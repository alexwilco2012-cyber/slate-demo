import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from './cn'

export interface EmptyStateProps {
  icon: Icon
  title: ReactNode
  /** Say why it is empty and what happens next. */
  description?: ReactNode
  /** The next step (SPEC §9: empty states point to the next step). */
  action?: ReactNode
  secondaryAction?: ReactNode
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/** Nothing here yet, and what to do about it. */
export function EmptyState({
  icon: Glyph,
  title,
  description,
  action,
  secondaryAction,
  headingLevel: Heading = 'h3',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      <span className="relative flex size-18 items-center justify-center rounded-full bg-accent-tint text-accent-text">
        <Glyph weight="duotone" aria-hidden className="size-9" />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <Heading className="font-display text-display-m font-semibold text-ink">{title}</Heading>
        {description ? <p className="text-body text-muted">{description}</p> : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex w-full flex-col items-center gap-(--gap-touch) sm:w-auto sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
