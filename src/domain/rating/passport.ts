// The tenant passport (SPEC §5, landlord->tenant). Never public and never a single number: one
// line per question, counting how many landlords gave each answer. The tenant shares it with an
// all-or-nothing link that works for 30 days, and every view is logged for them.

import { RELATIONSHIPS, type ScaleScore } from '@/domain/criteria'
import type {
  IsoDateTime,
  PassportLine,
  PassportShare,
  PersonId,
  Rating,
  TenantPassport,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import { isExpired, reviewDate } from './retention'
import { addDays, isBefore, toMs } from './time'

export function passportShareExpiresAt(createdAt: IsoDateTime): IsoDateTime {
  return addDays(createdAt, RATING_CONFIG.passportShareDays)
}

/** Matches the status of SharedPassport in the data layer. */
export type ShareStatus = 'ok' | 'expired' | 'revoked' | 'not_found'

/** A link never outlives 30 days from when it was made, whatever expiry was stored on it. */
export function shareStatus(
  share: PassportShare | null | undefined,
  now: IsoDateTime,
): ShareStatus {
  if (!share) return 'not_found'
  if (share.revokedAt && !isBefore(now, share.revokedAt)) return 'revoked'
  const limit = passportShareExpiresAt(share.createdAt)
  if (!isBefore(now, share.expiresAt) || !isBefore(now, limit)) return 'expired'
  return 'ok'
}

export function isShareActive(share: PassportShare | null | undefined, now: IsoDateTime) {
  return shareStatus(share, now) === 'ok'
}

/**
 * Every review a passport shows: all revealed landlord ratings of the tenant, newest first.
 * There is deliberately no way to leave one out.
 */
export function passportRatings(
  ratings: readonly Rating[],
  tenantId: PersonId,
  now: IsoDateTime,
): Rating[] {
  return ratings
    .filter(
      (rating) =>
        rating.direction === 'landlord->tenant' &&
        rating.subjectId === tenantId &&
        rating.state === 'revealed' &&
        !isExpired(rating, now),
    )
    .sort((a, b) => toMs(reviewDate(b)) - toMs(reviewDate(a)))
}

export type PassportSummary = Pick<TenantPassport, 'tenantId' | 'landlordCount' | 'lines'>

/**
 * Counts per question, e.g. "Rent on agreed date: Always, from 2 of 2 landlords". Each landlord
 * counts once, by their most recent rating, so a tenant who rented twice from one landlord
 * isn't counted twice.
 */
export function passportSummary(
  tenantId: PersonId,
  ratings: readonly Rating[],
  now: IsoDateTime,
): PassportSummary {
  const latestByLandlord = new Map<PersonId, Rating>()
  // Newest first, so the first rating seen from each landlord is their latest.
  for (const rating of passportRatings(ratings, tenantId, now)) {
    if (!latestByLandlord.has(rating.raterId)) latestByLandlord.set(rating.raterId, rating)
  }
  const latest = [...latestByLandlord.values()]

  const lines = RELATIONSHIPS['landlord->tenant'].criteria.map((criterion): PassportLine => {
    const counts: Record<ScaleScore, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let landlordCount = 0
    for (const rating of latest) {
      const answers: Partial<Record<string, ScaleScore>> = rating.answers
      const answer = answers[criterion.id]
      if (answer === undefined) continue
      counts[answer] += 1
      landlordCount += 1
    }
    return { criterionId: criterion.id, counts, landlordCount }
  })
  return { tenantId, landlordCount: latest.length, lines }
}
