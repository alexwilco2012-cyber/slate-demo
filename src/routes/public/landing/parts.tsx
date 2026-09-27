// Type and small pieces shared by the front page's sections, so every section speaks with the
// same voice: a quiet label with a short rule, then a large Fraunces heading.

import type { ElementType, ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

/** Section headings: large, tight Fraunces. */
export const sectionTitleClass =
  'font-display text-[clamp(2.25rem,1.3rem+3.4vw,4.25rem)] leading-[1.02] font-[560] tracking-[-0.032em] text-balance'

/** Headings inside a section: a feature, a door, a rule. */
export const featureTitleClass =
  'font-display text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] leading-[1.1] font-[560] tracking-[-0.02em] text-balance'

/** Lead paragraphs under a section heading. */
export const leadClass = 'text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.55] text-pretty'

/** "How it works", with a short rule before it. Muted, so the heading below carries the weight. */
export function SectionLabel({
  children,
  as: Tag = 'p',
  id,
  className,
}: {
  children: ReactNode
  as?: ElementType
  id?: string
  className?: string
}) {
  return (
    <Tag
      id={id}
      className={cn(
        'flex items-center gap-3 text-small font-semibold tracking-[0.01em] text-muted',
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-7 bg-current opacity-60" />
      {children}
    </Tag>
  )
}
