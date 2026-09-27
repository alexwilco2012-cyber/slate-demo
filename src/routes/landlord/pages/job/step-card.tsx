import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

/**
 * Where a repair's headings start. On its own page the repair's title is the h1, so its parts are
 * h2s; in the drawer the drawer's title is the h2, so they are h3s.
 */
export const JobHeadingLevel = createContext<2 | 3>(2)

export function useJobHeadings() {
  const base = useContext(JobHeadingLevel)
  return base === 2
    ? ({ section: 'h2', item: 'h3' } as const)
    : ({ section: 'h3', item: 'h4' } as const)
}

export interface StepCardProps {
  /** The question or step, e.g. "Approve this repair?". */
  title: ReactNode
  description?: ReactNode
  /** Buttons, main one last. */
  actions?: ReactNode
  /** 'now' for the landlord's own next step; 'waiting' when it's with someone else. */
  tone?: 'now' | 'waiting' | 'done'
  eyebrow?: ReactNode
  id?: string
  className?: string
  children?: ReactNode
}

/** The one next step on a repair, at the top of the page. */
export function StepCard({
  title,
  description,
  actions,
  tone = 'now',
  eyebrow,
  id,
  className,
  children,
}: StepCardProps) {
  const { section: Heading } = useJobHeadings()
  return (
    <section
      id={id}
      aria-label="Next step"
      className={cn(
        '@container relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-card p-4 sm:p-5',
        tone === 'now' &&
          'border border-[color-mix(in_oklab,var(--accent),transparent_65%)] bg-accent-tint',
        tone === 'waiting' && 'border border-line bg-surface shadow-soft',
        tone === 'done' && 'border border-line bg-surface-2',
        className,
      )}
    >
      {tone === 'now' ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-small font-semibold text-accent-text">
          {eyebrow ??
            (tone === 'now'
              ? 'Your next step'
              : tone === 'waiting'
                ? 'What’s happening'
                : 'Finished')}
        </p>
        <Heading
          data-step-heading=""
          tabIndex={-1}
          className="font-display text-display-m font-semibold text-ink outline-none"
        >
          {title}
        </Heading>
        {description ? <p className="max-w-prose text-body text-ink">{description}</p> : null}
      </div>
      {children}
      {actions ? (
        <div className="flex flex-col-reverse gap-(--gap-touch) @md:flex-row @md:flex-wrap @md:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  )
}
