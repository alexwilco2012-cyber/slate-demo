import {
  addMonths,
  bayesianScore,
  clientRating,
  countsInScore,
  coverage,
  distribution,
  hasHeadlineScore,
  landlordScore,
  platformMean,
  recencyWeight,
  relativeBadge,
  removeRating,
  reviewScore,
  scoreSummary,
  tradeScore,
  type SummaryInput,
} from '@/domain/rating'
import type { PersonId, Rating, ScaleScore } from '@/domain/types'
import { OTHER_HOME, PEOPLE, TENANCY, makeRating } from './fixtures'

const NOW = '2026-09-26T12:00:00.000Z'
const monthsAgo = (months: number) => addMonths(NOW, -months)

const landlords: PersonId[] = [
  'person_landlord_moira',
  'person_landlord_euan',
  'person_landlord_ailsa',
  'person_landlord_ross',
]
const tenants: PersonId[] = ['person_tenant_ruth', 'person_tenant_callum', 'person_tenant_eilidh']

/** A revealed landlord->trade review of Kev, every question answered with `score`. */
function ofKev(
  raterId: PersonId,
  score: ScaleScore,
  age = 0,
  overrides: Partial<Rating> = {},
): Rating {
  return makeRating({
    direction: 'landlord->trade',
    raterId,
    subjectId: PEOPLE.kev,
    score,
    at: monthsAgo(age),
    context: { kind: 'job', jobId: `job_${raterId}_${age}` },
    ...overrides,
  })
}

const kevSummary = (ratings: Rating[], extra: Partial<SummaryInput> = {}) =>
  scoreSummary({
    direction: 'landlord->trade',
    subjectId: PEOPLE.kev,
    ratings,
    now: NOW,
    platformMean: 4,
    ...extra,
  })

describe('per-review score and recency', () => {
  it('scores a review as the mean of the questions answered', () => {
    expect(
      reviewScore({ answers: { properly_fixed: 5, price_matched_quote: 4, on_time: 3 } }),
    ).toBe(4)
    expect(reviewScore({ answers: { fixed_quickly: 1, kept_informed: 2 } })).toBe(1.5)
    expect(reviewScore({ answers: {} })).toBeNull()
  })

  it('halves the weight every 12 months: w = 0.5^(months/12)', () => {
    expect(recencyWeight(NOW, NOW)).toBe(1)
    expect(recencyWeight(monthsAgo(12), NOW)).toBe(0.5)
    expect(recencyWeight(monthsAgo(24), NOW)).toBe(0.25)
    expect(recencyWeight(monthsAgo(35), NOW)).toBeCloseTo(0.5 ** (35 / 12))
  })

  it('drops the weight to zero at 36 months', () => {
    expect(recencyWeight(monthsAgo(36), NOW)).toBe(0)
    expect(recencyWeight(monthsAgo(40), NOW)).toBe(0)
  })

  it('treats a date in the future as brand new', () => {
    expect(recencyWeight(addMonths(NOW, 1), NOW)).toBe(1)
  })
})

describe('headline score S = (3m + Σwr) / (3 + Σw)', () => {
  it('is m when there are no reviews, and pulls a few reviews towards m', () => {
    expect(bayesianScore([], 4)).toBe(4)
    expect(
      bayesianScore(
        [5, 5, 5].map((score) => ({ score, weight: 1 })),
        4,
      ),
    ).toBe(4.5)
  })

  it('weights recent reviews more', () => {
    const summary = kevSummary([
      ofKev(landlords[0]!, 5, 0),
      ofKev(landlords[1]!, 3, 12),
      ofKev(landlords[2]!, 4, 24),
    ])
    // Σw = 1 + 0.5 + 0.25 = 1.75; Σwr = 5 + 1.5 + 1 = 7.5; S = (12 + 7.5) / 4.75
    expect(summary.score).toBeCloseTo(19.5 / 4.75, 10)
  })

  it('uses the platform mean it is given', () => {
    const ratings = landlords.slice(0, 3).map((id) => ofKev(id, 5))
    expect(kevSummary(ratings, { platformMean: 3 }).score).toBe((9 + 15) / 6)
  })
})

