import { CheckIcon } from '@phosphor-icons/react'
import { cn } from './cn'

export interface ProgressStepsProps {
  /** Short step names, e.g. ['Room', 'Problem', 'Photos', 'Urgency', 'Access', 'Check answers']. */
  steps: readonly string[]
  /** Zero-based index of the step on screen. */
  current: number
  /**
   * - bar: "Step 2 of 6 · Problem" over a segmented bar. For one-question-per-screen flows.
   * - list: every step named, with done and current marked. For a check-answers summary.
   */
  variant?: 'bar' | 'list'
  className?: string
}

/** Where someone is in a multi-step flow. Done, current and upcoming differ by shape and words. */
export function ProgressSteps({ steps, current, variant = 'bar', className }: ProgressStepsProps) {
  const total = steps.length
  const index = Math.min(Math.max(current, 0), total - 1)

  if (variant === 'bar') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <p className="flex items-baseline gap-2 text-small text-muted">
          <span className="figures font-semibold text-ink">
            Step {index + 1} of {total}
          </span>
          <span aria-hidden="true">·</span>
          <span>{steps[index]}</span>
        </p>
        <ol className="flex gap-1" aria-label="Progress">
          {steps.map((step, i) => {
            const state = i < index ? 'done' : i === index ? 'current' : 'upcoming'
            return (
              <li
                key={step}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-(--duration-base)',
                  state === 'done' && 'bg-accent',
                  state === 'current' && 'bg-accent',
                  state === 'upcoming' && 'bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]',
                )}
              >
                <span className="sr-only">
                  {step}:{' '}
                  {state === 'done' ? 'done' : state === 'current' ? 'current step' : 'to do'}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  return (
    <ol className={cn('flex flex-col', className)} aria-label="Progress">
      {steps.map((step, i) => {
        const state = i < index ? 'done' : i === index ? 'current' : 'upcoming'
        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex min-h-11 items-center gap-3 pb-1 last:pb-0"
          >
            {i < total - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 bottom-0 left-[0.8125rem] w-0.5 -translate-x-1/2',
                  state === 'done' ? 'bg-accent' : 'bg-line',
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-6.5 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                state === 'done' && 'bg-accent text-on-accent',
                state === 'current' &&
                  'bg-surface text-accent-text ring-2 ring-accent-strong ring-offset-2 ring-offset-bg',
                state === 'upcoming' &&
                  'border-2 border-dashed border-input-border bg-surface text-muted',
              )}
            >
              {state === 'done' ? <CheckIcon weight="bold" className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-body',
                state === 'current' ? 'font-semibold text-ink' : 'text-muted',
                state === 'done' && 'text-ink',
              )}
            >
              {step}
              <span className="sr-only">
                {state === 'done' ? ', done' : state === 'current' ? ', current step' : ', to do'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
