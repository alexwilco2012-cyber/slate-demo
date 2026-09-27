// What moderation may do to a rating (SPEC §6). Reviews publish automatically after the neutral
// checks and nobody approves them on substance. A review is removed, never edited; the only
// changes ever made to its words are fixes for obscenity or typos, and the answers never change.
// Scores are worked out from the ratings on every read, so removing or restricting one changes
// every score it fed straight away.

import type { ContentReport, IsoDateTime, Rating, RatingId, ReportId } from '@/domain/types'
import { RATING_CONFIG } from './config'
import { isAllowedCorrection, type CorrectionReason } from './correction'
import { fail, pass, type RuleResult } from './result'
import { checkLength } from './text-rules'

export type RemovalReason = NonNullable<Rating['removal']>['reason']

/** Takes a rating down for good. Its content is kept untouched for the record. */
export function removeRating(
  rating: Rating,
  removal: { at: IsoDateTime; reason: RemovalReason; reportId?: ReportId },
): RuleResult<Rating> {
  if (rating.state === 'removed') {
    return fail('already_done', 'This review has already been removed.')
  }
  if (rating.state === 'draft') {
    return fail('invalid_state', "A draft isn't published, so it can't be removed.")
  }
  const { restriction: _lifted, ...rest } = rating
  return pass({
    ...rest,
    state: 'removed',
    removal: {
      at: removal.at,
      reason: removal.reason,
      ...(removal.reportId ? { reportId: removal.reportId } : {}),
    },
  })
}

/** Hides a revealed review while a report about it is handled, e.g. a defamation notice. */
export function restrictRating(
  rating: Rating,
  restriction: { reportId: ReportId; at: IsoDateTime },
): RuleResult<Rating> {
  if (rating.state === 'restricted') return fail('already_done', 'This review is already hidden.')
  if (rating.state !== 'revealed') {
    return fail('invalid_state', 'Only a published review can be hidden.')
  }
  return pass({
    ...rating,
    state: 'restricted',
    restriction: { reportId: restriction.reportId, since: restriction.at },
  })
}

/** Puts a restricted review back when the report behind it is not upheld. */
export function liftRestriction(rating: Rating): RuleResult<Rating> {
  if (rating.state !== 'restricted') return fail('invalid_state', "This review isn't hidden.")
  const { restriction: _lifted, ...rest } = rating
  return pass({ ...rest, state: 'revealed' })
}

/**
 * The only edit ever made to a review: moderation masking obscenity or fixing a typo in the
 * comment (see correction.ts). Answers, dates and everything else stay as they were, and the fix
 * is recorded. A bigger change is refused: remove the review instead.
 */
export function correctComment(
  rating: Rating,
  correction: { at: IsoDateTime; reason: CorrectionReason; comment: string },
): RuleResult<Rating> {
  if (rating.state === 'draft' || rating.state === 'removed') {
    return fail('invalid_state', 'Only a sent review can be corrected.')
  }
  if (rating.comment === undefined) return fail('invalid_state', 'This review has no comment.')
  const checked = checkLength(correction.comment, RATING_CONFIG.comment, 'comment')
  if (!checked.ok) return checked
  const comment = checked.value
  if (!isAllowedCorrection(correction.reason, rating.comment, comment)) {
    const message =
      correction.reason === 'obscenity'
        ? 'Obscenity can only be masked with asterisks, letter for letter. To change more, remove the review.'
        : 'A typo fix can only change a letter or two in a few words. To change more, remove the review.'
    return fail('validation', message, { comment: message })
  }
  return pass({
    ...rating,
    comment,
    corrections: [...rating.corrections, { at: correction.at, reason: correction.reason }],
  })
}

/**
 * A suspected-fake report is open, so the review shows a "pending" label. No other kind of
 * report does this (SPEC §6).
 */
export function hasPendingFakeCheck(
  ratingId: RatingId,
  reports: readonly Pick<ContentReport, 'target' | 'route' | 'status'>[],
): boolean {
  return reports.some(
    (report) =>
      report.route === 'fake' &&
      report.status !== 'resolved' &&
      report.target.kind === 'rating' &&
      report.target.ratingId === ratingId,
  )
}
