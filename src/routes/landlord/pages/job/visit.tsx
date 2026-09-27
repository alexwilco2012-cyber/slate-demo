// Booking a visit with the Scottish 48 hours' written notice, and the visits already booked.
// The rule is checked as the landlord types, explained in words, and enforced by the data layer.

import { useMemo, useState } from 'react'
import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  KeyIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate } from '@/data'
import {
  ACCESS_SLOT_LABELS,
  LETTING_RULES,
  type AccessSlot,
  type Job,
  type PersonCard,
  type Visit,
  type VisitPurpose,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'
import { errorMessage, fieldErrors } from '../../lib/errors'
import { firstName } from '../../lib/format'
import {
  addHours,
  formatClock,
  formatLongDay,
  formatVisitWindow,
  hoursBetween,
  ukDate,
  ukDateTime,
  ukTime,
} from '../../lib/time'

const SLOT_TIMES: Record<AccessSlot, [string, string]> = {
  morning: ['09:00', '12:00'],
  afternoon: ['13:00', '17:00'],
  evening: ['17:00', '20:00'],
  all_day: ['09:00', '17:00'],
}

/** "3 days" or "20 hours". */
function noticeWords(hours: number) {
  if (hours >= 48) return `${Math.floor(hours / 24)} days`
  const whole = Math.max(0, Math.floor(hours))
  return `${whole} ${whole === 1 ? 'hour' : 'hours'}`
}

/** The first moment that gives 48 hours' notice, rounded up to the next whole hour. */
function earliestStart(now: string) {
  const earliest = addHours(now, LETTING_RULES.visitNoticeHours)
  const ms = Date.parse(earliest)
  return new Date(Math.ceil(ms / 3_600_000) * 3_600_000).toISOString()
}

export function BookVisitDialog({
  job,
  trade,
  tenantName,
  open,
  onOpenChange,
}: {
  job: Job
  trade: PersonCard | undefined
  tenantName: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const earliest = earliestStart(now)
  const firstWindow = job.access.windows.find(
    (w) => ukDateTime(w.date, SLOT_TIMES[w.slot][0])! >= earliest,
  )
  const [date, setDate] = useState(firstWindow?.date ?? ukDate(earliest))
  const [start, setStart] = useState(
    firstWindow ? SLOT_TIMES[firstWindow.slot][0] : ukTime(earliest),
  )
  const [end, setEnd] = useState(
    firstWindow ? SLOT_TIMES[firstWindow.slot][1] : ukTime(addHours(earliest, 3)),
  )
  const [emergency, setEmergency] = useState(false)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)

  const purpose: VisitPurpose =
    job.complianceType || job.category === 'safety_check' ? 'safety_check' : 'repair'
  const startsAt = ukDateTime(date, start)
  const endsAt = ukDateTime(date, end)
  const hours = startsAt ? hoursBetween(now, startsAt) : null
  const canEmergency = job.urgency === 'emergency'
  const tooSoon = hours !== null && hours < LETTING_RULES.visitNoticeHours && !emergency
  const inPast = hours !== null && hours <= 0
  const tenant = tenantName ?? 'the tenant'
  const who = trade ? firstName(trade.displayName) : 'the trade'

  const status = useMemo(() => {
    if (hours === null) return null
    if (inPast)
      return { ok: false, text: 'That time has already passed. Choose a time still to come.' }
    if (emergency)
      return {
        ok: true,
        text: `Emergency: ${tenant} is told straight away, without the usual 48 hours.`,
      }
    if (tooSoon)
      return {
        ok: false,
        text: `That’s only ${noticeWords(hours)}’ notice. In Scotland tenants must get at least 48 hours’ written notice of a visit. The earliest you can book is ${formatLongDay(earliest)} at ${formatClock(earliest)}.`,
      }
    return { ok: true, text: `${noticeWords(hours)}’ notice. That meets the 48-hour rule.` }
  }, [hours, inPast, emergency, tooSoon, tenant, earliest])

  async function book() {
    const next: Partial<Record<string, string>> = {}
    if (!startsAt) next.startsAt = 'Choose a date and start time.'
    if (!endsAt || (startsAt && endsAt <= startsAt))
      next.endsAt = 'The visit must end after it starts.'
    if (Object.keys(next).length) return setErrors(next)
    if (inPast || tooSoon) return setErrors({ startsAt: status?.text })
    setBusy(true)
    try {
      await api.bookVisit(viewer, job.id, {
        purpose,
        startsAt: startsAt!,
        endsAt: endsAt!,
        emergency,
        ...(note.trim() ? { note } : {}),
      })
      toast.success('Visit booked', {
        description: `${tenantName ?? 'The tenant'} has the written notice on the repair’s conversation.`,
      })
      onOpenChange(false)
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { startsAt: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Book the visit"
        description={`When ${who} will come. ${tenantName ? `${tenantName} gets` : 'The tenant gets'} the written notice as soon as you book.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={Boolean(status && !status.ok)} onClick={book}>
              Book and send notice
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {job.access.windows.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-body font-semibold text-ink">When {tenant} said suits</p>
              <ul className="flex flex-wrap gap-2">
                {job.access.windows.map((window) => {
                  const [from, to] = SLOT_TIMES[window.slot]
                  const chosen = date === window.date && start === from && end === to
                  return (
                    <li key={`${window.date}-${window.slot}`}>
                      <button
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => {
                          setDate(window.date)
                          setStart(from)
                          setEnd(to)
                          setErrors({})
                        }}
                        className={cn(
                          'flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-small font-semibold transition-colors',
                          chosen
                            ? 'border-accent-strong bg-accent text-on-accent'
                            : 'border-input-border bg-surface text-ink hover:bg-surface-2',
                        )}
                      >
                        {chosen ? (
                          <CheckCircleIcon weight="fill" aria-hidden className="size-4" />
                        ) : null}
                        {formatLongDay(window.date)} ·{' '}
                        {ACCESS_SLOT_LABELS[window.slot].toLowerCase()}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {job.access.keyAllowed || job.access.notes ? (
                <p className="flex items-start gap-1.5 text-small text-muted">
                  <KeyIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {[
                    job.access.keyAllowed ? `${tenant} is happy for a key to be used.` : null,
                    job.access.notes ? `“${job.access.notes}”` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Date"
              type="date"
              value={date}
              min={ukDate(now)}
              onChange={(event) => {
                setDate(event.target.value)
                setErrors({})
              }}
              error={errors.startsAt && !startsAt ? errors.startsAt : undefined}
            />
            <Input
              label="From"
              type="time"
              value={start}
              step={900}
              onChange={(event) => {
                setStart(event.target.value)
                setErrors({})
              }}
            />
            <Input
              label="Until"
              type="time"
              value={end}
              step={900}
              onChange={(event) => {
                setEnd(event.target.value)
                setErrors({})
              }}
              error={errors.endsAt}
            />
          </div>

          {status ? (
            <p
              role="status"
              className={cn(
                'flex items-start gap-2 rounded-control px-3.5 py-3 text-small',
                status.ok ? 'bg-positive-tint text-positive' : 'bg-critical-tint text-critical',
              )}
            >
              {status.ok ? (
                <CheckCircleIcon weight="fill" aria-hidden className="mt-0.5 size-4.5 shrink-0" />
              ) : (
                <WarningCircleIcon weight="fill" aria-hidden className="mt-0.5 size-4.5 shrink-0" />
              )}
              <span>{status.text}</span>
            </p>
          ) : null}
          {errors.startsAt && startsAt && errors.startsAt !== status?.text ? (
            <p className="text-small font-semibold text-critical">{errors.startsAt}</p>
          ) : null}

          {canEmergency ? (
            <Checkbox
              label="This is an emergency"
              description="Emergencies can go ahead without 48 hours’ notice. The tenant is still told in writing."
              checked={emergency}
              onCheckedChange={setEmergency}
            />
          ) : null}

          <Textarea
            label={`Anything to add to the notice for ${tenant}?`}
            optional
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            showCount
            rows={2}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function VisitList({ job, trade }: { job: Job; trade: PersonCard | undefined }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [cancelling, setCancelling] = useState<Visit | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  if (job.visits.length === 0) return null
  const name = trade ? firstName(trade.displayName) : 'The trade'

  async function cancel() {
    if (!cancelling) return
    if (reason.trim().length < 3) return setError('Say why, so everyone knows.')
    setBusy(true)
    try {
      await api.cancelVisit(viewer, job.id, cancelling.id, reason)
      toast.success('Visit cancelled', { description: 'Everyone on the repair has been told.' })
      setCancelling(null)
      setReason('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const STATUS_WORDS: Record<Visit['status'], string> = {
    booked: 'Booked',
    on_site: 'On site now',
    done: 'Done',
    no_access: 'Couldn’t get in',
    cancelled: 'Cancelled',
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {[...job.visits].reverse().map((visit) => (
          <li
            key={visit.id}
            className={cn(
              'flex flex-col gap-2 rounded-card border border-line p-4',
              visit.status === 'booked' || visit.status === 'on_site'
                ? 'bg-surface shadow-soft'
                : 'bg-surface-2',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex items-start gap-2 font-semibold text-ink">
                <CalendarCheckIcon
                  weight="duotone"
                  aria-hidden
                  className="mt-0.5 size-5 shrink-0 text-accent-text"
                />
                <span>
                  {name} · {formatVisitWindow(visit.startsAt, visit.endsAt)}
                </span>
              </p>
              <span className="text-small font-semibold text-muted">
                {STATUS_WORDS[visit.status]}
              </span>
            </div>
            <p className="flex items-start gap-2 text-small text-muted">
              <ClockIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
              {visit.notice.emergency
                ? `Emergency visit, notice sent ${formatLongDay(visit.notice.givenAt)}.`
                : `Written notice sent ${formatLongDay(visit.notice.givenAt)}, ${noticeWords(visit.notice.hoursGiven)} before the visit.`}
            </p>
            {visit.status === 'booked' ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  setCancelling(visit)
                  setError(undefined)
                }}
              >
                <CalendarPlusIcon weight="bold" aria-hidden />
                Cancel or move this visit
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Dialog
        open={cancelling !== null}
        onOpenChange={(next) => (next ? null : setCancelling(null))}
      >
        <DialogContent
          title="Cancel this visit?"
          description="The tenant and the trade are told why. To move it, cancel it here and book a new time with fresh notice."
          footer={
            <>
              <Button variant="secondary" onClick={() => setCancelling(null)}>
                Keep the visit
              </Button>
              <Button variant="danger" loading={busy} onClick={cancel}>
                Cancel visit
              </Button>
            </>
          }
        >
          <Textarea
            label="Reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(undefined)
            }}
            maxLength={500}
            showCount
            rows={3}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
