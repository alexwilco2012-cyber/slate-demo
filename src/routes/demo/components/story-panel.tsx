// The guided story: which step we're on, whose turn it is, what to tap, and a way to have it done
// for them. A column beside the phones on big screens ('rail'), a card above them otherwise
// ('band').

import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import { STEP_IDS, type StepId, type StoryState } from '../story/model'
import { STEP_COPY, type FrameTarget } from '../story/steps'
import { CurrentStep } from './story/current-step'
import { Derailed, Finished, derailedTitle } from './story/endings'
import { ProgressTrack, StepList, StepsToggle, TOTAL } from './story/overview'

export interface StoryPanelProps {
  variant: 'rail' | 'band'
  state: StoryState | null
  busy: boolean
  onShow: (target: FrameTarget) => void
  onSkip: (step: StepId) => void
  onReset: () => void
}

export function StoryPanel({ variant, state, busy, onShow, onSkip, onReset }: StoryPanelProps) {
  const reduceMotion = useReducedMotion()
  const headingId = useId()
  const stepsId = useId()
  const [stepsOpen, setStepsOpen] = useState(false)
  const rail = variant === 'rail'
  const key = state ? (state.derailed ?? state.current ?? 'finished') : 'loading'

  const body = !state ? (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-full" />
    </div>
  ) : state.derailed ? (
    <Derailed reason={state.derailed} onReset={onReset} />
  ) : state.current === null ? (
    <Finished state={state} onShow={onShow} onReset={onReset} />
  ) : (
    <CurrentStep
      id={state.current}
      state={state}
      busy={busy}
      onShow={onShow}
      onSkip={onSkip}
      compact={!rail}
      toggle={
        rail ? undefined : (
          <StepsToggle
            open={stepsOpen}
            controls={stepsId}
            onToggle={() => setStepsOpen((open) => !open)}
          />
        )
      }
    />
  )

  // Said once per change of step, briefly: the card itself isn't read out again every time.
  const announcement = !state
    ? ''
    : state.derailed
      ? `The story stopped: ${derailedTitle(state.derailed)}.`
      : state.current === null
        ? 'All ratings revealed together. That’s the end of the story.'
        : `Step ${STEP_IDS.indexOf(state.current) + 1} of ${TOTAL}: ${STEP_COPY[state.current].title}.`

  const animated = (
    <div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  )

  if (rail) {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <h2 id={headingId} className="font-display text-display-l font-semibold text-ink">
            One leak, three phones
          </h2>
          <p className="text-body text-pretty text-muted">
            Follow a repair from Sarah’s report to the ratings reveal. Tap through it in the phones,
            or let Skip ahead do each step. Every phone updates live.
          </p>
        </header>
        <div className="rounded-card border border-line bg-surface p-5 shadow-raised">
          {animated}
        </div>
        {state ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-small font-semibold text-muted">The story so far</h3>
            <StepList state={state} />
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-4 pt-5 shadow-raised sm:p-5 sm:pt-6"
    >
      <h2 id={headingId} className="sr-only">
        The story: one leak, three phones
      </h2>
      {state ? <ProgressTrack state={state} /> : null}
      {animated}
      {state ? (
        <div
          id={stepsId}
          hidden={!stepsOpen}
          className="rounded-control bg-bg/60 px-3 py-2 sm:columns-2 lg:columns-4 [&_li]:break-inside-avoid"
        >
          <StepList state={state} />
        </div>
      ) : null}
    </section>
  )
}
