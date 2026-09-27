import { useId, type ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import { cn } from './cn'

export interface RadioOption<V extends string> {
  value: V
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export interface RadioGroupProps<V extends string> {
  label: ReactNode
  hideLabel?: boolean
  hint?: ReactNode
  error?: ReactNode
  options: readonly RadioOption<V>[]
  value?: V
  defaultValue?: V
  onValueChange?: (value: V) => void
  name?: string
  required?: boolean
  disabled?: boolean
  /** 'cards' puts each option in its own bordered tile, for choices with descriptions. */
  variant?: 'list' | 'cards'
  className?: string
}

/** A labelled set of radio buttons. Arrow keys move between options. */
export function RadioGroup<V extends string>(props: RadioGroupProps<V>) {
  const {
    label,
    hideLabel,
    hint,
    error,
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    required,
    disabled,
    variant = 'list',
    className,
  } = props
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        id={`${id}-label`}
        className={cn('text-body font-semibold text-ink', hideLabel && 'sr-only')}
      >
        {label}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-0.5 text-small text-muted">
          {hint}
        </p>
      ) : null}
      <BaseRadioGroup
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        name={name}
        required={required}
        disabled={disabled}
        // A value prop, even an empty one, keeps the group controlled: nothing chosen is null, not
        // undefined, so the first choice never switches it from uncontrolled to controlled.
        value={'value' in props ? (value ?? null) : undefined}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next as V)}
        className={cn('flex flex-col', variant === 'cards' ? 'gap-(--gap-touch)' : 'gap-0')}
      >
        {options.map((option) => {
          const descriptionId = `${id}-${option.value}-description`
          return (
            <label
              key={option.value}
              className={cn(
                'group flex cursor-pointer items-start gap-3 text-body text-ink',
                variant === 'list' && 'min-h-(--control-h) py-2.5',
                variant === 'cards' &&
                  'rounded-control border border-input-border bg-surface p-4 transition-[border-color,background-color,box-shadow] duration-(--duration-quick) hover:bg-surface-2 has-data-checked:border-accent-strong has-data-checked:bg-accent-tint has-data-checked:shadow-[inset_0_0_0_1px_var(--accent-strong)]',
                option.disabled && 'cursor-not-allowed text-muted',
              )}
            >
              <Radio.Root
                value={option.value}
                disabled={option.disabled}
                aria-describedby={option.description ? descriptionId : undefined}
                className={cn(
                  'mt-px flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-input-border bg-surface trade:size-7',
                  'transition-[border-color] duration-(--duration-quick)',
                  'data-checked:border-accent-strong',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                )}
              >
                <Radio.Indicator className="size-3 rounded-full bg-accent-strong data-unchecked:hidden trade:size-3.5" />
              </Radio.Root>
              <span className="flex flex-col gap-0.5 pt-px">
                <span className="font-medium leading-snug">{option.label}</span>
                {option.description ? (
                  <span id={descriptionId} className="text-small text-muted">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </BaseRadioGroup>
      {error ? (
        <p id={`${id}-error`} className="text-small font-semibold text-critical">
          {error}
        </p>
      ) : null}
    </div>
  )
}
