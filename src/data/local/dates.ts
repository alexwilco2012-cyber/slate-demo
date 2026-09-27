// Date helpers for the local data layer. Instants are ISO strings in UTC; calendar dates and
// wall-clock times are UK ones, because every home in the demo is in Aberdeen.

import type { IsoDate, IsoDateTime } from '@/domain/types'

export const TIME_ZONE = 'Europe/London'
const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

export function toMs(iso: IsoDateTime): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new RangeError(`Not an ISO date: ${iso}`)
  return ms
}

export function fromMs(ms: number): IsoDateTime {
  return new Date(ms).toISOString()
}

export function addHours(iso: IsoDateTime, hours: number): IsoDateTime {
  return fromMs(toMs(iso) + hours * HOUR_MS)
}

export function addDays(iso: IsoDateTime, days: number): IsoDateTime {
  return fromMs(toMs(iso) + days * DAY_MS)
}

export function hoursBetween(from: IsoDateTime, to: IsoDateTime): number {
  return (toMs(to) - toMs(from)) / HOUR_MS
}

export function isBefore(a: IsoDateTime, b: IsoDateTime): boolean {
  return toMs(a) < toMs(b)
}

/** The day of the month on which British Summer Time starts or ends: the last Sunday. */
function lastSunday(year: number, monthIndex: number): number {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  return last.getUTCDate() - last.getUTCDay()
}

/** 1 during British Summer Time, otherwise 0. The clocks change at 01:00 UTC. */
function ukOffsetHours(ms: number): number {
  const year = new Date(ms).getUTCFullYear()
  const start = Date.UTC(year, 2, lastSunday(year, 2), 1)
  const end = Date.UTC(year, 9, lastSunday(year, 9), 1)
  return ms >= start && ms < end ? 1 : 0
}

/** A UK wall-clock time on a UK date, e.g. ('2026-09-29', '09:00') → '2026-09-29T08:00:00.000Z'. */
export function ukDateTime(date: IsoDate, time = '09:00'): IsoDateTime {
  const naive = Date.parse(`${date}T${time}:00.000Z`)
  if (Number.isNaN(naive)) throw new RangeError(`Not a date and time: ${date} ${time}`)
  return fromMs(naive - ukOffsetHours(naive - HOUR_MS) * HOUR_MS)
}

/** The UK calendar date an instant falls on. */
export function ukDate(iso: IsoDateTime): IsoDate {
  const ms = toMs(iso)
  return fromMs(ms + ukOffsetHours(ms) * HOUR_MS).slice(0, 10)
}

/** Midnight UK time at the start of a date. */
export function startOfUkDay(date: IsoDate): IsoDateTime {
  return ukDateTime(date, '00:00')
}

export function addDaysToDate(date: IsoDate, days: number): IsoDate {
  return fromMs(Date.parse(`${date}T12:00:00.000Z`) + days * DAY_MS).slice(0, 10)
}

/** Calendar months; 31 January plus one month is the last day of February. */
export function addMonthsToDate(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0))
  target.setUTCDate(Math.min(day, lastDay.getUTCDate()))
  return target.toISOString().slice(0, 10)
}

/** Whole days from one calendar date to another; negative if `to` is earlier. */
export function daysBetweenDates(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / DAY_MS,
  )
}

export function isValidDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function isValidDateTime(value: string): value is IsoDateTime {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))
}

const visitDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "9am", "12pm", "2:30pm", in UK time. */
export function formatClock(iso: IsoDateTime): string {
  const parts = clock.formatToParts(new Date(toMs(iso)))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === '00' ? `${twelve}${suffix}` : `${twelve}:${minute}${suffix}`
}

/** "Tuesday 29 September", in UK time. */
export function formatDay(iso: IsoDateTime): string {
  return visitDay.format(new Date(toMs(iso)))
}

/**
 * When something closes, ready to follow "closes": "on Friday 2 October at 6:10pm". Midnight
 * reads as the end of the day before: "at the end of Monday 28 September".
 */
export function formatDeadline(iso: IsoDateTime): string {
  if (formatClock(iso) === '12am') return `at the end of ${formatDay(addHours(iso, -1))}`
  return `on ${formatDay(iso)} at ${formatClock(iso)}`
}

/** "3 days'" or "20 hours'", for notice periods. */
export function formatNotice(hours: number): string {
  if (hours >= 48) {
    const days = Math.floor(hours / 24)
    return `${days} days'`
  }
  const whole = Math.max(0, Math.floor(hours))
  return whole === 1 ? "1 hour's" : `${whole} hours'`
}

const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'long' })
const dayMonth = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
})

/** "Thursday", in UK time. */
export function formatWeekday(iso: IsoDateTime): string {
  return weekday.format(new Date(toMs(iso)))
}

/** "24 September", in UK time. */
export function formatDayMonth(iso: IsoDateTime): string {
  return dayMonth.format(new Date(toMs(iso)))
}

/**
 * How long ago something was, in words that follow "Since": "8am" today, "yesterday", a weekday
 * within the last week, or a date.
 */
export function sinceText(since: IsoDateTime, now: IsoDateTime): string {
  const days = daysBetweenDates(ukDate(since), ukDate(now))
  if (days <= 0) return formatClock(since)
  if (days === 1) return 'yesterday'
  if (days < 7) return formatWeekday(since)
  return formatDayMonth(since)
}
