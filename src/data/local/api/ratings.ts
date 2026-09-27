// Ratings: what each person owes, drafting and sending, the reviews others may see, scores, and
// the rated person's reply, the reviewer's update and the dispute note. Every rule comes from
// the rating engine; this file checks who is asking, feeds the engine the records, saves what it
// returns and tells the people who need to know.

import type { RatingInput, RatingTask, ReviewDetail, SlateApi, Viewer } from '@/data/api'
import { RATING_DIRECTIONS, type RatingDirection } from '@/domain/criteria'
import { newId } from '@/domain/ids'
import type { PersonId, Rating } from '@/domain/types'
import { forbidden, landlordSide, notFound, requireJob, resolveViewer, type Actor } from '../access'
import { formatDeadline } from '../dates'
import { hrefs } from '../hrefs'
import { firstName, notify } from '../notify'
import {
  accessGivenForJob,
  actingAs,
  canViewClientRating,
  checkDispute,
  checkReply,
  checkText,
  checkUpdate,
  findOwed,
  isSubmitted,
  isWindowOpen,
  ratingAccess,
  ratingForSlot,
  replyClosesAt,
  ratingTasksFor,
  raterRole,
  reverseDirection,
  saveDraft,
  subjectRole,
  submitRating,
  type OwedRating,
} from '@/domain/rating'
import { accessContext, reviewsFor } from '../reviews'
import { orThrow } from '../rule-result'
import { clientRating, landlordScore, tradeScore } from '../scores'
import { allOwed } from '../settle'
import type { Draft, Reader } from '../tx'
import { requireOneOf } from '../validate'
import { publicReview } from '../views'
import type { LocalContext } from './context'
import { BRAND } from '@/config/brand'

type RatingMethods =
  | 'listRatingTasks'
  | 'listMyRatings'
  | 'getRating'
  | 'getReview'
  | 'saveRatingDraft'
  | 'submitRating'
  | 'checkText'
  | 'listReviews'
  | 'getLandlordScore'
  | 'getTradeScore'
  | 'getClientRating'
  | 'getAccessGiven'
  | 'replyToReview'
  | 'addReviewUpdate'
  | 'disputeReview'

/** Who hears about a rating on someone's behalf: a landlord's agents as well as the landlord. */
function recipientsFor(db: Reader, personId: PersonId, propertyId: string): PersonId[] {
  const property = db.get('properties', propertyId)
  if (!property || property.landlordId !== personId) return [personId]
  return landlordSide(db, property)
}

/** Names a comment may mention: the person being rated, e.g. "Kev fixed it in an hour". */
function namesOf(db: Reader, ...ids: PersonId[]): string[] {
  return ids.flatMap((id) => {
    const name = db.get('people', id)?.displayName
    return name ? [name] : []
  })
}

/** The reviewer's name, which a reply may never contain (they appear only as "Verified tenant"). */
function reviewerNameOf(db: Reader, rating: Rating): { reviewerName?: string } {
  const name = db.get('people', rating.raterId)?.displayName
  return name ? { reviewerName: name } : {}
}

function checkPortal(actor: Actor, input: RatingInput): void {
  const direction = requireOneOf(
    input.direction,
    RATING_DIRECTIONS,
    'direction',
    `That is not a kind of rating ${BRAND.name} has.`,
  )
  if (raterRole(direction) !== actor.role) {
    throw forbidden(`Use the ${raterRole(direction)} portal to leave this rating.`)
  }
}

function writeRating(tx: Draft, viewer: Viewer, input: RatingInput, send: boolean): Rating {
  const actor = resolveViewer(tx, viewer)
  checkPortal(actor, input)
  const context = {
    raterId: actor.actingAs,
    owed: allOwed(tx),
    ratings: tx.rows('ratings'),
    now: tx.now,
    newId: newId('rating'),
  }
  if (!send) return tx.put('ratings', orThrow(saveDraft(input, context)))

  const outcome = orThrow(
    submitRating(input, { ...context, filter: { allowedNames: namesOf(tx, input.subjectId) } }),
  )
  // Saved as sent. The reveal, and telling everyone about it, happens when the change settles,
  // the same way for every change.
  const { revealedAt: _revealed, ...sent } = outcome.rating
  const saved = tx.put('ratings', { ...sent, state: 'sealed', revealAt: null })
  const slot = findOwed(context.owed, {
    direction: saved.direction,
    raterId: saved.raterId,
    subjectId: saved.subjectId,
    context: saved.context,
  })
  if (slot) promptCounterpart(tx, slot)
  return saved
}

