// Tenant-portal wording for times and dates, in UK time. The shared formatters in
// @/components/slate/format cover dates and money; these add the friendlier phrasing the tenant
// screens use ("9am to 12pm", "Tomorrow", "Good morning").

import type { IsoDate, IsoDateTime } from '@/domain/types'
import { daysBetween, formatWeekday } from '@/components/slate/format'

const TIME_ZONE = 'Europe/London'

const hourMinute = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
})
const longDay = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: TIME_ZONE,
})
const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: TIME_ZONE,
})
const shortWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: TIME_ZONE })
const ukDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })

function toDate(value: IsoDate | IsoDateTime): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
}

function hourAndMinute(value: IsoDateTime): { hour: number; minute: number } {
  const parts = hourMinute.formatToParts(toDate(value))
  const read = (type: 'hour' | 'minute') =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { hour: read('hour'), minute: read('minute') }
}

/** "9am", "1:30pm", "12pm". */
export function clock(value: IsoDateTime): string {
  const { hour, minute } = hourAndMinute(value)
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0
    ? `${twelve}${suffix}`
    : `${twelve}:${String(minute).padStart(2, '0')}${suffix}`
}

/** "Tuesday 29 September" */
export function longDate(value: IsoDate | IsoDateTime): string {
  return longDay.format(toDate(value)).replace(',', '')
}

/** "29 September" */
export function dayAndMonth(value: IsoDate | IsoDateTime): string {
  return dayMonth.format(toDate(value))
}

/** "Mon" */
export function weekdayShort(value: IsoDate): string {
  return shortWeekday.format(toDate(value))
}

/** The calendar date in the UK, e.g. '2026-09-26'. */
export function ukDate(value: IsoDateTime): IsoDate {
  return ukDay.format(toDate(value))
}

/** "Today", "Tomorrow", "Yesterday", or "Tue 29 Sept". */
export function relativeDay(value: IsoDate | IsoDateTime, now: IsoDateTime): string {
  const days = daysBetween(now, value)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return formatWeekday(value)
}

/** "Today", "Tomorrow", "In 3 days", or the date when it's further off. */
export function dueIn(value: IsoDate | IsoDateTime, now: IsoDateTime): string {
  const days = daysBetween(now, value)
  if (days >= 2 && days <= 6) return `In ${days} days`
  return relativeDay(value, now)
}

/** "Tomorrow, 9am to 12pm" or "Tue 29 Sept, 9am to 12pm". */
export function visitWindow(startsAt: IsoDateTime, endsAt: IsoDateTime, now: IsoDateTime): string {
  return `${relativeDay(startsAt, now)}, ${clock(startsAt)} to ${clock(endsAt)}`
}

/** "Good morning" before noon, "Good afternoon" until six, then "Good evening". */
export function greeting(now: IsoDateTime): string {
  const { hour } = hourAndMinute(now)
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Adds whole days to a calendar date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const next = new Date(`${date}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

/**
 * Working days (Monday to Friday) after `from`, up to and including `to`. Bank holidays aren't
 * counted out, so this can only ever flatter a late deposit by a day or two, never condemn one.
 */
export function workingDaysBetween(from: IsoDate, to: IsoDate): number {
  if (to <= from) return 0
  let count = 0
  for (let day = addDays(from, 1); day <= to; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) count += 1
  }
  return count
}

/** "4 days" or "1 day" of notice, from hours. */
export function noticeText(hours: number): string {
  if (hours < 48) return `${Math.round(hours)} hours`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** A person's first name, for warm copy ("Graham will see it straight away"). */
export function firstName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName
}

/** "£875" for whole pounds, "£12.50" otherwise. */
export function pounds(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100)
}

/** "1st", "2nd", "23rd". */
export function ordinal(day: number): string {
  const tens = day % 100
  if (tens >= 11 && tens <= 13) return `${day}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'
  return `${day}${suffix}`
}
