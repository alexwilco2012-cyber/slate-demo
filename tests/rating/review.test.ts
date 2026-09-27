import { reviewerLabel, toPublicReview, type PublicReviewParts } from '@/domain/rating'
import type { Rating } from '@/domain/types'
import { PEOPLE, TENANCY, day, makeRating } from './fixtures'

const rating: Rating = makeRating({
  direction: 'tenant->landlord',
  raterId: PEOPLE.sarah,
  subjectId: PEOPLE.graham,
  context: TENANCY,
  comment: 'In my experience repairs were slow but he was always polite about it.',
  privateNote: 'I would not rent from him again.',
  wouldAgain: 'no',
  safetyFlag: true,
  at: '2025-11-20T10:00:00.000Z',
})

const parts: PublicReviewParts = {
  district: 'AB10',
  context: { kind: 'tenancy', startDate: '2024-06-01', endDate: '2025-10-31' },
}

describe('public review', () => {
  it('never carries the private note, the would-again answer, the flag or who wrote it', () => {
    const review = toPublicReview(rating, parts)
    expect(review).not.toBeNull()
    const text = JSON.stringify(review)
    expect(text).not.toContain('would not rent')
    expect(text).not.toContain(PEOPLE.sarah)
    for (const key of ['privateNote', 'wouldAgain', 'safetyFlag', 'raterId']) {
      expect(Object.keys(review ?? {})).not.toContain(key)
    }
  })

  it('shows the reviewer as "Verified tenant · AB10 · 2025"', () => {
    expect(toPublicReview(rating, parts)?.reviewer).toEqual({
      role: 'tenant',
      postcodeDistrict: 'AB10',
      year: 2025,
    })
    expect(reviewerLabel(rating, 'AB10').role).toBe('tenant')
  })

  it('carries the score, comment, and the published reply, update and dispute', () => {
    const review = toPublicReview(rating, {
      ...parts,
      replies: [
        {
          id: 'reply_old',
          ratingId: rating.id,
          authorId: PEOPLE.graham,
          body: 'Removed one.',
          postedAt: day(1),
          state: 'removed',
        },
        {
          id: 'reply_1',
          ratingId: rating.id,
          authorId: PEOPLE.graham,
          body: 'Thank you.',
          postedAt: day(2),
          state: 'published',
        },
      ],
      updates: [
        {
          id: 'update_1',
          ratingId: 'rating_other',
          authorId: PEOPLE.sarah,
          body: 'Not this one.',
          postedAt: day(2),
          state: 'published',
        },
      ],
      disputes: [
        { id: 'dispute_1', ratingId: rating.id, authorId: PEOPLE.graham, createdAt: day(3) },
      ],
    })
    expect(review).toMatchObject({
      score: 4,
      comment: rating.comment,
      reply: { id: 'reply_1' },
      dispute: { id: 'dispute_1' },
      pendingFakeCheck: false,
      corrected: false,
    })
    expect(review?.update).toBeUndefined()
  })

  it('shows the "pending" label and the corrected mark when they apply', () => {
    const corrected = { ...rating, corrections: [{ at: day(1), reason: 'typo' as const }] }
    const review = toPublicReview(corrected, {
      ...parts,
      reports: [
        { target: { kind: 'rating', ratingId: rating.id }, route: 'fake', status: 'received' },
      ],
    })
    expect(review).toMatchObject({ pendingFakeCheck: true, corrected: true })
  })

  it('is null for anything not shown on its own', () => {
    for (const state of ['draft', 'sealed', 'restricted', 'removed'] as const) {
      expect(toPublicReview({ ...rating, state }, parts)).toBeNull()
    }
    expect(toPublicReview({ ...rating, seal: 'retaliation_shield' }, parts)).toBeNull()
  })
})
