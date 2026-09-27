import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { LogoMark } from '@/components/slate/logo'
import { RoleAccentBar } from '@/components/slate/role-accent-bar'

/** Waits a moment before showing, so a quick load never flashes a placeholder. */
function Delayed({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * The portal's shape while its code or its person loads: accent bar, header, navigation and a
 * few content blocks, so nothing jumps when the real screen arrives.
 */
export function PortalSkeleton({ role }: { role: Role }) {
  return (
    <div data-role={role} role="status" aria-busy="true" className="min-h-dvh bg-bg lg:flex">
      <span className="sr-only">Loading</span>
      <div className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <RoleAccentBar />
        <Delayed className="flex flex-col gap-6 px-5 pt-6">
          <Skeleton className="h-8 w-44" />
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-9 w-full rounded-control" />
            ))}
          </div>
        </Delayed>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <RoleAccentBar />
        {/* The same height as the real header, so nothing moves when it arrives. */}
        <div className="flex min-h-16 items-center justify-between border-b border-line px-(--gutter) py-2 lg:pt-5 lg:pb-3">
          <Skeleton className="h-7 w-40 lg:hidden" />
          <Skeleton className="ml-auto size-9 rounded-full" />
        </div>
        <Delayed className="flex flex-col gap-5 px-(--gutter) pt-6 lg:pt-8">
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-1/2 max-w-sm" />
          <Skeleton className="h-36 w-full max-w-3xl rounded-card" />
          <Skeleton className="h-24 w-full max-w-3xl rounded-card" />
        </Delayed>
      </div>
    </div>
  )
}

/** For pages outside the portals (the public site, the demo page) while their code loads. */
export function PageFallback({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn('flex min-h-dvh items-center justify-center bg-bg', className)}
    >
      <span className="sr-only">Loading</span>
      <Delayed className="flex items-center gap-3 text-muted">
        <LogoMark size="md" />
        <Spinner className="size-5" />
      </Delayed>
    </div>
  )
}
