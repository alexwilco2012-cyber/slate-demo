import { HourglassMediumIcon, SealCheckIcon } from '@phosphor-icons/react'
import {
  BADGE_LABELS,
  GAS_APPLIANCE_LABELS,
  type VerificationBadge,
  type VerificationClaim,
} from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatDate } from './format'

/** The badge wording. Schemes are named in words: Slate never shows scheme logos (SPEC §6). */
export function badgeLabel(claim: VerificationClaim) {
  if (claim.kind === 'electrical_scheme') return `${claim.scheme} member`
  return BADGE_LABELS[claim.kind]
}

function badgeDetail(claim: VerificationClaim) {
  switch (claim.kind) {
    case 'gas_safe':
      return [
        `Registration ${claim.registrationNumber}`,
        claim.applianceCategories.map((category) => GAS_APPLIANCE_LABELS[category]).join(', '),
      ]
    case 'landlord_registration':
      return [`${claim.registrationNumber} · ${claim.council}`]
    case 'electrical_scheme':
      return [`Membership ${claim.membershipNumber}`]
    default:
      return []
  }
}

export type VerifiedBadgeProps =
  | {
      badge: VerificationBadge
      pending?: false
      /** 'chip' for profile headers and lists; 'detail' adds numbers and categories. */
      variant?: 'chip' | 'detail'
      className?: string
    }
  | {
      /** A claim still being checked: shown so people know, but never as verified. */
      badge: VerificationClaim
      pending: true
      variant?: 'chip' | 'detail'
      className?: string
    }

/** A checked credential, always with the date it was checked. */
export function VerifiedBadge({ badge, pending, variant = 'chip', className }: VerifiedBadgeProps) {
  const label = badgeLabel(badge)
  const checked = pending ? 'Check in progress' : `Checked ${formatDate(badge.checkedAt)}`
  const Glyph = pending ? HourglassMediumIcon : SealCheckIcon

  if (variant === 'chip') {
    return (
      <span
        className={cn(
          // rounded-2xl is a full pill on one line and a soft box if the date wraps under.
          'inline-flex max-w-full items-center gap-1.5 rounded-2xl py-1 pr-3 pl-1.5 text-small leading-tight',
          pending
            ? 'border border-dashed border-input-border bg-surface text-ink'
            : 'bg-brand-tint text-brand',
          className,
        )}
      >
        <Glyph weight={pending ? 'regular' : 'fill'} aria-hidden className="size-5 shrink-0" />
        {/* The dot sits in the gap and is clipped when the date wraps, so no line starts with it. */}
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 overflow-hidden">
          <span className="font-semibold">{label}</span>
          <span className="relative whitespace-nowrap text-muted before:absolute before:-left-1.5 before:-translate-x-1/2 before:content-['·']">
            <span className="sr-only">, </span>
            {checked}
          </span>
        </span>
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control p-3',
        pending ? 'border border-dashed border-input-border' : 'bg-brand-tint',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          pending ? 'bg-surface-2 text-muted' : 'bg-brand text-on-brand',
        )}
      >
        <Glyph weight={pending ? 'regular' : 'fill'} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold text-ink">{label}</span>
        {badgeDetail(badge).map((line) => (
          <span key={line} className="text-small text-muted">
            {line}
          </span>
        ))}
        <span className={cn('text-small', pending ? 'text-muted' : 'text-brand')}>{checked}</span>
      </div>
    </div>
  )
}
