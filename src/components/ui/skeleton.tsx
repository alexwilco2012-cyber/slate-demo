import type { ReactNode } from 'react'
import { cn } from './cn'

/** A placeholder block with a slow shimmer (static when reduced motion is on). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('slate-skeleton block rounded-md', className)} />
}

/** Lines of placeholder text; the last line is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </span>
  )
}

/**
 * Wraps skeletons so screen readers hear "Loading repairs" once instead of a silent page.
 * Keep the skeleton the same shape as the content so nothing jumps when it arrives.
 */
export function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
