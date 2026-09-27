// A revealed rating as other people see it. The private note, the "would you … again?" answer,
// the safety flag and the rater's identity never leave this function: reviewers appear as
// "Verified tenant · AB10 · 2025", never by name (SPEC §5 rules 6 and 9).

import type {
  ContentReport,
  DisputeNote,
  PostcodeDistrict,
  PublicReview,
  Rating,
  RatingUpdate,
  Reply,
  ReviewContext,
  ReviewerLabel,
} from '@/domain/types'
import { hasPendingFakeCheck } from './moderation'
import { reviewDate } from './retention'
import { raterRole } from './roles'
import { reviewScore } from './scoring'
import { isShielded } from './shield'

export function reviewerLabel(
  rating: Pick<Rating, 'direction' | 'submittedAt' | 'createdAt'>,
  district: PostcodeDistrict,
): ReviewerLabel {
  return {
    role: raterRole(rating.direction),
    postcodeDistrict: district,
    year: new Date(reviewDate(rating)).getUTCFullYear(),
  }
}

export interface PublicReviewParts {
  /** The postcode district to show for the reviewer, normally the home's (e.g. 'AB10'). */
  readonly district: PostcodeDistrict
  readonly context: ReviewContext
  readonly replies?: readonly Reply[]
  readonly updates?: readonly RatingUpdate[]
  readonly disputes?: readonly DisputeNote[]
  readonly reports?: readonly Pick<ContentReport, 'target' | 'route' | 'status'>[]
}

/**
 * The public face of a revealed rating, or null for anything that isn't shown on its own:
 * drafts, sealed, restricted and removed ratings, and per-repair ratings held by the shield.
 * Who may see the result is a separate question (visibility.ts).
 */
export function toPublicReview(rating: Rating, parts: PublicReviewParts): PublicReview | null {
  if (rating.state !== 'revealed' || isShielded(rating)) return null
  const score = reviewScore(rating)
  if (score === null) return null
  const reply = parts.replies?.find((r) => r.ratingId === rating.id && r.state === 'published')
  const update = parts.updates?.find((u) => u.ratingId === rating.id && u.state === 'published')
  const dispute = parts.disputes?.find((d) => d.ratingId === rating.id)
  return {
    ratingId: rating.id,
    direction: rating.direction,
    subjectId: rating.subjectId,
    propertyId: rating.propertyId,
    reviewer: reviewerLabel(rating, parts.district),
    context: parts.context,
    answers: { ...rating.answers },
    score,
    ...(rating.comment ? { comment: rating.comment } : {}),
    revealedAt: rating.revealedAt ?? reviewDate(rating),
    ...(reply ? { reply } : {}),
    ...(update ? { update } : {}),
    ...(dispute ? { dispute } : {}),
    pendingFakeCheck: hasPendingFakeCheck(rating.id, parts.reports ?? []),
    corrected: rating.corrections.length > 0,
  }
}
