// Photos people add to jobs, completions and messages. Each gets its own id and a record of who
// added it and when.

import { newId } from '@/domain/ids'
import type { ImageRef, IsoDateTime, PersonId, Photo } from '@/domain/types'

export function photosFrom(
  images: readonly ImageRef[],
  addedById: PersonId,
  addedAt: IsoDateTime,
): Photo[] {
  return images.map((image) => ({ ...image, id: newId('file'), addedById, addedAt }))
}
