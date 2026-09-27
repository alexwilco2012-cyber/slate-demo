// Photos on a job: tiles (real photos, or the demo's described placeholders), a viewer, the
// camera button and the upload queue that shows each photo from "Getting it ready" to "Added".

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowsClockwiseIcon,
  CameraIcon,
  CheckCircleIcon,
  ImageSquareIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import type { ImageRef, Photo } from '@/domain/types'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/components/slate/format'
import { isRealPhoto, shrinkPhoto } from '../lib/photos'

/** One photo, square. Seed photos are placeholders, drawn as a warm tile with their description. */
export function PhotoTile({ photo, className }: { photo: ImageRef; className?: string }) {
  if (isRealPhoto(photo.url)) {
    return (
      <img
        src={photo.url}
        alt={photo.alt}
        loading="lazy"
        className={cn('aspect-square w-full rounded-control bg-surface-2 object-cover', className)}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={photo.alt}
      className={cn(
        '@container relative flex aspect-square w-full flex-col justify-between gap-1 overflow-hidden rounded-control p-2.5 text-left',
        'bg-[linear-gradient(145deg,var(--avatar-3),var(--avatar-1)_70%)]',
        className,
      )}
    >
      <ImageSquareIcon weight="duotone" aria-hidden className="size-6 shrink-0 text-ink/70" />
      <span
        aria-hidden="true"
        className="line-clamp-2 text-caption leading-snug text-ink @[10rem]:line-clamp-4"
      >
        {photo.alt}
      </span>
    </div>
  )
}

/** Photos in a grid. Each opens larger, with who added it and when. */
export function PhotoGrid({
  photos,
  names,
  className,
}: {
  photos: readonly Photo[]
  /** Names by person id, for "Added by Beata". */
  names?: Record<string, string>
  className?: string
}) {
  const [open, setOpen] = useState<Photo | null>(null)
  return (
    <div className="@container">
      <ul className={cn('grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4', className)}>
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(photo)}
              aria-label={`Open photo: ${photo.alt}`}
              className="block w-full rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PhotoTile photo={photo} />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(next) => (next ? null : setOpen(null))}>
        {open ? (
          <DialogContent
            title="Photo"
            description={`Added ${names?.[open.addedById] ? `by ${names[open.addedById]} ` : ''}on ${formatDate(open.addedAt)}`}
            size="lg"
          >
            <div className="flex flex-col gap-3">
              <PhotoTile photo={open} className="mx-auto max-w-lg" />
              <p className="text-body text-ink">{open.alt}</p>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

/**
 * Opens the camera straight away on a phone (the file picker on a computer). The input stays
 * out of the tab order: the button is what people reach.
 */
export function CameraButton({
  onPhotos,
  multiple = true,
  children,
  ...button
}: Omit<ButtonProps, 'onClick'> & { onPhotos: (files: File[]) => void; multiple?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        data-testid="camera-input"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) onPhotos(files)
        }}
      />
      <Button
        iconStart={<CameraIcon weight="bold" aria-hidden />}
        {...button}
        onClick={() => input.current?.click()}
      >
        {children}
      </Button>
    </>
  )
}

// ─── The upload queue ────────────────────────────────────────────────────────────────────────

export type QueueStatus = 'preparing' | 'uploading' | 'added' | 'failed'

export interface QueuedPhoto {
  id: string
  status: QueueStatus
  /** The shrunk photo, once ready. */
  url?: string
  error?: string
}

let nextQueueId = 0

/**
 * Photos on their way to a job. Each is shrunk, then handed to `upload`; the queue shows every
 * step, keeps failures until they're retried or removed, and clears finished ones after a moment.
 */
export function usePhotoQueue(upload: (image: ImageRef) => Promise<void>, alt: string) {
  const [items, setItems] = useState<QueuedPhoto[]>([])
  const uploadRef = useRef(upload)
  useEffect(() => {
    uploadRef.current = upload
  }, [upload])

  const patch = useCallback((id: string, change: Partial<QueuedPhoto>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))
  }, [])

  const send = useCallback(
    async (id: string, url: string) => {
      patch(id, { status: 'uploading', error: undefined })
      try {
        await uploadRef.current({ url, alt })
        patch(id, { status: 'added' })
        window.setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== id))
        }, 2400)
      } catch (error) {
        patch(id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Something went wrong.',
        })
      }
    },
    [alt, patch],
  )

  const add = useCallback(
    (files: File[]) => {
      for (const file of files) {
        nextQueueId += 1
        const id = `queued-${nextQueueId}`
        setItems((current) => [...current, { id, status: 'preparing' }])
        shrinkPhoto(file)
          .then((url) => {
            patch(id, { url })
            return send(id, url)
          })
          .catch((error: unknown) =>
            patch(id, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'We couldn’t read that photo.',
            }),
          )
      }
    },
    [patch, send],
  )

  const retry = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id)
      if (item?.url) void send(id, item.url)
    },
    [items, send],
  )

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  return { items, add, retry, remove }
}

