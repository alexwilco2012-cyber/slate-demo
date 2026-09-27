import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CaretRightIcon, type Icon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import type { StatusTone } from '../lib/job'

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-surface-2 text-ink',
  info: 'bg-info-tint text-info',
  positive: 'bg-positive-tint text-positive',
  caution: 'bg-caution-tint text-caution',
  critical: 'bg-critical-tint text-critical',
}

/**
 * One thing to do, as a big row that is a link all the way across. The words carry the meaning;
 * the tinted icon only backs them up.
 */
export function TaskRow({
  to,
  icon: Glyph,
  tone = 'neutral',
  title,
  detail,
  aside,
}: {
  to: string
  icon: Icon
  tone?: StatusTone
  title: ReactNode
  detail?: ReactNode
  /** Right-hand figure, e.g. an amount. */
  aside?: ReactNode
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          'group flex min-h-18 items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 pr-3 text-ink no-underline shadow-soft',
          'transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            TONE_CLASS[tone],
          )}
        >
          <Glyph weight="bold" className="size-5.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="leading-snug font-semibold">{title}</span>
          {detail ? <span className="text-small text-muted">{detail}</span> : null}
        </span>
        {aside ? <span className="figures shrink-0 text-right font-bold">{aside}</span> : null}
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="size-5 shrink-0 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}
