// A quote in under a minute: tap saved lines (call-out, labour, parts) to add them, nudge the
// quantities, and the total works itself out, with VAT when the trade is registered for it.
// Totals are never typed in; the data layer works them out again from the lines.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckCircleIcon,
  MinusIcon,
  PaperPlaneTiltIcon,
  PlusCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { SlateError, useDemoNow, useSlate } from '@/data'
import type { JobId, LineItemKind, QuoteLineItem, SavedLineItem } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ActionDock } from '../components/action-dock'
import { ChoiceTiles } from '../components/choice-tiles'
import { Section } from '../components/page-bits'
import { Totals } from '../components/quote-table'
import { errorText, fieldError } from '../lib/errors'
import {
  KIND_LABELS,
  UNIT_LABELS,
  lineTotal,
  parsePounds,
  poundsInput,
  quantityText,
  stepFor,
  totalsOf,
} from '../lib/money'
import { addDaysTo, formatShortDay, ukDay } from '../lib/time'

type Unit = SavedLineItem['unit']

interface Line {
  key: number
  savedId?: string
  description: string
  kind: LineItemKind
  unit: Unit
  quantity: number
  unitPence: number
  /** What's typed in the price box, so a half-typed "4" doesn't jump about. */
  priceText: string
}

const HOLDS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const
type Holds = (typeof HOLDS)[number]['value']

type Start = 'tomorrow' | 'next' | 'week' | 'unsure'

let nextLineKey = 1