const QUEUE_WORDS: Record<QueueStatus, string> = {
  preparing: 'Getting it ready',
  uploading: 'Adding to the job',
  added: 'Added',
  failed: 'Not added',
}

const QUEUE_PROGRESS: Record<QueueStatus, number> = {
  preparing: 0.3,
  uploading: 0.7,
  added: 1,
  failed: 1,
}

/** Every photo on its way, with its own progress and words. Failures stay until dealt with. */
export function PhotoQueue({
  items,
  onRetry,
  onRemove,
  title = 'Uploads',
}: {
  items: readonly QueuedPhoto[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  title?: ReactNode
}) {
  if (items.length === 0) return null
  const waiting = items.filter((item) => item.status === 'preparing' || item.status === 'uploading')
  return (
    <div className="flex flex-col gap-3 rounded-card border border-input-border bg-surface p-4">
      <p className="flex items-center justify-between gap-3 font-semibold text-ink">
        <span>{title}</span>
        <span aria-live="polite" className="text-small font-normal text-muted">
          {waiting.length > 0
            ? `${waiting.length} on the way`
            : items.every((item) => item.status === 'added')
              ? 'All added'
              : null}
        </span>
      </p>
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2">
                {item.url ? (
                  <img src={item.url} alt="" className="size-full object-cover" />
                ) : (
                  <ImageSquareIcon weight="duotone" aria-hidden className="size-6 text-muted" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="flex items-center gap-2 text-small">
                  <QueueIcon status={item.status} />
                  <span className="font-semibold text-ink">
                    Photo {index + 1}: {QUEUE_WORDS[item.status]}
                  </span>
                </p>
                {item.status === 'failed' ? (
                  <p className="text-small text-critical">{item.error}</p>
                ) : (
                  <span
                    aria-hidden="true"
                    className="relative block h-1.5 overflow-hidden rounded-full bg-surface-2"
                  >
                    <span
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-slow) ease-out-soft',
                        item.status === 'added' ? 'bg-positive' : 'bg-accent-strong',
                      )}
                      style={{ width: `${QUEUE_PROGRESS[item.status] * 100}%` }}
                    />
                  </span>
                )}
              </div>
              {item.status === 'failed' ? (
                <div className="flex shrink-0 gap-(--gap-touch)">
                  {item.url ? (
                    <IconButton
                      label="Try again"
                      icon={<ArrowsClockwiseIcon weight="bold" />}
                      variant="secondary"
                      size="sm"
                      onClick={() => onRetry(item.id)}
                    />
                  ) : null}
                  <IconButton
                    label="Remove"
                    icon={<XIcon weight="bold" />}
                    variant="secondary"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                  />
                </div>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function QueueIcon({ status }: { status: QueueStatus }) {
  if (status === 'added')
    return <CheckCircleIcon weight="fill" aria-hidden className="size-5 text-positive" />
  if (status === 'failed')
    return <WarningCircleIcon weight="fill" aria-hidden className="size-5 text-critical" />
  return <Spinner className="size-5 text-accent-text" />
}
