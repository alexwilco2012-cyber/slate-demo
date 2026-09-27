import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'
import { Tooltip } from './tooltip'

export const iconButtonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center rounded-full',
    'transition-[background-color,color,scale] duration-(--duration-quick) ease-out-soft active:scale-95',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:text-muted disabled:opacity-60 disabled:active:scale-100',
    '[&_svg]:size-[55%] [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-ink hover:bg-surface-2',
        quiet: 'text-muted hover:bg-surface-2 hover:text-ink',
        secondary: 'border border-input-border bg-surface text-ink hover:bg-surface-2',
        soft: 'bg-accent-tint text-accent-text hover:shadow-[inset_0_0_0_1.5px_var(--accent-strong)]',
        primary: 'bg-accent text-on-accent shadow-soft hover:bg-accent-hover',
      },
      size: {
        sm: 'size-(--control-h-sm)',
        md: 'size-(--control-h)',
        lg: 'size-(--control-h-lg)',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: the accessible name, also shown as a tooltip to mouse and keyboard users. */
    label: string
    icon: ReactNode
    /** Set false where the label is already visible nearby. */
    tooltip?: boolean
  }

export function IconButton({
  label,
  icon,
  variant,
  size,
  tooltip = true,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
    </button>
  )
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button
}
