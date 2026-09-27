import {
  addDays,
  addMonths,
  earliestOf,
  expiredRatingIds,
  expiresAt,
  holdsContent,
  isExpired,
  latest,
  monthsBetween,
  purgeExpired,
  ratingsToPurge,
} from '@/domain/rating'
import type { Rating } from '@/domain/types'
import { PEOPLE, makeRating } from './fixtures'

describe('dates', () => {
  it('adds calendar months, keeping to the last day of a short month', () => {
    expect(addMonths('2026-01-31T10:00:00.000Z', 1)).toBe('2026-02-28T10:00:00.000Z')
    expect(addMonths('2028-01-31T10:00:00.000Z', 1)).toBe('2028-02-29T10:00:00.000Z')
    expect(addMonths('2026-09-26T10:00:00.000Z', -12)).toBe('2025-09-26T10:00:00.000Z')
  })

  it('counts months between two dates, with the part month as a fraction', () => {
    expect(monthsBetween('2025-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z')).toBe(12)
    expect(monthsBetween('2026-01-01T00:00:00.000Z', '2026-01-16T12:00:00.000Z')).toBeCloseTo(
      15.5 / 31,
    )
    expect(monthsBetween('2026-09-26T10:00:00.000Z', '2025-09-26T10:00:00.000Z')).toBe(-12)
  })

  it('picks the earliest and latest instants', () => {
    expect(latest('2026-03-02T09:00:00.000Z', '2026-03-05T09:00:00.000Z')).toBe(
      '2026-03-05T09:00:00.000Z',
    )
    expect(earliestOf(['2026-03-05T09:00:00.000Z', '2026-03-02T09:00:00.000Z'])).toBe(
      '2026-03-02T09:00:00.000Z',
    )
    expect(earliestOf([])).toBeNull()
    expect(addDays('2026-03-02T09:00:00.000Z', 14)).toBe('2026-03-16T09:00:00.000Z')
  })

  it('rejects text that is not a date', () => {
    expect(() => addDays('next Tuesday', 1)).toThrow(RangeError)
  })
})

describe('36-month retention', () => {
  const rating = makeRating({
    direction: 'landlord->trade',
    raterId: PEOPLE.graham,
    subjectId: PEOPLE.kev,
    at: '2026-03-02T09:00:00.000Z',
  })

  it('expires a review 36 months after it was written', () => {
    expect(expiresAt(rating)).toBe('2029-03-02T09:00:00.000Z')
    expect(isExpired(rating, '2029-03-02T08:59:59.999Z')).toBe(false)
    expect(isExpired(rating, '2029-03-02T09:00:00.000Z')).toBe(true)
  })

  it('lists expired reviews for deletion, skipping ones already removed', () => {
    const removed = { ...rating, id: 'rating_removed' as const, state: 'removed' as const }
    const fresh = makeRating({
      direction: 'landlord->trade',
      raterId: PEOPLE.graham,
      subjectId: PEOPLE.kev,
      at: '2028-01-10T09:00:00.000Z',
    })
    expect(expiredRatingIds([rating, removed, fresh], '2029-06-01T00:00:00.000Z')).toEqual([
      rating.id,
    ])
  })

  it('deletes what an expired review said, not just hides it (rule 12)', () => {
    const wordy: Rating = {
      ...rating,
      comment: 'In my experience he was quick and tidy, and the price matched.',
      privateNote: 'Would use again for small jobs.',
      wouldAgain: 'yes',
    }
    const removedEarlier: Rating = {
      ...wordy,
      id: 'rating_removed_earlier',
      state: 'removed',
      removal: { at: '2027-01-01T00:00:00.000Z', reason: 'report_upheld' },
    }
    const later = '2029-06-01T00:00:00.000Z'
    expect(ratingsToPurge([wordy, removedEarlier], '2029-03-01T00:00:00.000Z')).toEqual([])
    expect(ratingsToPurge([wordy, removedEarlier], later)).toEqual([wordy.id, removedEarlier.id])

    const purged = purgeExpired(wordy, later)
    expect(purged).toMatchObject({
      id: wordy.id,
      state: 'removed',
      answers: {},
      removal: { at: later, reason: 'expired' },
    })
    for (const field of ['comment', 'privateNote', 'wouldAgain']) {
      expect(purged).not.toHaveProperty(field)
    }
    expect(holdsContent(purged)).toBe(false)
    expect(ratingsToPurge([purged], later)).toEqual([])
    expect(purgeExpired(removedEarlier, later).removal?.reason).toBe('report_upheld')
  })
})
