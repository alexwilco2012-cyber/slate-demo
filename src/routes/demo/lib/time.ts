// Dates as the demo's people see them: UK time, whatever the viewer's own clock says.

import type { IsoDate, IsoDateTime } from '@/domain/types'
import { formatTime } from '@/components/slate/format'

const TIME_ZONE = 'Europe/London'
const DAY_MS = 24 * 60 * 60 * 1000

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const clockFace = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: TIME_ZONE })

/** '2026-09-29', the calendar day in the UK. */
export function ukDay(at: IsoDateTime): IsoDate {
  return isoDay.format(new Date(at))
}

/** 'Sat 26 Sept' */
export function dayLabel(at: IsoDateTime): string {
  return clockFace.format(new Date(at))
}

/** '12:45pm', written the same way as everywhere else in the app. */
export function timeLabel(at: IsoDateTime): string {
  return formatTime(at)
}

/** 'Tuesday' */
export function weekdayLabel(at: IsoDateTime): string {
  return weekday.format(new Date(at))
}

export function addMinutes(at: IsoDateTime, minutes: number): IsoDateTime {
  return new Date(Date.parse(at) + minutes * 60_000).toISOString()
}

/** Fractional days from one moment to another, for the demo clock. */
export function daysFrom(from: IsoDateTime, to: IsoDateTime): number {
  return (Date.parse(to) - Date.parse(from)) / DAY_MS
}

/** A calendar day some days after another. */
export function addDaysToDay(day: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/** A UK wall-clock time on a UK day, e.g. ('2026-09-29', 13) → 1pm that afternoon. */
export function ukAt(day: IsoDate, hour: number): IsoDateTime {
  // Start from the hour in UTC, then correct by however far the UK was from UTC that day.
  const guess = new Date(`${day}T${String(hour).padStart(2, '0')}:00:00Z`)
  const shown = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE })
      .format(guess)
      .slice(0, 2),
  )
  return new Date(guess.getTime() - (shown - hour) * 60 * 60 * 1000).toISOString()
}
