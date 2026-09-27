// What people can add to a review once it is revealed (SPEC §5 rule 8). The rating itself never
// changes; these sit alongside it.
// - The rated person: one public reply (up to 500 characters, within 30 days of the reveal), and
//   a visible "[Role] disputes this" note. They can also report it (reports.ts).
// - The reviewer: one dated update.
// Callers pass the person acting, so a letting agent replies as the landlord they work for.

import type {
  DisputeNote,
  IsoDateTime,
  PersonId,
  Rating,
  RatingUpdate,
  Reply,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import type { FilterOptions } from './filter'
import { fail, pass, type RuleResult } from './result'
import { isShielded } from './shield'
import { checkPublicText, type CheckedText } from './text-rules'
import { addDays, isBefore } from './time'

/** The last moment for the rated person's reply, or null before the reveal. */
export function replyClosesAt(rating: Pick<Rating, 'revealedAt'>): IsoDateTime | null {
  return rating.revealedAt ? addDays(rating.revealedAt, RATING_CONFIG.reply.withinDays) : null
}

export interface ReplyCheck {
  readonly rating: Rating
  readonly authorId: PersonId
  readonly body: string
  readonly now: IsoDateTime
  /** Replies already on this review. Only a published one uses up the one reply. */
  readonly existing: readonly Pick<Reply, 'ratingId' | 'state'>[]
  readonly filter?: FilterOptions
  /**
   * The reviewer's name, which the reply may never contain: a reply naming them would undo the
   * "Verified tenant · AB10 · 2025" label (SPEC §5 rule 9). Always pass it.
   */
  readonly reviewerName?: string
}

export function checkReply(check: ReplyCheck): RuleResult<CheckedText> {
  const { rating, authorId, now } = check
  if (authorId !== rating.subjectId) {
    return fail('forbidden', 'Only the person this review is about can reply to it.')
  }
  const visible = checkRevealed(rating)
  if (!visible.ok) return visible
  if (check.existing.some((reply) => reply.ratingId === rating.id && reply.state === 'published')) {
    return fail('already_done', "You've already replied to this review. You can reply once.")
  }
  const closesAt = replyClosesAt(rating)
  if (closesAt === null || !isBefore(now, closesAt)) {
    return fail(
      'window_closed',
      `Replies must be posted within ${RATING_CONFIG.reply.withinDays} days of the review appearing.`,
    )
  }
  const blockedNames = [...(check.filter?.blockedNames ?? [])]
  if (check.reviewerName) blockedNames.push(check.reviewerName)
  return checkPublicText(check.body, { maxLength: RATING_CONFIG.reply.maxLength }, 'body', {
    ...check.filter,
    blockedNames,
  })
}

export interface UpdateCheck {
  readonly rating: Rating
  readonly authorId: PersonId
  readonly body: string
  readonly existing: readonly Pick<RatingUpdate, 'ratingId' | 'state'>[]
  readonly filter?: FilterOptions
}

/** The reviewer's one dated update, e.g. "Six months on, the leak came back". */
export function checkUpdate(check: UpdateCheck): RuleResult<CheckedText> {
  const { rating, authorId } = check
  if (authorId !== rating.raterId) {
    return fail('forbidden', 'Only the person who wrote this review can add an update.')
  }
  const visible = checkRevealed(rating)
  if (!visible.ok) return visible
  if (
    check.existing.some((update) => update.ratingId === rating.id && update.state === 'published')
  ) {
    return fail('already_done', "You've already added an update. You can add one.")
  }
  return checkPublicText(check.body, RATING_CONFIG.update, 'body', check.filter)
}

export interface DisputeCheck {
  readonly rating: Rating
  readonly authorId: PersonId
  readonly existing: readonly Pick<DisputeNote, 'ratingId'>[]
}

export function checkDispute(check: DisputeCheck): RuleResult {
  const { rating, authorId } = check
  if (authorId !== rating.subjectId) {
    return fail('forbidden', 'Only the person this review is about can dispute it.')
  }
  const visible = checkRevealed(rating)
  if (!visible.ok) return visible
  if (check.existing.some((dispute) => dispute.ratingId === rating.id)) {
    return fail('already_done', "You've already marked this review as disputed.")
  }
  return pass(true)
}

/** Replies, updates and disputes only ever sit on a review people can see. */
function checkRevealed(rating: Rating): RuleResult {
  if (rating.state === 'restricted') {
    return fail('invalid_state', 'This review is hidden while a report about it is looked at.')
  }
  if (rating.state !== 'revealed' || isShielded(rating)) {
    return fail('invalid_state', "This review isn't showing, so there's nothing to respond to.")
  }
  return pass(true)
}
