import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { ToastProvider } from './toast'
import { TooltipProvider } from './tooltip'

/**
 * Mount once near the root: shared tooltip timing, the toast queue, and Motion set to follow the
 * system's reduced-motion setting.
 */
export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={500}>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </MotionConfig>
  )
}
