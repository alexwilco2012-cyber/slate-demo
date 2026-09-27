// Booking a visit: a day, a start time and how long, all as big choices (no dropdowns). Times
// that would give the tenant less than 48 hours' written notice are shown but can't be picked,
// unless the job is an emergency. The tenant's own access times are marked.

import { useMemo, useState } from 'react'
import { CalendarCheckIcon, InfoIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlate } from '@/data'
import { ACCESS_SLOT_LABELS, LETTING_RULES, type Job, type VisitPurpose } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { plural } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ChoiceTiles } from '../components/choice-tiles'
import { errorText, fieldError } from '../lib/errors'
import {
  SLOT_HOURS,
  addDaysTo,
  clockLabel,
  formatLongDay,
  formatShortDay,
  hoursBetween,
  relativeDay,
  ukDateTime,
  ukDay,
} from '../lib/time'

const DAYS_AHEAD = 12
const FIRST_HOUR = 8
const LAST_HOUR = 19
const LENGTHS = ['1', '2', '3', '4'] as const
type Length = (typeof LENGTHS)[number]

function dayLabel(date: string, today: string): string {
  const relative = relativeDay(date, today)
  return relative === 'Today' || relative === 'Tomorrow' ? relative : formatShortDay(date)
}

/** "2 days and 3 hours", "5 days", "20 hours". */
function noticeText(hours: number): string {
  const whole = Math.round(hours)
  const days = Math.floor(whole / 24)
  const rest = whole % 24
  if (days === 0) return plural(rest, 'hour')
  if (rest === 0) return plural(days, 'day')
  return `${plural(days, 'day')} and ${plural(rest, 'hour')}`
}

export function BookVisitSheet({
  open,
  onOpenChange,
  job,
  tenantName,
  purpose = 'repair',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
  tenantName: string
  purpose?: VisitPurpose
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const toast = useToast()
  const today = ukDay(now)
  const [emergency, setEmergency] = useState(false)
  const [day, setDay] = useState<string | undefined>()
  const [hour, setHour] = useState<string | undefined>()
  const [length, setLength] = useState<Length>('2')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ day?: string; hour?: string; note?: string }>({})
  const [saving, setSaving] = useState(false)

  const noticeHours = emergency ? 0 : LETTING_RULES.visitNoticeHours
  const bookable = (date: string, h: number) =>
    hoursBetween(now, ukDateTime(date, h)) >= Math.max(noticeHours, 0.25)

  const windowsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const window of job.access.windows) {
      map.set(window.date, [...(map.get(window.date) ?? []), ACCESS_SLOT_LABELS[window.slot]])
    }
    return map
  }, [job.access.windows])

  const days = Array.from({ length: DAYS_AHEAD }, (_, index) => addDaysTo(today, index))
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, index) => FIRST_HOUR + index)
  const suits = (date: string, h: number) =>
    job.access.windows.some(
      (window) =>
        window.date === date && h >= SLOT_HOURS[window.slot].from && h < SLOT_HOURS[window.slot].to,
    )

  const chosenHour = hour ? Number(hour) : undefined
  const startsAt = day && chosenHour !== undefined ? ukDateTime(day, chosenHour) : undefined
  const endsAt =
    day && chosenHour !== undefined ? ukDateTime(day, chosenHour + Number(length)) : undefined
  const notice = startsAt ? hoursBetween(now, startsAt) : undefined

  async function book() {
    const next: typeof errors = {}
    if (!day) next.day = 'Choose a day.'
    else if (chosenHour === undefined) next.hour = 'Choose a start time.'
    setErrors(next)
    if (!startsAt || !endsAt) return
    setSaving(true)
    try {
      await api.bookVisit(viewer, job.id, {
        purpose,
        startsAt,
        endsAt,
        emergency,
        note: note.trim() || undefined,
      })
      onOpenChange(false)
      toast.success('Visit booked', {
        description: `${tenantName} has the written notice on the job.`,
      })
    } catch (error) {
      setErrors({
        hour: fieldError(error, 'startsAt') ?? fieldError(error, 'endsAt'),
        note: fieldError(error, 'note'),
      })
      if (!fieldError(error, 'startsAt') && !fieldError(error, 'note')) {
        toast.error('Visit not booked', { description: errorText(error) })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={purpose === 'quote' ? 'Book a visit to price it' : 'Book a visit'}
        description={`${tenantName} gets written notice on the job as soon as you book.`}
        size="lg"
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Cancel</Button>} />
            <Button
              loading={saving}
              iconStart={<CalendarCheckIcon weight="bold" aria-hidden />}
              onClick={book}
            >
              Book visit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {job.urgency === 'emergency' ? (
            <Switch
              label="Emergency visit"
              description="Emergencies don’t need 48 hours’ notice. We still tell the tenant straight away."
              checked={emergency}
              onCheckedChange={setEmergency}
            />
          ) : (
            <p className="flex items-start gap-2.5 rounded-control bg-info-tint p-3 text-small text-info">
              <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                In Scotland tenants get at least 48 hours’ written notice, so you can’t pick an
                earlier time.
              </span>
            </p>
          )}

          <ChoiceTiles
            label="Day"
            value={day}
            onValueChange={(value) => {
              setDay(value)
              setHour(undefined)
              setErrors({})
            }}
            error={errors.day}
            options={days.map((date) => {
              const open = hours.some((h) => bookable(date, h))
              const wanted = windowsByDay.get(date)
              return {
                value: date,
                label: dayLabel(date, today),
                detail: !open
                  ? 'Too soon for notice'
                  : wanted
                    ? `${tenantName}: ${wanted.join(', ').toLowerCase()}`
                    : undefined,
                disabled: !open,
              }
            })}
          />

          {day ? (
            <ChoiceTiles
              label="Start time"
              hint={
                windowsByDay.has(day)
                  ? `Times marked “Suits ${tenantName}” are in the access times they gave.`
                  : `${tenantName} didn’t give times for this day. Message them to check.`
              }
              columns={3}
              value={hour}
              onValueChange={(value) => {
                setHour(value)
                setErrors({})
              }}
              error={errors.hour}
              options={hours.map((h) => ({
                value: String(h),
                label: clockLabel(h),
                detail: !bookable(day, h)
                  ? 'Too soon'
                  : suits(day, h)
                    ? `Suits ${tenantName}`
                    : undefined,
                disabled: !bookable(day, h),
              }))}
            />
          ) : null}

          <SegmentedControl
            label="How long"
            options={LENGTHS.map((value) => ({
              value,
              label: plural(Number(value), 'hour'),
            }))}
            value={length}
            onValueChange={setLength}
            stackOnPhone={false}
          />

          <Textarea
            label={`Note for ${tenantName}`}
            optional
            hint="Added to the written notice, e.g. “I’ll need to turn the water off for an hour.”"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            error={errors.note}
          />

          {startsAt && endsAt && notice !== undefined ? (
            <p
              aria-live="polite"
              className="flex flex-col gap-0.5 rounded-control border border-input-border bg-surface-2 p-3.5"
            >
              <span className="font-bold text-ink">
                {formatLongDay(startsAt)}, {clockLabel(Number(hour))} to{' '}
                {clockLabel(Number(hour) + Number(length))}
              </span>
              <span className="text-small text-muted">
                {emergency
                  ? 'It’s an emergency, so the 48-hour rule doesn’t apply.'
                  : `That gives ${tenantName} ${noticeText(notice)} of notice.`}
              </span>
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
