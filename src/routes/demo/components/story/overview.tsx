// The story at a glance: whose turn a step is, the progress bar, and the list of all twelve steps.

import {
  CaretDownIcon,
  CheckCircleIcon,
  ClockClockwiseIcon,
  HandTapIcon,
} from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import type { Role } from '@/domain/types'
import { CAST } from '../../cast'
import { STEP_IDS, type StepActor, type StepId, type StoryState } from '../../story/model'
import { STEP_COPY, actorLabel, stepActor } from '../../story/steps'

export const TOTAL = STEP_IDS.length

/** The phone a step belongs to, for its colour; none for the clock or everyone. */
export function roleOf(actor: StepActor): Role | undefined {
  return actor === 'clock' || actor === 'everyone' ? undefined : actor
}

export function ActorChip({ actor }: { actor: StepActor }) {
  const role = roleOf(actor)
  const label =
    actor === 'clock' ? 'Demo clock' : actor === 'everyone' ? 'Everyone' : CAST[actor].firstName
  return (
    <span
      data-role-accent={role}
      className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-tint px-2 text-caption leading-none font-semibold whitespace-nowrap text-accent-text"
    >
      {role ? (
        <RoleIcon role={role} weight="bold" className="size-3.5" />
      ) : actor === 'clock' ? (
        <ClockClockwiseIcon weight="bold" aria-hidden className="size-3.5" />
      ) : (
        <HandTapIcon weight="bold" aria-hidden className="size-3.5" />
      )}
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{actorLabel(actor)}</span>
    </span>
  )
}

/**
 * Twelve bars along the top edge of the story card, one per step, each in the colour of whoever
 * does it. Decorative: "Step 4 of 12" says the same in words.
 */
export function ProgressTrack({ state }: { state: StoryState }) {
  return (
    <ol aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1.5 gap-0.5">
      {STEP_IDS.map((id) => {
        const status = state.status[id]
        return (
          <li
            key={id}
            data-role-accent={roleOf(stepActor(id))}
            className={cn(
              'flex-1 transition-colors duration-(--duration-slow)',
              status === 'done' && 'bg-accent',
              status === 'current' && 'story-current bg-accent/60',
              status === 'upcoming' && 'bg-surface-2',
            )}
          />
        )
      })}
    </ol>
  )
}

function StepMark({ id, state }: { id: StepId; state: StoryState }) {
  const status = state.status[id]
  if (status === 'done') {
    return <CheckCircleIcon weight="fill" aria-hidden className="size-6 shrink-0 text-positive" />
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums',
        status === 'current'
          ? 'story-current border-2 border-accent-strong bg-accent-tint text-accent-text'
          : 'border border-line text-muted',
      )}
    >
      {STEP_IDS.indexOf(id) + 1}
    </span>
  )
}

export function StepList({ state }: { state: StoryState }) {
  return (
    <ol className="flex flex-col">
      {STEP_IDS.map((id) => {
        const status = state.status[id]
        const actor = stepActor(id)
        return (
          <li
            key={id}
            data-role-accent={roleOf(actor)}
            aria-current={status === 'current' ? 'step' : undefined}
            className="flex items-center gap-3 py-1.5"
          >
            <StepMark id={id} state={state} />
            <span
              className={cn(
                'min-w-0 flex-1 text-small leading-snug',
                status === 'done' && 'text-muted',
                status === 'current' && 'font-semibold text-ink',
                status === 'upcoming' && 'text-muted',
              )}
            >
              {status === 'done' ? STEP_COPY[id].doneTitle : STEP_COPY[id].title}
              <span className="sr-only">
                {status === 'done' ? ', done' : status === 'current' ? ', now' : ', to come'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function StepsToggle({
  open,
  controls,
  onToggle,
}: {
  open: boolean
  controls: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="-my-2 ml-auto inline-flex min-h-10 shrink-0 items-center gap-1 rounded-control px-1 text-caption font-semibold text-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {open ? 'Hide steps' : `All ${TOTAL} steps`}
      <CaretDownIcon
        weight="bold"
        aria-hidden
        className={cn(
          'size-4 transition-transform duration-(--duration-quick)',
          open && 'rotate-180',
        )}
      />
    </button>
  )
}
