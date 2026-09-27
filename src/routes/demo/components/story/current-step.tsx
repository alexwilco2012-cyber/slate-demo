// The step being played: its number, whose turn it is, what to tap, and a way to have it done.

import type { ReactNode } from 'react'
import { ClockClockwiseIcon, FastForwardIcon, HandTapIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Button } from '@/components/ui/button'
import type { Role } from '@/domain/types'
import { CAST } from '../../cast'
import { addMinutes, dayLabel, timeLabel } from '../../lib/time'
import { STEP_IDS, waitingOn, type StepId, type StoryState } from '../../story/model'
import { STEP_COPY, stepActor, stepHint, stepTarget, type FrameTarget } from '../../story/steps'
import { ActorChip, TOTAL, roleOf } from './overview'
import { RateChecklist, RatePills } from './ratings'

function StepActions({
  id,
  state,
  busy,
  onShow,
  onSkip,
}: {
  id: StepId
  state: StoryState
  busy: boolean
  onShow: (target: FrameTarget) => void
  onSkip: (step: StepId) => void
}) {
  const actor = stepActor(id)
  const target = stepTarget(id, state)

  if (id === 'visit_day' || id === 'reveal') {
    const visit = state.visit
    const label =
      id === 'visit_day' && visit
        ? `Move to ${dayLabel(visit.startsAt)}, ${timeLabel(addMinutes(visit.startsAt, -15))}`
        : 'Move the clock to the reveal'
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          loading={busy}
          onClick={() => onSkip(id)}
          iconStart={<ClockClockwiseIcon weight="bold" aria-hidden />}
        >
          {label}
        </Button>
      </div>
    )
  }

  if (id === 'rate') {
    const someIn = state.ratings.some((r) => !r.shielded && r.status === 'submitted')
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          loading={busy}
          onClick={() => onSkip('rate')}
          iconStart={<FastForwardIcon weight="bold" aria-hidden />}
        >
          Skip ahead: everyone rates
        </Button>
        {someIn ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onSkip('reveal')}
            iconStart={<ClockClockwiseIcon weight="bold" aria-hidden />}
          >
            Move the clock to the reveal
          </Button>
        ) : null}
      </div>
    )
  }

  const who = roleOf(actor) ? CAST[actor as Role].firstName : null
  return (
    <div className="flex flex-wrap gap-2">
      {target ? (
        <Button
          onClick={() => onShow(target)}
          disabled={busy}
          iconStart={<HandTapIcon weight="bold" aria-hidden />}
          aria-label={who ? `Show me in ${who}’s phone` : 'Show me'}
        >
          Show me
        </Button>
      ) : null}
      <Button
        variant="secondary"
        loading={busy}
        onClick={() => onSkip(id)}
        iconStart={<FastForwardIcon weight="bold" aria-hidden />}
        aria-label={who ? `Skip ahead: ${who} does this step` : 'Skip ahead'}
      >
        Skip ahead
      </Button>
    </div>
  )
}

export function CurrentStep({
  id,
  state,
  busy,
  onShow,
  onSkip,
  compact,
  toggle,
}: {
  id: StepId
  state: StoryState
  busy: boolean
  onShow: (target: FrameTarget) => void
  onSkip: (step: StepId) => void
  compact: boolean
  /** "All 12 steps", beside the step number in the card above the phones. */
  toggle?: ReactNode
}) {
  const actor = stepActor(id)
  const index = STEP_IDS.indexOf(id) + 1
  const waiting = waitingOn(state)
  return (
    <div data-role-accent={roleOf(actor)} className="flex flex-col gap-3">
      <div
        className={cn(
          'flex flex-col gap-3',
          compact &&
            'lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_auto] lg:items-center lg:gap-6',
        )}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-2 text-caption font-semibold text-muted">
            <span>
              Step {index} of {TOTAL}
            </span>
            <ActorChip actor={id === 'rate' && waiting.length === 1 ? waiting[0]! : actor} />
            {toggle}
          </p>
          <h3 className="font-display text-display-m font-semibold text-balance text-ink">
            {STEP_COPY[id].title}
          </h3>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-body text-pretty text-ink/90">{stepHint(id, state)}</p>
          {id === 'rate' && compact ? <RatePills state={state} onShow={onShow} /> : null}
        </div>
        {id !== 'rate' || compact ? (
          <StepActions id={id} state={state} busy={busy} onShow={onShow} onSkip={onSkip} />
        ) : null}
      </div>
      {id === 'rate' && !compact ? (
        <>
          <RateChecklist state={state} onShow={onShow} />
          <StepActions id={id} state={state} busy={busy} onShow={onShow} onSkip={onSkip} />
        </>
      ) : null}
    </div>
  )
}