export function QuoteBuilder({
  jobId,
  saved,
  vatRegistered,
  landlordName,
  doneTo,
}: {
  jobId: JobId
  saved: readonly SavedLineItem[]
  vatRegistered: boolean
  landlordName: string
  /** Where to go once it's sent. */
  doneTo?: string
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const today = ukDay(now)
  const toast = useToast()
  const navigate = useNavigate()
  const [lines, setLines] = useState<Line[]>([])
  const [holds, setHolds] = useState<Holds>('30')
  const [start, setStart] = useState<Start | undefined>()
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ lines?: string; notes?: string }>({})
  const [sending, setSending] = useState(false)

  const quoteLines: QuoteLineItem[] = lines.map((line) => ({
    description: line.description,
    kind: line.kind,
    quantity: line.quantity,
    unitPence: line.unitPence,
  }))
  const totals = totalsOf(quoteLines, vatRegistered)

  function addSaved(item: SavedLineItem) {
    setErrors({})
    setLines((current) => {
      const existing = current.find((line) => line.savedId === item.id)
      if (existing) {
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + stepFor(line.unit) } : line,
        )
      }
      return [
        ...current,
        {
          key: nextLineKey++,
          savedId: item.id,
          description: item.description,
          kind: item.kind,
          unit: item.unit,
          quantity: 1,
          unitPence: item.unitPence,
          priceText: poundsInput(item.unitPence),
        },
      ]
    })
  }

  function update(key: number, change: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
  }

  const startDates: Record<Exclude<Start, 'unsure'>, string> = {
    tomorrow: addDaysTo(today, 1),
    next: addDaysTo(today, 2),
    week: addDaysTo(today, 7),
  }

  async function send() {
    if (lines.length === 0) {
      setErrors({ lines: 'Add at least one line. Tap a saved line, or add your own.' })
      return
    }
    if (lines.some((line) => parsePounds(line.priceText) === null)) {
      setErrors({ lines: 'Check the prices. Each needs to be in pounds, like 42.50.' })
      return
    }
    setSending(true)
    try {
      await api.submitQuote(viewer, {
        jobId,
        lineItems: quoteLines,
        notes: notes.trim() || undefined,
        earliestStart: start && start !== 'unsure' ? startDates[start] : undefined,
        validUntil: addDaysTo(today, Number(holds)),
      })
      toast.success(`Quote sent to ${landlordName}`, {
        description: `${formatPence(totals.totalPence)}. We’ll tell you when they decide.`,
      })
      if (doneTo) navigate(doneTo)
    } catch (error) {
      const lineError = fieldError(error, 'lineItems')
      const notesError = fieldError(error, 'notes')
      setErrors({ lines: lineError, notes: notesError })
      if (!lineError && !notesError) {
        toast.error('Quote not sent', { description: errorText(error) })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Quick lines"
        description="Tap to add. Tap again for one more. You can change these lines in your profile."
        headingLevel="h3"
      >
        {saved.length === 0 ? (
          <p className="rounded-card border border-dashed border-input-border p-4 text-muted">
            You have no saved lines yet. Add your own below and tick “Save it for next time”.
          </p>
        ) : (
          <ul className="grid gap-(--gap-touch) sm:grid-cols-2">
            {saved.map((item) => {
              const added = lines.find((line) => line.savedId === item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => addSaved(item)}
                    className={cn(
                      'flex min-h-16 w-full items-center gap-3 rounded-control border bg-surface p-3 text-left text-ink',
                      'transition-[background-color,border-color,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98] hover:bg-surface-2',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      added ? 'border-accent-strong bg-accent-tint' : 'border-input-border',
                    )}
                  >
                    {added ? (
                      <CheckCircleIcon
                        weight="fill"
                        aria-hidden
                        className="size-7 shrink-0 text-accent-strong"
                      />
                    ) : (
                      <PlusCircleIcon weight="bold" aria-hidden className="size-7 shrink-0" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="leading-snug font-semibold">{item.description}</span>
                      <span className="text-small text-muted">
                        {formatPence(item.unitPence)} {UNIT_LABELS[item.unit]} ·{' '}
                        {KIND_LABELS[item.kind]}
                        {added ? ` · In quote: ${quantityText(added.quantity, added.unit)}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Your quote" headingLevel="h3">
        {lines.length === 0 ? (
          <p className="rounded-card border border-dashed border-input-border p-4 text-muted">
            Nothing added yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Quote lines">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const step = stepFor(line.unit)
                const priceError =
                  parsePounds(line.priceText) === null ? 'Enter pounds, like 42.50' : undefined
                return (
                  <motion.li
                    key={line.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold text-ink">{line.description}</span>
                        <span className="text-small text-muted">{KIND_LABELS[line.kind]}</span>
                      </div>
                      <IconButton
                        label={`Remove ${line.description}`}
                        icon={<TrashIcon weight="bold" />}
                        variant="quiet"
                        size="sm"
                        onClick={() =>
                          setLines((current) => current.filter((item) => item.key !== line.key))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 xs:grid-cols-[auto_minmax(0,1fr)_auto]">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-small font-semibold text-ink" id={`qty-${line.key}`}>
                          {line.unit === 'hour'
                            ? 'Hours'
                            : line.unit === 'metre'
                              ? 'Metres'
                              : 'How many'}
                        </span>
                        <div
                          role="group"
                          aria-labelledby={`qty-${line.key}`}
                          className="flex items-center gap-1 rounded-control border border-input-border bg-surface p-1"
                        >
                          <IconButton
                            label={line.unit === 'hour' ? 'Half an hour less' : 'One fewer'}
                            icon={<MinusIcon weight="bold" />}
                            variant="ghost"
                            size="sm"
                            tooltip={false}
                            disabled={line.quantity <= step}
                            onClick={() => update(line.key, { quantity: line.quantity - step })}
                          />
                          <output
                            aria-live="polite"
                            className="figures min-w-10 text-center text-body-l font-bold text-ink"
                          >
                            {new Intl.NumberFormat('en-GB').format(line.quantity)}
                          </output>
                          <IconButton
                            label={line.unit === 'hour' ? 'Half an hour more' : 'One more'}
                            icon={<PlusIcon weight="bold" />}
                            variant="ghost"
                            size="sm"
                            tooltip={false}
                            disabled={line.quantity >= 999}
                            onClick={() => update(line.key, { quantity: line.quantity + step })}
                          />
                        </div>
                      </div>
                      <Input
                        label={`Price ${UNIT_LABELS[line.unit]}`}
                        leading="£"
                        inputMode="decimal"
                        autoComplete="off"
                        value={line.priceText}
                        error={priceError}
                        onChange={(event) => {
                          const text = event.target.value
                          const pence = parsePounds(text)
                          update(line.key, {
                            priceText: text,
                            ...(pence !== null ? { unitPence: pence } : {}),
                          })
                        }}
                      />
                      <p className="figures col-span-2 flex items-baseline justify-between gap-2 border-t border-line pt-2 text-ink xs:col-span-1 xs:flex-col xs:items-end xs:border-0 xs:pt-0">
                        <span className="text-small text-muted">Line total</span>
                        <span className="text-body-l font-bold">
                          {formatPence(lineTotal(line))}
                        </span>
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
        <div aria-live="polite">
          {errors.lines ? (
            <p className="text-small font-semibold text-critical">{errors.lines}</p>
          ) : null}
        </div>
        <OwnLine
          onAdd={(line) => {
            setErrors({})
            setLines((current) => [...current, { ...line, key: nextLineKey++ }])
          }}
        />
        <Totals
          subtotal={totals.subtotalPence}
          vat={totals.vatPence}
          total={totals.totalPence}
          vatNote="Not VAT registered"
        />
        <p className="text-small text-muted">
          {vatRegistered
            ? 'We add VAT at 20% because your profile says you’re VAT registered.'
            : 'We don’t add VAT because your profile says you’re not VAT registered.'}{' '}
          <Link to="/trade/profile#business" className="font-semibold text-accent-text underline">
            Change this
          </Link>
        </p>
      </Section>

      <div className="flex flex-col gap-6">
        <ChoiceTiles
          label="Price holds for"
          columns={3}
          options={HOLDS}
          value={holds}
          onValueChange={setHolds}
        />
        <ChoiceTiles
          label="Earliest you could start"
          hint="Optional. Helps the landlord choose."
          columns={4}
          value={start}
          onValueChange={setStart}
          options={[
            { value: 'tomorrow', label: 'Tomorrow', detail: formatShortDay(startDates.tomorrow) },
            { value: 'next', label: formatShortDay(startDates.next) },
            { value: 'week', label: 'In a week', detail: formatShortDay(startDates.week) },
            { value: 'unsure', label: 'Not sure yet' },
          ]}
        />
        <Textarea
          label={`Note for ${landlordName}`}
          optional
          hint="e.g. parts to order, or anything you’ll need from the tenant."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          error={errors.notes}
        />
      </div>

      <ActionDock
        label="Send the quote"
        status={
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-muted">
              {lines.length === 0
                ? 'No lines yet'
                : `${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`}
            </span>
            <span className="figures text-body-l font-bold text-ink">
              Total {formatPence(totals.totalPence)}
            </span>
          </span>
        }
      >
        <Button
          size="trade"
          loading={sending}
          iconStart={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
          onClick={send}
        >
          Send quote
        </Button>
      </ActionDock>
    </div>
  )
}

const KINDS: { value: LineItemKind; label: string }[] = [
  { value: 'labour', label: 'Labour' },
  { value: 'materials', label: 'Parts' },
  { value: 'callout', label: 'Call-out' },
  { value: 'other', label: 'Other' },
]

/** A line of the trade's own, optionally saved for next time. */
function OwnLine({ onAdd }: { onAdd: (line: Omit<Line, 'key'>) => void }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<LineItemKind>('materials')
  const [unit, setUnit] = useState<Unit>('each')
  const [price, setPrice] = useState('')
  const [save, setSave] = useState(false)
  const [errors, setErrors] = useState<{ description?: string; price?: string }>({})

  if (!open) {
    return (
      <Button
        variant="secondary"
        iconStart={<PlusIcon weight="bold" aria-hidden />}
        onClick={() => setOpen(true)}
        className="sm:self-start"
      >
        Add your own line
      </Button>
    )
  }

  async function add() {
    const pence = parsePounds(price)
    const next = {
      description: description.trim() ? undefined : 'Say what it’s for.',
      price: pence === null ? 'Enter the price in pounds, like 18.00.' : undefined,
    }
    setErrors(next)
    if (next.description || pence === null) return
    onAdd({
      description: description.trim(),
      kind,
      unit,
      quantity: 1,
      unitPence: pence,
      priceText: poundsInput(pence),
    })
    if (save) {
      try {
        await api.saveLineItem(viewer, {
          description: description.trim(),
          kind,
          unit,
          unitPence: pence,
        })
        toast.success('Saved for next time', { description: 'It’s now one of your quick lines.' })
      } catch (error) {
        toast.error('Not saved as a quick line', {
          description: error instanceof SlateError ? error.message : errorText(error),
        })
      }
    }
    setDescription('')
    setPrice('')
    setSave(false)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-input-border bg-surface p-4">
      <Input
        label="What it’s for"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={120}
        error={errors.description}
      />
      <ChoiceTiles label="Kind" options={KINDS} value={kind} onValueChange={setKind} columns={4} />
      <SegmentedControl
        label="Priced"
        options={[
          { value: 'each', label: 'Each' },
          { value: 'hour', label: 'By the hour' },
          { value: 'metre', label: 'By the metre' },
        ]}
        value={unit}
        onValueChange={setUnit}
      />
      <Input
        label="Price"
        leading="£"
        inputMode="decimal"
        autoComplete="off"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        error={errors.price}
      />
      <Checkbox label="Save it for next time" checked={save} onCheckedChange={setSave} />
      <div className="grid grid-cols-2 gap-(--gap-touch)">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="soft" onClick={add}>
          Add line
        </Button>
      </div>
    </div>
  )
}