describe('no score until 3 reviews from 3 different people (rule 10)', () => {
  it('shows no score with two reviewers', () => {
    const summary = kevSummary([ofKev(landlords[0]!, 5), ofKev(landlords[1]!, 5)])
    expect(summary).toMatchObject({ score: null, reviewCount: 2, reviewerCount: 2 })
  })

  it('counts one landlord rating several jobs as one reviewer', () => {
    const summary = kevSummary([
      ofKev(landlords[0]!, 5, 0),
      ofKev(landlords[0]!, 5, 1),
      ofKev(landlords[1]!, 5, 2),
    ])
    expect(summary).toMatchObject({ score: null, reviewCount: 3, reviewerCount: 2 })
  })

  it('shows a score from 3 reviews by 3 people', () => {
    const summary = kevSummary(landlords.slice(0, 3).map((id) => ofKev(id, 5)))
    expect(summary.score).toBe(4.5)
  })
})

describe('tenants never become a number (rule 11)', () => {
  it('has a headline score only for landlords and trades', () => {
    expect(hasHeadlineScore('tenant->landlord')).toBe(true)
    expect(hasHeadlineScore('landlord->trade')).toBe(true)
    expect(hasHeadlineScore('tenant->trade')).toBe(true)
    expect(hasHeadlineScore('trade->landlord')).toBe(true)
    expect(hasHeadlineScore('landlord->tenant')).toBe(false)
    expect(hasHeadlineScore('trade->tenant')).toBe(false)
  })

  it('refuses to work out a score from ratings of a tenant, so nothing can rank them', () => {
    const aboutSarah = landlords.slice(0, 3).map((raterId) =>
      makeRating({
        direction: 'landlord->tenant',
        raterId,
        subjectId: PEOPLE.sarah,
        context: TENANCY,
        at: monthsAgo(1),
      }),
    )
    for (const direction of ['landlord->tenant', 'trade->tenant'] as const) {
      expect(() =>
        scoreSummary({
          direction,
          subjectId: PEOPLE.sarah,
          ratings: aboutSarah,
          now: NOW,
          platformMean: 4,
        }),
      ).toThrow(RangeError)
    }
  })
})

describe('which reviews count', () => {
  const three = landlords.slice(0, 3).map((id) => ofKev(id, 5))

  it.each(['sealed', 'draft', 'restricted', 'removed'] as const)(
    'leaves out %s ratings',
    (state) => {
      const other = ofKev(landlords[3]!, 1, 0, { state })
      expect(countsInScore(other, { now: NOW })).toBe(false)
      expect(kevSummary([...three, other])).toMatchObject({ reviewCount: 3, score: 4.5 })
    },
  )

  it('never scores the private would-again answer or the safety flag (rule 6)', () => {
    const plain = kevSummary(three)
    const withPrivateAnswers = kevSummary(
      three.map((rating, index) => ({
        ...rating,
        wouldAgain: index === 0 ? ('no' as const) : ('not_sure' as const),
        safetyFlag: true,
        privateNote: 'Would not use again.',
      })),
    )
    expect(withPrivateAnswers).toEqual(plain)
  })

  it('stops counting a review at 36 months', () => {
    const old = ofKev(landlords[3]!, 1, 36)
    const nearlyOld = ofKev(landlords[3]!, 1, 35)
    expect(kevSummary([...three, old]).reviewCount).toBe(3)
    expect(kevSummary([...three, nearlyOld]).reviewCount).toBe(4)
  })

  it('ignores reviews of other people and other directions', () => {
    const aboutFiona = ofKev(landlords[3]!, 1, 0, { subjectId: PEOPLE.fiona })
    const fromTenant = makeRating({
      direction: 'tenant->trade',
      raterId: tenants[0]!,
      subjectId: PEOPLE.kev,
    })
    expect(kevSummary([...three, aboutFiona, fromTenant]).reviewCount).toBe(3)
  })

  it('recalculates straight away after a removal', () => {
    const low = ofKev(landlords[3]!, 1)
    const before = kevSummary([...three, low])
    const removed = removeRating(low, { at: NOW, reason: 'report_upheld' })
    if (!removed.ok) throw new Error(removed.message)
    const after = kevSummary([...three, removed.value])
    expect(before.score).toBe((12 + 16) / 7)
    expect(after.score).toBe(4.5)

    const takenDown = removeRating(three[0]!, { at: NOW, reason: 'moderation' })
    if (!takenDown.ok) throw new Error(takenDown.message)
    expect(kevSummary([takenDown.value, three[1]!, three[2]!])).toMatchObject({
      score: null,
      reviewCount: 2,
    })
  })
})

