// The retaliation shield (SPEC §5 rule 4). A tenant's per-repair ratings of their current landlord
// are never shown one by one, not even to the landlord. They only join the landlord's aggregate:
// - once the rater's tenancy has finished its end-of-tenancy reveal, so the landlord can't work
//   them out from a moving score while still able to rate that tenant; or
// - once the landlord has 5+ different tenant raters, and then only in batches: at the start of
//   the 1st of each month, and only when at least two different tenants' ratings are waiting.
//   One tenant's answers never move the score on their own, so nobody can read them by
//   comparing the score before and after a release.
// Release is worked out on every read. If removals or expiry take a landlord back under 5, the
// ratings of tenants still living there go back behind the shield: it fails safe for tenants.

import type {
  IsoDateTime,
  Job,
  PersonId,
  Rating,
  RatingId,
  Tenancy,
  TenancyId,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import { isExpired } from './retention'
import { contextSettledAt } from './reveal'
import { fromMs, toMs } from './time'
import { isSubmitted, type OwedRating } from './unlock'

export function isShielded(rating: Rating): boolean {
  return rating.seal === 'retaliation_shield'
}

/** When a rating joined the aggregate, or null if it isn't in it. */
function inAggregateSince(rating: Rating): IsoDateTime | null {
  if (isShielded(rating)) return rating.state === 'sealed' ? (rating.submittedAt ?? null) : null
  if (rating.state !== 'revealed') return null
  return rating.revealedAt ?? rating.submittedAt ?? null
}

/**
 * Different tenants whose ratings of this landlord sit in the aggregate at `at`: revealed
 * end-of-tenancy ratings plus sealed per-repair ones. One tenant with many ratings counts once.
 */
export function distinctTenantRaters(
  ratings: readonly Rating[],
  landlordId: PersonId,
  at: IsoDateTime,
): number {
  const raters = new Set<PersonId>()
  const atMs = toMs(at)
  for (const rating of ratings) {
    if (rating.direction !== 'tenant->landlord' || rating.subjectId !== landlordId) continue
    if (!isSubmitted(rating) || isExpired(rating, at)) continue
    const since = inAggregateSince(rating)
    if (since !== null && toMs(since) <= atMs) raters.add(rating.raterId)
  }
  return raters.size
}

export function isShieldLifted(
  ratings: readonly Rating[],
  landlordId: PersonId,
  at: IsoDateTime,
): boolean {
  return distinctTenantRaters(ratings, landlordId, at) >= RATING_CONFIG.shieldReleaseTenantRaters
}

// ─── Monthly batches ─────────────────────────────────────────────────────────────────────────

/** The batch moment in a month: the start of the configured day, in UTC. */
function batchInMonth(year: number, month: number): number {
  return Date.UTC(year, month, RATING_CONFIG.shieldBatch.dayOfMonth)
}

/** Every batch moment after `from` and no later than `to`, oldest first. */
export function shieldBatchMoments(from: IsoDateTime, to: IsoDateTime): IsoDateTime[] {
  const start = toMs(from)
  const end = toMs(to)
  const moments: IsoDateTime[] = []
  const first = new Date(start)
  for (let month = first.getUTCMonth(); ; month += 1) {
    const moment = batchInMonth(first.getUTCFullYear(), month)
    if (moment > end) break
    if (moment > start) moments.push(fromMs(moment))
  }
  return moments
}

/** The next batch moment strictly after `now`, e.g. 1 October for any time in September. */
export function nextShieldBatchAt(now: IsoDateTime): IsoDateTime {
  const date = new Date(toMs(now))
  const thisMonth = batchInMonth(date.getUTCFullYear(), date.getUTCMonth())
  if (thisMonth > toMs(now)) return fromMs(thisMonth)
  return fromMs(batchInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1))
}

// ─── Release ─────────────────────────────────────────────────────────────────────────────────

export interface ShieldOptions {
  readonly landlordId: PersonId
  readonly now: IsoDateTime
  /**
   * When the tenancy this per-repair rating belongs to finished its end-of-tenancy reveal (see
   * tenancyReleaseTimes), or null if it hasn't. Preferred over tenancyReleased, because a rating
   * released that way must not be counted again towards a later monthly batch.
   */
  readonly tenancyReleasedAt?: (rating: Rating) => IsoDateTime | null
  /** Whether that tenancy has finished its reveal, when the moment isn't known. Defaults to no. */
  readonly tenancyReleased?: (rating: Rating) => boolean
}

export interface ShieldRelease {
  readonly route: 'batch' | 'tenancy_end'
  /** The batch moment or the end-of-tenancy reveal. Null when only a yes or no was given. */
  readonly at: IsoDateTime | null
}

/**
 * The per-repair ratings of this landlord that count in their aggregate now, and how each was
 * released. Pass every tenant->landlord rating of the landlord, across all their homes, so the
 * 5-rater count is right.
 */
