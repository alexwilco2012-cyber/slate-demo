// "When can someone get in?": a week of days against morning, afternoon and evening. Tap the
// times that suit; picking all three on a day means any time that day.

import { useState } from 'react'
import { CaretDownIcon, CheckIcon, PlusIcon } from '@phosphor-icons/react'
import type { AccessSlot, AccessWindow, IsoDate } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { addDays, longDate, weekdayShort } from '../../lib/format'

const PARTS = [
  { slot: 'morning', label: 'Morning', hours: '8am to 12pm' },
  { slot: 'afternoon', label: 'Afternoon', hours: '12pm to 5pm' },
  { slot: 'evening', label: 'Evening', hours: '5pm to 8pm' },
] as const satisfies readonly { slot: AccessSlot; label: string; hours: string }[]

type Part = (typeof PARTS)[number]['slot']

export const MAX_WINDOWS = 14

/** Which parts of a day are chosen; 'all_day' counts as all three. */
function partsOn(windows: readonly AccessWindow[], date: IsoDate): Set<Part> {
  const chosen = new Set<Part>()
  for (const window of windows) {
    if (window.date !== date) continue
    if (window.slot === 'all_day') PARTS.forEach((part) => chosen.add(part.slot))
    else chosen.add(window.slot)
  }
  return chosen
}

function toWindows(date: IsoDate, parts: Set<Part>): AccessWindow[] {
  if (parts.size === PARTS.length) return [{ date, slot: 'all_day' }]
  return PARTS.filter((part) => parts.has(part.slot)).map((part) => ({ date, slot: part.slot }))
}

export function AccessGrid({
  windows,
  onChange,
  today,
  describedBy,
}: {
  windows: AccessWindow[]
  onChange: (windows: AccessWindow[]) => void
  /** Choices start tomorrow. */
  today: IsoDate
  describedBy?: string
}) {
  const [days, setDays] = useState(() => {
    const furthest = windows.reduce((max, w) => (w.date > max ? w.date : max), today)
    const needed = Math.round((Date.parse(furthest) - Date.parse(today)) / 86_400_000)
    return needed > 7 ? 14 : 7
  })
  const dates = Array.from({ length: days }, (_, index) => addDays(today, index + 1))

  function toggle(date: IsoDate, part: Part | 'all') {
    const current = partsOn(windows, date)
    let next: Set<Part>
    if (part === 'all') {
      next = current.size === PARTS.length ? new Set() : new Set(PARTS.map((p) => p.slot))
    } else {
      next = new Set(current)
      if (next.has(part)) next.delete(part)
      else next.add(part)
    }
    const others = windows.filter((window) => window.date !== date)
    onChange([...others, ...toWindows(date, next)].sort((a, b) => a.date.localeCompare(b.date)))
  }

  return (
    <div className="flex flex-col gap-3" aria-describedby={describedBy}>
      <div
        aria-hidden="true"
        className="grid grid-cols-[4.25rem_repeat(3,minmax(0,1fr))] gap-1.5 px-1 text-center text-caption text-muted sm:grid-cols-[6.5rem_repeat(3,minmax(0,1fr))]"
      >
        <span />
        {PARTS.map((part) => (
          <span key={part.slot} className="flex flex-col leading-tight">
            <span className="font-semibold text-ink">{part.label}</span>
            <span className="hidden sm:inline">{part.hours}</span>
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {dates.map((date) => {
          const chosen = partsOn(windows, date)
          const all = chosen.size === PARTS.length
          return (
            <li
              key={date}
              role="group"
              aria-label={longDate(date)}
              className={cn(
                'grid grid-cols-[4.25rem_repeat(3,minmax(0,1fr))] items-stretch gap-1.5 rounded-control p-1 transition-colors duration-(--duration-quick) sm:grid-cols-[6.5rem_repeat(3,minmax(0,1fr))]',
                chosen.size > 0 && 'bg-accent-tint/60',
              )}
            >
              <button
                type="button"
                aria-pressed={all}
                aria-label={`Any time on ${longDate(date)}`}
                onClick={() => toggle(date, 'all')}
                className="flex min-h-12 flex-col items-start justify-center rounded-control px-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="text-small font-semibold text-ink">{weekdayShort(date)}</span>
                <span className="figures text-caption text-muted">
                  {Number(date.slice(8))} {longDate(date).split(' ').at(-1)?.slice(0, 3)}
                </span>
              </button>
              {PARTS.map((part) => {
                const on = chosen.has(part.slot)
                return (
                  <button
                    key={part.slot}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${longDate(date)}, ${part.label.toLowerCase()} (${part.hours})`}
                    onClick={() => toggle(date, part.slot)}
                    className={cn(
                      'flex min-h-12 items-center justify-center rounded-control border text-small font-semibold transition-[background-color,border-color,color,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.97]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      on
                        ? 'border-accent-strong bg-accent text-on-accent shadow-soft'
                        : 'border-input-border bg-surface text-muted hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    {on ? (
                      <CheckIcon weight="bold" aria-hidden className="size-5" />
                    ) : (
                      <PlusIcon weight="bold" aria-hidden className="size-4 opacity-60" />
                    )}
                  </button>
                )
              })}
            </li>
          )
        })}
      </ul>
      {days === 7 ? (
        <button
          type="button"
          onClick={() => setDays(14)}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-1 text-small font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <CaretDownIcon weight="bold" aria-hidden className="size-4" />
          Show the week after
        </button>
      ) : null}
      <p className="text-caption text-muted">Tip: tap a day’s name to choose the whole day.</p>
    </div>
  )
}

const SLOT_WORDS: Record<AccessSlot, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  all_day: 'any time',
}

/** "Mon 28 Sept: any time", one line per day. */
export function describeWindows(windows: readonly AccessWindow[]): string[] {
  const byDate = new Map<IsoDate, AccessSlot[]>()
  for (const window of windows)
    byDate.set(window.date, [...(byDate.get(window.date) ?? []), window.slot])
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => {
      const words = slots.map((slot) => SLOT_WORDS[slot])
      const joined =
        words.length > 1 ? `${words.slice(0, -1).join(', ')} or ${words.at(-1)}` : words[0]
      return `${longDate(date)}: ${joined}`
    })
}
