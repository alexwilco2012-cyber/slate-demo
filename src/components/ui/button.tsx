import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'
import { Spinner } from './spinner'

/**
 * Button styles, exported so links that look like buttons (a router Link) share them exactly.
 * Heights come from --control-h*, which the trade portal raises for Hi-Vis.
 */
export const buttonVariants = cva(
  [
    // Labels may wrap on narrow screens (320px, 200% zoom), so heights are minimums.
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 text-center',
    'rounded-control font-semibold leading-tight no-underline',
    'transition-[background-color,border-color,color,box-shadow,scale] duration-(--duration-quick) ease-out-soft',
    'active:scale-[0.98] aria-disabled:active:scale-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:border-transparent disabled:bg-surface-2 disabled:text-muted disabled:shadow-none disabled:active:scale-100',
    'aria-busy:cursor-progress',
    '[&_svg]:size-[1.25em] [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** The one main action on a screen. Role accent fill. */
        primary:
          'bg-accent text-on-accent shadow-soft hover:bg-accent-hover active:bg-accent-press',
        /** Quieter actions next to a primary. */
        secondary:
          'border border-input-border bg-surface text-ink hover:bg-surface-2 active:bg-surface-2',
        /** Role-tinted, for a second action that still belongs to the portal. */
        soft: 'bg-accent-tint text-accent-text hover:shadow-[inset_0_0_0_1.5px_var(--accent-strong)]',
        /** Text-weight actions in toolbars, cards and dialogs. */
        ghost: 'text-ink hover:bg-surface-2 active:bg-surface-2',
        /**
         * Destructive and irreversible actions. Outlined: a red fill is almost the same colour as
         * the tenant's clay primary (1.06:1), so it would read as the main action.
         */
        danger:
          'border border-danger bg-surface text-danger hover:bg-critical-tint active:bg-critical-tint',
        /** Only the final confirm inside a dialog that says what will be lost. */
        'danger-solid':
          'bg-danger text-on-danger shadow-soft hover:bg-[color-mix(in_oklab,var(--danger)_86%,var(--ink))]',
      },
      size: {
        sm: 'min-h-(--control-h-sm) px-3 py-1.5 text-small',
        md: 'min-h-(--control-h) px-4 py-2 text-body',
        lg: 'min-h-(--control-h-lg) px-6 py-2.5 text-body-l',
        /** Hi-Vis: 60px tall and full width, for the bottom third of trade screens. */
        trade: 'min-h-15 w-full px-6 py-3 text-body-l font-bold',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export type ButtonProps = ComponentProps<'button'> &
  ButtonVariantProps & {
    iconStart?: ReactNode
    iconEnd?: ReactNode
    /** Shows a spinner and blocks clicks, but keeps focus so screen readers stay put. */
    loading?: boolean
  }

export function Button({
  className,
  variant,
  size,
  fullWidth,
  iconStart,
  iconEnd,
  loading = false,
  type = 'button',
  onClick,
  children,
  ...props
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? <Spinner /> : iconStart}
      {children}
      {iconEnd}
    </button>
  )
}
