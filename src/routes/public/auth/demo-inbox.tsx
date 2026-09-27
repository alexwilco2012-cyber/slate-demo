import { EnvelopeSimpleOpenIcon, FlaskIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import type { MagicLinkSent } from '@/data'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { LogoMark } from '@/components/slate/logo'

function minutesBetween(from: string, to: string) {
  return Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
}

export interface DemoInboxProps {
  sent: MagicLinkSent
  /** The demo's "now" when the link was sent, for "works for 15 minutes". */
  sentAt: string
  purpose: 'sign-up' | 'sign-in'
  name?: string
  opening: boolean
  error?: string | null
  onOpen: () => void
  className?: string
}

/**
 * The simulated email. A real backend emails the magic link; in the demo it lands here, on screen,
 * and opening it signs this tab in. There is never a password.
 */
export function DemoInbox({
  sent,
  sentAt,
  purpose,
  name,
  opening,
  error,
  onOpen,
  className,
}: DemoInboxProps) {
  const minutes = minutesBetween(sentAt, sent.expiresAt)
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="flex items-center gap-2 text-small font-semibold text-muted">
        <FlaskIcon weight="duotone" aria-hidden className="size-4 shrink-0" />
        Demo inbox. The email lands here, not in your real inbox.
      </p>
      <article
        aria-label={`Email from ${BRAND.name}`}
        className="overflow-hidden rounded-card border border-line bg-surface shadow-raised"
      >
        <header className="flex flex-col gap-1 border-b border-line bg-surface-2 px-5 py-4 text-small">
          <p className="flex items-center gap-2.5">
            <LogoMark size="sm" />
            <span className="font-semibold text-ink">{BRAND.name}</span>
            <span className="text-muted">to {sent.sentTo}</span>
          </p>
          <p className="font-semibold text-ink">
            {purpose === 'sign-up'
              ? `Finish signing up to ${BRAND.name}`
              : `Sign in to ${BRAND.name}`}
          </p>
        </header>
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-body text-ink">
            {name ? `Hi ${name},` : 'Hello,'}
            <br />
            {purpose === 'sign-up'
              ? 'Open this link to confirm your email and set up your account.'
              : 'Open this link to sign in. You won’t need a password.'}
          </p>
          <Button
            onClick={onOpen}
            loading={opening}
            size="lg"
            iconStart={<EnvelopeSimpleOpenIcon weight="bold" aria-hidden />}
            className="self-start max-sm:w-full"
          >
            {purpose === 'sign-up' ? 'Confirm and continue' : 'Sign me in'}
          </Button>
          <p className="text-small text-muted">
            The link works for {minutes} minutes and only once. If you didn’t ask for it, ignore
            this email.
          </p>
        </div>
      </article>
      <div aria-live="polite">
        {error ? (
          <p className="flex items-start gap-2 text-small font-semibold text-critical">
            <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