describe('what the score panel shows', () => {
  it('gives a 5-level distribution, rounding halves up', () => {
    const at = (answers: Rating['answers']) => ofKev(landlords[0]!, 5, 0, { answers })
    expect(
      distribution([
        at({ properly_fixed: 5, price_matched_quote: 4 }),
        at({ properly_fixed: 3, price_matched_quote: 2 }),
        at({ properly_fixed: 1, price_matched_quote: 2, on_time: 1 }),
        at({ properly_fixed: 4 }),
      ]),
    ).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1, 5: 1 })
  })

  it('gives each question its own average and count', () => {
    const summary = kevSummary([
      ofKev(landlords[0]!, 5),
      ofKev(landlords[1]!, 3),
      ofKev(landlords[2]!, 4, 0, { answers: { properly_fixed: 4 } }),
    ])
    expect(summary.criteria[0]).toEqual({ criterionId: 'properly_fixed', mean: 4, count: 3 })
    expect(summary.criteria[1]).toEqual({ criterionId: 'price_matched_quote', mean: 4, count: 2 })
    expect(summary.criteria.map((c) => c.criterionId)).toEqual([
      'properly_fixed',
      'price_matched_quote',
      'on_time',
      'kept_updated',
      'right_paperwork',
    ])
  })

  it('gives the date of the latest review', () => {
    const summary = kevSummary([ofKev(landlords[0]!, 5, 6), ofKev(landlords[1]!, 5, 2)])
    expect(summary.lastReviewAt).toBe(monthsAgo(2))
    expect(kevSummary([]).lastReviewAt).toBeNull()
  })

  it('says "Reviewed on X of Y completed jobs", counting each job once', () => {
    const jobs = [
      { jobId: 'job_a' as const, completedAt: monthsAgo(1) },
      { jobId: 'job_b' as const, completedAt: monthsAgo(2) },
      { jobId: 'job_c' as const, completedAt: monthsAgo(40) },
    ]
    const ratings = [
      makeRating({
        direction: 'tenant->trade',
        raterId: tenants[0]!,
        subjectId: PEOPLE.kev,
        context: { kind: 'job', jobId: 'job_a' },
      }),
      makeRating({
        direction: 'tenant->trade',
        raterId: tenants[1]!,
        subjectId: PEOPLE.kev,
        context: { kind: 'job', jobId: 'job_a' },
      }),
    ]
    expect(coverage(jobs, ratings, NOW)).toEqual({ reviewed: 1, completed: 2 })
    expect(kevSummary([]).coverage).toBeNull()
    expect(kevSummary([], { completedJobs: jobs }).coverage).toEqual({ reviewed: 0, completed: 2 })
  })
})

