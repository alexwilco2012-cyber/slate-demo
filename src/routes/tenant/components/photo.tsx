// Photos on repairs. The demo ships no real photos: seed images are placeholder descriptors
// (placeholder://photo/…), drawn here as a warm tile with their description. Photos the tenant
// takes in the demo are real, kept small, and shown as they are.

import { HouseLineIcon, ImageIcon } from '@phosphor-icons/react'
import { isPlaceholder } from '@/data'
import type { ImageRef } from '@/domain/types'
import { cn } from '@/components/ui/cn'

export function PhotoTile({
  image,
  className,
  showCaption = true,
}: {
  image: ImageRef
  className?: string
  /** Placeholders show their description; turn off for tiny thumbnails. */
  showCaption?: boolean
}) {
  if (!isPlaceholder(image.url)) {
    return (
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        className={cn('aspect-square w-full rounded-control bg-surface-2 object-cover', className)}
      />
    )
  }
  const home = image.url.includes('/home/')
  const Glyph = home ? HouseLineIcon : ImageIcon
  return (
    <figure
      role="img"
      aria-label={image.alt}
      className={cn(
        'relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-control p-3 text-center',
        'bg-[radial-gradient(120%_90%_at_20%_10%,color-mix(in_oklab,var(--accent-tint),var(--surface)_20%),var(--surface-2))]',
        className,
      )}
    >
      <Glyph weight="duotone" aria-hidden className="size-8 shrink-0 text-accent-text opacity-80" />
      {showCaption ? (
        <figcaption
          aria-hidden="true"
          className="line-clamp-3 text-caption leading-snug text-muted"
        >
          {image.alt}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function PhotoGrid({
  images,
  className,
}: {
  images: readonly ImageRef[]
  className?: string
}) {
  if (images.length === 0) return null
  return (
    <ul className={cn('grid grid-cols-2 gap-2 @sm:grid-cols-3', className)}>
      {images.map((image, index) => (
        <li key={`${image.url}-${index}`}>
          <PhotoTile image={image} />
        </li>
      ))}
    </ul>
  )
}
