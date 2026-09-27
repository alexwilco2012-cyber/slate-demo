import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CaretRightIcon, type Icon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

export interface StatTileProps {
  label: string
  /** The figure. Money is pre-formatted, e.g. "£1,240". */
  value: ReactNode
  /** One short line of context, e.g. "2 need approval". */
  hint?: ReactNode
  icon?: Icon
  /** 'accent' tints the tile for the one number that needs the person today. */
  tone?: 'default' | 'accent'
  /** Makes the whole tile a link to the list behind the number. */
  to?: string
  className?: string
}

/** One number with its label, for dashboards. Linked tiles show a chevron as well as a hover. */
export function StatTile({
  label,
  value,
  hint,
  icon: Glyph,
  tone = 'default',
  to,
  className,
}: StatTileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-small font-semibold text-muted">
          {Glyph ? (
            <Glyph
              weight="bold"
              aria-hidden
              className={cn('size-4.5 shrink-0', tone === 'accent' && 'text-accent-text')}
            />
          ) : null}
          {label}
        </span>
        {to ? (
          <CaretRightIcon
            weight="bold"
            aria-hidden
            className="size-4 shrink-0 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
          />
        ) : null}
      </span>
      <span className="font-display figures text-display-l leading-none font-semibold text-ink">
        {value}
      </span>
      {hint ? <span className="text-small text-muted">{hint}</span> : null}
    </>
  )

  const classes = cn(
    'group flex min-h-28 flex-col justify-between gap-3 rounded-card p-4 no-underline',
    tone === 'accent'
      ? 'border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint'
      : 'border border-line bg-surface shadow-soft',
    to &&
      'transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    className,
  )

  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}