describe('relative badges', () => {
  const lower = (count: number) => Array.from({ length: count }, () => 3)

  it('needs 20 other peers with a score', () => {
    expect(relativeBadge(4.5, { area: 'Aberdeen', scores: lower(19) })).toBeNull()
    expect(relativeBadge(4.5, { area: 'Aberdeen', scores: [...lower(19), null] })).toBeNull()
    expect(relativeBadge(4.5, { area: 'Aberdeen', scores: lower(20) })).toEqual({
      topPercent: 5,
      area: 'Aberdeen',
    })
  })

  it('only uses the 5%, 10% and 25% bands', () => {
    const peers = (higher: number) => ({
      area: 'Aberdeen',
      scores: [...Array.from({ length: higher }, () => 4.9), ...lower(20 - higher)],
    })
    expect(relativeBadge(4.5, peers(1))?.topPercent).toBe(10)
    expect(relativeBadge(4.5, peers(2))?.topPercent).toBe(25)
    expect(relativeBadge(4.5, peers(5))).toBeNull()
  })

  it('lets ties share the better place, and gives nothing without a score', () => {
    expect(relativeBadge(4.5, { area: 'Aberdeen', scores: [4.5, ...lower(19)] })?.topPercent).toBe(
      5,
    )
    expect(relativeBadge(null, { area: 'Aberdeen', scores: lower(30) })).toBeNull()
  })

  it('appears in the summary when peers are given', () => {
    const ratings = landlords.slice(0, 3).map((id) => ofKev(id, 5))
    expect(
      kevSummary(ratings, { peers: { area: 'Aberdeen', scores: lower(20) } }).relativeBadge,
    ).toEqual({
      topPercent: 5,
      area: 'Aberdeen',
    })
  })
})

describe('platform mean m', () => {
  const reviewsOf = (count: number, score: ScaleScore, age = 1) =>
    Array.from({ length: count }, (_, index) =>
      makeRating({
        direction: 'landlord->trade',
        raterId: `person_landlord_${index}`,
        subjectId: PEOPLE.kev,
        score,
        at: monthsAgo(age),
      }),
    )

  it('starts at 4.0 until there are 20 reviews in the last 12 months', () => {
    expect(platformMean([], 'landlord->trade', NOW)).toBe(4)
    expect(platformMean(reviewsOf(19, 2), 'landlord->trade', NOW)).toBe(4)
    expect(platformMean(reviewsOf(20, 2), 'landlord->trade', NOW)).toBe(2)
  })

  it('only uses revealed reviews from the last 12 months in that direction', () => {
    const recent = reviewsOf(20, 3)
    const old = reviewsOf(5, 1, 13)
    const sealed = reviewsOf(5, 1).map((rating) => ({ ...rating, state: 'sealed' as const }))
    const tenantSide = reviewsOf(5, 1).map((rating) => ({
      ...rating,
      direction: 'tenant->trade' as const,
    }))
    expect(
      platformMean([...recent, ...old, ...sealed, ...tenantSide], 'landlord->trade', NOW),
    ).toBe(3)
  })
})

describe('trade Overall', () => {
  const fromLandlords = landlords.slice(0, 3).map((id) => ofKev(id, 5))
  const fromTenants = tenants.map((id) =>
    makeRating({
      direction: 'tenant->trade',
      raterId: id,
      subjectId: PEOPLE.kev,
      score: 3,
      at: NOW,
    }),
  )
  const input = {
    tradeId: PEOPLE.kev,
    now: NOW,
    platformMeans: { fromLandlords: 4, fromTenants: 4 },
  }

  it('is the mean of the landlord and tenant halves, and keeps both halves', () => {
    const score = tradeScore({ ...input, ratings: [...fromLandlords, ...fromTenants] })
    expect(score.fromLandlords.score).toBe(4.5)
    expect(score.fromTenants.score).toBe(3.5)
    expect(score.overall).toBe(4)
  })

  it('has no Overall while the tenant half is still new, but keeps the landlord half', () => {
    const score = tradeScore({ ...input, ratings: [...fromLandlords, fromTenants[0]!] })
    expect(score.fromTenants).toMatchObject({ score: null, reviewCount: 1 })
    expect(score.fromLandlords.score).toBe(4.5)
    expect(score.overall).toBeNull()
  })

  it('has no Overall while the landlord half is still new, but keeps the tenant half', () => {
    const score = tradeScore({ ...input, ratings: [fromLandlords[0]!, ...fromTenants] })
    expect(score.fromLandlords).toMatchObject({ score: null, reviewCount: 1 })
    expect(score.fromTenants.score).toBe(3.5)
    expect(score.overall).toBeNull()
  })

  it('needs 3 different people in each half, not just 3 reviews', () => {
    const sameTenant = [0, 1, 2].map((n) =>
      makeRating({
        direction: 'tenant->trade',
        raterId: tenants[0]!,
        subjectId: PEOPLE.kev,
        score: 5,
        at: NOW,
        context: { kind: 'job', jobId: `job_repeat_${n}` },
      }),
    )
    const score = tradeScore({ ...input, ratings: [...fromLandlords, ...sameTenant] })
    expect(score.fromTenants).toMatchObject({ score: null, reviewCount: 3, reviewerCount: 1 })
    expect(score.overall).toBeNull()
  })

  it('has no Overall while both halves are new', () => {
    expect(tradeScore({ ...input, ratings: [] }).overall).toBeNull()
  })
})

