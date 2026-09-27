// The reviews a viewer may read, shaped for screens. Shared by the review lists, review pages and
// public profiles, so every one of them applies the same visibility rules (SPEC §5 table).

import type { ReviewQuery, Viewer } from '@/data/api'
import type { PublicReview, Rating } from '@/domain/types'
import { canView } from '@/domain/rating'
import type { Reader } from './tx'
import { publicReview } from './views'

export function accessContext(db: Reader, rating: Rating) {
  const property = db.get('properties', rating.propertyId)
  return { now: db.now, ...(property ? { propertyLandlordId: property.landlordId } : {}) }
}

/**
 * Revealed reviews in one direction about one person that the viewer may see, newest first.
 * Shielded per-repair ratings never appear one by one; they only count inside scores.
 */
export function reviewsFor(db: Reader, viewer: Viewer, query: ReviewQuery): PublicReview[] {
  return db
    .rows('ratings')
    .filter(
      (r) =>
        r.direction === query.direction &&
        r.subjectId === query.subjectId &&
        (!query.propertyId || r.propertyId === query.propertyId),
    )
    .filter((r) => canView(viewer, r, accessContext(db, r)))
    .flatMap((r) => {
      const review = publicReview(db, r)
      return review ? [review] : []
    })
    .sort((a, b) => b.revealedAt.localeCompare(a.revealedAt))
}
