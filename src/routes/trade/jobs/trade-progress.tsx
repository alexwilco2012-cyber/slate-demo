// How a job has gone from the trade's side: chosen, quoted, instructed, booked, done, paid. Each
// step says done, now or next in words and with its own marker shape, never by colour alone.

import { CheckIcon, XIcon } from '@phosphor-icons/react'
import type { Job, JobEventKind } from '@/domain/types'
import { cn } from '@/components/ui/cn'

type StepState = 'done' | 'current' | 'upcoming' | 'stopped'

// `next` is how the step reads while it's the one being waited on: "Paid" alone would read as
// though the money had arrived.
const STEPS: { label: string; next: string; events: readonly JobEventKind[] }[] = [
  { label: 'Quoted', next: 'Send a quote', events: ['quote_submitted', 'quote_accepted'] },
  { label: 'Instructed', next: 'Get the go-ahead', events: ['trade_instructed'] },
  { label: 'Booked', next: 'Book a visit', events: ['visit_booked'] },
  { label: 'Done', next: 'Do the work', events: ['completed', 'confirmed'] },
  { label: 'Invoiced', next: 'Send the invoice', events: ['invoice_sent'] },
  { label: 'Paid', next: 'Get paid', events: ['payment_recorded'] },
]

const WORDS: Record<StepState, string> = {
  done: 'done',
  current: 'up next',
  upcoming: 'still to come',
  stopped: 'called off',
}

export function progressSteps(
  job: Pick<Job, 'status' | 'timeline' | 'acceptedQuoteId' | 'payment'>,
) {
  const stopped = job.status === 'cancelled' || job.status === 'declined'
  const happened = STEPS.map(
    ({ label, events }) =>
      job.timeline.some((event) => events.includes(event.kind)) ||
      (label === 'Quoted' && job.acceptedQuoteId !== undefined) ||
      (label === 'Invoiced' && job.payment !== undefined) ||
      (label === 'Paid' && job.payment?.paidAt !== undefined),
  )
  // A later step counts for the earlier ones too: an emergency can go ahead without a quote.
  const done = happened.map((_, index) => happened.slice(index).some(Boolean))
  let reachedCurrent = false
  return STEPS.map(({ label, next }, index) => {
    let state: StepState
    if (done[index] && !reachedCurrent) state = 'done'
    else if (!reachedCurrent) {
      reachedCurrent = true
      state = stopped ? 'stopped' : 'current'
    } else state = 'upcoming'
    return { label: state === 'stopped' ? 'Called off' : label, next, state }
  })
}

export function TradeProgress({ job, className }: { job: Job; className?: string }) {
  const steps = progressSteps(job)
  const current = steps.find((step) => step.state === 'current' || step.state === 'stopped')
  return (
    <div className={cn('@container flex flex-col gap-2', className)}>
      <ol aria-label="Job progress" className="flex items-start">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex flex-1 flex-col items-center gap-1.5"
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-3.5 left-1/2 h-0.5 w-full -translate-y-1/2',
                  step.state === 'done'
                    ? 'bg-accent-strong'
                    : 'bg-[repeating-linear-gradient(to_right,var(--input-border)_0_4px,transparent_4px_8px)]',
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full',
                step.state === 'done' &&
                  'bg-accent text-on-accent ring-2 ring-accent-strong ring-inset',
                step.state === 'current' && 'bg-surface ring-[2.5px] ring-accent-strong ring-inset',
                step.state === 'upcoming' &&
                  'border-2 border-dashed border-input-border bg-surface',
                step.state === 'stopped' && 'bg-critical text-on-danger',
              )}
            >
              {step.state === 'done' ? <CheckIcon weight="bold" className="size-4" /> : null}
              {step.state === 'current' ? (
                <span className="size-2.5 rounded-full bg-accent-strong" />
              ) : null}
              {step.state === 'stopped' ? <XIcon weight="bold" className="size-4" /> : null}
            </span>
            <span
              className={cn(
                'sr-only px-0.5 text-center text-caption leading-tight @min-[34rem]:not-sr-only',
                step.state === 'current' ? 'font-bold text-ink' : 'text-muted',
              )}
            >
              {step.label}
              <span className="sr-only">: {WORDS[step.state]}</span>
            </span>
          </li>
        ))}
      </ol>
      {current ? (
        <p className="text-small text-ink @min-[34rem]:hidden" aria-hidden="true">
          <span className="font-bold">
            {current.state === 'stopped'
              ? 'Called off'
              : `Step ${steps.indexOf(current) + 1} of ${steps.length}: ${current.next}`}
          </span>
        </p>
      ) : (
        <p className="text-small text-ink @min-[34rem]:hidden" aria-hidden="true">
          <span className="font-bold">All done</span>
        </p>
      )}
    </div>
  )
}
