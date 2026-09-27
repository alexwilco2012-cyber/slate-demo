import type { ReactNode } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Field, controlClassName } from '@/components/ui/field'

export interface SelectFieldProps<V extends string> {
  label: ReactNode
  hideLabel?: boolean
  hint?: ReactNode
  error?: ReactNode
  value: V
  onValueChange: (value: V) => void
  options: readonly { value: V; label: string }[]
  className?: string
}

/**
 * A native select: the platform's own picker on phones, keyboard-friendly everywhere. For long
 * lists such as homes, where segmented buttons would not fit.
 */
export function SelectField<V extends string>({
  label,
  hideLabel,
  hint,
  error,
  value,
  onValueChange,
  options,
  className,
}: SelectFieldProps<V>) {
  return (
    <Field label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            value={value}
            onChange={(event) => onValueChange(event.target.value as V)}
            className={cn(
              controlClassName,
              'min-h-(--control-h) cursor-pointer appearance-none py-2 pr-10 pl-3.5',
            )}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <CaretDownIcon
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
          />
        </div>
      )}
    </Field>
  )
}
