import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

export const cardVariants = cva('relative flex flex-col overflow-hidden rounded-card text-ink', {
  variants: {
    variant: {
      /** Default: a surface lifted gently off the page. */
      raised: 'border border-line bg-surface shadow-soft',
      /** Hairline only, for dense lists. */
      outline: 'border border-line bg-surface',
      /** Recessed well, for secondary panels inside a card or page. */
      sunken: 'bg-surface-2',
      /** Role-tinted, for the one thing on a screen that needs the person. */
      accent: 'border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint',
    },
    padding: {
      none: '',
      sm: 'p-3.5',
      md: 'p-4 sm:p-5',
      lg: 'p-5 sm:p-7',
    },
    interactive: {
      true: [
        'transition-[box-shadow,border-color,translate] duration-(--duration-base) ease-out-soft',
        'hover:-translate-y-px hover:shadow-raised',
        'has-[a:focus-visible,button:focus-visible]:outline-2 has-[a:focus-visible,button:focus-visible]:outline-offset-2 has-[a:focus-visible,button:focus-visible]:outline-ring',
      ],
      false: '',
    },
  },
  defaultVariants: { variant: 'raised', padding: 'md', interactive: false },
})

export type CardProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof cardVariants> & {
    as?: 'div' | 'article' | 'section' | 'li' | 'aside'
    /** The 4px role accent bar along the top edge. */
    accentBar?: boolean
  }

export function Card({
  as: Element = 'div',
  variant,
  padding,
  interactive,
  accentBar,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Element className={cn(cardVariants({ variant, padding, interactive }), className)} {...props}>
      {accentBar ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      ) : null}
      {children}
    </Element>
  )
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
  headingLevel: Heading = 'h3',
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  eyebrow?: ReactNode
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow ? <div className="text-small font-semibold text-muted">{eyebrow}</div> : null}
        <Heading className="text-title font-semibold leading-snug text-ink">{title}</Heading>
        {description ? <p className="text-small text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardFooter({
  className,
  as: Element = 'div',
  ...props
}: HTMLAttributes<HTMLElement> & { as?: 'div' | 'footer' }) {
  return (
    <Element
      className={cn(
        'mt-4 flex flex-wrap items-center gap-(--gap-touch) border-t border-line pt-4',
        className,
      )}
      {...props}
    />
  )
}
