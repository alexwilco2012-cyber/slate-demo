// Adding photos: the camera opens straight away on phones, or choose from the library. Each photo
// shows in a visible queue while it "uploads" (simulated in the demo) and can be removed.
// Photos are shrunk before they're kept, so the demo's browser storage never fills up.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  CheckCircleIcon,
  ImagesIcon,
  SparkleIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { PLACEHOLDER_SCHEME } from '@/data'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/icon-button'
import { PhotoTile } from '../../components/photo'
import type { DraftPhoto } from './draft'

export const MAX_PHOTOS = 10
const MAX_EDGE = 960

type Upload = {
  id: string
  name: string
  previewUrl: string | null
  progress: number
  status: 'uploading' | 'done' | 'failed'
  file?: File
}

let counter = 0
function localId() {
  counter += 1
  return `photo-${Date.now().toString(36)}-${counter}`
}

/** Shrinks a photo to a JPEG at most MAX_EDGE pixels on its longest side. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No canvas')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.72)
}

export function PhotoQueue({
  photos,
  onChange,
  sampleAlt,
  onBusyChange,
}: {
  photos: DraftPhoto[]
  onChange: (photos: DraftPhoto[]) => void
  /** What a demo sample photo shows, e.g. "Damp patch on a bedroom ceiling". */
  sampleAlt: string
  onBusyChange?: (busy: boolean) => void
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const latestPhotos = useRef(photos)
  latestPhotos.current = photos
  const timers = useRef(new Set<number>())
  const cancelled = useRef(new Set<string>())

  const busy = uploads.some((upload) => upload.status === 'uploading')
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])
  useEffect(() => {
    const running = timers.current
    return () => running.forEach((timer) => window.clearInterval(timer))
  }, [])

  const room = MAX_PHOTOS - photos.length - uploads.filter((u) => u.status === 'uploading').length

  function patchUpload(id: string, patch: Partial<Upload>) {
    setUploads((current) =>
      current.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)),
    )
  }

  /** Simulates the upload: progress climbs, then the photo joins the report. */
  function runUpload(upload: Upload, make: () => Promise<DraftPhoto>) {
    let progress = 0
    const made = make()
    const timer = window.setInterval(() => {
      progress = Math.min(progress + 9 + Math.random() * 14, 92)
      patchUpload(upload.id, { progress })
    }, 120)
    timers.current.add(timer)
    made
      .then(
        (photo) =>
          new Promise<DraftPhoto>((resolve) => window.setTimeout(() => resolve(photo), 900)),
      )
      .then((photo) => {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl)
        if (cancelled.current.has(upload.id)) return
        onChange([...latestPhotos.current, photo])
        setUploads((current) => current.filter((item) => item.id !== upload.id))
      })
      .catch(() => patchUpload(upload.id, { status: 'failed', progress: 0 }))
      .finally(() => {
        window.clearInterval(timer)
        timers.current.delete(timer)
      })
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const chosen = Array.from(files).slice(0, Math.max(room, 0))
    for (const file of chosen) {
      const upload: Upload = {
        id: localId(),
        name: file.name || 'Photo',
        previewUrl: URL.createObjectURL(file),
        progress: 4,
        status: 'uploading',
        file,
      }
      setUploads((current) => [...current, upload])
      runUpload(upload, async () => ({
        id: upload.id,
        url: await shrink(file),
        alt: `Photo taken by you: ${upload.name.replace(/\.[a-z0-9]+$/i, '')}`,
        name: upload.name,
      }))
    }
  }

  function addSample() {
    const upload: Upload = {
      id: localId(),
      name: 'Sample photo',
      previewUrl: null,
      progress: 4,
      status: 'uploading',
    }
    setUploads((current) => [...current, upload])
    const count = latestPhotos.current.length + 1
    runUpload(upload, async () => ({
      id: upload.id,
      url: `${PLACEHOLDER_SCHEME}photo/sample-${Date.now().toString(36)}-${count}`,
      alt: sampleAlt,
      name: 'Sample photo',
    }))
  }

  function retry(upload: Upload) {
    if (!upload.file) return
    const file = upload.file
    patchUpload(upload.id, { status: 'uploading', progress: 4 })
    runUpload(upload, async () => ({
      id: upload.id,
      url: await shrink(file),
      alt: `Photo taken by you: ${upload.name}`,
      name: upload.name,
    }))
  }

  const total = photos.length + uploads.length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Button
          size="lg"
          variant="soft"
          iconStart={<CameraIcon weight="bold" aria-hidden />}
          onClick={() => cameraRef.current?.click()}
          disabled={room <= 0}
        >
          Take a photo
        </Button>
        <Button
          size="lg"
          variant="secondary"
          iconStart={<ImagesIcon weight="bold" aria-hidden />}
          onClick={() => libraryRef.current?.click()}
          disabled={room <= 0}
        >
          Choose photos
        </Button>
      </div>
      {/* capture opens the rear camera straight away on phones; desktops show a file picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={addSample}
        disabled={room <= 0}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-control px-1 text-small font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-muted disabled:no-underline"
      >
        <SparkleIcon weight="bold" aria-hidden className="size-4" />
        No camera handy? Add a sample photo for the demo
      </button>

      <div className="flex flex-col gap-2">
        <p className="flex items-center justify-between text-small text-muted" aria-live="polite">
          <span className="font-semibold text-ink">
            {total === 0 ? 'No photos yet' : `${total} of ${MAX_PHOTOS} photos`}
          </span>
          {busy ? <span>Uploading…</span> : null}
        </p>
        {total > 0 ? (
          <ul aria-label="Photos" className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {photos.map((photo, index) => (
                <motion.li
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-control border border-line bg-surface p-2 pr-1.5"
                >
                  <PhotoTile image={photo} showCaption={false} className="size-14 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-small font-semibold text-ink">{photo.name}</p>
                    <p className="flex items-center gap-1.5 text-caption text-positive">
                      <CheckCircleIcon weight="fill" aria-hidden className="size-4" />
                      Added
                    </p>
                  </div>
                  <IconButton
                    label={`Remove photo ${index + 1}`}
                    icon={<XIcon weight="bold" />}
                    variant="quiet"
                    onClick={() => onChange(photos.filter((item) => item.id !== photo.id))}
                  />
                </motion.li>
              ))}
              {uploads.map((upload) => (
                <motion.li
                  key={upload.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-control border border-dashed border-input-border bg-surface p-2 pr-1.5"
                >
                  {upload.previewUrl ? (
                    <img
                      src={upload.previewUrl}
                      alt=""
                      className="size-14 shrink-0 rounded-control bg-surface-2 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="slate-skeleton size-14 shrink-0 rounded-control"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="truncate text-small font-semibold text-ink">{upload.name}</p>
                    {upload.status === 'failed' ? (
                      <p className="flex items-center gap-1.5 text-caption font-semibold text-critical">
                        <WarningCircleIcon weight="bold" aria-hidden className="size-4" />
                        Couldn’t add this photo
                      </p>
                    ) : (
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${upload.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(upload.progress)}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
                      >
                        <span
                          className="block h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {upload.status === 'failed' && upload.file ? (
                    <IconButton
                      label={`Try ${upload.name} again`}
                      icon={<ArrowCounterClockwiseIcon weight="bold" />}
                      variant="quiet"
                      onClick={() => retry(upload)}
                    />
                  ) : null}
                  <IconButton
                    label={`Cancel ${upload.name}`}
                    icon={<XIcon weight="bold" />}
                    variant="quiet"
                    className={cn(upload.status === 'uploading' && 'opacity-80')}
                    onClick={() => {
                      cancelled.current.add(upload.id)
                      setUploads((current) => current.filter((item) => item.id !== upload.id))
                    }}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : null}
      </div>
    </div>
  )
}
