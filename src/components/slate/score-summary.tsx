import { useId, type ReactNode } from 'react'
import { MedalIcon, SparkleIcon } from '@phosphor-icons/react'
import { RATING_RULES } from '@/domain/criteria'
import type { RatingDirection, ScoreSummary as ScoreSummaryData } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatDate, formatScore, plural } from './format'
import { ScoreBar } from './score-bar'
import { DISTRIBUTION_LEVELS, criterionDef, meanWords, scoreWords } from './score-words'

/** The big number and its words. Used on its own in list rows and profile headers. */
export function ScoreHeadline({
  score,
  size = 'lg',
  className,
}: {
  score: number
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            'font-display figures leading-none font-semibold tracking-[-0.03em] text-ink',
            size === 'lg' ? 'text-[3.25rem]' : 'text-display-l',
          )}
        >
          {formatScore(score)}
        </span>
        <span className="text-small text-muted">out of 5</span>
        <span
          className={cn(
            'basis-full font-semibold text-ink',
            size === 'lg' ? 'text-title' : 'text-body',
          )}
        >
          {scoreWords(score)}
        </span>
      </p>
      <ScoreBar value={score} max={5} size={size === 'lg' ? 'lg' : 'md'} className="max-w-56" />
    </div>
  )
}

/** Below three different reviewers there is no score, only this (SPEC §5 rule 10). */
export function NewScoreState({
  reviewCount,
  className,
}: {
  reviewCount: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-tint px-2.5 text-small font-semibold text-accent-text">
          <SparkleIcon weight="fill" aria-hidden className="size-4" />
          New
        </span>
        <span className="font-semibold text-ink">{plural(reviewCount, 'verified review')}</span>
      </p>
      <p className="text-small text-muted">
        A score appears once {RATING_RULES.minReviewersForScore} different people have reviewed.
      </p>
    </div>
  )
}

export interface ScoreSummaryProps {
  summary: ScoreSummaryData
  /** Which relationship the reviews come from, for the criterion names. */
  direction: RatingDirection
  title?: ReactNode
  /** Extra facts under the count, e.g. "Paid on time on 7 of 8 jobs". */
  facts?: ReactNode[]
  /** 'full' shows both breakdowns; 'compact' only the headline and count. */
  variant?: 'full' | 'compact'
  /** The title's level. Without a title, the level of the "How reviews spread" headings. */
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/**
 * Everything a headline score shows (SPEC §5): the score to one decimal with its words, how many
 * reviews, when the last one was, how many completed jobs were reviewed, how answers spread over
 * the five levels, and each criterion on its own.
 */
export function ScoreSummary({
  summary,
  direction,
  title,
  facts = [],
  variant = 'full',
  headingLevel: Heading = 'h3',
  className,
}: ScoreSummaryProps) {
  const id = useId()
  // Without a title the breakdown headings take the title's level, so no level is skipped.
  const Subheading = !title ? Heading : Heading === 'h2' ? 'h3' : Heading === 'h3' ? 'h4' : 'h5'
  const hasScore = summary.score !== null
  const totalInDistribution = Object.values(summary.distribution).reduce((a, b) => a + b, 0)

  const meta = [
    hasScore ? plural(summary.reviewCount, 'review') : null,
    summary.lastReviewAt ? `Last review ${formatDate(summary.lastReviewAt)}` : null,
  ].filter(Boolean)

  return (
    <section
      aria-labelledby={title ? `${id}-title` : undefined}
      aria-label={title ? undefined : 'Score'}
      className={cn('@container flex flex-col gap-5', className)}
    >
      {title ? (
        <Heading id={`${id}-title`} className="text-title font-semibold text-ink">
          {title}
        </Heading>
      ) : null}

      <div className="flex flex-col gap-5 @xl:grid @xl:grid-cols-2 @xl:gap-8">
        <div className="flex flex-col gap-4">
          {summary.score !== null ? (
            <ScoreHeadline score={summary.score} size={variant === 'full' ? 'lg' : 'md'} />
          ) : (
            <NewScoreState reviewCount={summary.reviewCount} />
          )}

          {meta.length > 0 || summary.coverage || facts.length > 0 ? (
            <ul className="flex flex-col gap-1 text-small text-muted">
              {meta.length > 0 ? <li>{meta.join(' · ')}</li> : null}
              {summary.coverage ? (
                <li>
                  Reviewed on{' '}
                  <span className="figures font-semibold text-ink">
                    {summary.coverage.reviewed} of {summary.coverage.completed}
                  </span>{' '}
                  completed jobs
                </li>
              ) : null}
              {facts.map((fact, index) => (
                <li key={index}>{fact}</li>
              ))}
            </ul>
          ) : null}

          {summary.relativeBadge && hasScore ? (
            <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-tint py-1 pr-3 pl-2 text-small font-semibold text-brand">
              <MedalIcon weight="fill" aria-hidden className="size-4" />
              Top {summary.relativeBadge.topPercent}% in {summary.relativeBadge.area}
            </p>
          ) : null}

          {variant === 'full' && totalInDistribution > 0 ? (
            <div className="flex flex-col gap-2">
              <Subheading className="text-small font-semibold text-ink">
                How reviews spread
              </Subheading>
              <ul className="grid grid-cols-[max-content_minmax(3rem,1fr)_1.5rem] gap-x-3 gap-y-1.5">
                {DISTRIBUTION_LEVELS.map((level) => {
                  const count = summary.distribution[level.score]
                  return (
                    <li
                      key={level.score}
                      className="col-span-3 grid grid-cols-subgrid items-center text-small"
                    >
                      <span className="truncate text-ink">{level.label}</span>
                      <ScoreBar value={count} max={totalInDistribution} size="sm" />
                      <span className="figures text-right text-muted">
                        {count}
                        <span className="sr-only"> {count === 1 ? 'review' : 'reviews'}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {variant === 'full' && summary.criteria.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Subheading className="text-small font-semibold text-ink">By question</Subheading>
            <ul className="flex flex-col gap-3">
              {summary.criteria.map((criterion) => {
                const definition = criterionDef(direction, criterion.criterionId)
                return (
                  <li key={criterion.criterionId} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-small font-medium text-ink">
                        {definition?.short ?? criterion.criterionId}
                      </span>
                      {criterion.mean !== null ? (
                        <span className="shrink-0 text-small whitespace-nowrap text-muted">
                          <span className="figures font-semibold text-ink">
                            {formatScore(criterion.mean)}
                          </span>{' '}
                          {meanWords(definition?.scale ?? 'judgement', criterion.mean)}
                        </span>
                      ) : (
                        <span className="shrink-0 text-small text-muted">No answers yet</span>
                      )}
                    </div>
                    <ScoreBar value={criterion.mean ?? 0} max={5} size="sm" />
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
