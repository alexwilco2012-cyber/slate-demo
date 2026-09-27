// A notification arriving on a phone, drawn like the phone's own banner. It opens the right
// screen in that phone when tapped, and goes by itself after a few seconds.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { XIcon } from '@phosphor-icons/react'
import { LogoMark } from '@/components/slate/logo'
import { BRAND } from '@/config/brand'
import type { Ping } from '../lib/use-pings'

export function PingBanner({
  ping,
  name,
  onOpen,
  onDismiss,
}: {
  ping: Ping | undefined
  name: string
  onOpen: (ping: Ping) => void
  onDismiss: () => void
}) {
  const reduceMotion = useReducedMotion()
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-2 top-2 z-10">
      <AnimatePresence>
        {ping ? (
          <motion.div
            key={ping.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative flex items-start gap-2.5 rounded-[1.1rem] border border-line bg-surface/95 p-2.5 pr-9 shadow-overlay backdrop-blur-md"
            data-testid="ping"
          >
            <LogoMark size="sm" className="mt-0.5" />
            <button
              type="button"
              onClick={() => onOpen(ping)}
              className="min-w-0 flex-1 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-baseline gap-1.5 text-caption text-muted">
                <span className="font-semibold text-ink">{BRAND.name}</span>
                <span aria-hidden>·</span>
                <span>now</span>
                <span className="sr-only">, for {name}:</span>
              </span>
              <span className="line-clamp-2 text-small leading-snug font-semibold text-ink">
                {ping.title}
              </span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
            >
              <XIcon weight="bold" aria-hidden className="size-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
