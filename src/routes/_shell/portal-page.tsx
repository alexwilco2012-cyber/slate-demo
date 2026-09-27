import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { useDocumentTitle } from './route-effects'

const WIDTHS = {
  /** Forms and one-question-per-screen flows. */
  narrow: 'max-w-2xl',
  /** Most pages. */
  default: 'max-w-5xl',
  /** Lists with a detail drawer, tables. */
  wide: 'max-w-7xl',
} as const

export interface PortalPageProps {
  /** Names the browser tab: "Repairs · Slate". The visible heading is the page's own PageHeader. */
  title: string
  width?: keyof typeof WIDTHS
  className?: string
  children: ReactNode
}

/** Optional wrapper for a portal page: a consistent width and the browser tab's title. */
export function PortalPage({ title, width = 'default', className, children }: PortalPageProps) {
  useDocumentTitle(title)
  return (
    <div className={cn('mx-auto flex w-full flex-col gap-6', WIDTHS[width], className)}>
      {children}
    </div>
  )
}
