import {
  accessGiven,
  accessGivenForJob,
  canView,
  canViewClientRating,
  canViewPassport,
  ratingAccess,
  type RatingViewer,
} from '@/domain/rating'
import type { PassportShare, Rating } from '@/domain/types'
import { PEOPLE, TENANCY, day, makeRating } from './fixtures'

const NOW = day(20)
const context = { now: NOW, propertyLandlordId: PEOPLE.graham }

const sarah: RatingViewer = { personId: PEOPLE.sarah, role: 'tenant' }
const amy: RatingViewer = { personId: PEOPLE.amy, role: 'tenant' }
const graham: RatingViewer = { personId: PEOPLE.graham, role: 'landlord' }
const fiona: RatingViewer = { personId: PEOPLE.fiona, role: 'landlord' }
const agent: RatingViewer = { personId: PEOPLE.agent, role: 'landlord', actingForId: PEOPLE.graham }
const kev: RatingViewer = { personId: PEOPLE.kev, role: 'trade' }
const mhairi: RatingViewer = { personId: PEOPLE.mhairi, role: 'trade' }

describe('public reviews: tenant->landlord, landlord->trade, tenant->trade', () => {
  const reviews = [
    makeRating({
      direction: 'tenant->landlord',
      raterId: PEOPLE.sarah,
      subjectId: PEOPLE.graham,
      context: TENANCY,
    }),
    makeRating({ direction: 'landlord->trade', raterId: PEOPLE.graham, subjectId: PEOPLE.kev }),
    makeRating({ direction: 'tenant->trade', raterId: PEOPLE.sarah, subjectId: PEOPLE.kev }),
  ]

  it.each(reviews.map((rating) => [rating.direction, rating] as const))(
    '%s is visible to anyone signed in, in any portal',
    (_, rating) => {
      for (const viewer of [amy, fiona, mhairi, graham, kev]) {
        expect(canView(viewer, rating, context)).toBe(true)
      }
    },
  )

  it('is not shown to someone who is not signed in', () => {
    for (const rating of reviews) expect(ratingAccess(null, rating, context)).toBe('none')
  })

  it('is hidden from everyone but its author while sealed', () => {
    const sealed = { ...reviews[1]!, state: 'sealed' as const }
    expect(ratingAccess(graham, sealed, context)).toBe('author')
    expect(ratingAccess(agent, sealed, context)).toBe('author')
    expect(ratingAccess(kev, sealed, context)).toBe('none')
    expect(ratingAccess(amy, sealed, context)).toBe('none')
  })

  it('shows the author their own private fields, and nobody else', () => {
    expect(ratingAccess(sarah, reviews[0]!, context)).toBe('author')
    expect(ratingAccess(graham, reviews[0]!, context)).toBe('review')
  })
})

describe('tenant passport: landlord->tenant', () => {
  const rating = makeRating({
    direction: 'landlord->tenant',
    raterId: PEOPLE.fiona,
    subjectId: PEOPLE.sarah,
    context: TENANCY,
  })
  const share: PassportShare = {
    id: 'share_union_grove',
    tenantId: PEOPLE.sarah,
    token: 'tok_example',
    createdAt: day(10),
    expiresAt: day(40),
    views: [],
  }

  it('is never public', () => {
    for (const viewer of [graham, kev, mhairi, amy]) {
      expect(ratingAccess(viewer, rating, context)).toBe('none')
    }
    expect(ratingAccess(null, rating, context)).toBe('none')
  })

  it('is seen in full by the tenant, and by the landlord who wrote it', () => {
    expect(ratingAccess(sarah, rating, context)).toBe('review')
    expect(ratingAccess(fiona, rating, context)).toBe('author')
  })

  it("is seen by anyone holding the tenant's live link, signed in or not", () => {
    expect(ratingAccess(graham, rating, { ...context, passportShare: share })).toBe('review')
    expect(ratingAccess(null, rating, { ...context, passportShare: share })).toBe('review')
  })

  it('stops showing when the link is 30 days old, revoked, or for another tenant', () => {
    expect(canView(graham, rating, { now: day(40), passportShare: share })).toBe(false)
    const revoked = { ...share, revokedAt: day(15) }
    expect(canView(graham, rating, { now: day(20), passportShare: revoked })).toBe(false)
    const amysLink = { ...share, tenantId: PEOPLE.amy }
    expect(canView(graham, rating, { now: day(20), passportShare: amysLink })).toBe(false)
  })

  it('gives all or nothing: the passport as a whole follows the same rule', () => {
    expect(canViewPassport(sarah, PEOPLE.sarah, { now: NOW })).toBe(true)
    expect(canViewPassport(graham, PEOPLE.sarah, { now: NOW })).toBe(false)
    expect(canViewPassport(graham, PEOPLE.sarah, { now: NOW, passportShare: share })).toBe(true)
    expect(canViewPassport(null, PEOPLE.sarah, { now: day(41), passportShare: share })).toBe(false)
  })
})

