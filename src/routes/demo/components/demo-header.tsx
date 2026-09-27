// The strip across the top: the brand, a "Live demo" marker, the demo clock every phone runs on,
// light or dark, and starting again.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowCounterClockwiseIcon, ClockIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useDemoNow } from '@/data'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/icon-button'
import { Logo } from '@/components/slate/logo'
import { BRAND } from '@/config/brand'
import { useThemePreference } from '@/routes/_shell'
import { dayLabel, timeLabel } from '../lib/time'
import { useMedia } from '../lib/use-media'

/** A jump bigger than the few seconds each change moves the clock on. */
const JUMP_MS = 30 * 60 * 1000

function DemoClock() {
  const now = useDemoNow()
  const previous = useRef(now)
  const [jumps, setJumps] = useState(0)

  useEffect(() => {
    if (Math.abs(Date.parse(now) - Date.parse(previous.current)) > JUMP_MS) setJumps((n) => n + 1)
    previous.current = now
  }, [now])

  return (
    <p
      key={jumps}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-small font-semibold whitespace-nowrap text-ink tabular-nums',
        jumps > 0 && 'clock-jumped',
      )}
      title="The demo clock. Notice periods and rating windows run on it."
    >
      <ClockIcon weight="bold" aria-hidden className="size-4 text-muted" />
      <span className="sr-only">Demo clock: </span>
      <time dateTime={now}>
        <span className="hidden sm:inline">{dayLabel(now)} · </span>
        {timeLabel(now)}
      </time>
    </p>
  )
}

function ThemeToggle() {
  const [preference, setPreference] = useThemePreference()
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const dark = preference === 'dark' || (preference === 'system' && systemDark)
  return (
    <IconButton
      size="sm"
      variant="quiet"
      label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      icon={dark ? <SunIcon weight="bold" /> : <MoonIcon weight="bold" />}
      onClick={() => setPreference(dark ? 'light' : 'dark')}
    />
  )
}

export function DemoHeader({ onReset }: { onReset: () => void }) {
  return (
    <header className="sticky top-0 z-(--z-nav) border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          to="/"
          aria-label={`${BRAND.name} home`}
          className="shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Logo size="sm" className="hidden sm:inline-flex" />
          <Logo size="sm" markOnly className="sm:hidden" />
        </Link>
        <p className="inline-flex h-7 shrink-0 items-center gap-2 rounded-full bg-positive-tint px-2.5 text-caption font-bold whitespace-nowrap text-positive">
          <span aria-hidden className="live-dot" />
          <span className="max-xs:sr-only">Live demo</span>
        </p>
        <p className="hidden min-w-0 truncate text-small text-muted xl:block">
          Three phones, one set of data. What happens in one shows in the others straight away.
        </p>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <DemoClock />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            iconStart={<ArrowCounterClockwiseIcon weight="bold" aria-hidden />}
            className="max-sm:hidden"
          >
            Reset demo
          </Button>
          <IconButton
            size="sm"
            variant="quiet"
            label="Reset demo"
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={onReset}
            className="sm:hidden"
          />
        </div>
      </div>
    </header>
  )
}
