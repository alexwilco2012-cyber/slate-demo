import {
  contextSettledAt,
  owedForJob,
  owedForTenancy,
  revealStateOf,
  settleRatings,
} from '@/domain/rating'
import type { Rating } from '@/domain/types'
import {
  JOB,
  PEOPLE,
  TENANCY,
  day,
  endedTenancy,
  makeJob,
  makeRating,
  makeTenancy,
  makeVisit,
  property,
} from './fixtures'

/** A sent rating that hasn't been revealed yet. */
function sealed(overrides: Parameters<typeof makeRating>[0]): Rating {
  return makeRating({ state: 'sealed', revealedAt: undefined, revealAt: null, ...overrides })
}

const fromGraham = (at: string) =>
  sealed({ direction: 'landlord->trade', raterId: PEOPLE.graham, subjectId: PEOPLE.kev, at })
const fromKev = (at: string) =>
  sealed({ direction: 'trade->landlord', raterId: PEOPLE.kev, subjectId: PEOPLE.graham, at })

describe('double-blind reveal on a job', () => {
  // An empty home: just Graham and Kev rating each other.
  const job = makeJob({ tenancyId: undefined })
  const owed = owedForJob(job, property, null)

  it("keeps a rating sealed while the other side's window is open", () => {
    const graham = fromGraham(day(3))
    const state = revealStateOf(graham, owed, [graham], day(4))
    expect(state).toEqual({ status: 'sealed', revealAt: day(30), waitingFor: 'others' })
  })

  it('reveals both together the moment the last one owed is sent', () => {
    const ratings = [fromGraham(day(3)), fromKev(day(5))]
    const { ratings: settled, newlyRevealed } = settleRatings(owed, ratings, day(5))
    expect(settled.map((rating) => rating.state)).toEqual(['revealed', 'revealed'])
    expect(settled.map((rating) => rating.revealedAt)).toEqual([day(5), day(5)])
    expect(newlyRevealed).toEqual(ratings.map((rating) => rating.id))
  })

  it('reveals a lone rating when the window closes with only one side rated', () => {
    const ratings = [fromGraham(day(3))]
    expect(settleRatings(owed, ratings, day(29)).ratings[0]?.state).toBe('sealed')
    const [revealed] = settleRatings(owed, ratings, day(30)).ratings
    expect(revealed).toMatchObject({ state: 'revealed', revealedAt: day(30), revealAt: day(30) })
  })

  it("doesn't treat a draft as sent", () => {
    const draft = makeRating({
      direction: 'trade->landlord',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      state: 'draft',
      submittedAt: undefined,
      revealedAt: undefined,
    })
    const ratings = [fromGraham(day(3)), draft]
    const { ratings: settled } = settleRatings(owed, ratings, day(5))
    expect(settled[0]?.state).toBe('sealed')
    expect(settled[1]).toBe(draft)
    expect(revealStateOf(draft, owed, ratings, day(5))).toBeNull()
  })

  it('never changes a rating after its reveal', () => {
    const first = settleRatings(owed, [fromGraham(day(3)), fromKev(day(5))], day(5)).ratings
    const again = settleRatings(owed, first, day(60))
    expect(again.newlyRevealed).toEqual([])
    again.ratings.forEach((rating, index) => expect(rating).toBe(first[index]))
  })

  it('leaves restricted and removed ratings alone', () => {
    const restricted = { ...fromGraham(day(3)), state: 'restricted' as const }
    const removed = { ...fromKev(day(4)), state: 'removed' as const }
    const { ratings } = settleRatings(owed, [restricted, removed], day(60))
    expect(ratings[0]).toBe(restricted)
    expect(ratings[1]).toBe(removed)
  })

  it('says when everything owed on the job was locked', () => {
    const ratings = [fromGraham(day(3)), fromKev(day(5))]
    expect(contextSettledAt(JOB, owed, [fromGraham(day(3))], day(10))).toBeNull()
    expect(contextSettledAt(JOB, owed, ratings, day(10))).toBe(day(5))
  })
})

