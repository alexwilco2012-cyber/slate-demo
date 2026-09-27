// Display formatting shared by the Slate components: British English, UK time.

import type { IsoDate, IsoDateTime, Pence } from '@/domain/types'

const TIME_ZONE = 'Europe/London'

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})
const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
})
const weekdayDayMonth = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
})
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const oneDecimal = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** A calendar date ('2026-09-26') is read as noon UTC so no time zone can move it a day. */
function toDate(value: IsoDate | IsoDateTime): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
}

/** "26 Sept 2026" */
export function formatDate(value: IsoDate | IsoDateTime) {
  return dayMonthYear.format(toDate(value))
}

/** "September 2026" */
export function formatMonthYear(value: IsoDate | IsoDateTime) {
  return monthYear.format(toDate(value))
}

/** "Sat 26 Sept" */
export function formatWeekday(value: IsoDate | IsoDateTime) {
  return weekdayDayMonth.format(toDate(value))
}

/** "9am", "12pm", "2:30pm": the one way the whole app writes a time of day. */
export function formatTime(value: IsoDateTime) {
  const parts = clock.formatToParts(toDate(value))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === '00' ? `${twelve}${suffix}` : `${twelve}:${minute}${suffix}`
}

/** "£1,240.00" from whole pence. */
export function formatPence(pence: Pence) {
  return money.format(pence / 100)
}

/** "4.6": scores always show one decimal. */
export function formatScore(score: number) {
  return oneDecimal.format(Math.round(score * 10) / 10)
}

/** Whole days from `from` to `to`, by calendar date in the UK. Negative when `to` is earlier. */
export function daysBetween(from: IsoDate | IsoDateTime, to: IsoDate | IsoDateTime) {
  const day = (value: IsoDate | IsoDateTime) =>
    Date.parse(`${isoDay.format(toDate(value))}T00:00:00Z`)
  return Math.round((day(to) - day(from)) / 86_400_000)
}

/** "23 days left", "Due today", "Expired 5 days ago". */
export function describeDaysLeft(daysLeft: number) {
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return '1 day left'
  if (daysLeft > 1) return `${daysLeft} days left`
  if (daysLeft === -1) return 'Expired yesterday'
  return `Expired ${-daysLeft} days ago`
}

/** "1 review", "3 reviews" */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${new Intl.NumberFormat('en-GB').format(count)} ${count === 1 ? one : many}`
}
