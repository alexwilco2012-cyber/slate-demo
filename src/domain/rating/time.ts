// Date arithmetic on ISO instants, all in UTC. Months are calendar months, so a review written on
// 26 September 2026 is exactly 12 months old on 26 September 2027 and expires on 26 September 2029.

import type { IsoDateTime } from '@/domain/types'

const DAY_MS = 86_400_000

export function toMs(iso: IsoDateTime): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new RangeError(`Not an ISO date: ${iso}`)
  return ms
}

export function fromMs(ms: number): IsoDateTime {
  return new Date(ms).toISOString()
}

export function addDays(iso: IsoDateTime, days: number): IsoDateTime {
  return fromMs(toMs(iso) + days * DAY_MS)
}

/** Adds calendar months, keeping the time of day. 31 January + 1 month is 28 (or 29) February. */
export function addMonths(iso: IsoDateTime, months: number): IsoDateTime {
  const d = new Date(toMs(iso))
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + months
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return fromMs(
    Date.UTC(
      year,
      month,
      Math.min(d.getUTCDate(), lastDayOfMonth),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  )
}

/** Calendar months from `from` to `to`, with the part month as a fraction. Negative if earlier. */
export function monthsBetween(from: IsoDateTime, to: IsoDateTime): number {
  const start = toMs(from)
  const end = toMs(to)
  if (end < start) return -monthsBetween(to, from)
  const a = new Date(start)
  const b = new Date(end)
  let whole = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  while (whole > 0 && toMs(addMonths(from, whole)) > end) whole -= 1
  const anchor = toMs(addMonths(from, whole))
  const next = toMs(addMonths(from, whole + 1))
  return whole + (end - anchor) / (next - anchor)
}

export function isBefore(a: IsoDateTime, b: IsoDateTime): boolean {
  return toMs(a) < toMs(b)
}

/** The later of the given instants. */
export function latest(first: IsoDateTime, ...rest: IsoDateTime[]): IsoDateTime {
  return rest.reduce((max, iso) => (toMs(iso) > toMs(max) ? iso : max), first)
}

/** The earliest of the given instants, or null when there are none. */
export function earliestOf(list: readonly IsoDateTime[]): IsoDateTime | null {
  const [first, ...rest] = list
  if (first === undefined) return null
  return rest.reduce((min, iso) => (toMs(iso) < toMs(min) ? iso : min), first)
}
