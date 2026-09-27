import {
  distinctTenantRaters,
  isShieldLifted,
  landlordScore,
  nextShieldBatchAt,
  owedForTenancy,
  ratingAccess,
  releasedShieldIds,
  shieldBatchMoments,
  shieldReleases,
  tenancyReleaseCheck,
  tenancyReleaseTimes,
} from '@/domain/rating'
import type { PersonId, Rating } from '@/domain/types'
import {
  JOB,
  OTHER_HOME,
  PEOPLE,
  TENANCY,
  day,
  endedTenancy,
  makeJob,
  makeRating,
  makeTenancy,
} from './fixtures'

const NOW = day(30)
const tenants: PersonId[] = [
  'person_tenant_ruth',
  'person_tenant_callum',
  'person_tenant_eilidh',
  'person_tenant_hamish',
  'person_tenant_morven',
  'person_tenant_lewis',
]

/** A tenant's per-repair rating of Graham, still sealed by the shield. */
type Overrides = Partial<Rating> & { at?: string }

function perRepair(raterId: PersonId, overrides: Overrides = {}): Rating {
  return makeRating({
    direction: 'tenant->landlord',
    raterId,
    subjectId: PEOPLE.graham,
    seal: 'retaliation_shield',
    state: 'sealed',
    revealedAt: undefined,
    revealAt: null,
    answers: { fixed_quickly: 1, kept_informed: 2 },
    at: day(1),
    ...overrides,
  })
}

/** A revealed end-of-tenancy rating of Graham from a former tenant. */
function endOfTenancy(raterId: PersonId, overrides: Overrides = {}): Rating {
  return makeRating({
    direction: 'tenant->landlord',
    raterId,
    subjectId: PEOPLE.graham,
    context: { kind: 'tenancy', tenancyId: `tenancy_${raterId}` },
    at: day(1),
    ...overrides,
  })
}

describe('retaliation shield', () => {
  it('counts each tenant once, however many ratings they gave', () => {
    const ratings = [perRepair(PEOPLE.sarah), perRepair(PEOPLE.sarah), endOfTenancy(PEOPLE.sarah)]
    expect(distinctTenantRaters(ratings, PEOPLE.graham, NOW)).toBe(1)
  })

  it("doesn't count ratings that aren't in the aggregate or are about someone else", () => {
    const ratings = [
      endOfTenancy(tenants[0]!, { state: 'sealed' }),
      endOfTenancy(tenants[1]!, { state: 'removed' }),
      endOfTenancy(tenants[2]!, { state: 'restricted' }),
      perRepair(tenants[3]!, { subjectId: PEOPLE.fiona }),
      perRepair(tenants[4]!, { state: 'draft', submittedAt: undefined }),
      perRepair(tenants[5]!, { createdAt: day(-1200), submittedAt: day(-1200) }),
    ]
    expect(distinctTenantRaters(ratings, PEOPLE.graham, NOW)).toBe(0)
  })

  it('stays up with 4 different tenant raters and lifts at 5', () => {
    const four = tenants.slice(0, 4).map((id) => perRepair(id))
    expect(isShieldLifted(four, PEOPLE.graham, NOW)).toBe(false)
    expect(releasedShieldIds(four, { landlordId: PEOPLE.graham, now: NOW }).size).toBe(0)

    const five = [...four, endOfTenancy(tenants[4]!)]
    expect(isShieldLifted(five, PEOPLE.graham, NOW)).toBe(true)
    const released = releasedShieldIds(five, { landlordId: PEOPLE.graham, now: NOW })
    expect([...released].sort()).toEqual(four.map((rating) => rating.id).sort())
  })

  it('goes back up if a removal takes the landlord under 5 again', () => {
    const ratings = [...tenants.slice(0, 4).map((id) => perRepair(id)), endOfTenancy(tenants[4]!)]
    const afterRemoval = ratings.map((rating, index) =>
      index === 4 ? { ...rating, state: 'removed' as const } : rating,
    )
    expect(releasedShieldIds(afterRemoval, { landlordId: PEOPLE.graham, now: NOW }).size).toBe(0)
  })

  it('never shows a sealed per-repair rating to the landlord, or anyone but its author', () => {
    const rating = perRepair(PEOPLE.sarah)
    const context = { now: NOW, propertyLandlordId: PEOPLE.graham }
    expect(ratingAccess({ personId: PEOPLE.graham, role: 'landlord' }, rating, context)).toBe(
      'none',
    )
    expect(
      ratingAccess(
        { personId: PEOPLE.agent, role: 'landlord', actingForId: PEOPLE.graham },
        rating,
        context,
      ),
    ).toBe('none')
    expect(ratingAccess({ personId: PEOPLE.kev, role: 'trade' }, rating, context)).toBe('none')
    expect(ratingAccess({ personId: PEOPLE.sarah, role: 'tenant' }, rating, context)).toBe('author')
  })

  it('stays sealed even once released: it only ever appears inside the aggregate', () => {
    const ratings = tenants.slice(0, 5).map((id) => perRepair(id))
    const released = releasedShieldIds(ratings, { landlordId: PEOPLE.graham, now: NOW })
    expect(released.size).toBe(5)
    const context = { now: NOW, propertyLandlordId: PEOPLE.graham }
    for (const rating of ratings) {
      expect(rating.state).toBe('sealed')
      expect(ratingAccess({ personId: PEOPLE.fiona, role: 'tenant' }, rating, context)).toBe('none')
    }
  })
})

