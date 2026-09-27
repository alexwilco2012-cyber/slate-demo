// The reveal moment: the first time a tenant sees a rating that has just been unsealed, the lock
// opens and the review rises into place. After that it simply sits there. Which reveals someone
// has seen is remembered in this browser only (a nicety, not a record).

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LockSimpleIcon, LockSimpleOpenIcon } from '@phosphor-icons/react'
import type { IsoDateTime, PersonId } from '@/domain/types'
import { daysBetween } from '@/components/slate/format'

/** Only reveals from the last fortnight get the moment; older ones are simply shown. */
const FRESH_DAYS = 14

function key(personId: PersonId) {
  return `slate-tenant-seen-reveals:${personId}`
}

function readSeen(personId: PersonId): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(key(personId)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function markSeen(personId: PersonId, id: string) {
  try {
    const seen = readSeen(personId)
    seen.add(id)
    window.localStorage.setItem(key(personId), JSON.stringify([...seen].slice(-200)))
  } catch {
    // Storage blocked: the moment may play again next time, which is harmless.
  }
}

/**
 * True once the element has been at least 40% on screen. The lock opens when the tenant can
 * actually see it, not while it's below the fold. Where there's no IntersectionObserver (tests,
 * very old browsers) it counts as seen straight away.
 */
function useSeenOnScreen(ref: RefObject<HTMLElement | null>, watching: boolean) {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (!watching || seen || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
      },
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, watching, seen])
  return seen
}

export function RevealMoment({
  personId,
  id,
  revealedAt,
  now,
  children,
}: {
  personId: PersonId
  /** Usually the rating id. */
  id: string
  revealedAt: IsoDateTime
  now: IsoDateTime
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const [fresh] = useState(
    () => daysBetween(revealedAt, now) <= FRESH_DAYS && !readSeen(personId).has(id),
  )
  const [open, setOpen] = useState(!fresh || Boolean(reduce))
  const ref = useRef<HTMLDivElement>(null)
  const visible = useSeenOnScreen(ref, fresh)

  useEffect(() => {
    if (!fresh || !visible) return
    markSeen(personId, id)
    if (reduce) return
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => window.clearTimeout(timer)
  }, [fresh, visible, personId, id, reduce])

  if (!fresh) return <>{children}</>

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-small font-semibold text-accent-text">
        {open ? (
          <LockSimpleOpenIcon weight="bold" aria-hidden className="size-4" />
        ) : (
          <LockSimpleIcon weight="bold" aria-hidden className="size-4" />
        )}
        Newly revealed
      </p>
      <div className="relative">
        <AnimatePresence initial={false}>
          {!open ? (
            <motion.div
              key="lock"
              aria-hidden="true"
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-card border border-dashed border-input-border bg-surface-2"
            >
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: [-8, 8, -4, 0] }}
                transition={{ duration: 0.5 }}
                className="flex size-14 items-center justify-center rounded-full bg-surface text-accent-text shadow-raised"
              >
                <LockSimpleIcon weight="bold" className="size-7" />
              </motion.span>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
