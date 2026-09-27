import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/** Where the browser can tell when something scrolls into view (not jsdom, not very old browsers). */
export function canObserve() {
  return typeof window !== 'undefined' && 'IntersectionObserver' in window
}

export interface PublicRevealProps {
  children: ReactNode
  /** Seconds, for a gentle stagger between neighbours. */
  delay?: number
  className?: string
}

/**
 * Rises a little and fades in the first time it scrolls into view. With reduced motion, or where
 * scrolling can't be observed, it is simply there: content is never left hidden.
 */
export function PublicReveal({ children, delay = 0, className }: PublicRevealProps) {
  const reduced = useReducedMotion()
  if (reduced || !canObserve()) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