describe('release at the end of the tenancy', () => {
  const tenancy = endedTenancy()
  const jobs = [makeJob()]
  const owed = owedForTenancy(tenancy)
  const repair = perRepair(PEOPLE.sarah, { context: JOB, at: day(-30) })
  const grahamRatesSarah = makeRating({
    direction: 'landlord->tenant',
    raterId: PEOPLE.graham,
    subjectId: PEOPLE.sarah,
    context: TENANCY,
    at: day(5),
  })
  const sarahRatesGraham = makeRating({
    direction: 'tenant->landlord',
    raterId: PEOPLE.sarah,
    subjectId: PEOPLE.graham,
    context: TENANCY,
    at: day(6),
  })

  it("waits until the landlord's rating of that tenant is locked, not just the move-out", () => {
    const ratings = [repair]
    const check = tenancyReleaseCheck(jobs, owed, ratings, day(3))
    expect(check(repair)).toBe(false)
    expect(
      releasedShieldIds(ratings, { landlordId: PEOPLE.graham, now: day(3), tenancyReleased: check })
        .size,
    ).toBe(0)
  })

  it('releases it into the aggregate once the end-of-tenancy ratings are revealed', () => {
    const ratings = [repair, grahamRatesSarah, sarahRatesGraham]
    const check = tenancyReleaseCheck(jobs, owed, ratings, day(7))
    expect(check(repair)).toBe(true)
    const released = releasedShieldIds(ratings, {
      landlordId: PEOPLE.graham,
      now: day(7),
      tenancyReleased: check,
    })
    expect([...released]).toEqual([repair.id])
  })

  it('releases it when the 28-day window closes, even if nobody rated', () => {
    const check = tenancyReleaseCheck(jobs, owed, [repair], day(28))
    expect(check(repair)).toBe(true)
  })

  it('keeps it sealed for a job with no tenancy on record', () => {
    const check = tenancyReleaseCheck([makeJob({ tenancyId: undefined })], owed, [repair], day(60))
    expect(check(repair)).toBe(false)
  })

  it("keeps it sealed while the tenant still rents another of the landlord's homes", () => {
    // Sarah moved from Esslemont Avenue to another of Graham's flats: he is still her landlord.
    const nextFlat = makeTenancy({ id: 'tenancy_rosemount', propertyId: OTHER_HOME })
    const ratings = [repair, grahamRatesSarah, sarahRatesGraham]
    const check = tenancyReleaseCheck(jobs, owed, ratings, day(60), [tenancy, nextFlat])
    expect(check(repair)).toBe(false)

    // Once that tenancy has ended and been through its own reveal, it is released.
    const ended = endedTenancy({ id: 'tenancy_rosemount', propertyId: OTHER_HOME })
    const allOwed = [...owed, ...owedForTenancy(ended)]
    expect(tenancyReleaseCheck(jobs, allOwed, ratings, day(60), [tenancy, ended])(repair)).toBe(
      true,
    )
    // Someone else's tenancy with Graham makes no difference.
    const amys = makeTenancy({ id: 'tenancy_amy', tenantIds: [PEOPLE.amy] })
    expect(tenancyReleaseCheck(jobs, owed, ratings, day(60), [tenancy, amys])(repair)).toBe(true)
  })
})

