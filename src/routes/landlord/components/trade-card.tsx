// A trade as a landlord weighs them up: what they do, how far away, checked credentials, and
// both halves of their score. The directory lists trades A to Z and never ranks them.

import { useState, type ReactNode } from 'react'
import { BookmarkSimpleIcon, MapPinIcon, SparkleIcon } from '@phosphor-icons/react'
import type { TradeListing } from '@/data'
import { DISTANCE_BAND_LABELS, distanceBandOf, milesBetween } from '@/domain/places'
import { coverageText, tradeHeadline, type HeadlineDisplay } from '@/domain/rating/display'
import {
  TRADE_TYPE_LABELS,
  type PostcodeDistrict,
  type ScoreSummary,
  type TradeScore,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import { VerifiedBadge } from '@/components/slate/verified-badge'

/** "Within 2 miles of the home", from district centres (never a street address). */
export function distanceText(from: PostcodeDistrict, to: PostcodeDistrict | undefined): string {
  if (!to) return from
  const miles = milesBetween(from, to)
  if (miles === null) return `Based in ${from}`
  if (miles === 0) return `Based in ${from}, same area`
  return `Based in ${from} · ${DISTANCE_BAND_LABELS[distanceBandOf(miles)].toLowerCase()}`
}

function Half({
  role,
  label,
  display,
  summary,
}: {
  role: 'landlord' | 'tenant'
  label: string
  display: HeadlineDisplay
  summary: ScoreSummary
}) {
  return (
    <div
      data-role-accent={role}
      className="flex min-w-0 flex-col gap-1 rounded-control bg-surface-2 p-3"
    >
      <p className="flex items-center gap-1.5 text-caption font-semibold text-muted">
        <RoleIcon role={role} weight="bold" aria-hidden className="size-3.5 text-accent-text" />
        {label}
      </p>
      {display.kind === 'score' ? (
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display figures text-title leading-none font-semibold text-ink">
            {display.value}
          </span>
          <span className="sr-only">out of 5,</span>
          <span className="text-small text-ink">{display.label}</span>
        </p>
      ) : (
        <p className="flex items-center gap-1 text-small font-semibold text-ink">
          <SparkleIcon weight="fill" aria-hidden className="size-3.5 text-accent-text" />
          New
        </p>
      )}
      <p className="figures text-caption text-muted">
        {summary.reviewCount} {summary.reviewCount === 1 ? 'review' : 'reviews'}
      </p>
    </div>
  )
}

/** Both halves side by side, the Overall above them once each half has its own score. */
export function TradeScoreHalves({ score }: { score: TradeScore }) {
  const head = tradeHeadline(score)
  const coverage = score.fromLandlords.coverage ?? score.fromTenants.coverage
  return (
    <div className="flex flex-col gap-2">
      {head.overall?.kind === 'score' ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-small text-ink">
          <span className="font-semibold">Overall</span>
          <span className="font-display figures text-title leading-none font-semibold">
            {head.overall.value}
          </span>
          <span className="sr-only">out of 5,</span>
          <span>{head.overall.label}</span>
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Half
          role="landlord"
          label="From landlords"
          display={head.fromLandlords}
          summary={score.fromLandlords}
        />
        <Half
          role="tenant"
          label="From tenants"
          display={head.fromTenants}
          summary={score.fromTenants}
        />
      </div>
      {head.note ? <p className="text-caption text-muted">{head.note}</p> : null}
      {coverage && coverage.completed > 0 ? (
        <p className="text-caption text-muted">{coverageText(coverage)}</p>
      ) : null}
    </div>
  )
}

export interface TradeCardProps {
  listing: TradeListing
  /** The home the work is at, for the distance. */
  district?: PostcodeDistrict
  onToggleSaved?: (saved: boolean) => Promise<void> | void
  onViewProfile?: () => void
  /** The main action, e.g. "Choose Kev". */
  action?: ReactNode
  headingLevel?: 'h2' | 'h3'
  className?: string
}

export function TradeCard({
  listing,
  district,
  onToggleSaved,
  onViewProfile,
  action,
  headingLevel: Heading = 'h3',
  className,
}: TradeCardProps) {
  const { trade, score, saved } = listing
  const profile = trade.tradeProfile
  const [busy, setBusy] = useState(false)
  const checked = trade.badges.filter((badge) => badge.kind !== 'id_check')
  const idChecked = trade.badges.find((badge) => badge.kind === 'id_check')

  async function toggle() {
    if (!onToggleSaved) return
    setBusy(true)
    try {
      await onToggleSaved(!saved)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        '@container flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar
          name={trade.displayName}
          seed={trade.avatarSeed}
          role="trade"
          size="md"
          decorative
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Heading className="font-semibold leading-snug text-ink">
            {profile?.businessName ?? trade.displayName}
          </Heading>
          <p className="text-small text-muted">
            {trade.displayName}
            {profile
              ? ` · ${profile.trades.map((type) => TRADE_TYPE_LABELS[type]).join(', ')}`
              : ''}
          </p>
          <p className="flex items-center gap-1 text-small text-muted">
            <MapPinIcon weight="bold" aria-hidden className="size-4 shrink-0" />
            {distanceText(trade.postcodeDistrict, district)}
          </p>
        </div>
        {onToggleSaved ? (
          <Button
            variant={saved ? 'soft' : 'ghost'}
            size="sm"
            loading={busy}
            aria-pressed={saved}
            iconStart={<BookmarkSimpleIcon weight={saved ? 'fill' : 'bold'} aria-hidden />}
            onClick={toggle}
          >
            {saved ? 'Saved' : 'Save'}
          </Button>
        ) : null}
      </header>

      {checked.length > 0 || idChecked ? (
        <ul className="flex flex-wrap gap-2" aria-label="Checked credentials">
          {checked.map((badge) => (
            <li key={badge.kind}>
              <VerifiedBadge badge={badge} />
            </li>
          ))}
          {idChecked && checked.length === 0 ? (
            <li>
              <VerifiedBadge badge={idChecked} />
            </li>
          ) : null}
        </ul>
      ) : null}

      <TradeScoreHalves score={score} />

      {onViewProfile || action ? (
        <footer className="flex flex-wrap items-center justify-end gap-(--gap-touch) border-t border-line pt-3.5 @max-sm:[&>*]:flex-1">
          {onViewProfile ? (
            <Button variant="secondary" onClick={onViewProfile}>
              Reviews and profile
            </Button>
          ) : null}
          {action}
        </footer>
      ) : null}
    </article>
  )
}
