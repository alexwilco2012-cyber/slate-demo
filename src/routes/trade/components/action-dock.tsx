import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/components/ui/cn'

/**
 * The screen's one main action, kept in the bottom third where a thumb reaches it (Hi-Vis rules).
 * It floats above the phone's bottom bar, and at the foot of the column on a computer. Put it
 * last in the page so it never covers the end of the content. Secondary actions belong in the
 * page itself: the dock stays one button tall so it hides as little of the screen as it can.
 */
export function ActionDock({
  children,
  label,
  status,
  className,
}: {
  children: ReactNode
  /** Names the group for screen readers, e.g. "Job actions". */
  label: string
  /** One line above the button, e.g. a quote's running total. */
  status?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      role="group"
      aria-label={label}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky bottom-[calc(4.5rem+1px+env(safe-area-inset-bottom)+0.75rem)] z-20 mt-2 lg:bottom-6',
        'flex flex-col gap-2.5 rounded-card border border-line bg-surface/95 p-2.5 shadow-overlay backdrop-blur-md',
        className,
      )}
    >
      {status ? <div className="px-1.5 pt-1 text-small text-ink">{status}</div> : null}
      {children}
    </motion.div>
  )
}
