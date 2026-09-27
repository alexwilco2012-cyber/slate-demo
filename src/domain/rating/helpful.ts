// The optional "Helpful reviewer" badge (SPEC §5, "Prompting ratings"): a plain count of the
// reviews someone has had published. It never looks at what they said, so it can't reward
// praise or punish criticism, and it gates nothing.

import type { IsoDateTime, PersonId, Rating } from '@/domain/types'
import { isExpired } from './retention'
import { isShielded } from './shield'

/**
 * Published reviews this person wrote and that still stand. Per-repair ratings are left out:
 * counting them would tell a landlord when a tenant had rated them, which the shield hides.
 */
export function helpfulReviewerCount(
  personId: PersonId,
  ratings: readonly Rating[],
  now: IsoDateTime,
): number {
  return ratings.filter(
    (rating) =>
      rating.raterId === personId &&
      rating.state === 'revealed' &&
      !isShielded(rating) &&
      !isExpired(rating, now),
  ).length
}

/** "Helpful reviewer · 7 reviews", or null before their first review is published. */
export function helpfulReviewerText(count: number): string | null {
  if (count === 0) return null
  return `Helpful reviewer · ${count} ${count === 1 ? 'review' : 'reviews'}`
}
