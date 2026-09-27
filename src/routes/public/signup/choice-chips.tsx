import { useId, type ReactNode } from 'react'
import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

export interface ChipOption<V extends string> {
  value: V
  label: string
  hint?: string
}

/**
 * Several choices at once, as tappable chips. Real checkboxes underneath, in a fieldset, so each
 * is announced with its state and the group has its question.
 */
export function ChoiceChips<V extends string>({
  legend,
  hideLegend,
  hint,
  error,
  options,
  value,
  onChange,
  className,
}: {
  legend: ReactNode
  hideLegend?: boolean
  hint?: ReactNode
  error?: string
  options: readonly ChipOption<V>[]
  value: readonly V[]
  onChange: (next: V[]) => void
  className?: string
}) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  function toggle(option: V, on: boolean) {
    const next = on ? [...value, option] : value.filter((item) => item !== option)
    // Keep the order the options are listed in, whatever order they were tapped.
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }

  return (
    <fieldset
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      <legend className={cn('mb-1 text-body font-semibold text-ink', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-1 text-small text-muted">
          {hint}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-(--gap-touch)">
        {options.map((option) => {
          const on = value.includes(option.value)
          return (
            <li key={option.value}>
              <label
                className={cn(
                  'flex min-h-(--control-h) cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-body font-semibold select-none',
                  'transition-[background-color,border-color,box-shadow] duration-(--duration-quick) ease-out-soft',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                  on
                    ? 'border-accent-strong bg-accent-tint text-ink shadow-[inset_0_0_0_1px_var(--accent-strong)]'
                    : 'border-input-border bg-surface text-ink hover:bg-surface-2',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                  className="sr-only"
                />
                {/* Square, like any checkbox: more than one can be chosen. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-[0.3125rem] border-2',
                    on
                      ? 'border-accent-strong bg-accent text-on-accent'
                      : 'border-input-border bg-surface',
                  )}
                >
                  {on ? <CheckIcon weight="bold" className="size-3" /> : null}
                </span>
                <span className="flex flex-col leading-tight">
                  {option.label}
                  {option.hint ? (
                    <span className="text-caption font-normal text-muted">{option.hint}</span>
                  ) : null}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div aria-live="polite">
        {error ? (
          <p
            id={`${id}-error`}
            className="flex items-start gap-1.5 text-small font-semibold text-critical"
          >
            <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  )
}
