import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export interface PublicPhotoProps {
  src: string
  /** Empty for a photo that only sets the scene; the words beside it carry the meaning. */
  alt: string
  /** What shows until the photo has loaded, and for good if it never does. Decorative. */
  fallback: ReactNode
  /** Sizes the frame. Give it an aspect ratio so nothing moves when the photo arrives. */
  className?: string
  imgClassName?: string
  /** Above the fold: load straight away, ahead of other images. */
  priority?: boolean
  sizes?: string
}

/**
 * A photograph slot for the public site. The drawn fallback sits underneath; the photo fades in
 * over it once decoded and is removed if it fails, so a missing file never shows as a broken image.
 */
export function PublicPhoto({
  src,
  alt,
  fallback,
  className,
  imgClassName,
  priority = false,
  sizes,
}: PublicPhotoProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  // A cached photo can finish before React attaches onLoad.
  const measure = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setState('loaded')
  }, [])

  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {fallback}
      </div>
      {state === 'failed' ? null : (
        <img
          ref={measure}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) setState('loaded')
          }}
          onError={() => setState('failed')}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out-soft',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  )
}
