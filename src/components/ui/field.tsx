import { useId, type ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from './cn'

/** What a control needs from its Field to be labelled and described. */
export interface FieldControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  required: boolean | undefined
}

export interface FieldProps {
  label: ReactNode
  /** Persistent help under the label. Never rely on a placeholder instead. */
  hint?: ReactNode
  /** Says what went wrong and how to fix it. Shown under the control. */
  error?: ReactNode
  required?: boolean
  /** Marks the field "(optional)" instead of marking required ones: most fields are required. */
  optional?: boolean
  /** Extra description ids, such as a character count. */
  describedBy?: string
  /** Visually hide the label (it stays for screen readers). Use sparingly. */
  hideLabel?: boolean
  id?: string
  className?: string
  children: (control: FieldControlProps) => ReactNode
  /** Rendered after the control, e.g. a character count. */
  footer?: ReactNode
}

/** Label, hint, control and error, wired together with ids. */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  describedBy,
  hideLabel,
  id,
  className,
  children,
  footer,
}: FieldProps) {
  const autoId = useId()
  const controlId = id ?? `field-${autoId}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedByIds = [hintId, errorId, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={controlId}
        className={cn('text-body font-semibold text-ink', hideLabel && 'sr-only')}
      >
        {label}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="-mt-0.5 text-small text-muted">
          {hint}
        </p>
      ) : null}
      {children({
        id: controlId,
        'aria-describedby': describedByIds,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {footer}
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

/** Shared look for text-like controls, so Input and Textarea match. */
export const controlClassName = cn(
  'w-full rounded-control border border-input-border bg-surface text-body text-ink',
  'placeholder:text-muted',
  'transition-[border-color,box-shadow] duration-(--duration-quick) ease-out-soft',
  'hover:border-[color-mix(in_oklab,var(--input-border),var(--ink)_30%)]',
  'focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
  'aria-invalid:border-critical aria-invalid:shadow-[inset_0_0_0_1px_var(--critical)]',
  'disabled:bg-surface-2 disabled:text-muted',
  'read-only:bg-surface-2 read-only:focus-visible:outline-dashed',
)
