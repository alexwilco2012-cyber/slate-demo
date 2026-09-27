import type { ReactNode } from 'react'
import { CheckIcon, XIcon } from '@phosphor-icons/react'
import type { IsoDateTime, Job, JobEventKind } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatTime, formatWeekday } from './format'

export const JOB_STAGES = [
  { key: 'reported', label: 'Reported' },
  { key: 'approved', label: 'Approved' },
  { key: 'booked', label: 'Booked' },
  { key: 'visit', label: 'Visit' },
  { key: 'fixed', label: 'Fixed' },
  { key: 'rated', label: 'Rated' },
] as const

export type JobStageKey = (typeof JOB_STAGES)[number]['key']
export type JobStageState = 'done' | 'current' | 'upcoming' | 'stopped'

export interface JobStage {
  key: JobStageKey
  label: string
  state: JobStageState
  at?: IsoDateTime
  /** A line under the label, e.g. "Kev Rattray, plumber" or "Waiting for Graham to approve". */
  detail?: ReactNode
}

/** The event that completes each stage; the latest one counts. */
const STAGE_EVENTS: Record<JobStageKey, readonly JobEventKind[]> = {
  reported: ['reported'],
  approved: ['approved'],
  booked: ['visit_booked'],
  visit: ['visit_started', 'visit_confirmed'],
  fixed: ['completed', 'confirmed'],
  rated: ['ratings_revealed'],
}

/**
 * Works out the six stages from a job's append-only timeline. A declined or cancelled job stops
 * at the stage it reached. Pass `details` to add a line under any stage.
 */
export function jobStages(
  job: Pick<Job, 'status' | 'timeline'>,
  details: Partial<Record<JobStageKey, ReactNode>> = {},
): JobStage[] {
  const doneAt = (key: JobStageKey) =>
    job.timeline
      .filter((event) => STAGE_EVENTS[key].includes(event.kind))
      .map((event) => event.at)
      .sort()
      .at(-1)
  const stopped = job.status === 'declined' || job.status === 'cancelled'
  let reachedCurrent = false

  return JOB_STAGES.map(({ key, label }) => {
    const at = doneAt(key)
    let state: JobStageState
    if (at && !reachedCurrent) state = 'done'
    else if (!reachedCurrent) {
      reachedCurrent = true
      state = stopped ? 'stopped' : 'current'
    } else state = 'upcoming'
    // A stopped job names what stopped it, e.g. "Declined" where "Approved" would have been.
    const shown =
      state === 'stopped' ? (job.status === 'declined' ? 'Declined' : 'Cancelled') : label
    return { key, label: shown, state, at: state === 'done' ? at : undefined, detail: details[key] }
  })
}

const STATE_WORDS: Record<JobStageState, string> = {
  done: 'Done',
  current: 'Now',
  upcoming: 'Next',
  stopped: 'Stopped',
}

function Marker({ state, size = 'md' }: { state: JobStageState; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative z-10 flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-7' : 'size-5',
        state === 'done' && 'bg-accent text-on-accent',
        state === 'current' && 'bg-surface ring-[2.5px] ring-accent-strong ring-inset',
        state === 'upcoming' && 'border-2 border-dashed border-input-border bg-surface',
        state === 'stopped' && 'bg-critical text-on-danger',
      )}
    >
      {state === 'done' ? (
        <CheckIcon weight="bold" className={size === 'md' ? 'size-4' : 'size-3'} />
      ) : null}
      {state === 'current' ? (
        <span
          className={cn('rounded-full bg-accent-strong', size === 'md' ? 'size-2.5' : 'size-2')}
        />
      ) : null}
      {state === 'stopped' ? (
        <XIcon weight="bold" className={size === 'md' ? 'size-4' : 'size-3'} />
      ) : null}
    </span>
  )
}

function when(at: IsoDateTime) {
  return `${formatWeekday(at)}, ${formatTime(at)}`
}

export interface JobTimelineProps {
  stages: readonly JobStage[]
  /** 'full' for the job screen; 'compact' is a one-row strip for list cards. */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * Reported, approved, booked, visit, fixed, rated. Each stage says done, now or next in words and
 * with its own marker shape, never by colour alone.
 */
export function JobTimeline({ stages, variant = 'full', className }: JobTimelineProps) {
  if (variant === 'compact') {
    // A finished job has no current stage, so the strip's summary names the last one done.
    const current =
      stages.find((stage) => stage.state === 'current' || stage.state === 'stopped') ??
      (stages.every((stage) => stage.state === 'done') ? stages.at(-1) : undefined)
    // Names under each marker need about 80px each; a narrower strip gives one summary line.
    return (
      <div className={cn('@container flex flex-col gap-2', className)}>
        <ol aria-label="Job progress" className="flex items-center">
          {stages.map((stage, index) => (
            <li
              key={stage.key}
              aria-current={stage.state === 'current' ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center gap-1.5"
            >
              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-2.5 left-1/2 h-0.5 w-full -translate-y-1/2',
                    stage.state === 'done' ? 'bg-accent' : 'bg-line',
                  )}
                />
              ) : null}
              <Marker state={stage.state} size="sm" />
              <span
                className={cn(
                  'sr-only px-0.5 text-center text-caption leading-tight @min-[30rem]:not-sr-only',
                  stage.state === 'current' ? 'font-semibold text-ink' : 'text-muted',
                )}
              >
                {stage.label}
                <span className="sr-only">: {STATE_WORDS[stage.state]}</span>
              </span>
            </li>
          ))}
        </ol>
        {current ? (
          <p className="text-small text-ink @min-[30rem]:hidden" aria-hidden="true">
            <span className="font-semibold">
              {STATE_WORDS[current.state]}: {current.label}
            </span>
            {current.detail ? <span className="text-muted"> · {current.detail}</span> : null}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <ol aria-label="Job progress" className={cn('flex flex-col', className)}>
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          aria-current={stage.state === 'current' ? 'step' : undefined}
          className="relative flex gap-3.5 pb-5 last:pb-0"
        >
          {index < stages.length - 1 ? (
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
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-caption font-semibold',
                  stage.state === 'done' && 'text-muted',
                  stage.state === 'current' && 'bg-accent-tint text-accent-text',
                  stage.state === 'upcoming' && 'text-muted',
                  stage.state === 'stopped' && 'bg-critical-tint text-critical',
                )}
              >
                {STATE_WORDS[stage.state]}
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
