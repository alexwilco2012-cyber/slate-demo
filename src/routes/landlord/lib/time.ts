// UK wall-clock helpers for the landlord screens: booking a visit needs a date and time as the
// landlord reads them (Europe/London), sent to the data layer as an instant in UTC.

import type { IsoDate, IsoDateTime } from '@/domain/types'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
const TIME_ZONE = 'Europe/London'

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

/** ('2026-09-29', '09:00') → '2026-09-29T08:00:00.000Z'. Null if either part is missing. */
export function ukDateTime(date: IsoDate, time: string): IsoDateTime | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const naive = Date.parse(`${date}T${time}:00.000Z`)
  if (Number.isNaN(naive)) return null
  return new Date(naive - ukOffsetHours(naive - HOUR_MS) * HOUR_MS).toISOString()
}

/** The UK calendar date an instant falls on. */
export function ukDate(iso: IsoDateTime): IsoDate {
  const ms = Date.parse(iso)
  return new Date(ms + ukOffsetHours(ms) * HOUR_MS).toISOString().slice(0, 10)
}

/** The UK wall-clock time of an instant, e.g. '14:30'. */
export function ukTime(iso: IsoDateTime): string {
  const ms = Date.parse(iso)
  return new Date(ms + ukOffsetHours(ms) * HOUR_MS).toISOString().slice(11, 16)
}

export function addHours(iso: IsoDateTime, hours: number): IsoDateTime {
  return new Date(Date.parse(iso) + hours * HOUR_MS).toISOString()
}

export function addDays(iso: IsoDateTime, days: number): IsoDateTime {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString()
}

export function addDaysToDate(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

export function hoursBetween(from: IsoDateTime, to: IsoDateTime): number {
  return (Date.parse(to) - Date.parse(from)) / HOUR_MS
}

const clockParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "9am", "12pm", "2:30pm", in UK time. */
export function formatClock(iso: IsoDateTime): string {
  const parts = clockParts.formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === '00' ? `${twelve}${suffix}` : `${twelve}:${minute}${suffix}`
}

const longDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "Tuesday 29 September", in UK time. */
export function formatLongDay(value: IsoDate | IsoDateTime): string {
  return longDay.format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
}

const dayMonth = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
})

/**
 * "26 Sept" when it falls in the same year as now, "26 Sept 2025" otherwise, so lists don't
 * repeat this year on every row.
 */
export function formatShortDate(value: IsoDate | IsoDateTime, now: IsoDateTime): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  const day = dayMonth.format(date)
  return ukDate(date.toISOString()).slice(0, 4) === ukDate(now).slice(0, 4)
    ? day
    : `${day} ${ukDate(date.toISOString()).slice(0, 4)}`
}

/** "Tue 29 Sept, 9am to 12pm". */
export function formatVisitWindow(startsAt: IsoDateTime, endsAt: IsoDateTime): string {
  return `${formatLongDay(startsAt)}, ${formatClock(startsAt)} to ${formatClock(endsAt)}`
}

/** "Good morning", "Good afternoon" or "Good evening", by the UK clock. */
export function greeting(now: IsoDateTime): string {
  const hour = Number(ukTime(now).slice(0, 2))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Whole calendar days from one UK date to another. */
export function daysUntil(from: IsoDateTime, to: IsoDate | IsoDateTime): number {
  const a = Date.parse(`${ukDate(from)}T12:00:00Z`)
  const b = Date.parse(`${to.length === 10 ? to : ukDate(to)}T12:00:00Z`)
  return Math.round((b - a) / DAY_MS)
}
