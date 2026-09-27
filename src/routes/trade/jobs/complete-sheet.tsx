// Marking the work done: before and after photos in pairs, what was done, the final price and
// the invoice, in one go. The landlord confirms afterwards, and everyone can rate.

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowsClockwiseIcon,
  CameraIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useSlate } from '@/data'
import type { ImageRef, Job, PaymentTermsDays, Quote } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ChoiceTiles } from '../components/choice-tiles'
import { errorText, fieldError } from '../lib/errors'
import { parsePounds, poundsInput } from '../lib/money'
import { shrinkPhoto } from '../lib/photos'

const MAX_PAIRS = 3

export const TERMS: { value: `${PaymentTermsDays}`; label: string }[] = [
  { value: '0', label: 'On the day' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
]

type Slot = { status: 'empty' } | { status: 'preparing' } | { status: 'ready'; url: string }
type Pair = { id: number; before: Slot; after: Slot }

let nextPairId = 1

/** Before or after: a big camera target, then the photo with retake and remove. */
function PhotoSlot({
  label,
  slot,
  onFile,
  onClear,
}: {
  label: 'Before' | 'After'
  slot: Slot
  onFile: (file: File) => void
  onClear: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const pick = () => input.current?.click()
  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        data-testid={`camera-${label.toLowerCase()}`}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      <span className="text-small font-semibold text-ink">{label}</span>
      {slot.status === 'ready' ? (
        <div className="relative">
          <img
            src={slot.url}
            alt={`${label} photo`}
            className="aspect-square w-full rounded-control bg-surface-2 object-cover"
          />
          <div className="absolute right-2 bottom-2 flex gap-(--gap-touch)">
            <IconButton
              label={`Retake the ${label.toLowerCase()} photo`}
              icon={<ArrowsClockwiseIcon weight="bold" />}
              variant="secondary"
              size="sm"
              onClick={pick}
            />
            <IconButton
              label={`Remove the ${label.toLowerCase()} photo`}
              icon={<TrashIcon weight="bold" />}
              variant="secondary"
              size="sm"
              onClick={onClear}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={slot.status === 'preparing'}
          className={cn(
            'flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-input-border bg-surface text-ink',
            'transition-colors duration-(--duration-quick) hover:bg-surface-2',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          {slot.status === 'preparing' ? (
            <>
              <Spinner className="size-7 text-accent-text" />
              <span className="text-small font-semibold">Getting it ready</span>
            </>
          ) : (
            <>
              <CameraIcon weight="bold" aria-hidden className="size-8" />
              <span className="font-semibold">Take {label.toLowerCase()} photo</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

export function CompleteSheet({
  open,
  onOpenChange,
  job,
  quote,
  vatRegistered,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
  /** The accepted quote, for the final price. */
  quote: Quote | undefined
  vatRegistered: boolean
  onDone?: () => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [pairs, setPairs] = useState<Pair[]>([
    { id: 0, before: { status: 'empty' }, after: { status: 'empty' } },
  ])
  const [note, setNote] = useState('')
  const [price, setPrice] = useState(quote ? poundsInput(quote.totalPence) : '')
  const [invoiceNow, setInvoiceNow] = useState<'now' | 'later'>('now')
  const [terms, setTerms] = useState<`${PaymentTermsDays}`>('14')
  const [errors, setErrors] = useState<{ photos?: string; price?: string; note?: string }>({})
  const [saving, setSaving] = useState(false)

  function setSlot(pairId: number, side: 'before' | 'after', slot: Slot) {
    setPairs((current) =>
      current.map((pair) => (pair.id === pairId ? { ...pair, [side]: slot } : pair)),
    )
  }

  function takePhoto(pairId: number, side: 'before' | 'after', file: File) {
    setSlot(pairId, side, { status: 'preparing' })
    setErrors((current) => ({ ...current, photos: undefined }))
    shrinkPhoto(file)
      .then((url) => setSlot(pairId, side, { status: 'ready', url }))
      .catch((error: unknown) => {
        setSlot(pairId, side, { status: 'empty' })
        setErrors((current) => ({ ...current, photos: errorText(error) }))
      })
  }

  async function save() {
    const photos: ImageRef[] = []
    pairs.forEach((pair, index) => {
      const n = pairs.length > 1 ? ` (${index + 1})` : ''
      if (pair.before.status === 'ready') {
        photos.push({ url: pair.before.url, alt: `Before${n}: ${job.title}` })
      }
      if (pair.after.status === 'ready') {
        photos.push({ url: pair.after.url, alt: `After${n}: ${job.title}` })
      }
    })
    const next: typeof errors = {}
    if (!pairs.some((pair) => pair.after.status === 'ready')) {
      next.photos = 'Add at least one after photo, so the landlord can see the finished work.'
    }
    if (
      pairs.some((pair) => pair.before.status === 'preparing' || pair.after.status === 'preparing')
    ) {
      next.photos = 'A photo is still getting ready. Wait a moment, then try again.'
    }
    const pence = price.trim() ? parsePounds(price) : undefined
    if (pence === null) next.price = 'Enter the price in pounds, like 69.50.'
    setErrors(next)
    if (next.photos || next.price) return

    setSaving(true)
    try {
      await api.markComplete(viewer, job.id, {
        photos,
        note: note.trim() || undefined,
        finalPricePence: pence ?? undefined,
        invoiceDueInDays: invoiceNow === 'now' ? (Number(terms) as PaymentTermsDays) : undefined,
      })
      onOpenChange(false)
      toast.success('Marked as done', {
        description:
          invoiceNow === 'now'
            ? 'Your invoice has gone to the landlord. They confirm the job, then everyone can rate.'
            : 'The landlord confirms the job, then everyone can rate. Send your invoice when you’re ready.',
      })
      onDone?.()
    } catch (error) {
      const fields = {
        photos: fieldError(error, 'photos'),
        price: fieldError(error, 'finalPricePence'),
        note: fieldError(error, 'note'),
      }
      setErrors(fields)
      if (!Object.values(fields).some(Boolean)) {
        toast.error('Not marked as done', { description: errorText(error) })
      }
    } finally {
      setSaving(false)
    }
  }

  const pence = parsePounds(price)
  const quoted = quote?.totalPence
  const differs = pence !== null && quoted !== undefined && pence !== quoted

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Mark the work done"
        description="Photos, what you did and your invoice, in one go."
        size="lg"
        initialFocus={true}
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Not yet</Button>} />
            <Button
              loading={saving}
              iconStart={<CheckCircleIcon weight="bold" aria-hidden />}
              onClick={save}
            >
              Mark as done
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold text-ink">Before and after photos</legend>
            <p className="-mt-1 text-small text-muted">
              Take the same view before and after. You need at least one after photo.
            </p>
            <ul className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {pairs.map((pair, index) => (
                  <motion.li
                    key={pair.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-2 rounded-card border border-line p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">Pair {index + 1}</span>
                      {pairs.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconStart={<TrashIcon weight="bold" aria-hidden />}
                          onClick={() =>
                            setPairs((current) => current.filter((item) => item.id !== pair.id))
                          }
                        >
                          Remove pair
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <PhotoSlot
                        label="Before"
                        slot={pair.before}
                        onFile={(file) => takePhoto(pair.id, 'before', file)}
                        onClear={() => setSlot(pair.id, 'before', { status: 'empty' })}
                      />
                      <PhotoSlot
                        label="After"
                        slot={pair.after}
                        onFile={(file) => takePhoto(pair.id, 'after', file)}
                        onClear={() => setSlot(pair.id, 'after', { status: 'empty' })}
                      />
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {pairs.length < MAX_PAIRS ? (
              <Button
                variant="secondary"
                iconStart={<PlusIcon weight="bold" aria-hidden />}
                onClick={() => {
                  setPairs((current) => [
                    ...current,
                    { id: nextPairId++, before: { status: 'empty' }, after: { status: 'empty' } },
                  ])
                }}
              >
                Add another pair
              </Button>
            ) : null}
            <div aria-live="polite">
              {errors.photos ? (
                <p className="text-small font-semibold text-critical">{errors.photos}</p>
              ) : null}
            </div>
          </fieldset>

          <Textarea
            label="What you did"
            optional
            hint="The landlord and tenant see this, e.g. “Replaced the fill valve and tested it.”"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={3}
            error={errors.note}
          />

          <Input
            label="Final price"
            hint={
              quoted !== undefined
                ? `Your quote was ${formatPence(quoted)}${vatRegistered ? ' including VAT' : ''}.${differs ? ' Say why it’s different in the note.' : ''}`
                : 'What the work cost, in pounds.'
            }
            leading="£"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            error={errors.price}
          />

          <SegmentedControl
            label="Invoice"
            options={[
              { value: 'now', label: 'Send it now' },
              { value: 'later', label: 'Later' },
            ]}
            value={invoiceNow}
            onValueChange={setInvoiceNow}
          />
          {invoiceNow === 'now' ? (
            <ChoiceTiles
              label="Payment due"
              hint="The landlord pays you directly. We remind them, and tell you both if it’s late."
              options={TERMS}
              value={terms}
              onValueChange={setTerms}
              columns={4}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
