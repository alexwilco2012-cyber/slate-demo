// Small building blocks the tenant screens share: section headings, query errors, status and
// urgency badges, the review policy link and a person's line.

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  ScrollIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { JobStatus, PersonCard, Role, Urgency } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { JOB_STATUS_META, URGENCY_META } from '../lib/jobs'

/** Where the plain-English review policy lives (SPEC §6: linked from every rating). */
export const REVIEW_POLICY_PATH = '/policies/reviews'

export function Section({
  title,
  id,
  action,
  description,
  children,
  className,
}: {
  title: ReactNode
  /** Used for the heading id, so the section is named by it. */
  id: string
  /** A link beside the heading, e.g. "All repairs". */
  action?: { to: string; label: string }
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('flex scroll-mt-24 flex-col gap-3', className)}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id={`${id}-title`}
            className="font-display text-display-m font-semibold text-ink outline-none"
          >
            {title}
          </h2>
          {description ? <p className="text-small text-muted">{description}</p> : null}
        </div>
        {action ? (
          <Link
            to={action.to}
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-small font-semibold text-accent-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {action.label}
            <CaretRightIcon weight="bold" aria-hidden className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** The number beside a tab's name, e.g. "Open 2". */
export function TabCount({ count }: { count: number }) {
  return (
    <span className="figures inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-caption font-semibold text-muted in-data-active:bg-accent-tint in-data-active:text-accent-text">
      {count}
    </span>
  )
}

/** Something failed to load: say so plainly, and offer to try again. */
export function QueryError({
  what,
  onRetry,
  className,
}: {
  /** e.g. "your repairs". */
  what: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-critical-tint text-critical"
      >
        <WarningCircleIcon weight="bold" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold text-ink">We couldn’t load {what}</p>
        <p className="text-small text-muted">
          Nothing has been lost. Check your connection and try again.
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        iconStart={<ArrowClockwiseIcon weight="bold" aria-hidden />}
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}

export function JobStatusBadge({
  status,
  size = 'sm',
}: {
  status: JobStatus
  size?: BadgeProps['size']
}) {
  const meta = JOB_STATUS_META[status]
  const Glyph = meta.icon
  return (
    <Badge tone={meta.tone} size={size} icon={<Glyph weight="bold" aria-hidden />}>
      {meta.label}
    </Badge>
  )
}

export function UrgencyBadge({
  urgency,
  size = 'sm',
}: {
  urgency: Urgency
  size?: BadgeProps['size']
}) {
  const meta = URGENCY_META[urgency]
  const Glyph = meta.icon
  return (
    <Badge tone={meta.tone} size={size} icon={<Glyph weight="bold" aria-hidden />}>
      {meta.label}
    </Badge>
  )
}

/** "Read our review policy": on every rating screen and review. */
export function ReviewPolicyLink({ className }: { className?: string }) {
  return (
    <Link
      to={REVIEW_POLICY_PATH}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 self-start rounded-control text-small font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <ScrollIcon weight="bold" aria-hidden className="size-4" />
      How reviews work: our review policy
    </Link>
  )
}

/** Avatar, name, role chip and a line under, e.g. a trade's business. */
export function PersonLine({
  person,
  role,
  roleLabel,
  subtitle,
  size = 'md',
  className,
}: {
  person: Pick<PersonCard, 'displayName' | 'avatarSeed'>
  role: Role
  roleLabel?: string
  subtitle?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar
        name={person.displayName}
        seed={person.avatarSeed}
        role={role}
        size={size}
        decorative
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{person.displayName}</span>
          <RoleChip role={role} label={roleLabel} />
        </p>
        {subtitle ? <p className="text-small text-muted">{subtitle}</p> : null}
      </div>
    </div>
  )
}

/** A soft panel for explanations: sealing, notice, what happens next. */
export function Explainer({
  icon,
  title,
  children,
  tone = 'sunken',
  className,
}: {
  icon: ReactNode
  title?: ReactNode
  children: ReactNode
  tone?: 'sunken' | 'accent' | 'info'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control p-4',
        tone === 'sunken' && 'bg-surface-2',
        tone === 'accent' && 'bg-accent-tint',
        tone === 'info' && 'bg-info-tint',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex shrink-0 [&_svg]:size-5',
          tone === 'accent' ? 'text-accent-text' : tone === 'info' ? 'text-info' : 'text-ink',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1 text-small text-ink">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  )
}
