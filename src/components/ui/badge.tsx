import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

export const badgeVariants = cva(
  [
    'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full font-semibold leading-none whitespace-nowrap',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-ink',
        accent: 'bg-accent-tint text-accent-text',
        brand: 'bg-brand-tint text-brand',
        positive: 'bg-positive-tint text-positive',
        caution: 'bg-caution-tint text-caution',
        critical: 'bg-critical-tint text-critical',
        info: 'bg-info-tint text-info',
        outline: 'border border-input-border bg-surface text-ink',
      },
      size: {
        sm: 'h-6 px-2 text-caption [&_svg]:size-3.5',
        md: 'h-7 px-2.5 text-small [&_svg]:size-4',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** Status badges need an icon as well as a colour (SPEC §9: status never colour alone). */
    icon?: ReactNode
  }

/** A short label for status or category. Always words; the colour only reinforces them. */
export function Badge({ tone, size, icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
