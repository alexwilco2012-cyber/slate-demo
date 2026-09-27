import { useId, type ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export interface SectionProps {
  title: ReactNode
  description?: ReactNode
  /** A link or button on the right of the heading, e.g. "See all". */
  action?: ReactNode
  /** Beside the title, e.g. a count. */
  meta?: ReactNode
  id?: string
  headingLevel?: 'h2' | 'h3'
  /** The heading's look, when it differs from its level: a repair's parts are h2s set small. */
  size?: 'large' | 'small'
  className?: string
  children: ReactNode
}

/** A titled block of a page. The heading names the region for screen readers. */
export function Section({
  title,
  description,
  action,
  meta,
  id,
  headingLevel: Heading = 'h2',
  size = Heading === 'h2' ? 'large' : 'small',
  className,
  children,
}: SectionProps) {
  const autoId = useId()
  const headingId = `${id ?? autoId}-heading`
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('flex scroll-mt-24 flex-col gap-4', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading
              id={headingId}
              tabIndex={-1}
              className={cn(
                'font-display font-semibold text-ink outline-none',
                size === 'large' ? 'text-display-m' : 'text-title',
              )}
            >
              {title}
            </Heading>
            {meta}
          </div>
          {description ? <p className="max-w-prose text-body text-muted">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** A small count pill beside a heading: "5". */
export function CountPill({ value, label }: { value: number; label: string }) {
  return (
    <span className="figures inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-accent px-2 text-small font-bold text-on-accent">
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  )
}
