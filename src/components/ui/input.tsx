import { useRef, type ComponentProps, type ReactNode } from 'react'
import { cn } from './cn'
import { Field, type FieldProps } from './field'

export type InputProps = Omit<ComponentProps<'input'>, 'id' | 'children'> &
  Pick<FieldProps, 'label' | 'hint' | 'error' | 'optional' | 'hideLabel' | 'id'> & {
    /** Text or an icon inside the start of the box, e.g. "£". */
    leading?: ReactNode
    /** Text or an icon inside the end of the box, e.g. "per month". */
    trailing?: ReactNode
    fieldClassName?: string
  }

/** A labelled single-line text field. Pick the right `type`, `inputMode` and `autoComplete`. */
export function Input({
  label,
  hint,
  error,
  optional,
  hideLabel,
  id,
  required,
  leading,
  trailing,
  className,
  fieldClassName,
  disabled,
  readOnly,
  ...props
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

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
    >
      {(control) => (
        // The box draws the border so "£" and "per month" sit inside it; clicks anywhere focus
        // the input.
        <div
          onPointerDown={(event) => {
            if (event.target !== inputRef.current) {
              event.preventDefault()
              inputRef.current?.focus()
            }
          }}
          data-invalid={error ? '' : undefined}
          data-disabled={disabled ? '' : undefined}
          data-readonly={readOnly ? '' : undefined}
          className={cn(
            'flex h-(--control-h) w-full cursor-text items-center rounded-control border border-input-border bg-surface text-ink',
            'transition-[border-color,box-shadow] duration-(--duration-quick) ease-out-soft',
            'hover:border-[color-mix(in_oklab,var(--input-border),var(--ink)_30%)]',
            'has-[input:focus-visible]:border-ring has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-ring',
            'data-invalid:border-critical data-invalid:shadow-[inset_0_0_0_1px_var(--critical)]',
            'data-disabled:cursor-not-allowed data-disabled:bg-surface-2 data-disabled:text-muted',
            'data-readonly:bg-surface-2',
          )}
        >
          {leading ? (
            <span className="flex shrink-0 items-center pl-3.5 text-muted [&_svg]:size-5">
              {leading}
            </span>
          ) : null}
          <input
            ref={inputRef}
            {...control}
            {...props}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent px-3.5 text-body text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed',
              leading && 'pl-2',
              trailing && 'pr-2',
              className,
            )}
          />
          {trailing ? (
            <span className="flex shrink-0 items-center whitespace-nowrap pr-3.5 text-small text-muted [&_svg]:size-5">
              {trailing}
            </span>
          ) : null}
        </div>
      )}
    </Field>
  )
}
