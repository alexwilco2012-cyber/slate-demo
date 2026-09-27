// The demo ships no real photos or files. Each one is a placeholder descriptor that screens draw
// as a tile with its alt text, e.g. 'placeholder://photo/leak-under-kitchen-sink'.

import type { FileId, FileRef, ImageRef, IsoDateTime, Photo, PersonId } from '@/domain/types'

export const PLACEHOLDER_SCHEME = 'placeholder://'

export function isPlaceholder(url: string): boolean {
  return url.startsWith(PLACEHOLDER_SCHEME)
}

export function image(kind: 'photo' | 'home', slug: string, alt: string): ImageRef {
  return { url: `${PLACEHOLDER_SCHEME}${kind}/${slug}`, alt }
}

export function photo(slug: string, alt: string, addedById: PersonId, addedAt: IsoDateTime): Photo {
  const id: FileId = `file_${slug}`
  return { id, ...image('photo', slug, alt), addedById, addedAt }
}

export function file(slug: string, name: string, sizeBytes: number): FileRef {
  return { name, url: `${PLACEHOLDER_SCHEME}document/${slug}`, sizeBytes }
}
