// Who's coming: the trade the landlord chose, their checked credentials (always with the date
// they were checked) and what landlords and tenants say about them.

import { SparkleIcon } from '@phosphor-icons/react'
import type { PersonCard, TradeScore } from '@/domain/types'
import { tradeHeadline, type HeadlineDisplay } from '@/domain/rating'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import { ScoreHeadline } from '@/components/slate/score-summary'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { tradeWord } from '../lib/jobs'
import { PersonLine } from './basics'

function Half({
  role,
  label,
  display,
}: {
  role: 'landlord' | 'tenant'
  label: string
  display: HeadlineDisplay
}) {
  return (
    <div data-role-accent={role} className="flex flex-col gap-1 rounded-control bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-caption font-semibold text-muted">
        <RoleIcon role={role} weight="bold" className="size-3.5 text-accent-text" />
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
        <p className="flex items-center gap-1.5 text-small text-ink">
          <SparkleIcon weight="fill" aria-hidden className="size-3.5 text-accent-text" />
          {display.text}
        </p>
      )}
    </div>
  )
}

export function TradeCard({
  trade,
  score,
  className,
}: {
  trade: PersonCard
  score: TradeScore | undefined
  className?: string
}) {
  const headline = score ? tradeHeadline(score) : null
  const word = tradeWord(trade)
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <PersonLine
        person={trade}
        role="trade"
        size="lg"
        subtitle={`${word.charAt(0).toUpperCase()}${word.slice(1)}${trade.tradeProfile ? ` · ${trade.tradeProfile.businessName}` : ''}`}
      />
      {trade.badges.length > 0 ? (
        <ul aria-label="Checked credentials" className="flex flex-wrap gap-2">
          {trade.badges.map((badge) => (
            <li key={badge.kind} className="max-w-full">
              <VerifiedBadge badge={badge} />
            </li>
          ))}
        </ul>
      ) : null}
      {headline && score ? (
        <div className="flex flex-col gap-2.5">
          {headline.overall && score.overall !== null ? (
            <ScoreHeadline score={score.overall} size="md" />
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Half role="landlord" label="From landlords" display={headline.fromLandlords} />
            <Half role="tenant" label="From tenants" display={headline.fromTenants} />
          </div>
          {headline.note ? <p className="text-caption text-muted">{headline.note}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
