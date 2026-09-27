import { useId, useState, type ChangeEvent, type ComponentProps } from 'react'
import { cn } from './cn'
import { Field, controlClassName, type FieldProps } from './field'

export type TextareaProps = Omit<ComponentProps<'textarea'>, 'id' | 'children'> &
  Pick<FieldProps, 'label' | 'hint' | 'error' | 'optional' | 'hideLabel' | 'id'> & {
    /** Shows "120 of 1,000 characters" under the box. Needs maxLength. */
    showCount?: boolean
    fieldClassName?: string
  }

const numberFormat = new Intl.NumberFormat('en-GB')

/** A labelled multi-line field that grows with its content. */
export function Textarea({
  label,
  hint,
  error,
  optional,
  hideLabel,
  id,
  required,
  showCount,
  maxLength,
  minLength,
  value,
  defaultValue,
  onChange,
  rows = 4,
  className,
  fieldClassName,
  ...props
}: TextareaProps) {
  const countId = useId()
  const [uncontrolledLength, setUncontrolledLength] = useState(String(defaultValue ?? '').length)
  const length = value !== undefined ? String(value).length : uncontrolledLength
  const withCount = showCount && maxLength !== undefined

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setUncontrolledLength(event.target.value.length)
    onChange?.(event)
  }

  const tooShort = minLength !== undefined && length > 0 && length < minLength

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      hideLabel={hideLabel}
      required={required}
      id={id}
      className={fieldClassName}
      describedBy={withCount ? countId : undefined}
      footer={
        withCount ? (
          <p id={countId} className="figures text-right text-caption text-muted">
            {tooShort
              ? `${numberFormat.format(minLength - length)} more characters needed · `
              : null}
            {numberFormat.format(length)} of {numberFormat.format(maxLength)} characters
          </p>
        ) : null
      }
    >
      {(control) => (
        <textarea
          {...control}
          {...props}
          rows={rows}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          minLength={minLength}
          onChange={handleChange}
          className={cn(
            controlClassName,
            'block min-h-28 resize-y px-3.5 py-3 leading-relaxed [field-sizing:content] max-h-96',
            className,
          )}
        />
      )}
    </Field>
  )
}
