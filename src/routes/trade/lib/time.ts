// Calendar helpers for the trade portal. Every home is in Aberdeen, so days and times are UK ones,
// whatever the device's own time zone.

import type { AccessSlot, IsoDate, IsoDateTime } from '@/domain/types'

const TIME_ZONE = 'Europe/London'
const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const hourOfDay = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
})
const longDay = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: TIME_ZONE,
})
const shortDay = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const weekdayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: TIME_ZONE })

/** A calendar date ('2026-09-26') read as noon UTC, so no time zone can move it a day. */
function noonOf(date: IsoDate): Date {
  return new Date(`${date}T12:00:00Z`)
}

/** The UK calendar date an instant falls on. */
export function ukDay(at: IsoDateTime): IsoDate {
  return isoDay.format(new Date(at))
}

/** The UK hour, 0 to 23. */
export function ukHour(at: IsoDateTime): number {
  return Number(hourOfDay.format(new Date(at)))
}

export function addDaysTo(date: IsoDate, days: number): IsoDate {
  return new Date(noonOf(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** A UK wall-clock time as an instant: ukDateTime('2026-09-28', 9, 30). */
export function ukDateTime(date: IsoDate, hour: number, minute = 0): IsoDateTime {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  // Try both offsets: the right one lands back on the same wall-clock hour.
  for (const offset of [1, 0]) {
    const candidate = naive - offset * HOUR_MS
    if (ukHour(new Date(candidate).toISOString()) === hour) {
      return new Date(candidate).toISOString()
    }
  }
  return new Date(naive).toISOString()
}

export function hoursBetween(from: IsoDateTime, to: IsoDateTime): number {
  return (Date.parse(to) - Date.parse(from)) / HOUR_MS
}

/** "Saturday 26 September" */
export function formatLongDay(value: IsoDate | IsoDateTime): string {
  return longDay.format(value.length === 10 ? noonOf(value) : new Date(value))
}

/** "Mon 28 Sept" */
export function formatShortDay(value: IsoDate | IsoDateTime): string {
  return shortDay.format(value.length === 10 ? noonOf(value) : new Date(value))
}

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

/**
 * "Mon 28 Sept" for a date this year; "18 Nov 2024" for any other year, so an old quote or rating
 * can't be mistaken for a recent one.
 */
export function formatDayIn(value: IsoDate | IsoDateTime, today: IsoDate): string {
  const day = value.length === 10 ? value : ukDay(value)
  if (day.slice(0, 4) === today.slice(0, 4)) return formatShortDay(value)
  return dayMonthYear.format(noonOf(day))
}

/** "Today", "Tomorrow", "Monday" (this week) or "Mon 5 Oct". */
export function relativeDay(date: IsoDate, today: IsoDate): string {
  const days = Math.round((noonOf(date).getTime() - noonOf(today).getTime()) / DAY_MS)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days < 7) return weekdayName.format(noonOf(date))
  return formatShortDay(date)
}

export function daysFrom(from: IsoDate, to: IsoDate): number {
  return Math.round((noonOf(to).getTime() - noonOf(from).getTime()) / DAY_MS)
}

export function greeting(now: IsoDateTime): string {
  const hour = ukHour(now)
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

/** The hours each access slot covers, for booking a visit inside it. */
export const SLOT_HOURS: Record<AccessSlot, { from: number; to: number }> = {
  morning: { from: 8, to: 12 },
  afternoon: { from: 12, to: 17 },
  evening: { from: 17, to: 20 },
  all_day: { from: 8, to: 20 },
}

/** "9am", "1:30pm": short, for choice tiles. */
export function clockLabel(hour: number, minute = 0): string {
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute ? `${twelve}:${String(minute).padStart(2, '0')}${suffix}` : `${twelve}${suffix}`
}
