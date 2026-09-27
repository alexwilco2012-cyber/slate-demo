// Reviews stop counting and are deleted 36 months after they were written (SPEC §5 rule 12).
// The same date drives the recency weight, so a review's weight reaches zero as it expires.

import type { IsoDateTime, Rating, RatingId } from '@/domain/types'
import { RATING_CONFIG } from './config'
import { addMonths, isBefore } from './time'

/** When the review was written: when it was sent, or when it was started if it never was. */
export function reviewDate(rating: Pick<Rating, 'submittedAt' | 'createdAt'>): IsoDateTime {
  return rating.submittedAt ?? rating.createdAt
}

export function expiresAt(rating: Pick<Rating, 'submittedAt' | 'createdAt'>): IsoDateTime {
  return addMonths(reviewDate(rating), RATING_CONFIG.retentionMonths)
}

export function isExpired(
  rating: Pick<Rating, 'submittedAt' | 'createdAt'>,
  now: IsoDateTime,
): boolean {
  return !isBefore(now, expiresAt(rating))
}

/** Ratings to delete now, with removal reason 'expired'. */
export function expiredRatingIds(ratings: readonly Rating[], now: IsoDateTime): RatingId[] {
  return ratings
    .filter((rating) => rating.state !== 'removed' && isExpired(rating, now))
    .map((rating) => rating.id)
}

/** Whether a rating still holds anything the reviewer said. */
export function holdsContent(rating: Rating): boolean {
  return (
    rating.comment !== undefined ||
    rating.privateNote !== undefined ||
    rating.wouldAgain !== undefined ||
    Object.keys(rating.answers).length > 0
  )
}

/**
 * Expired ratings whose words are still stored, including ones moderation removed earlier and
 * kept for the record: at 36 months everything goes (purgeExpired).
 */
export function ratingsToPurge(ratings: readonly Rating[], now: IsoDateTime): RatingId[] {
  return ratings
    .filter((rating) => isExpired(rating, now) && holdsContent(rating))
    .map((rating) => rating.id)
}

/**
 * Deletes what an expired rating said: answers, comment, private note and the would-again
 * answer. What is left only records that a rating was once given, so the slot stays used and
 * the rater can't rate that job or tenancy again. An earlier removal keeps its reason.
 */
export function purgeExpired(rating: Rating, at: IsoDateTime): Rating {
  const {
    comment: _comment,
    privateNote: _note,
    wouldAgain: _again,
    restriction: _restriction,
    ...kept
  } = rating
  return {
    ...kept,
    answers: {},
    safetyFlag: false,
    state: 'removed',
    removal: rating.removal ?? { at, reason: 'expired' },
  }
}
