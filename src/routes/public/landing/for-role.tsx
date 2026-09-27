// The numbered steps used on the how-it-works pages.

import { cn } from '@/components/ui/cn'
import type { Step } from '../content/roles'

/** Numbered steps with the number in the role's tint. */
export function StepList({ steps, className }: { steps: readonly Step[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col gap-5', className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className="figures flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-body-l font-semibold text-accent-text"
          >
            {index + 1}
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <h3 className="text-title leading-snug font-semibold text-ink">{step.title}</h3>
            <p className="text-body text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
