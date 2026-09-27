import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

export interface PageHeaderProps {
  title: ReactNode
  /** A short line above the title, e.g. the property: "17 Fonthill Road, Ferryhill". */
  eyebrow?: ReactNode
  description?: ReactNode
  /** Where "back" goes, and what it's called: "Repairs", not just "Back". */
  back?: { to: string; label: string }
  /**
   * Buttons beside the title once the header itself is 576px wide, under it when narrower. It
   * measures its own width, so a header in a narrow column or drawer stacks too.
   */
  actions?: ReactNode
  /** Badges and facts under the title, e.g. status and urgency. */
  meta?: ReactNode
  className?: string
}

/** The page's single h1, with an optional named back link, facts and actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  back,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('@container flex flex-col gap-3', className)}>
      {back ? (
        <Link
          to={back.to}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 text-body font-semibold text-accent-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <CaretLeftIcon weight="bold" aria-hidden className="size-4.5" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-end @xl:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? <p className="text-small font-semibold text-muted">{eyebrow}</p> : null}
          <h1 className="font-display text-display-l font-semibold text-ink">{title}</h1>
          {description ? <p className="max-w-prose text-body-l text-muted">{description}</p> : null}
          {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-(--gap-touch) @max-xl:[&>*]:flex-1">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
