import { helpfulReviewerCount, helpfulReviewerText } from '@/domain/rating'
import { PEOPLE, TENANCY, day, makeRating } from './fixtures'

describe('"Helpful reviewer" count badge', () => {
  const bySarah = (overrides: Partial<Parameters<typeof makeRating>[0]> = {}) =>
    makeRating({
      direction: 'tenant->trade',
      raterId: PEOPLE.sarah,
      subjectId: PEOPLE.kev,
      ...overrides,
    })

  it('counts published reviews, whatever they said', () => {
    const ratings = [
      bySarah({ score: 5 }),
      bySarah({ score: 1 }),
      makeRating({
        direction: 'tenant->landlord',
        raterId: PEOPLE.sarah,
        subjectId: PEOPLE.graham,
        context: TENANCY,
        score: 2,
      }),
      bySarah({ raterId: PEOPLE.amy }),
    ]
    expect(helpfulReviewerCount(PEOPLE.sarah, ratings, day(10))).toBe(3)
    expect(helpfulReviewerText(3)).toBe('Helpful reviewer · 3 reviews')
    expect(helpfulReviewerText(1)).toBe('Helpful reviewer · 1 review')
    expect(helpfulReviewerText(0)).toBeNull()
  })

  it('leaves out sealed, removed, expired and per-repair ratings', () => {
    const ratings = [
      bySarah({ state: 'sealed', revealedAt: undefined }),
      bySarah({ state: 'removed' }),
      bySarah({ at: '2022-01-10T09:00:00.000Z' }),
      makeRating({
        direction: 'tenant->landlord',
        raterId: PEOPLE.sarah,
        subjectId: PEOPLE.graham,
        seal: 'retaliation_shield',
        state: 'sealed',
        revealedAt: undefined,
        answers: { fixed_quickly: 4, kept_informed: 4 },
      }),
    ]
    expect(helpfulReviewerCount(PEOPLE.sarah, ratings, day(10))).toBe(0)
  })
})