describe('client rating: trade->landlord', () => {
  const rating = makeRating({
    direction: 'trade->landlord',
    raterId: PEOPLE.kev,
    subjectId: PEOPLE.graham,
  })

  it('is for trades, and for the landlord it is about', () => {
    expect(ratingAccess(mhairi, rating, context)).toBe('review')
    expect(ratingAccess(graham, rating, context)).toBe('review')
    expect(ratingAccess(agent, rating, context)).toBe('review')
  })

  it('is hidden from tenants and other landlords', () => {
    expect(ratingAccess(sarah, rating, context)).toBe('none')
    expect(ratingAccess(fiona, rating, context)).toBe('none')
    expect(ratingAccess(null, rating, context)).toBe('none')
  })

  it('applies the same rule to the client rating summary', () => {
    expect(canViewClientRating(mhairi, PEOPLE.graham)).toBe(true)
    expect(canViewClientRating(graham, PEOPLE.graham)).toBe(true)
    expect(canViewClientRating(agent, PEOPLE.graham)).toBe(true)
    expect(canViewClientRating(fiona, PEOPLE.graham)).toBe(false)
    expect(canViewClientRating(sarah, PEOPLE.graham)).toBe(false)
    expect(canViewClientRating(null, PEOPLE.graham)).toBe(false)
  })
})

describe('trade->tenant', () => {
  const rating = (access: 1 | 3 | 5): Rating =>
    makeRating({
      direction: 'trade->tenant',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.sarah,
      answers: { access_given: access, felt_safe: 5, clear_information: 4 },
    })

  it('is private to the tenant', () => {
    expect(ratingAccess(sarah, rating(5), context)).toBe('review')
    expect(ratingAccess(mhairi, rating(5), context)).toBe('none')
    expect(ratingAccess(fiona, rating(5), context)).toBe('none')
    expect(ratingAccess(amy, rating(5), context)).toBe('none')
  })

  it("gives the home's landlord only access given, yes or no", () => {
    expect(ratingAccess(graham, rating(5), context)).toBe('access_given')
    expect(ratingAccess(agent, rating(5), context)).toBe('access_given')
    expect(canView(graham, rating(5), context)).toBe(false)
  })

  it('counts Yes and Partly as yes, No as no', () => {
    expect(accessGiven(rating(5))).toBe(true)
    expect(accessGiven(rating(3))).toBe(true)
    expect(accessGiven(rating(1))).toBe(false)
    expect(accessGiven({ ...rating(1), state: 'sealed' })).toBeNull()
  })

  it('says no for the job if any rated tenant gave no access, and nothing before the reveal', () => {
    const yes = rating(5)
    const no = { ...rating(1), subjectId: PEOPLE.amy }
    expect(accessGivenForJob('job_kitchen_leak', [yes], NOW)).toBe(true)
    expect(accessGivenForJob('job_kitchen_leak', [yes, no], NOW)).toBe(false)
    expect(accessGivenForJob('job_kitchen_leak', [{ ...yes, state: 'sealed' }], NOW)).toBeNull()
    expect(accessGivenForJob('job_other', [yes], NOW)).toBeNull()
  })
})

describe('ratings nobody sees', () => {
  const rating = makeRating({
    direction: 'landlord->trade',
    raterId: PEOPLE.graham,
    subjectId: PEOPLE.kev,
    at: day(0),
  })

  it('hides a removed rating, even from its author', () => {
    const removed = { ...rating, state: 'removed' as const }
    expect(ratingAccess(graham, removed, context)).toBe('none')
    expect(ratingAccess(kev, removed, context)).toBe('none')
  })

  it('hides a restricted rating from everyone but its author', () => {
    const restricted = { ...rating, state: 'restricted' as const }
    expect(ratingAccess(graham, restricted, context)).toBe('author')
    expect(ratingAccess(mhairi, restricted, context)).toBe('none')
  })

  it('hides a rating once it is 36 months old', () => {
    const later = { ...context, now: '2029-03-02T09:00:00.000Z' }
    expect(ratingAccess(mhairi, rating, later)).toBe('none')
    expect(ratingAccess(graham, rating, later)).toBe('none')
  })
})
