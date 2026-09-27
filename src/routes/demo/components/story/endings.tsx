// How the story ends: the ratings revealed together, or a repair that was called off.

import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowCounterClockwiseIcon,
  HandTapIcon,
  LockSimpleOpenIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/config/brand'
import type { Derailment, StoryState } from '../../story/model'
import type { FrameTarget } from '../../story/steps'
import { TOTAL } from './overview'

export function Finished({
  state,
  onShow,
  onReset,
}: {
  state: StoryState
  onShow: (target: FrameTarget) => void
  onReset: () => void
}) {
  const reduceMotion = useReducedMotion()
  const job = state.snapshot.job
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <motion.span
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-positive-tint text-positive"
        >
          <LockSimpleOpenIcon weight="duotone" aria-hidden className="size-6" />
        </motion.span>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-muted">
            All {TOTAL} steps · the end of the story
          </p>
          <h3 className="font-display text-display-m font-semibold text-ink">Revealed together</h3>
        </div>
      </div>
      <p className="text-body text-pretty text-ink/90">
        Every rating on the leak opened at the same moment, so nobody could react to anyone else’s.
        Sarah’s rating of Graham stays sealed and only counts inside his score.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onShow({ cast: 'trade', path: '/trade/profile' })}
          iconStart={<HandTapIcon weight="bold" aria-hidden />}
        >
          See Kev’s new reviews
        </Button>
        {job ? (
          <Button
            variant="secondary"
            onClick={() => onShow({ cast: 'landlord', path: '/landlord/ratings' })}
          >
            What Graham sees
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={onReset}
          iconStart={<ArrowCounterClockwiseIcon weight="bold" aria-hidden />}
        >
          Start again
        </Button>
      </div>
    </div>
  )
}

const DERAILED: Record<Derailment, { title: string; body: string }> = {
  declined: {
    title: 'Graham declined the repair',
    body: 'With no repair to do, there’s nothing for Kev to quote. Start again, or have Sarah report the leak again.',
  },
  cancelled: {
    title: 'The repair was called off',
    body: 'With no repair to do, there’s nothing for Kev to quote. Start again, or have Sarah report the leak again.',
  },
  other_trade: {
    title: 'Graham chose another trade',
    body: `That’s his call to make, and ${BRAND.name} never overrules it. This story follows Kev, though, so start again and ask Kev to quote.`,
  },
}

export function Derailed({ reason, onReset }: { reason: Derailment; onReset: () => void }) {
  const copy = DERAILED[reason]
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-caption font-semibold text-caution">
        <WarningCircleIcon weight="bold" aria-hidden className="size-4" />
        The story stopped here
      </p>
      <h3 className="font-display text-display-m font-semibold text-ink">{copy.title}</h3>
      <p className="text-body text-pretty text-ink/90">{copy.body}</p>
      <div>
        <Button
          onClick={onReset}
          iconStart={<ArrowCounterClockwiseIcon weight="bold" aria-hidden />}
        >
          Start again
        </Button>
      </div>
    </div>
  )
}

export function derailedTitle(reason: Derailment): string {
  return DERAILED[reason].title
}