/** "Leave yours to see what they said about you", to the other side if they still owe theirs. */
function promptCounterpart(tx: Draft, slot: OwedRating): void {
  const theirSlot = findOwed(allOwed(tx), {
    direction: reverseDirection(slot.direction),
    raterId: slot.subjectId,
    subjectId: slot.raterId,
    context: slot.context,
  })
  if (!theirSlot || !isWindowOpen(theirSlot, tx.now)) return
  const theirs = ratingForSlot(theirSlot, tx.rows('ratings'))
  if (theirs && isSubmitted(theirs)) return
  const role = raterRole(theirSlot.direction)
  notify(tx, {
    to: recipientsFor(tx, theirSlot.raterId, theirSlot.propertyId),
    role,
    kind: 'rating_reminder',
    title: `${firstName(tx, slot.raterId)} has rated you`,
    body: `Leave yours to see what they said about you. Both stay hidden until then, or until your window closes ${formatDeadline(theirSlot.closesAt)}.`,
    href: hrefs.ratings(role),
  })
}

function ratingOrThrow(db: Reader, ratingId: string): Rating {
  const rating = db.get('ratings', ratingId)
  if (!rating) throw notFound('review')
  return rating
}

export function ratingsApi(ctx: LocalContext): Pick<SlateApi, RatingMethods> {
  const fresh = <D extends RatingDirection>(id: string): Rating<D> => {
    const rating = ctx.read().get('ratings', id)
    if (!rating) throw notFound('rating')
    // Saved a moment ago from input of direction D.
    return rating as Rating<D>
  }

  return {
    async listRatingTasks(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const tasks: RatingTask[] = ratingTasksFor(
        actor.actingAs,
        allOwed(db),
        db.rows('ratings'),
        db.now,
      )
        .filter((task) => raterRole(task.direction) === actor.role)
        .map((task) => ({ ...task }))
      const done = (task: RatingTask) => (task.status === 'submitted' ? 1 : 0)
      return tasks.sort((a, b) => done(a) - done(b) || a.closesAt.localeCompare(b.closesAt))
    },

    async listMyRatings(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('ratings')
        .filter((r) => r.raterId === actor.actingAs && raterRole(r.direction) === actor.role)
        .filter((r) => r.state !== 'removed')
        .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
    },

    async getRating(viewer, ratingId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      const rating = db.get('ratings', ratingId)
      if (!rating) return null
      // Only the author: anyone else's copy would carry the rater's id, and reviewers are never
      // named (SPEC §5 rule 9). Others read reviews through getReview.
      return ratingAccess(viewer, rating, accessContext(db, rating)) === 'author' ? rating : null
    },

    async getReview(viewer, ratingId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const rating = db.get('ratings', ratingId)
      if (!rating) return null
      const access = ratingAccess(viewer, rating, accessContext(db, rating))
      if (access !== 'author' && access !== 'review') return null
      const review = publicReview(db, rating)
      if (!review) return null
      const mine = access === 'author'
      const aboutMe =
        actingAs(viewer) === rating.subjectId && subjectRole(rating.direction) === actor.role
      const closesAt = aboutMe ? replyClosesAt(rating) : null
      const canReply =
        aboutMe &&
        !review.reply &&
        closesAt !== null &&
        db.now < closesAt &&
        rating.state === 'revealed'
      const detail: ReviewDetail = {
        review,
        mine,
        aboutMe,
        can: {
          reply: canReply,
          dispute: aboutMe && !review.dispute,
          update: mine && !review.update,
          report: !mine,
        },
        replyClosesAt: canReply ? closesAt : null,
      }
      if (mine) detail.rating = rating
      return detail
    },

    async saveRatingDraft(viewer, input) {
      const id = ctx.write((tx) => writeRating(tx, viewer, input, false).id)
      return fresh(id)
    },

    async submitRating(viewer, input) {
      const id = ctx.write((tx) => writeRating(tx, viewer, input, true).id)
      return fresh(id)
    },

    async checkText(text) {
      return checkText(text)
    },

    async listReviews(viewer, query) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      return reviewsFor(db, viewer, query)
    },

    async getLandlordScore(viewer, query) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      return landlordScore(db, query)
    },

    async getTradeScore(viewer, tradeId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      return tradeScore(db, tradeId)
    },

    async getClientRating(viewer, landlordId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      if (!canViewClientRating(viewer, landlordId)) {
        throw forbidden('Client ratings are shown to trades, and to the landlord themselves.')
      }
      return clientRating(db, landlordId)
    },

    async getAccessGiven(viewer, jobId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const { side } = requireJob(db, actor, jobId)
      if (side !== 'landlord') throw forbidden('Only the landlord sees whether access was given.')
      return accessGivenForJob(jobId, db.rows('ratings'), db.now)
    },

    async replyToReview(viewer, ratingId, body) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const rating = ratingOrThrow(tx, ratingId)
        if (subjectRole(rating.direction) !== actor.role) {
          throw forbidden(`Use the ${subjectRole(rating.direction)} portal to reply to this.`)
        }
        const checked = orThrow(
          checkReply({
            rating,
            authorId: actor.actingAs,
            body,
            now: tx.now,
            existing: tx.rows('replies'),
            filter: { allowedNames: namesOf(tx, actor.actingAs) },
            ...reviewerNameOf(tx, rating),
          }),
        )
        const reply = tx.put('replies', {
          id: newId('reply'),
          ratingId: rating.id,
          authorId: actor.actingAs,
          body: checked.text,
          postedAt: tx.now,
          state: 'published',
        })
        const role = raterRole(rating.direction)
        notify(tx, {
          to: recipientsFor(tx, rating.raterId, rating.propertyId),
          role,
          kind: 'review_reply',
          title: 'Your review has a reply',
          href: hrefs.review(role, rating.id),
          ref: { entity: 'reply', id: reply.id },
        })
        return reply
      })
    },

    async addReviewUpdate(viewer, ratingId, body) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const rating = ratingOrThrow(tx, ratingId)
        if (raterRole(rating.direction) !== actor.role) {
          throw forbidden(`Use the ${raterRole(rating.direction)} portal to update this.`)
        }
        const checked = orThrow(
          checkUpdate({
            rating,
            authorId: actor.actingAs,
            body,
            existing: tx.rows('updates'),
            filter: { allowedNames: namesOf(tx, rating.subjectId) },
          }),
        )
        const update = tx.put('updates', {
          id: newId('update'),
          ratingId: rating.id,
          authorId: actor.actingAs,
          body: checked.text,
          postedAt: tx.now,
          state: 'published',
        })
        const role = subjectRole(rating.direction)
        notify(tx, {
          to: recipientsFor(tx, rating.subjectId, rating.propertyId),
          role,
          kind: 'review_update',
          title: 'A review of you has a dated update',
          href: hrefs.review(role, rating.id),
          ref: { entity: 'update', id: update.id },
        })
        return update
      })
    },

    async disputeReview(viewer, ratingId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const rating = ratingOrThrow(tx, ratingId)
        if (subjectRole(rating.direction) !== actor.role) {
          throw forbidden(`Use the ${subjectRole(rating.direction)} portal to dispute this.`)
        }
        orThrow(checkDispute({ rating, authorId: actor.actingAs, existing: tx.rows('disputes') }))
        const dispute = tx.put('disputes', {
          id: newId('dispute'),
          ratingId: rating.id,
          authorId: actor.actingAs,
          createdAt: tx.now,
        })
        const role = raterRole(rating.direction)
        notify(tx, {
          to: recipientsFor(tx, rating.raterId, rating.propertyId),
          role,
          kind: 'review_disputed',
          title: `The ${subjectRole(rating.direction)} you reviewed disputes your review`,
          body: 'Your review stays up, with a note saying they dispute it.',
          href: hrefs.review(role, rating.id),
          ref: { entity: 'dispute', id: dispute.id },
        })
        return dispute
      })
    },
  }
}