describe('shielded ratings in the landlord score', () => {
  const now = day(30)
  const revealed = tenants.slice(0, 3).map((id) => endOfTenancy(id, { at: day(-60) }))
  const shielded = perRepair(PEOPLE.sarah, { at: day(-10) })
  const ratings = [...revealed, shielded]
  const base = { landlordId: PEOPLE.graham, ratings, now, platformMean: 4 }

  it('leaves sealed ratings out of the public score', () => {
    const score = landlordScore(base)
    expect(score.reviewCount).toBe(3)
    expect(score.criteria.find((c) => c.criterionId === 'fixed_quickly')?.count).toBe(3)
  })

  it('counts a released rating in the score and question bars, but not the distribution or date', () => {
    const score = landlordScore({ ...base, releasedShielded: new Set([shielded.id]) })
    expect(score.reviewCount).toBe(4)
    expect(score.reviewerCount).toBe(4)
    expect(score.criteria.find((c) => c.criterionId === 'fixed_quickly')).toEqual({
      criterionId: 'fixed_quickly',
      mean: (4 * 3 + 1) / 4,
      count: 4,
    })
    expect(Object.values(score.distribution).reduce((a, b) => a + b, 0)).toBe(3)
    expect(score.lastReviewAt).toBe(day(-60))
    const without = landlordScore(base)
    expect(score.score).not.toBe(without.score)
  })
})

describe('monthly batches once the shield has lifted', () => {
  // Four former tenants have rated Graham at the end of their tenancies, so a fifth tenant's
  // per-repair rating lifts the shield. Day 0 is Monday 2 March 2026.
  const former = tenants.slice(0, 4).map((id) => endOfTenancy(id, { at: day(-60) }))
  const sarahs = perRepair(PEOPLE.sarah, { at: day(1) })
  const amys = perRepair(PEOPLE.amy, { at: day(35) })
  const options = (now: string) => ({ landlordId: PEOPLE.graham, now })

  it('releases on the 1st of each month', () => {
    expect(nextShieldBatchAt(day(1))).toBe('2026-04-01T00:00:00.000Z')
    expect(nextShieldBatchAt('2026-04-01T00:00:00.000Z')).toBe('2026-05-01T00:00:00.000Z')
    expect(nextShieldBatchAt('2026-12-15T10:00:00.000Z')).toBe('2027-01-01T00:00:00.000Z')
    expect(shieldBatchMoments(day(1), day(62))).toEqual([
      '2026-04-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    ])
  })

  it("holds one tenant's rating on its own, even with the shield lifted", () => {
    const ratings = [...former, sarahs]
    expect(isShieldLifted(ratings, PEOPLE.graham, day(30))).toBe(true)
    expect(releasedShieldIds(ratings, options(day(30))).size).toBe(0)
    expect(releasedShieldIds(ratings, options(day(200))).size).toBe(0)
  })

  it("waits for the next 1st, then releases two tenants' ratings together", () => {
    const ratings = [...former, sarahs, amys]
    // Amy's arrives on 6 April, after the April batch: nothing moves until 1 May.
    expect(releasedShieldIds(ratings, options(day(45))).size).toBe(0)
    const releases = shieldReleases(ratings, options(day(61)))
    expect([...releases.keys()].sort()).toEqual([amys.id, sarahs.id].sort())
    for (const release of releases.values()) {
      expect(release).toEqual({ route: 'batch', at: '2026-05-01T00:00:00.000Z' })
    }
  })

  it('never counts two ratings from the same tenant as a batch', () => {
    const again = perRepair(PEOPLE.sarah, { at: day(20) })
    expect(releasedShieldIds([...former, sarahs, again], options(day(61))).size).toBe(0)
  })

  it('leaves the score unchanged between batches, then moves it once', () => {
    const ratings = [...former, sarahs, amys]
    const score = (now: string) =>
      landlordScore({
        landlordId: PEOPLE.graham,
        ratings,
        now,
        platformMean: 4,
        releasedShielded: releasedShieldIds(ratings, options(now)),
      })
    const before = score('2026-04-30T23:59:00.000Z')
    const after = score('2026-05-01T00:01:00.000Z')
    expect(before.reviewCount).toBe(4)
    expect(after.reviewCount).toBe(6)
  })

  it("doesn't let a rating already released at tenancy end pad out a batch", () => {
    const ratings = [...former, sarahs, amys]
    const releases = shieldReleases(ratings, {
      ...options(day(61)),
      tenancyReleasedAt: (rating) => (rating.id === amys.id ? day(40) : null),
    })
    expect(releases.get(amys.id)).toEqual({ route: 'tenancy_end', at: day(40) })
    expect(releases.has(sarahs.id)).toBe(false)
  })

  it('works out when a tenancy was released, for the batch check', () => {
    const tenancy = endedTenancy()
    const repair = perRepair(PEOPLE.sarah, { context: JOB, at: day(-30) })
    const times = tenancyReleaseTimes([makeJob()], owedForTenancy(tenancy), [repair], day(40))
    // Nobody rated, so the tenancy settled when its 28-day window closed.
    expect(times(repair)).toBe(owedForTenancy(tenancy)[0]?.closesAt)
  })
})