export function shieldReleases(
  ratings: readonly Rating[],
  options: ShieldOptions,
): Map<RatingId, ShieldRelease> {
  const { landlordId, now } = options
  const held = ratings
    .filter(
      (rating) =>
        isShielded(rating) &&
        rating.state === 'sealed' &&
        isSubmitted(rating) &&
        rating.direction === 'tenant->landlord' &&
        rating.subjectId === landlordId &&
        !isExpired(rating, now),
    )
    .sort((a, b) => toMs(sentAt(a)) - toMs(sentAt(b)))

  const releases = new Map<RatingId, ShieldRelease>()
  const tenancyAt = (rating: Rating): IsoDateTime | null => {
    const at = options.tenancyReleasedAt?.(rating) ?? null
    return at !== null && toMs(at) <= toMs(now) ? at : null
  }

  const [first] = held
  if (first && isShieldLifted(ratings, landlordId, now)) {
    for (const moment of shieldBatchMoments(sentAt(first), now)) {
      const momentMs = toMs(moment)
      const due = held.filter((rating) => {
        if (releases.has(rating.id) || toMs(sentAt(rating)) >= momentMs) return false
        if (isExpired(rating, moment)) return false
        // Already in the score through its own tenancy's reveal, so it can't pad out a batch.
        const released = tenancyAt(rating)
        return released === null || toMs(released) > momentMs
      })
      const tenants = new Set(due.map((rating) => rating.raterId))
      if (tenants.size < RATING_CONFIG.shieldBatch.minTenants) continue
      if (!isShieldLifted(ratings, landlordId, moment)) continue
      for (const rating of due) releases.set(rating.id, { route: 'batch', at: moment })
    }
  }

  for (const rating of held) {
    if (releases.has(rating.id)) continue
    const at = tenancyAt(rating)
    if (at !== null) releases.set(rating.id, { route: 'tenancy_end', at })
    else if (options.tenancyReleased?.(rating)) {
      releases.set(rating.id, { route: 'tenancy_end', at: null })
    }
  }
  return releases
}

/** The ids from shieldReleases: the per-repair ratings that may count in the aggregate now. */
export function releasedShieldIds(
  ratings: readonly Rating[],
  options: ShieldOptions,
): Set<RatingId> {
  return new Set(shieldReleases(ratings, options).keys())
}

function sentAt(rating: Rating): IsoDateTime {
  return rating.submittedAt ?? rating.createdAt
}

/**
 * Builds ShieldOptions.tenancyReleasedAt: a per-repair rating is released once its tenancy's
 * end-of-tenancy ratings have been revealed, which is also when the landlord's rating of that
 * tenant is locked. `owed` must include the tenancies' owed ratings (owedForTenancy).
 *
 * Pass `tenancies` so a tenant who has moved to another of the same landlord's homes stays
 * shielded: the landlord is still their current landlord, so nothing is released until every
 * tenancy the tenant has with them has finished its end-of-tenancy reveal.
 */
export function tenancyReleaseTimes(
  jobs: readonly Pick<Job, 'id' | 'tenancyId'>[],
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
  tenancies?: readonly Pick<Tenancy, 'id' | 'landlordId' | 'tenantIds' | 'status'>[],
): (rating: Rating) => IsoDateTime | null {
  const tenancyOf = new Map(jobs.map((job) => [job.id, job.tenancyId]))
  const settled = new Map<TenancyId, IsoDateTime | null>()
  const settledAt = (tenancyId: TenancyId): IsoDateTime | null => {
    if (settled.has(tenancyId)) return settled.get(tenancyId) ?? null
    const at = contextSettledAt({ kind: 'tenancy', tenancyId }, owed, ratings, now)
    settled.set(tenancyId, at)
    return at
  }
  return (rating) => {
    if (rating.context.kind !== 'job') return null
    const tenancyId = tenancyOf.get(rating.context.jobId)
    if (tenancyId === undefined) return null
    let at = settledAt(tenancyId)
    if (at === null) return null
    for (const tenancy of tenancies ?? []) {
      const theirs =
        tenancy.status !== 'proposed' &&
        tenancy.landlordId === rating.subjectId &&
        tenancy.tenantIds.includes(rating.raterId)
      if (!theirs) continue
      const other = settledAt(tenancy.id)
      if (other === null) return null
      if (toMs(other) > toMs(at)) at = other
    }
    return at
  }
}

/** The yes-or-no form of tenancyReleaseTimes, for ShieldOptions.tenancyReleased. */
export function tenancyReleaseCheck(
  jobs: readonly Pick<Job, 'id' | 'tenancyId'>[],
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
  tenancies?: readonly Pick<Tenancy, 'id' | 'landlordId' | 'tenantIds' | 'status'>[],
): (rating: Rating) => boolean {
  const times = tenancyReleaseTimes(jobs, owed, ratings, now, tenancies)
  return (rating) => times(rating) !== null
}
