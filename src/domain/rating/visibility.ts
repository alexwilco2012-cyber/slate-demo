// Who may see a rating (SPEC §5 table, "Visibility" column):
// - public: tenant->landlord, landlord->trade and tenant->trade, to anyone signed in;
// - tenant passport: landlord->tenant, to the tenant and to anyone holding their live share link;
// - trades only: trade->landlord, to any trade and to the landlord it is about;
// - subject only: trade->tenant, to the tenant; the landlord sees only "access given: yes/no".
// The rater always sees their own rating, private fields included. Nobody else sees a draft,
// sealed, restricted, removed or expired rating, and shielded ratings are never shown on their own.

import { RELATIONSHIPS, type CriterionDef, type RelationshipDef } from '@/domain/criteria'
import type {
  IsoDateTime,
  JobId,
  PassportShare,
  PersonId,
  Rating,
  Role,
  ScaleScore,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import { isShareActive } from './passport'
import { isExpired } from './retention'

/** Who is looking. The data layer's Viewer has this shape. */
export interface RatingViewer {
  readonly personId: PersonId
  readonly role: Role
  /** A letting agent working inside this landlord's account (landlord portal only). */
  readonly actingForId?: PersonId
}

/**
 * - author: the rater, who sees everything they wrote, including the private note.
 * - review: the published review, without the private note or the would-again answer.
 * - access_given: the landlord's view of trade->tenant, reduced to yes or no.
 * - none: nothing at all, not even that it exists.
 */
export type RatingAccess = 'author' | 'review' | 'access_given' | 'none'

export interface AccessContext {
  readonly now: IsoDateTime
  /** The landlord of the rating's home, who may see "access given" on trade->tenant. */
  readonly propertyLandlordId?: PersonId
  /** A tenant passport link being opened, possibly by someone who isn't signed in. */
  readonly passportShare?: PassportShare
}

/** The person the viewer acts as: the landlord, for an agent working in their account. */
export function actingAs(viewer: RatingViewer): PersonId {
  return viewer.role === 'landlord' && viewer.actingForId ? viewer.actingForId : viewer.personId
}

/** Pass null for someone who isn't signed in, such as a person opening a passport link. */
export function ratingAccess(
  viewer: RatingViewer | null,
  rating: Rating,
  context: AccessContext,
): RatingAccess {
  if (rating.state === 'removed' || isExpired(rating, context.now)) return 'none'
  const me = viewer ? actingAs(viewer) : null
  if (me === rating.raterId) return 'author'
  if (rating.state !== 'revealed' || rating.seal === 'retaliation_shield') return 'none'

  const relationship: RelationshipDef = RELATIONSHIPS[rating.direction]
  switch (relationship.visibility) {
    case 'public':
      return viewer ? 'review' : 'none'
    case 'tenant_passport': {
      if (me === rating.subjectId) return 'review'
      const share = context.passportShare
      const shared = share?.tenantId === rating.subjectId && isShareActive(share, context.now)
      return shared ? 'review' : 'none'
    }
    case 'trades_only':
      return me === rating.subjectId || viewer?.role === 'trade' ? 'review' : 'none'
    case 'subject_only':
      if (me === rating.subjectId) return 'review'
      if (viewer?.role === 'landlord' && me === context.propertyLandlordId) return 'access_given'
      return 'none'
  }
}

/** Whether the viewer may read the review itself (not just the landlord's yes/no). */
export function canView(
  viewer: RatingViewer | null,
  rating: Rating,
  context: AccessContext,
): boolean {
  const access = ratingAccess(viewer, rating, context)
  return access === 'author' || access === 'review'
}

/** Client ratings are for trades, and for the landlord to see their own (SPEC §5 table). */
export function canViewClientRating(viewer: RatingViewer | null, landlordId: PersonId): boolean {
  if (!viewer) return false
  return viewer.role === 'trade' || (viewer.role === 'landlord' && actingAs(viewer) === landlordId)
}

/**
 * The tenant passport is never public. The tenant sees all of it, and so does anyone holding
 * the tenant's live share link. There is no partial view.
 */
export function canViewPassport(
  viewer: RatingViewer | null,
  tenantId: PersonId,
  context: Pick<AccessContext, 'now' | 'passportShare'>,
): boolean {
  if (viewer?.personId === tenantId) return true
  const share = context.passportShare
  return share?.tenantId === tenantId && isShareActive(share, context.now)
}

const TRADE_RATES_TENANT: readonly CriterionDef[] = RELATIONSHIPS['trade->tenant'].criteria
const ACCESS_GIVEN_ID = TRADE_RATES_TENANT.find((c) => c.landlordSeesAsYesNo)?.id ?? 'access_given'

/**
 * The landlord's yes/no from one revealed trade->tenant rating: Yes and Partly are yes, No is no
 * (RATING_CONFIG.accessGivenMinScore). Null when the rating isn't revealed or doesn't answer it.
 */
export function accessGiven(rating: Rating): boolean | null {
  if (rating.direction !== 'trade->tenant' || rating.state !== 'revealed') return null
  const answers: Partial<Record<string, ScaleScore>> = rating.answers
  const answer = answers[ACCESS_GIVEN_ID]
  return answer === undefined ? null : answer >= RATING_CONFIG.accessGivenMinScore
}

/**
 * The yes/no a landlord sees for a job. Where the trade rated several tenants, it is no if any
 * of them says no. Null until one is revealed.
 */
export function accessGivenForJob(
  jobId: JobId,
  ratings: readonly Rating[],
  now: IsoDateTime,
): boolean | null {
  const answers = ratings
    .filter((rating) => rating.context.kind === 'job' && rating.context.jobId === jobId)
    .filter((rating) => !isExpired(rating, now))
    .map(accessGiven)
    .filter((answer) => answer !== null)
  return answers.length === 0 ? null : answers.every(Boolean)
}