describe("trade->landlord waits for the landlord's rating of that trade to be locked", () => {
  const unconfirmed = makeJob({
    tenancyId: undefined,
    status: 'completed',
    landlordConfirmedAt: undefined,
  })

  it('stays sealed with no date while the landlord has not confirmed the job', () => {
    const owed = owedForJob(unconfirmed, property, null)
    const kev = fromKev(day(1))
    expect(revealStateOf(kev, owed, [kev], day(40))).toEqual({
      status: 'sealed',
      revealAt: null,
      waitingFor: 'counterpart',
    })
    expect(settleRatings(owed, [kev], day(40)).ratings[0]?.state).toBe('sealed')
  })

  it("is revealed with the landlord's rating once the landlord confirms and rates", () => {
    const confirmedLate = makeJob({ tenancyId: undefined, landlordConfirmedAt: day(45) })
    const owed = owedForJob(confirmedLate, property, null)
    const kev = fromKev(day(1))
    const state = revealStateOf(kev, owed, [kev], day(46))
    expect(state).toEqual({ status: 'sealed', revealAt: day(59), waitingFor: 'counterpart' })

    const ratings = [kev, fromGraham(day(47))]
    const { ratings: settled } = settleRatings(owed, ratings, day(47))
    expect(settled.map((rating) => [rating.state, rating.revealedAt])).toEqual([
      ['revealed', day(47)],
      ['revealed', day(47)],
    ])
  })

  it("is revealed when the landlord's window closes if they never rate", () => {
    const confirmedLate = makeJob({ tenancyId: undefined, landlordConfirmedAt: day(45) })
    const owed = owedForJob(confirmedLate, property, null)
    const [kev] = settleRatings(owed, [fromKev(day(1))], day(59)).ratings
    expect(kev).toMatchObject({ state: 'revealed', revealedAt: day(59) })
  })
})

describe('reveal with tenants involved', () => {
  it('holds a tenancy until every co-tenant and the landlord have rated, or 28 days pass', () => {
    const tenancy = endedTenancy({ tenantIds: [PEOPLE.sarah, PEOPLE.amy] })
    const owed = owedForTenancy(tenancy)
    const ratings = [
      sealed({
        direction: 'landlord->tenant',
        raterId: PEOPLE.graham,
        subjectId: PEOPLE.sarah,
        context: TENANCY,
        at: day(2),
      }),
      sealed({
        direction: 'landlord->tenant',
        raterId: PEOPLE.graham,
        subjectId: PEOPLE.amy,
        context: TENANCY,
        at: day(3),
      }),
      sealed({
        direction: 'tenant->landlord',
        raterId: PEOPLE.sarah,
        subjectId: PEOPLE.graham,
        context: TENANCY,
        at: day(4),
      }),
    ]
    const early = settleRatings(owed, ratings, day(27))
    expect(early.newlyRevealed).toEqual([])
    expect(early.ratings.every((rating) => rating.revealAt === day(28))).toBe(true)

    const late = settleRatings(owed, ratings, day(28))
    expect(late.ratings.map((rating) => rating.revealedAt)).toEqual([day(28), day(28), day(28)])

    const amy = sealed({
      direction: 'tenant->landlord',
      raterId: PEOPLE.amy,
      subjectId: PEOPLE.graham,
      context: TENANCY,
      at: day(10),
    })
    const allIn = settleRatings(owed, [...ratings, amy], day(10))
    expect(allIn.ratings.every((rating) => rating.revealedAt === day(10))).toBe(true)
  })

  it('never reveals a per-repair rating on its own, and it holds nothing else up', () => {
    const owed = owedForJob(makeJob(), property, makeTenancy())
    const perRepair = sealed({
      direction: 'tenant->landlord',
      raterId: PEOPLE.sarah,
      subjectId: PEOPLE.graham,
      seal: 'retaliation_shield',
      answers: { fixed_quickly: 2, kept_informed: 2 },
      at: day(1),
    })
    const others = [
      fromGraham(day(3)),
      fromKev(day(3)),
      sealed({
        direction: 'trade->tenant',
        raterId: PEOPLE.kev,
        subjectId: PEOPLE.sarah,
        at: day(3),
      }),
      sealed({
        direction: 'tenant->trade',
        raterId: PEOPLE.sarah,
        subjectId: PEOPLE.kev,
        at: day(3),
      }),
    ]
    const { ratings } = settleRatings(owed, [perRepair, ...others], day(400))
    expect(ratings[0]).toBe(perRepair)
    expect(revealStateOf(perRepair, owed, ratings, day(400))).toEqual({
      status: 'sealed',
      revealAt: null,
      waitingFor: 'shield',
    })
    expect(ratings.slice(1).every((rating) => rating.revealedAt === day(3))).toBe(true)
  })
})

