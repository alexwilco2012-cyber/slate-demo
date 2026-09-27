// Loading and error states shared by the landlord screens.

import type { ReactNode } from 'react'
import { ArrowClockwiseIcon, CloudWarningIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { errorMessage } from '../lib/errors'

/** A failed read, what went wrong and a way to try again. */
export function ErrorPanel({
  error,
  onRetry,
  title = 'This didn’t load',
  className,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-critical-tint text-critical"
      >
        <CloudWarningIcon weight="duotone" className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-small text-muted">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button
          variant="secondary"
          iconStart={<ArrowClockwiseIcon weight="bold" aria-hidden />}
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  )
}

/** Placeholder rows shaped like a list of cards. */
export function ListSkeleton({
  rows = 3,
  label,
  className,
}: {
  rows?: number
  label: string
  className?: string
}) {
  return (
    <LoadingRegion label={label} className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-card border border-line bg-surface p-4"
        >
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <SkeletonText lines={2} className="flex-1" />
          <Skeleton className="hidden h-10 w-28 rounded-control sm:block" />
        </div>
      ))}
    </LoadingRegion>
  )
}

/** Placeholder cards in a grid. */
export function CardGridSkeleton({
  cards = 3,
  label,
  className,
  children,
}: {
  cards?: number
  label: string
  className?: string
  children?: ReactNode
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-card border border-line bg-surface">
          {children ?? (
            <>
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="flex flex-col gap-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <SkeletonText lines={2} />
              </div>
            </>
          )}
        </div>
      ))}
    </LoadingRegion>
  )
}

/** A page's worth of placeholder: header and a few blocks. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-1/2 max-w-sm" />
      </div>
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
    </LoadingRegion>
  )
}
