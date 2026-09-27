// Small building blocks shared by the public pages: the page width, section headings and the
// light-on-spruce button used inside the dark bands.

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

/** The page width: 1152px with the standard side gutter. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-(--gutter)', className)} {...props} />
}

/** A short line above a section heading, e.g. "For tenants". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-small font-semibold tracking-[0.01em] text-accent-text',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = 'start',
  className,
}: {
  id?: string
  eyebrow?: ReactNode
  title: ReactNode
  intro?: ReactNode
  align?: 'start' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-3',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className="font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance"
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            'text-body-l opacity-90',
            align === 'center' ? 'text-balance' : 'text-pretty',
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  )
}

/** A light button for the dark spruce bands, where the usual spruce primary would disappear. */
export const bandButtonClass = cn(
  'inline-flex min-h-(--control-h-lg) items-center justify-center gap-2 rounded-control px-6 py-2.5',
  'bg-[var(--on-band)] text-body-l font-semibold text-[var(--band)] no-underline shadow-soft',
  'transition-[background-color,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98]',
  'hover:bg-[color-mix(in_oklab,var(--on-band)_88%,var(--band))]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-band)]',
  '[&_svg]:size-5',
)

/** The quieter partner of bandButtonClass. */
export const bandOutlineButtonClass = cn(
  'inline-flex min-h-(--control-h-lg) items-center justify-center gap-2 rounded-control px-6 py-2.5',
  'border border-[var(--on-band-muted)] text-body-l font-semibold text-[var(--on-band)] no-underline',
  'transition-[background-color,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98]',
  'hover:bg-[var(--band-raised)]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-band)]',
  '[&_svg]:size-5',
)

/** Text links in running copy. Underlined, so they never rely on colour. */
export const inlineLinkClass =
  'font-semibold text-accent-text underline decoration-[0.08em] underline-offset-[0.2em] hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm'
