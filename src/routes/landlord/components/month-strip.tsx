// The compliance calendar at a glance: how many certificates run out in each of the next twelve
// months. A month with something in it can be chosen to list only those.

import type { ComplianceItem, IsoDate } from '@/domain/types'
import { cn } from '@/components/ui/cn'

/** "2026-10" for each of this month and the eleven after it. */
export function nextTwelveMonths(today: IsoDate): string[] {
  const [year, month] = today.split('-').map(Number) as [number, number]
  return Array.from({ length: 12 }, (_, index) =>
    new Date(Date.UTC(year, month - 1 + index, 1)).toISOString().slice(0, 7),
  )
}

/** The month a certificate runs out, as "2026-10", or null if it never does or isn't on file. */
export function expiryMonth(item: ComplianceItem): string | null {
  return item.document?.expiresAt?.slice(0, 7) ?? null
}

const short = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const long = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function dateOf(month: string) {
  return new Date(`${month}-01T12:00:00Z`)
}

/** "November 2026". */
export function monthName(month: string): string {
  return long.format(dateOf(month))
}

export function MonthStrip({
  months,
  counts,
  selected,
  onSelect,
}: {
  months: readonly string[]
  counts: ReadonlyMap<string, number>
  selected: string | null
  onSelect: (month: string | null) => void
}) {
  return (
    <ol className="grid grid-cols-6 gap-1.5 sm:gap-2 lg:grid-cols-12" aria-label="Next 12 months">
      {months.map((month, index) => {
        const count = counts.get(month) ?? 0
        const date = dateOf(month)
        const showYear = index === 0 || date.getUTCMonth() === 0
        const label = (
          <>
            <span className="text-caption font-semibold text-muted">
              {short.format(date)}
              {showYear ? (
                <span className="block font-normal">{date.getUTCFullYear()}</span>
              ) : (
                <span className="block font-normal" aria-hidden="true">
                  &nbsp;
                </span>
              )}
            </span>
            <span
              className={cn(
                'figures font-display text-title leading-none font-semibold',
                count > 0 ? 'text-ink' : 'text-muted',
              )}
            >
              <span aria-hidden="true">{count}</span>
            </span>
            <span className="sr-only">
              {count === 0
                ? ': nothing runs out'
                : `: ${count} ${count === 1 ? 'certificate runs' : 'certificates run'} out`}
            </span>
          </>
        )
        const cell =
          'flex min-h-20 w-full flex-col items-center justify-between gap-1 rounded-control border px-1 py-2 text-center'
        return (
          <li key={month} className="flex">
            {count > 0 ? (
              <button
                type="button"
                aria-pressed={selected === month}
                onClick={() => onSelect(selected === month ? null : month)}
                className={cn(
                  cell,
                  'transition-[box-shadow,border-color,background-color] duration-(--duration-quick) hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  selected === month
                    ? 'border-accent-strong bg-accent-tint shadow-soft'
                    : 'border-input-border bg-surface shadow-soft',
                )}
              >
                {label}
              </button>
            ) : (
              <span className={cn(cell, 'border-dashed border-line bg-transparent')}>{label}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
