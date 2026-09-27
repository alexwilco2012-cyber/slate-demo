// The five ratings a finished repair owes, and who has sent theirs: a list in the story column,
// pills in the card above the phones. Each open one can be shown in the rater's phone.

import { LockSimpleIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CAST } from '../../cast'
import type { RatingLine, StoryState } from '../../story/model'
import { ratingLineLabel, ratingTarget, type FrameTarget } from '../../story/steps'

function RatingStatus({ line }: { line: RatingLine }) {
  if (line.status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-positive">
        <LockSimpleIcon weight="bold" aria-hidden className="size-3.5" />
        Sealed
      </span>
    )
  }
  if (line.status === 'not_open') {
    return <span className="text-caption text-muted">Not open yet</span>
  }
  return <span className="text-caption font-semibold text-ink">To do</span>
}

export function RateChecklist({
  state,
  onShow,
}: {
  state: StoryState
  onShow: (target: FrameTarget) => void
}) {
  const jobId = state.snapshot.job?.id
  return (
    <ul className="flex flex-col divide-y divide-line rounded-control border border-line bg-bg/60">
      {state.ratings.map((line) => (
        <li key={line.direction} className="flex items-center gap-2.5 px-3 py-2">
          <Avatar name={CAST[line.rater].fullName} role={line.rater} size="xs" decorative />
          <div className="min-w-0 flex-1">
            <p className="text-small leading-tight font-semibold text-ink">
              {ratingLineLabel(line)}
            </p>
            {line.shielded ? (
              <p className="text-caption leading-snug text-muted">
                Never shown on its own: it only counts inside Graham’s score
              </p>
            ) : null}
          </div>
          <RatingStatus line={line} />
          {jobId && (line.status === 'to_do' || line.status === 'draft') ? (
            <Button
              size="sm"
              variant="ghost"
              className="-mr-1.5 px-2"
              onClick={() => onShow(ratingTarget(line, jobId))}
              aria-label={`Show me: ${ratingLineLabel(line)}`}
            >
              Show me
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** The same five ratings as small pills, for the card above the phones. */
export function RatePills({
  state,
  onShow,
}: {
  state: StoryState
  onShow: (target: FrameTarget) => void
}) {
  const jobId = state.snapshot.job?.id
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Who has rated">
      {state.ratings.map((line) => {
        const sealed = line.status === 'submitted'
        const open = jobId && (line.status === 'to_do' || line.status === 'draft')
        const content = (
          <>
            <Avatar name={CAST[line.rater].fullName} role={line.rater} size="xs" decorative />
            <span>{ratingLineLabel(line)}</span>
            {sealed ? (
              <LockSimpleIcon weight="bold" aria-hidden className="size-3.5 text-positive" />
            ) : null}
            <span className="sr-only">
              {sealed ? ', sealed' : line.status === 'not_open' ? ', not open yet' : ', to do'}
              {line.shielded ? ', only counts inside Graham’s score' : ''}
            </span>
          </>
        )
        const pill =
          'inline-flex h-9 items-center gap-1.5 rounded-full border pr-3 pl-1 text-small font-semibold whitespace-nowrap'
        return (
          <li key={line.direction}>
            {open ? (
              <button
                type="button"
                onClick={() => onShow(ratingTarget(line, jobId))}
                className={cn(
                  pill,
                  'border-input-border bg-surface text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                )}
              >
                {content}
              </button>
            ) : (
              <span
                className={cn(
                  pill,
                  sealed
                    ? 'border-transparent bg-positive-tint text-positive'
                    : 'border-dashed border-line text-muted',
                )}
              >
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