describe('a tenant and a trade are held together, even before the tenant can rate', () => {
  // Kev finished on day 0. He rated Sarah and Graham on day 3; Graham rated Kev on day 4.
  const kevOnSarah = () =>
    sealed({ direction: 'trade->tenant', raterId: PEOPLE.kev, subjectId: PEOPLE.sarah, at: day(3) })
  const sarahOnKev = (at: string) =>
    sealed({ direction: 'tenant->trade', raterId: PEOPLE.sarah, subjectId: PEOPLE.kev, at })
  const landlordAndTrade = () => [fromKev(day(3)), fromGraham(day(4))]
  const jobWithConfirmation = (tenantConfirmedAt?: string) =>
    makeJob({ visits: [makeVisit({ tenantConfirmedAt })] })

  it("never shows Kev's rating of Sarah while she could still confirm the visit and rate him", () => {
    const owed = owedForJob(jobWithConfirmation(undefined), property, makeTenancy())
    const ratings = [...landlordAndTrade(), kevOnSarah()]
    const early = settleRatings(owed, ratings, day(13))
    expect(early.newlyRevealed).toEqual([])
    expect(early.ratings.map((rating) => rating.revealAt)).toEqual([day(14), day(14), day(14)])
    expect(revealStateOf(ratings[2]!, owed, ratings, day(13))).toMatchObject({
      status: 'sealed',
      revealAt: day(14),
    })

    // Her chance to rate ends with Kev's window; then everything is revealed together.
    const late = settleRatings(owed, ratings, day(14))
    expect(late.ratings.map((rating) => rating.revealedAt)).toEqual([day(14), day(14), day(14)])
  })

  it('waits for her once she confirms, and never backdates the reveal', () => {
    const ratings = [...landlordAndTrade(), kevOnSarah()]
    const before = owedForJob(jobWithConfirmation(undefined), property, makeTenancy())
    expect(settleRatings(before, ratings, day(4)).newlyRevealed).toEqual([])

    // Sarah confirms on day 5, so her window runs to day 19 and Kev's rating waits for it.
    const after = owedForJob(jobWithConfirmation(day(5)), property, makeTenancy())
    const waiting = settleRatings(after, ratings, day(6))
    expect(waiting.newlyRevealed).toEqual([])
    expect(waiting.ratings[2]?.revealAt).toBe(day(19))

    const settled = settleRatings(after, [...ratings, sarahOnKev(day(7))], day(7))
    expect(settled.ratings.map((rating) => rating.revealedAt)).toEqual([
      day(7),
      day(7),
      day(7),
      day(7),
    ])
  })

  it('holds a tenant who rates first until the trade can no longer rate back', () => {
    const notDone = makeJob({ visits: [makeVisit({ status: 'on_site', finishedAt: undefined })] })
    const owed = owedForJob(notDone, property, makeTenancy())
    expect(owed.some((slot) => slot.direction === 'trade->tenant')).toBe(false)
    const ratings = [...landlordAndTrade(), sarahOnKev(day(2))]
    expect(settleRatings(owed, ratings, day(14)).ratings[2]).toMatchObject({
      state: 'sealed',
      revealAt: day(15),
    })
    expect(settleRatings(owed, ratings, day(15)).ratings[2]?.revealedAt).toBe(day(15))
  })

  it('reveals the trade side at the deadline when the tenant confirms too late to rate', () => {
    // Sarah only confirms on day 20, after Kev's window closed: she has missed this job.
    const owed = owedForJob(jobWithConfirmation(day(20)), property, makeTenancy())
    expect(owed.some((slot) => slot.direction === 'tenant->trade')).toBe(false)
    const ratings = [...landlordAndTrade(), kevOnSarah()]
    expect(settleRatings(owed, ratings, day(21)).ratings[2]).toMatchObject({
      state: 'revealed',
      revealedAt: day(14),
    })
  })
})
