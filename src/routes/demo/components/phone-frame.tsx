// One person's phone: their name and role above, their portal running live inside. Side by side
// the phone is drawn at a true phone width (375px) and scaled to fit the column, so every portal
// shows its real phone layout; on a small screen the portal fills the space instead.

import { useId, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowSquareOutIcon, HandPointingIcon, HouseIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Avatar } from '@/components/ui/avatar'
import { IconButton, iconButtonVariants } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { BRAND } from '@/config/brand'
import { frameName, frameSrc, type CastMember } from '../cast'
import type { Ping } from '../lib/use-pings'
import { PingBanner } from './ping-banner'

/** A phone's width in CSS pixels, as the portals are designed and tested. */
const PHONE_WIDTH = 375
/** The bezel around the screen, in real pixels at any scale. */
const BEZEL = 9

export interface PhoneFrameProps {
  member: CastMember
  /** 'device' draws a scaled phone; 'fill' lets the portal fill the space (small screens). */
  mode: 'device' | 'fill'
  /** It's this person's turn in the story. */
  turn: boolean
  ping: Ping | undefined
  onPingOpen: (ping: Ping) => void
  onPingDismiss: () => void
  onHome: () => void
  frameRef: Ref<HTMLIFrameElement>
  hidden?: boolean
  /** Only one phone of the three is shown at a time on small screens: they're tab panels. */
  panel?: { id: string; labelledBy: string }
  className?: string
}

export function PhoneFrame({
  member,
  mode,
  turn,
  ping,
  onPingOpen,
  onPingDismiss,
  onHome,
  frameRef,
  hidden,
  panel,
  className,
}: PhoneFrameProps) {
  const headingId = useId()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useLayoutEffect(() => {
    const element = box.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((current) =>
        current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
          ? current
          : { width, height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const device = mode === 'device'
  const available = size ?? { width: PHONE_WIDTH + BEZEL * 2, height: 640 }
  const screenWidth = device ? Math.max(0, available.width - BEZEL * 2) : available.width
  const screenHeight = device ? Math.max(0, available.height - BEZEL * 2) : available.height
  const scale = device ? Math.min(1, screenWidth / PHONE_WIDTH) : 1
  const frameWidth = device ? PHONE_WIDTH : screenWidth
  const frameHeight = scale > 0 ? screenHeight / scale : screenHeight
  const title = `${member.firstName}’s phone: ${BRAND.forRole[member.role]}`

  return (
    <section
      data-role-accent={member.role}
      data-turn={turn || undefined}
      aria-labelledby={panel?.labelledBy ?? headingId}
      id={panel?.id}
      role={panel ? 'tabpanel' : undefined}
      hidden={hidden}
      className={cn('flex min-h-0 min-w-0 flex-col', device ? 'gap-5' : 'gap-3', className)}
    >
      <header className="flex min-w-0 items-center gap-3 px-1">
        {device ? (
          <>
            <Avatar name={member.fullName} role={member.role} size="sm" decorative />
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="truncate leading-tight font-semibold text-ink">
                {member.fullName}
              </h2>
              <p className="truncate text-caption text-muted">{member.about}</p>
            </div>
          </>
        ) : (
          // The tab above already names the person; here, their turn or who they are.
          <div className="flex min-w-0 flex-1 items-center">
            {turn ? (
              <TurnPill turn={turn} />
            ) : (
              <p className="truncate text-small text-muted">
                <span className="font-semibold text-ink">{member.fullName}</span> · {member.about}
              </p>
            )}
          </div>
        )}
        <div className="flex shrink-0 items-center">
          <IconButton
            size="sm"
            variant="quiet"
            label={`${member.firstName}’s home screen`}
            icon={<HouseIcon weight="bold" />}
            onClick={onHome}
          />
          <Tooltip content={`Open ${member.firstName}’s phone in a new tab`}>
            <a
              href={frameSrc(member.key)}
              target="_blank"
              rel="noopener"
              aria-label={`Open ${member.firstName}’s phone in a new tab`}
              className={iconButtonVariants({ size: 'sm', variant: 'quiet' })}
            >
              <ArrowSquareOutIcon weight="bold" aria-hidden />
            </a>
          </Tooltip>
        </div>
      </header>

      <div ref={box} className={cn('relative min-h-0 flex-1', device && 'flex justify-center')}>
        <div
          className={cn(
            'relative transition-[box-shadow] duration-(--duration-slow) ease-out-soft',
            device ? 'phone-bezel rounded-[2.6rem]' : 'size-full rounded-card',
            device && turn && 'phone-turn',
          )}
          style={
            device
              ? {
                  padding: BEZEL,
                  width: frameWidth * scale + BEZEL * 2,
                  height: available.height,
                }
              : undefined
          }
        >
          {device ? (
            <TurnPill turn={turn} className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2" />
          ) : null}
          <div
            className={cn(
              'relative overflow-hidden bg-bg',
              device ? 'rounded-[2.05rem]' : 'size-full rounded-card border border-line',
              !device && turn && 'phone-turn',
            )}
            style={device ? { width: frameWidth * scale, height: screenHeight } : undefined}
          >
            <iframe
              ref={frameRef}
              name={frameName(member.key)}
              title={title}
              src={frameSrc(member.key)}
              onLoad={() => setLoaded(true)}
              className="block origin-top-left border-0 bg-bg"
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: scale === 1 ? undefined : `scale(${scale})`,
              }}
            />
            {!loaded ? (
              <p className="absolute inset-0 flex items-center justify-center gap-2 bg-bg text-small font-semibold text-muted">
                <Spinner />
                Opening {member.firstName}’s phone
              </p>
            ) : null}
            <PingBanner
              ping={ping}
              name={member.firstName}
              onOpen={onPingOpen}
              onDismiss={onPingDismiss}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function TurnPill({ turn, className }: { turn: boolean; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {turn ? (
        <motion.p
          key="turn"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 text-caption font-bold whitespace-nowrap text-on-accent shadow-raised',
            className,
          )}
        >
          <HandPointingIcon weight="bold" aria-hidden className="size-3.5" />
          Your turn
        </motion.p>
      ) : null}
    </AnimatePresence>
  )
}
