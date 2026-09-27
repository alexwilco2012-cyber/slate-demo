import { useId } from 'react'
import type { ScoreSummary as ScoreSummaryData, TradeScore } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { formatScore, plural } from './format'
import { ScoreBar } from './score-bar'
import { NewScoreState, ScoreHeadline, ScoreSummary } from './score-summary'
import { scoreWords } from './score-words'

function Half({
  role,
  label,
  summary,
}: {
  role: 'landlord' | 'tenant'
  label: string
  summary: ScoreSummaryData
}) {
  return (
    <div
      data-role-accent={role}
      className="flex flex-col gap-2 rounded-control border border-line bg-surface p-3.5"
    >
      <p className="flex items-center gap-2 text-small font-semibold text-ink">
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-accent-tint text-accent-text"
        >
          <RoleIcon role={role} weight="bold" className="size-3.5" />
        </span>
        {label}
      </p>
      {summary.score !== null ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display figures text-display-m leading-none font-semibold text-ink">
              {formatScore(summary.score)}
            </span>
            <span className="text-small text-ink">{scoreWords(summary.score)}</span>
          </p>
          <ScoreBar value={summary.score} max={5} size="sm" />
          <p className="text-small text-muted">{plural(summary.reviewCount, 'review')}</p>
        </>
      ) : (
        <p className="text-small text-muted">
          New · {plural(summary.reviewCount, 'verified review')}
        </p>
      )}
    </div>
  )
}

export interface TradeScoreSummaryProps {
  score: TradeScore
  /** Show each half's full breakdown in tabs under the headline. */
  details?: boolean
  className?: string
}

/**
 * A trade's Overall: the mean of what landlords and tenants say, always shown with both halves
 * (SPEC §5), so a trade can't look good to one side while ignoring the other.
 */
export function TradeScoreSummary({ score, details = true, className }: TradeScoreSummaryProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-4">
        <h3 id={`${id}-title`} className="text-title font-semibold text-ink">
          Overall
        </h3>
        {score.overall !== null ? (
          <ScoreHeadline score={score.overall} />
        ) : (
          <NewScoreState
            reviewCount={score.fromLandlords.reviewCount + score.fromTenants.reviewCount}
          />
        )}
        <p className="text-small text-muted">The average of what landlords and tenants say.</p>
        <div className="grid grid-cols-2 gap-(--gap-touch)">
          <Half role="landlord" label="From landlords" summary={score.fromLandlords} />
          <Half role="tenant" label="From tenants" summary={score.fromTenants} />
        </div>
      </div>

      {details ? (
        <Tabs defaultValue="landlords">
          <TabsList>
            <TabsTab value="landlords">
              <RoleIcon role="landlord" weight="bold" />
              Landlords
            </TabsTab>
            <TabsTab value="tenants">
              <RoleIcon role="tenant" weight="bold" />
              Tenants
            </TabsTab>
          </TabsList>
          <TabsPanel value="landlords">
            <ScoreSummary
              summary={score.fromLandlords}
              direction="landlord->trade"
              variant="full"
              headingLevel="h4"
            />
          </TabsPanel>
          <TabsPanel value="tenants">
            <ScoreSummary
              summary={score.fromTenants}
              direction="tenant->trade"
              variant="full"
              headingLevel="h4"
            />
          </TabsPanel>
        </Tabs>
      ) : null}
    </section>
  )
}
