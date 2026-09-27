// The demo's fixed "today". Every date in the seed is written relative to it, or as a UK date and
// time before it, so the story reads the same whenever the demo is opened.

import { addDaysToDate, ukDateTime } from '@/data/local/dates'
import type { IsoDate, IsoDateTime } from '@/domain/types'

/** Saturday 26 September 2026. */
export const DEMO_TODAY: IsoDate = '2026-09-26'

/** 10am UK time on the demo's today, when the story is picked up. */
export const DEMO_NOW: IsoDateTime = ukDateTime(DEMO_TODAY, '10:00')

/** A UK date `offset` days from the demo's today: day(-1) is Friday 25 September 2026. */
export function day(offset: number): IsoDate {
  return addDaysToDate(DEMO_TODAY, offset)
}

/** A UK wall-clock time `offset` days from the demo's today: d(-1, '18:42'). */
export function d(offset: number, time = '09:00'): IsoDateTime {
  return ukDateTime(day(offset), time)
}

/** A UK wall-clock time on a given date, for the older history: on('2024-11-18', '07:40'). */
export function on(date: IsoDate, time = '09:00'): IsoDateTime {
  return ukDateTime(date, time)
}
