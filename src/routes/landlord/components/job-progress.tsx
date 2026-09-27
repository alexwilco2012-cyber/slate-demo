// The landlord's view of a repair's progress. It spells out the steps that are the landlord's to
// take, choosing the trade, accepting the quote and instructing them, so the page always shows
// that the landlord made the choice (SPEC §4 legal rule). Same markers as JobTimeline.

import type { ReactNode } from 'react'
import { CheckIcon, XIcon } from '@phosphor-icons/react'
import type { IsoDateTime, Job, JobEvent, JobEventKind, PersonCard, PersonId } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatWeekday } from '@/components/slate/format'
import { firstName } from '../lib/format'
import { formatClock } from '../lib/time'

type StageKey =
  | 'reported'
  | 'approved'
  | 'chosen'
  | 'accepted'
  | 'instructed'
  | 'booked'
  | 'done'
  | 'confirmed'
  | 'rated'

type State = 'done' | 'current' | 'upcoming' | 'stopped'

// Each stage reads as what happened once it's done, and as what's waiting while it's the current
// one: "Approved" afterwards, "Approving the repair" while it's happening.
const STAGES: { key: StageKey; label: string; now: string; events: JobEventKind[] }[] = [
  { key: 'reported', label: 'Reported', now: 'Reported', events: ['reported'] },
  { key: 'approved', label: 'Approved', now: 'Approving the repair', events: ['approved'] },
  { key: 'chosen', label: 'Trade chosen', now: 'Choosing a trade', events: ['trade_chosen'] },
  { key: 'accepted', label: 'Quote accepted', now: 'Choosing a quote', events: ['quote_accepted'] },
  {
    key: 'instructed',
    label: 'Go-ahead given',
    now: 'Giving the go-ahead',
    events: ['trade_instructed'],
  },
  { key: 'booked', label: 'Visit booked', now: 'Booking the visit', events: ['visit_booked'] },
  { key: 'done', label: 'Work done', now: 'Doing the work', events: ['completed'] },
  { key: 'confirmed', label: 'Confirmed', now: 'Confirming it’s done', events: ['confirmed'] },
  {
    key: 'rated',
    label: 'Ratings revealed',
    now: 'Rating each other',
    events: ['ratings_revealed'],
  },
]

const STATE_WORDS: Record<State, string> = {
  done: 'Done',
  current: 'Now',
  upcoming: 'Still to come',
  stopped: 'Stopped',
}

const ROUTE_WORDS = {
  saved_trades: 'from your saved trades',
  directory: 'from the directory',
  job_board: 'from quotes on the job board',
} as const

function lastOf(job: Job, kinds: JobEventKind[]): JobEvent | undefined {
  return job.timeline.filter((event) => kinds.includes(event.kind)).at(-1)
}

function Marker({ state }: { state: State }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
        state === 'done' && 'bg-accent text-on-accent',
        state === 'current' && 'bg-surface ring-[2.5px] ring-accent-strong ring-inset',
        state === 'upcoming' && 'border-2 border-dashed border-input-border bg-surface',
        state === 'stopped' && 'bg-critical text-on-danger',
      )}
    >
      {state === 'done' ? <CheckIcon weight="bold" className="size-4" /> : null}
      {state === 'current' ? <span className="size-2.5 rounded-full bg-accent-strong" /> : null}
      {state === 'stopped' ? <XIcon weight="bold" className="size-4" /> : null}
    </span>
  )
}

function when(at: IsoDateTime) {
  return `${formatWeekday(at)}, ${formatClock(at)}`
}

export interface JobProgressProps {
  job: Job
  people: ReadonlyMap<PersonId, PersonCard>
  className?: string
}

export function JobProgress({ job, people, className }: JobProgressProps) {
  const name = (id: PersonId | null | undefined) => {
    const card = id ? people.get(id) : undefined
    return card ? firstName(card.displayName) : undefined
  }
  const stopped = job.status === 'declined' || job.status === 'cancelled'
  const emergencyWithoutQuote =
    !job.acceptedQuoteId && job.timeline.some((event) => event.kind === 'trade_instructed')
  let reachedCurrent = false

  const rows = STAGES.filter((stage) => !(stage.key === 'accepted' && emergencyWithoutQuote)).map(
    (stage) => {
      const event = lastOf(job, stage.events)
      let state: State
      if (event && !reachedCurrent) state = 'done'
      else if (!reachedCurrent) {
        reachedCurrent = true
        state = stopped ? 'stopped' : 'current'
      } else state = 'upcoming'

      let detail: ReactNode = null
      const by = name(event?.actorId)
      if (state === 'done' && event) {
        if (event.kind === 'trade_chosen') {
          detail = `${name(event.tradeId) ?? 'Trade'}, ${ROUTE_WORDS[event.route]}${by ? ` · by ${by}` : ''}`
        } else if (event.kind === 'trade_instructed') {
          detail = `${by ?? 'You'} gave ${name(event.tradeId) ?? 'the trade'} the go-ahead`
        } else if (by) {
          detail = `By ${by}`
        }
      }
      if (state === 'current' && stage.key === 'chosen' && job.board) {
        detail = 'Out for quotes on the job board'
      }
      if (state === 'stopped') {
        const reason = lastOf(job, ['declined', 'cancelled'])
        detail =
          reason && (reason.kind === 'declined' || reason.kind === 'cancelled')
            ? reason.reason
            : null
      }
      const label =
        state === 'stopped'
          ? job.status === 'declined'
            ? 'Declined'
            : 'Cancelled'
          : state === 'current'
            ? stage.now
            : stage.label
      return { ...stage, label, state, at: state === 'done' ? event?.at : undefined, detail }
    },
  )

  return (
    <ol aria-label="Repair progress" className={cn('flex flex-col', className)}>
      {rows.map((stage, index) => (
        <li
          key={stage.key}
          aria-current={stage.state === 'current' ? 'step' : undefined}
          className="relative flex gap-3.5 pb-4 last:pb-0"
        >
          {index < rows.length - 1 ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-7 bottom-0 left-3.5 w-0.5 -translate-x-1/2',
                stage.state === 'done'
                  ? 'bg-accent'
                  : 'bg-[repeating-linear-gradient(to_bottom,var(--input-border)_0_4px,transparent_4px_8px)]',
              )}
            />
          ) : null}
          <Marker state={stage.state} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  'text-body',
                  stage.state === 'upcoming' ? 'text-muted' : 'font-semibold text-ink',
                )}
              >
                {stage.label}
              </span>
              {/* Steps still to come are drawn dashed and muted; a word on each would only be
                  noise, so it's there for screen readers alone. */}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-caption font-semibold',
                  stage.state === 'current' && 'bg-accent-tint text-accent-text',
                  stage.state === 'stopped' && 'bg-critical-tint text-critical',
                  stage.state === 'done' && 'text-muted',
                  stage.state === 'upcoming' && 'sr-only',
                )}
              >
                {stage.state === 'upcoming'
                  ? `: ${STATE_WORDS.upcoming}`
                  : STATE_WORDS[stage.state]}
              </span>
            </p>
            {stage.at ? (
              <p className="figures text-small text-muted">
                <time dateTime={stage.at}>{when(stage.at)}</time>
              </p>
            ) : null}
            {stage.detail ? <p className="text-small text-ink">{stage.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
