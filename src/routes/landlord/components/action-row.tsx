import { Link } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import type { ActionView } from '../lib/actions'

const TONES = {
  critical: 'bg-critical-tint text-critical',
  accent: 'bg-accent-tint text-accent-text',
  neutral: 'bg-surface-2 text-ink',
} as const

/** One thing waiting on the landlord, with the button that deals with it. */
export function ActionRow({ view }: { view: ActionView }) {
  const Glyph = view.icon
  return (
    <div
      className={cn(
        '@container relative flex items-start gap-3.5 rounded-card border bg-surface p-4 shadow-soft sm:items-center',
        view.tone === 'critical'
          ? 'border-[color-mix(in_oklab,var(--critical),transparent_55%)]'
          : 'border-line',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full',
          TONES[view.tone],
        )}
      >
        <Glyph weight="duotone" className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 @xl:flex-row @xl:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-small font-semibold text-muted">
            {view.tone === 'critical' ? <span className="sr-only">Important: </span> : null}
            {view.title}
          </p>
          <p className="font-semibold text-ink">{view.subject}</p>
          {view.meta ? <p className="text-small text-muted">{view.meta}</p> : null}
        </div>
        <Link
          to={view.cta.to}
          aria-label={`${view.cta.label}: ${view.subject}`}
          className={cn(
            buttonVariants({ variant: view.tone === 'neutral' ? 'secondary' : 'primary' }),
            'self-start @xl:self-center',
          )}
        >
          {view.cta.label}
          <CaretRightIcon weight="bold" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
