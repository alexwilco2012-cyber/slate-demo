// Saving and sending a rating (SPEC §5 rules 1, 2 and 6). A rating can only be given where one is
// owed: after a completed job, or a tenancy both sides confirmed, between people on the record.
// Once sent it is sealed and can never be changed; it is revealed with the others on the same job
// or tenancy (reveal.ts).

import {
  RELATIONSHIPS,
  SCALES,
  type CriterionDef,
  type RatingDirection,
  type RelationshipDef,
} from '@/domain/criteria'
import type {
  ContextRef,
  CriteriaAnswers,
  IsoDateTime,
  PersonId,
  Rating,
  RatingId,
  SensitiveTopic,
  WouldAgain,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import type { FilterOptions } from './filter'
import { fail, pass, type RuleFailure, type RuleResult } from './result'
import { settleRatings } from './reveal'
import { checkLength, checkPublicText } from './text-rules'
import { isBefore } from './time'
import { findOwed, isSubmitted, ratingForSlot, slotKey, type OwedRating } from './unlock'

/** What the rating form sends. Matches RatingInput in the data layer. */
export interface RatingSubmission<D extends RatingDirection = RatingDirection> {
  readonly direction: D
  readonly context: ContextRef
  readonly subjectId: PersonId
  readonly answers: CriteriaAnswers<D>
  /** Optional, 30 to 1,000 characters, shown as "[Role]'s opinion". */
  readonly comment?: string
  /** Seen only by the rater and moderation. */
  readonly privateNote?: string
  /** Never shown to anyone or scored. */
  readonly wouldAgain?: WouldAgain
  readonly safetyFlag?: boolean
}

export interface SubmitContext {
  /** Who is rating: the landlord themselves when their letting agent sends it for them. */
  readonly raterId: PersonId
  /** What everyone owes on this job or tenancy (owedForJob, owedForTenancy). */
  readonly owed: readonly OwedRating[]
  /** Every rating on this job or tenancy, at least. Others pass through untouched. */
  readonly ratings: readonly Rating[]
  readonly now: IsoDateTime
  /** Used when there is no draft to send. */
  readonly newId: RatingId
  /** Names the comment may mention, such as the person being rated. */
  readonly filter?: FilterOptions
}

/** Why a rating goes to moderation. It is published all the same: nobody approves reviews. */
export interface ModerationNeed {
  readonly safetyConcern: boolean
  readonly flaggedTopics: readonly SensitiveTopic[]
}

export interface SubmitOutcome<D extends RatingDirection = RatingDirection> {
  /** As sent: sealed, or already revealed if it was the last one owed. */
  readonly rating: Rating<D>
  /** The ratings passed in with this one added (or its draft replaced), then settled. */
  readonly ratings: Rating[]
  /** Revealed by sending this one, possibly including it. Tell each rated person now. */
  readonly newlyRevealed: RatingId[]
  readonly moderation: ModerationNeed | null
}

export function submitRating<D extends RatingDirection>(
  submission: RatingSubmission<D>,
  context: SubmitContext,
): RuleResult<SubmitOutcome<D>> {
  const opened = openSlot(submission, context)
  if (!opened.ok) return opened
  const { slot, existing } = opened.value

  const answers = checkAnswers(slot.direction, slot.criteria, submission.answers, true)
  const comment = checkPublicText(
    submission.comment,
    { ...RATING_CONFIG.comment, optional: true },
    'comment',
    context.filter,
  )
  const note = checkPrivateNote(submission.privateNote)
  const failures = [answers, comment, note].filter((result) => !result.ok)
  if (failures.length > 0) return combine(failures)
  if (!comment.ok) return comment

  const now = context.now
  const sent: Rating<D> = {
    id: existing?.id ?? context.newId,
    direction: submission.direction,
    raterId: context.raterId,
    subjectId: submission.subjectId,
    context: submission.context,
    propertyId: slot.propertyId,
    seal: slot.seal,
    answers: submission.answers,
    ...(comment.value.text ? { comment: comment.value.text } : {}),
    ...optionalPrivateFields(submission),
    safetyFlag: submission.safetyFlag ?? false,
    state: 'sealed',
    createdAt: existing?.createdAt ?? now,
    submittedAt: now,
    windowClosesAt: slot.closesAt,
    revealAt: null,
    corrections: [],
  }

  const key = slotKey(slot)
  const others = context.ratings.filter(
    (rating) => !(slotKey(rating) === key && !isSubmitted(rating)),
  )
  const settled = settleRatings(context.owed, [...others, sent], now)
  const after = settled.ratings.find((rating) => rating.id === sent.id)
  const rating: Rating<D> = after
    ? {
        ...sent,
        state: after.state,
        revealAt: after.revealAt,
        ...(after.revealedAt ? { revealedAt: after.revealedAt } : {}),
      }
    : sent

  const flaggedTopics = comment.value.filter.issues
    .filter((issue) => issue.action === 'flag')
    .map((issue) => issue.topic)
  const safetyConcern = rating.safetyFlag
  return pass({
    rating,
    ratings: settled.ratings,
    newlyRevealed: settled.newlyRevealed,
    moderation:
      safetyConcern || flaggedTopics.length > 0
        ? { safetyConcern, flaggedTopics: [...new Set(flaggedTopics)] }
        : null,
  })
}

/**
 * Keeps an unsent rating while the window is open. Only length limits and the answers given are
 * checked; the comment filter and required questions wait until it is sent.
 */
export function saveDraft<D extends RatingDirection>(
  submission: RatingSubmission<D>,
  context: Omit<SubmitContext, 'filter'>,
): RuleResult<Rating<D>> {
  const opened = openSlot(submission, context)
  if (!opened.ok) return opened
  const { slot, existing } = opened.value

  const answers = checkAnswers(slot.direction, slot.criteria, submission.answers, false)
  const comment = checkLength(
    submission.comment,
    { maxLength: RATING_CONFIG.comment.maxLength, optional: true },
    'comment',
  )
  const failures = [answers, comment, checkPrivateNote(submission.privateNote)].filter(
    (result) => !result.ok,
  )
  if (failures.length > 0) return combine(failures)

  return pass({
    id: existing?.id ?? context.newId,
    direction: submission.direction,
    raterId: context.raterId,
    subjectId: submission.subjectId,
    context: submission.context,
    propertyId: slot.propertyId,
    seal: slot.seal,
    answers: submission.answers,
    ...(submission.comment?.trim() ? { comment: submission.comment.trim() } : {}),
    ...optionalPrivateFields(submission),
    safetyFlag: submission.safetyFlag ?? false,
    state: 'draft',
    createdAt: existing?.createdAt ?? context.now,
    windowClosesAt: slot.closesAt,
    revealAt: null,
    corrections: [],
  })
}

/** The owed slot this submission fills, and any draft of it, if it may be written now. */
function openSlot(
  submission: RatingSubmission,
  context: Pick<SubmitContext, 'raterId' | 'owed' | 'ratings' | 'now'>,
): RuleResult<{ slot: OwedRating; existing: Rating | undefined }> {
  const identity = {
    direction: submission.direction,
    raterId: context.raterId,
    subjectId: submission.subjectId,
    context: submission.context,
  }
  const slot = findOwed(context.owed, identity)
  if (!slot) {
    return fail(
      'forbidden',
      "There's no rating for you to give here. Ratings open after a completed job, or when a tenancy you both confirmed ends.",
    )
  }
  const existing = ratingForSlot(slot, context.ratings)
  if (existing && isSubmitted(existing)) {
    return fail(
      'already_done',
      "You've already sent this rating. Ratings can't be changed once sent.",
    )
  }
  if (isBefore(context.now, slot.opensAt)) {
    return fail('invalid_state', "This rating isn't open yet.")
  }
  if (!isBefore(context.now, slot.closesAt)) {
    return fail('window_closed', 'The time to leave this rating has ended.')
  }
  return pass({ slot, existing })
}

/**
 * Every answer must be a point on its question's scale, and only questions asked on this
 * occasion may be answered (after a repair, tenant->landlord asks two). When sending, every
 * question must be answered.
 */
export function checkAnswers(
  direction: RatingDirection,
  criteria: readonly CriterionDef[],
  answers: CriteriaAnswers,
  requireAll: boolean,
): RuleResult {
  const given: Partial<Record<string, unknown>> = answers
  const fields: Record<string, string> = {}
  for (const criterion of criteria) {
    const value = given[criterion.id]
    if (value === undefined) {
      if (requireAll) fields[`answers.${criterion.id}`] = 'Choose an answer.'
      continue
    }
    const onScale = SCALES[criterion.scale].some((point) => point.score === value)
    if (!onScale) fields[`answers.${criterion.id}`] = 'Choose one of the answers shown.'
  }
  const asked = new Set(criteria.map((criterion) => criterion.id))
  const relationship: RelationshipDef = RELATIONSHIPS[direction]
  const known = new Set(relationship.criteria.map((criterion) => criterion.id))
  for (const [id, value] of Object.entries(given)) {
    if (value === undefined || asked.has(id)) continue
    fields[`answers.${id}`] = known.has(id)
      ? "This question isn't asked this time."
      : "This question isn't part of this rating."
  }
  return Object.keys(fields).length === 0
    ? pass(true)
    : fail('validation', 'Answer every question to send your rating.', fields)
}

function checkPrivateNote(note: string | undefined): RuleResult<string> {
  const limits = { maxLength: RATING_CONFIG.privateNoteMaxLength, optional: true }
  return checkLength(note, limits, 'privateNote')
}

function optionalPrivateFields(submission: RatingSubmission) {
  const note = submission.privateNote?.trim()
  return {
    ...(note ? { privateNote: note } : {}),
    ...(submission.wouldAgain ? { wouldAgain: submission.wouldAgain } : {}),
  }
}

/** Every field problem at once, so the form can show them together. */
function combine(failures: readonly RuleResult<unknown>[]): RuleFailure {
  const problems = failures.filter((result): result is RuleFailure => !result.ok)
  const fields = problems.reduce<Partial<Record<string, string>>>(
    (all, problem) => ({ ...all, ...problem.fields }),
    {},
  )
  const main = problems.find((problem) => problem.code === 'validation') ?? problems[0]
  return fail(main?.code ?? 'validation', main?.message ?? 'Check the highlighted answers.', fields)
}
