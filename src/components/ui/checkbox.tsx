import { useId, type ReactNode } from 'react'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from './cn'

export interface CheckboxProps {
  label: ReactNode
  description?: ReactNode
  /** Says what went wrong, e.g. a box that must be ticked. Marks the box invalid and describes it. */
  error?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  indeterminate?: boolean
  name?: string
  value?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

/**
 * A labelled checkbox. The whole row is the target, at least 44px tall. An error shows under it,
 * in a wrapper that is always there so the box never remounts (and loses focus) as it comes and
 * goes.
 */
export function Checkbox({
  label,
  description,
  error,
  onCheckedChange,
  className,
  ...props
}: CheckboxProps) {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cn('flex flex-col', className)}>
      <label
        className={cn(
          'group flex min-h-(--control-h) cursor-pointer items-start gap-3 py-2.5 text-body text-ink',
          props.disabled && 'cursor-not-allowed text-muted',
        )}
      >
        <BaseCheckbox.Root
          {...props}
          onCheckedChange={(checked) => onCheckedChange?.(checked)}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'mt-px flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-input-border bg-surface text-on-accent trade:size-7',
            'transition-[background-color,border-color] duration-(--duration-quick) ease-out-soft',
            'group-hover:border-[color-mix(in_oklab,var(--input-border),var(--ink)_35%)]',
            // The edge uses --accent-strong so an ochre box still reads at 3:1 in the trade portal.
            'data-checked:border-accent-strong data-checked:bg-accent data-indeterminate:border-accent-strong data-indeterminate:bg-accent',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'data-disabled:border-line data-disabled:bg-surface-2',
            'aria-invalid:border-critical',
          )}
        >
          <BaseCheckbox.Indicator className="flex data-unchecked:hidden [&_svg]:size-4 trade:[&_svg]:size-5">
            {props.indeterminate ? <MinusIcon weight="bold" /> : <CheckIcon weight="bold" />}
          </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
        <span className="flex flex-col gap-0.5 pt-px">
          <span className="font-medium leading-snug">{label}</span>
          {description ? (
            <span id={descriptionId} className="text-small text-muted">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      <div aria-live="polite">
        {error ? (
          <p
            id={errorId}
            className="flex items-start gap-1.5 text-small font-semibold text-critical"
          >
            <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
