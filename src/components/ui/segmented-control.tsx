import { useId, type ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CheckIcon } from '@phosphor-icons/react'
import { cn } from './cn'

export interface SegmentOption<V extends string> {
  value: V
  label: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<V extends string> {
  /** Visible group label. Pass hideLabel to keep it for screen readers only. */
  label: string
  hideLabel?: boolean
  hint?: ReactNode
  options: readonly SegmentOption<V>[]
  value?: V
  defaultValue?: V
  onValueChange?: (value: V) => void
  name?: string
  disabled?: boolean
  required?: boolean
  /** sm suits dense toolbars; lg is for the one big choice on a trade screen. */
  size?: 'sm' | 'md' | 'lg'
  /** Stack the options below 640px. Use for four or more, or for long labels. */
  stackOnPhone?: boolean
  fullWidth?: boolean
  className?: string
}

/**
 * One choice from a few, all visible at once. Use instead of a dropdown, always in the trade
 * portal (Hi-Vis). A radio group underneath: arrow keys move and select, Tab leaves the group.
 */
export function SegmentedControl<V extends string>(props: SegmentedControlProps<V>) {
  const {
    label,
    hideLabel,
    hint,
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    disabled,
    required,
    size = 'md',
    stackOnPhone,
    fullWidth = true,
    className,
  } = props
  const labelId = useId()
  const hintId = useId()

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div id={labelId} className={cn('text-body font-semibold text-ink', hideLabel && 'sr-only')}>
        {label}
      </div>
      {hint ? (
        <p id={hintId} className="-mt-0.5 text-small text-muted">
          {hint}
        </p>
      ) : null}
      <RadioGroup
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        name={name}
        // A value prop, even an empty one, keeps the group controlled: nothing chosen is null, not
        // undefined, so the first choice never switches it from uncontrolled to controlled.
        value={'value' in props ? (value ?? null) : undefined}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next as V)}
        disabled={disabled}
        required={required}
        className={cn(
          'gap-1 rounded-[calc(var(--radius-control)+0.25rem)] border border-input-border bg-surface-2 p-1',
          fullWidth
            ? 'grid w-full auto-cols-fr grid-flow-col'
            : 'inline-grid auto-cols-fr grid-flow-col',
          stackOnPhone && 'max-sm:grid-flow-row max-sm:auto-cols-auto',
        )}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              // Wraps rather than overflows: in a tight cell the tick sits above the word.
              'flex min-w-0 select-none flex-wrap content-center items-center justify-center gap-x-1.5 rounded-control text-center font-semibold text-ink',
              size === 'sm' && 'min-h-(--control-h-sm) px-2 text-small',
              size === 'md' && 'min-h-(--control-h) px-2.5 text-body',
              size === 'lg' && 'min-h-(--control-h-lg) px-3 text-body-l',
              'transition-[background-color,color,box-shadow] duration-(--duration-quick) ease-out-soft',
              // The inset edge is invisible on clay and moss; on ochre it gives the pill a 4:1 edge.
              'hover:bg-surface data-checked:bg-accent data-checked:text-on-accent data-checked:shadow-[inset_0_0_0_1.5px_var(--accent-strong),var(--shadow-soft)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'data-disabled:cursor-not-allowed data-disabled:text-muted data-disabled:hover:bg-transparent',
              '[&_svg]:size-[1.2em] [&_svg]:shrink-0',
            )}
          >
            <Radio.Indicator
              keepMounted
              className="flex items-center data-unchecked:hidden"
              aria-hidden
            >
              <CheckIcon weight="bold" />
            </Radio.Indicator>
            {option.icon ? (
              <span className="flex in-data-checked:hidden">{option.icon}</span>
            ) : null}
            <span className={cn('min-w-0 leading-tight', size === 'sm' ? 'py-1.5' : 'py-2')}>
              {option.label}
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  )
}