describe('client rating from trades', () => {
  const byTrade = (
    raterId: PersonId,
    jobId: `job_${string}`,
    paid: ScaleScore,
    state: Rating['state'] = 'revealed',
  ) =>
    makeRating({
      direction: 'trade->landlord',
      raterId,
      subjectId: PEOPLE.graham,
      context: { kind: 'job', jobId },
      answers: {
        clear_description: 4,
        paid_on_time: paid,
        arranged_access: 4,
        fair_to_deal_with: 4,
      },
      state,
      at: NOW,
    })

  it('says "Paid on time on X of Y jobs", counting only Always as on time', () => {
    const rating = clientRating({
      landlordId: PEOPLE.graham,
      now: NOW,
      platformMean: 4,
      ratings: [
        byTrade(PEOPLE.kev, 'job_a', 5),
        byTrade(PEOPLE.mhairi, 'job_b', 5),
        byTrade('person_trade_doug', 'job_c', 4),
        byTrade('person_trade_doug', 'job_d', 1, 'sealed'),
      ],
    })
    expect(rating.paidOnTime).toEqual({ onTime: 2, jobs: 3 })
    expect(rating.summary.reviewCount).toBe(3)
    expect(rating.summary.score).not.toBeNull()
  })
})

describe('landlord score', () => {
  const byTenant = (raterId: PersonId, home: number, extra: Partial<Rating> = {}) =>
    makeRating({
      direction: 'tenant->landlord',
      raterId,
      subjectId: PEOPLE.graham,
      context: TENANCY,
      answers: {
        fixed_quickly: 4,
        kept_informed: 4,
        home_as_advertised: home as ScaleScore,
        proper_notice: 4,
        fair_about_money: 4,
      },
      at: NOW,
      ...extra,
    })

  it('adds the property sub-score from "Home matched the advert", with the same rules', () => {
    const ratings = [byTenant(tenants[0]!, 5), byTenant(tenants[1]!, 5), byTenant(tenants[2]!, 5)]
    const score = landlordScore({ landlordId: PEOPLE.graham, ratings, now: NOW, platformMean: 4 })
    expect(score.propertySubScore).toBe(4.5)
    const two = landlordScore({
      landlordId: PEOPLE.graham,
      ratings: ratings.slice(0, 2),
      now: NOW,
      platformMean: 4,
    })
    expect(two.propertySubScore).toBeNull()
  })

  it('narrows to one home for its property page', () => {
    const ratings = [
      byTenant(tenants[0]!, 5),
      byTenant(tenants[1]!, 5),
      byTenant(tenants[2]!, 2, { propertyId: OTHER_HOME }),
    ]
    const home = landlordScore({
      landlordId: PEOPLE.graham,
      ratings,
      now: NOW,
      platformMean: 4,
      propertyId: OTHER_HOME,
    })
    expect(home.reviewCount).toBe(1)
    expect(
      landlordScore({ landlordId: PEOPLE.graham, ratings, now: NOW, platformMean: 4 }).reviewCount,
    ).toBe(3)
  })
})
