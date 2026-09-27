// Headline scores, worked out by the rating engine on every read, so a removal or an expiry shows
// at once (SPEC §6: "recalculate scores after any removal"). This file only gathers the inputs:
// the ratings, the platform mean for each direction, which per-repair ratings the retaliation
// shield has released, each trade's completed jobs and, where there are enough, the peers.

import type { LandlordScoreQuery } from '@/data/api'
import type {
  ClientRating,
  LandlordScore,
  PersonId,
  Rating,
  RatingDirection,
  RatingId,
  Role,
  TradeScore,
} from '@/domain/types'
import {
  RATING_CONFIG,
  clientRating as engineClientRating,
  countsInScore,
  landlordScore as engineLandlordScore,
  owedForTenancy,
  platformMean,
  releasedShieldIds,
  tenancyReleaseTimes,
  tradeScore as engineTradeScore,
  type CompletedJob,
  type PeerGroup,
} from '@/domain/rating'
import { notFound } from './access'
import type { Reader } from './tx'

const AREA = 'Aberdeen'

function meanFor(db: Reader, direction: RatingDirection): number {
  return platformMean(db.rows('ratings'), direction, db.now)
}

/** Per-repair ratings of this landlord that the shield has released into their aggregate. */
export function releasedFor(db: Reader, landlordId: PersonId): Set<RatingId> {
  const ratings = db.rows('ratings')
  const theirs = ratings.filter(
    (r) => r.direction === 'tenant->landlord' && r.subjectId === landlordId,
  )
  const tenancies = db.rows('tenancies')
  const tenancyOwed = tenancies.flatMap(owedForTenancy)
  return releasedShieldIds(theirs, {
    landlordId,
    now: db.now,
    // The tenancies too, so a tenant who moved to another of this landlord's homes stays shielded.
    tenancyReleasedAt: tenancyReleaseTimes(
      db.rows('jobs'),
      tenancyOwed,
      ratings,
      db.now,
      tenancies,
    ),
  })
}

/** Every shielded rating released into any landlord's score right now. */
export function allReleased(db: Reader): Set<RatingId> {
  const landlords = new Set(
    db
      .rows('ratings')
      .filter((r) => r.direction === 'tenant->landlord' && r.seal === 'retaliation_shield')
      .map((r) => r.subjectId),
  )
  return new Set([...landlords].flatMap((landlordId) => [...releasedFor(db, landlordId)]))
}

/** Every tenant->landlord rating that counts towards this landlord's score right now. */
export function landlordRatings(db: Reader, landlordId: PersonId): Rating[] {
  const releasedShielded = releasedFor(db, landlordId)
  return db
    .rows('ratings')
    .filter(
      (r) =>
        r.direction === 'tenant->landlord' &&
        r.subjectId === landlordId &&
        countsInScore(r, { now: db.now, releasedShielded }),
    )
}

/**
 * Other people with the same role, for "Top 10% in Aberdeen". Only worth working out once there
 * could be enough of them to show a badge at all.
 */
function peerIds(db: Reader, role: Role, exclude: PersonId): PersonId[] | null {
  const ids = db
    .rows('people')
    .filter((p) => p.id !== exclude && p.roles.includes(role))
    .map((p) => p.id)
  return ids.length >= RATING_CONFIG.relativeBadge.minPeers ? ids : null
}

function landlordScoreOf(
  db: Reader,
  landlordId: PersonId,
  propertyId?: Rating['propertyId'],
  peers?: PeerGroup,
): LandlordScore {
  return engineLandlordScore({
    landlordId,
    ratings: db.rows('ratings'),
    now: db.now,
    platformMean: meanFor(db, 'tenant->landlord'),
    releasedShielded: releasedFor(db, landlordId),
    ...(propertyId ? { propertyId } : {}),
    ...(peers ? { peers } : {}),
  })
}

export function landlordScore(db: Reader, query: LandlordScoreQuery): LandlordScore {
  if ('propertyId' in query) {
    const property = db.get('properties', query.propertyId)
    if (!property) throw notFound('home')
    return landlordScoreOf(db, property.landlordId, property.id)
  }
  const others = peerIds(db, 'landlord', query.landlordId)
  const peers = others
    ? { area: AREA, scores: others.map((id) => landlordScoreOf(db, id).score) }
    : undefined
  return landlordScoreOf(db, query.landlordId, undefined, peers)
}

function completedJobs(db: Reader, tradeId: PersonId): CompletedJob[] {
  return db
    .rows('jobs')
    .flatMap((job) =>
      job.tradeId === tradeId &&
      (job.status === 'completed' || job.status === 'confirmed') &&
      job.completion
        ? [{ jobId: job.id, completedAt: job.completion.completedAt }]
        : [],
    )
}

function tradeScoreOf(
  db: Reader,
  tradeId: PersonId,
  peers?: { fromLandlords?: PeerGroup; fromTenants?: PeerGroup },
): TradeScore {
  return engineTradeScore({
    tradeId,
    ratings: db.rows('ratings'),
    now: db.now,
    platformMeans: {
      fromLandlords: meanFor(db, 'landlord->trade'),
      fromTenants: meanFor(db, 'tenant->trade'),
    },
    completedJobs: completedJobs(db, tradeId),
    ...(peers ? { peers } : {}),
  })
}

export function tradeScore(db: Reader, tradeId: PersonId): TradeScore {
  const others = peerIds(db, 'trade', tradeId)
  if (!others) return tradeScoreOf(db, tradeId)
  const scores = others.map((id) => tradeScoreOf(db, id))
  return tradeScoreOf(db, tradeId, {
    fromLandlords: { area: AREA, scores: scores.map((s) => s.fromLandlords.score) },
    fromTenants: { area: AREA, scores: scores.map((s) => s.fromTenants.score) },
  })
}

export function clientRating(db: Reader, landlordId: PersonId): ClientRating {
  return engineClientRating({
    landlordId,
    ratings: db.rows('ratings'),
    now: db.now,
    platformMean: meanFor(db, 'trade->landlord'),
  })
}
