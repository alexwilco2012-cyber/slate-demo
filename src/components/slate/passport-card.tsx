import { useId, type ReactNode } from 'react'
import { IdentificationCardIcon, LockKeyIcon } from '@phosphor-icons/react'
import { SCALES } from '@/domain/criteria'
import type { PassportLine, ScaleScore } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { plural } from './format'
import { criterionDef } from './score-words'

/** "Always, from 2 of 2 landlords" for each answer given, best first. */
function answerSummary(line: PassportLine) {
  const definition = criterionDef('landlord->tenant', line.criterionId)
  const points: readonly { score: ScaleScore; label: string }[] =
    SCALES[definition?.scale ?? 'judgement']
  return [...points]
    .sort((a, b) => b.score - a.score)
    .filter((point) => line.counts[point.score] > 0)
    .map((point) => ({
      label: point.label,
      count: line.counts[point.score],
    }))
}

export interface PassportCardProps {
  landlordCount: number
  lines: readonly PassportLine[]
  /** e.g. "Sarah Reid". Shown to the tenant and to whoever they share it with. */
  tenantName?: string
  /** The share action and its terms, e.g. a button and "Link works for 30 days · views logged". */
  footer?: ReactNode
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/**
 * The tenant passport: what landlords said, counted per question. Deliberately no single number,
 * and never public: the tenant sees all of it and shares it all or not at all.
 */
export function PassportCard({
  landlordCount,
  lines,
  tenantName,
  footer,
  headingLevel: Heading = 'h3',
  className,
}: PassportCardProps) {
  const id = useId()
  return (
    <section
      aria-labelledby={`${id}-title`}
      data-role-accent="tenant"
      className={cn(
        'relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft',
        className,
      )}
    >
      <span aria-hidden="true" className="h-1 bg-accent" />
      <header className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
        >
          <IdentificationCardIcon weight="duotone" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Heading
            id={`${id}-title`}
            className="font-display text-display-m font-semibold text-ink"
          >
            Tenant passport
          </Heading>
          <p className="text-small text-muted">
            {tenantName ? `${tenantName} · ` : null}
            From {plural(landlordCount, 'landlord')}
          </p>
        </div>
      </header>

      <p className="mx-4 mt-3 flex items-start gap-2 text-small text-muted sm:mx-5">
        <LockKeyIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        Never public. No single score: each question is counted on its own.
      </p>

      <dl className="mt-2 flex flex-col px-4 sm:px-5">
        {lines.map((line) => {
          const definition = criterionDef('landlord->tenant', line.criterionId)
          const answers = answerSummary(line)
          return (
            <div
              key={line.criterionId}
              className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <dt className="font-semibold text-ink">{definition?.short ?? line.criterionId}</dt>
              <dd className="flex flex-col text-body text-ink sm:items-end sm:text-right">
                {answers.length === 0 ? (
                  <span className="text-muted">Not answered yet</span>
                ) : (
                  answers.map((answer) => (
                    <span key={answer.label}>
                      <span className="font-semibold">{answer.label}</span>
                      <span className="text-muted">
                        , from{' '}
                        <span className="figures">
                          {answer.count} of {line.landlordCount}
                        </span>{' '}
                        {line.landlordCount === 1 ? 'landlord' : 'landlords'}
                      </span>
                    </span>
                  ))
                )}
              </dd>
            </div>
          )
        })}
      </dl>

      {footer ? (
        <footer className="mt-1 flex flex-col gap-2 border-t border-line bg-surface-2 px-4 py-4 sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
