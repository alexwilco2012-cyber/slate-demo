import { ImageSquareIcon } from '@phosphor-icons/react'
import { isPlaceholder } from '@/data'
import type { ImageRef } from '@/domain/types'
import { cn } from '@/components/ui/cn'

/**
 * A photo on a job. The demo has no real photos, so placeholders are drawn as a tile that says
 * what the photo shows (its alt text), which is also what a screen reader hears.
 */
export function PhotoTile({ image, className }: { image: ImageRef; className?: string }) {
  if (!isPlaceholder(image.url)) {
    return (
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        className={cn('aspect-[4/3] w-full rounded-control bg-surface-2 object-cover', className)}
      />
    )
  }
  return (
    <figure
      className={cn(
        'flex aspect-[4/3] w-full flex-col justify-between gap-2 overflow-hidden rounded-control border border-line bg-surface-2 p-3',
        className,
      )}
    >
      <ImageSquareIcon weight="duotone" aria-hidden className="size-6 text-muted" />
      <figcaption className="line-clamp-3 text-caption text-ink">
        <span className="sr-only">Photo: </span>
        {image.alt}
      </figcaption>
    </figure>
  )
}
