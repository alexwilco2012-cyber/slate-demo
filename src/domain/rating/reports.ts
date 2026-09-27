// Deadlines for the four report routes on a review (SPEC §6), read from REPORT_ROUTE_INFO.
// Defamation: notify the poster within 48 hours, not counting hours that fall on a non-business
// day (a Saturday, Sunday, Christmas Day, Good Friday or bank holiday), as the England and Wales
// regulations count them. Working days skip the same days. Days are UK calendar days: in summer,
// 23:30 UTC on a Friday is already Saturday in the UK, so that half hour doesn't count.

import {
  REPORT_ROUTE_INFO,
  type ClockRule,
  type IsoDate,
  type IsoDateTime,
  type ReportClock,
  type ReportRoute,
} from '@/domain/types'
import { fromMs, toMs } from './time'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

const UK_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const UK_WEEKDAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' })

/**
 * England and Wales bank holidays for the years the demo covers, with Christmas Day and Good
 * Friday, which the regulations name. Holidays only in Scotland or Northern Ireland are left
 * out: that can only bring a deadline forward, never past what the law allows.
 */
export const ENGLAND_AND_WALES_BANK_HOLIDAYS: readonly IsoDate[] = [
  '2025-01-01',
  '2025-04-18',
  '2025-04-21',
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
  '2026-01-01',
  '2026-04-03',
  '2026-04-06',
  '2026-05-04',
  '2026-05-25',
  '2026-08-31',
  '2026-12-25',
  '2026-12-28',
  '2027-01-01',
  '2027-03-26',
  '2027-03-29',
  '2027-05-03',
  '2027-05-31',
  '2027-08-30',
  '2027-12-27',
  '2027-12-28',
]

export interface ClockOptions {
  /**
   * UK bank holidays as 'YYYY-MM-DD', which don't count as business days. Replaces the built-in
   * ENGLAND_AND_WALES_BANK_HOLIDAYS, so a live service can pass the current official list.
   */
  readonly bankHolidays?: readonly IsoDate[]
}

/** Whether the UK calendar day this instant falls on is a business day. */
export function isBusinessDay(ms: number, options: ClockOptions = {}): boolean {
  const date = new Date(ms)
  const weekday = UK_WEEKDAY.format(date)
  if (weekday === 'Sat' || weekday === 'Sun') return false
  const holidays = options.bankHolidays ?? ENGLAND_AND_WALES_BANK_HOLIDAYS
  return !holidays.includes(UK_DATE.format(date))
}

/**
 * Adds hours that fall on business days. UK days always change on the hour, so after the part
 * hour up to the next whole hour, each hour lies inside one UK day.
 */
export function addBusinessHours(
  start: IsoDateTime,
  hours: number,
  options: ClockOptions = {},
): IsoDateTime {
  let at = toMs(start)
  let remaining = hours * HOUR_MS
  while (remaining > 0) {
    const nextHour = (Math.floor(at / HOUR_MS) + 1) * HOUR_MS
    if (isBusinessDay(at, options)) {
      if (remaining <= nextHour - at) return fromMs(at + remaining)
      remaining -= nextHour - at
    }
    at = nextHour
  }
  return fromMs(at)
}

/** Adds business days, 24 hours at a time, skipping days that aren't business days. */
export function addBusinessDays(
  start: IsoDateTime,
  days: number,
  options: ClockOptions = {},
): IsoDateTime {
  let at = toMs(start)
  let remaining = days
  while (remaining > 0) {
    at += DAY_MS
    if (isBusinessDay(at, options)) remaining -= 1
  }
  return fromMs(at)
}

export function clockDueAt(
  rule: ClockRule,
  submittedAt: IsoDateTime,
  options: ClockOptions = {},
): IsoDateTime {
  switch (rule.unit) {
    case 'hours':
      return fromMs(toMs(submittedAt) + rule.amount * HOUR_MS)
    case 'days':
      return fromMs(toMs(submittedAt) + rule.amount * DAY_MS)
    case 'working_hours':
      return addBusinessHours(submittedAt, rule.amount, options)
    case 'working_days':
      return addBusinessDays(submittedAt, rule.amount, options)
  }
}

/** The clock a new report starts, e.g. defamation: notify the poster within 48 working hours. */
export function reportClock(
  route: ReportRoute,
  submittedAt: IsoDateTime,
  options: ClockOptions = {},
): ReportClock {
  const rule: ClockRule = REPORT_ROUTE_INFO[route].clock
  return { step: rule.step, dueAt: clockDueAt(rule, submittedAt, options) }
}
