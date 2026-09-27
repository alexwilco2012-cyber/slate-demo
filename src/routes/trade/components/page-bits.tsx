// Small pieces every trade page uses: section headings, the loading shape and the error state.

import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowsClockwiseIcon, CaretRightIcon, CloudSlashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'

export function Section({
  title,
  count,
  description,
  link,
  headingLevel: Heading = 'h2',
  className,
  children,
}: {
  title: ReactNode
  /** Shown beside the title, e.g. how many visits today. */
  count?: number
  description?: ReactNode
  /** A short "See all" link to the full list; `context` finishes it for screen readers. */
  link?: { to: string; label: string; context?: string }
  headingLevel?: 'h2' | 'h3'
  className?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Heading id={id} className="font-display text-display-m font-semibold text-ink">
            {title}
            {count !== undefined ? (
              <span className="figures relative -top-0.5 ml-2.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-2 px-2 align-middle font-sans text-small font-bold text-ink">
                {count}
              </span>
            ) : null}
          </Heading>
          {description ? <p className="text-small text-muted">{description}</p> : null}
        </div>
        {link ? (
          <SeeAll to={link.to} context={link.context}>
            {link.label}
          </SeeAll>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function SeeAll({
  to,
  context,
  children,
}: {
  to: string
  context?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className="-mt-1.5 -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 font-semibold whitespace-nowrap text-accent-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
      {context ? <span className="sr-only"> {context}</span> : null}
      <CaretRightIcon weight="bold" aria-hidden className="size-4" />
    </Link>
  )
}

/** When a read fails: say so plainly and offer to try again. */
export function LoadError({
  what,
  onRetry,
  className,
}: {
  /** e.g. "your jobs" */
  what: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-4 rounded-card border border-input-border bg-surface p-5 sm:flex-row sm:items-center',
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-critical-tint text-critical">
        <CloudSlashIcon weight="bold" aria-hidden className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold text-ink">We couldn’t load {what}</p>
        <p className="text-small text-muted">
          Nothing you’ve done is lost. Check your signal, then try again.
        </p>
      </div>
      <Button
        variant="secondary"
        iconStart={<ArrowsClockwiseIcon weight="bold" aria-hidden />}
        onClick={onRetry}
        className="max-sm:w-full"
      >
        Try again
      </Button>
    </div>
  )
}

/** A page-shaped placeholder: a title, then a few cards the height of the real ones. */
export function PageSkeleton({ label, cards = 3 }: { label: string; cards?: number }) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-3/4 max-w-sm" />
        <Skeleton className="h-5 w-2/3 max-w-md" />
      </div>
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton key={index} className="h-44 w-full rounded-card" />
      ))}
    </LoadingRegion>
  )
}

/**
 * A fact with its label, for "Area", "Distance" and so on: one dt/dd pair for a <dl>. The icon
 * sits inside the dt, because a <dl>'s groups may hold nothing but their dt and dd.
 */
export function Fact({
  label,
  children,
  icon,
  className,
}: {
  label: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative flex min-w-0 flex-col', icon && 'min-h-10 pl-12', className)}>
      <dt className="text-small text-muted">
        {icon ? (
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0 flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink [&_svg]:size-5"
          >
            {icon}
          </span>
        ) : null}
        {label}
      </dt>
      <dd className="font-semibold break-words text-ink">{children}</dd>
    </div>
  )
}
