import { useId, type ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

export interface ChoiceTile<V extends string> {
  value: V
  label: ReactNode
  /** A second line, e.g. "Tenant's choice" or "Too soon for notice". */
  detail?: ReactNode
  disabled?: boolean
}

/**
 * One choice from several, as big tiles that wrap onto rows: the trade portal's answer to a
 * dropdown when there are too many options for a segmented control. A radio group underneath.
 */
export function ChoiceTiles<V extends string>({
  label,
  hint,
  error,
  options,
  value,
  onValueChange,
  columns = 2,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  options: readonly ChoiceTile<V>[]
  value: V | undefined
  onValueChange: (value: V) => void
  /** Tiles per row in a narrow space, one more when there's room; 4 is two by two, then four across. */
  columns?: 1 | 2 | 3 | 4
  className?: string
}) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cn('@container flex flex-col gap-2', className)}>
      <div id={`${id}-label`} className="font-semibold text-ink">
        {label}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-1 text-small text-muted">
          {hint}
        </p>
      ) : null}
      <RadioGroup
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        value={value ?? null}
        onValueChange={(next) => onValueChange(next as V)}
        className={cn(
          'grid gap-(--gap-touch)',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-2 @lg:grid-cols-3',
          columns === 3 && 'grid-cols-3 @xl:grid-cols-4',
          columns === 4 && 'grid-cols-2 @xl:grid-cols-4',
        )}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              'group relative flex min-h-(--control-h) flex-col items-start justify-center gap-0.5 rounded-control border border-input-border bg-surface px-3.5 py-2.5 text-left text-ink',
              'transition-[background-color,border-color,box-shadow,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98]',
              'hover:bg-surface-2',
              'data-checked:border-accent-strong data-checked:bg-accent-tint data-checked:shadow-[inset_0_0_0_1.5px_var(--accent-strong)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:bg-transparent data-disabled:active:scale-100',
            )}
          >
            <span className="pr-6 leading-tight font-semibold group-data-disabled:text-muted">
              {option.label}
            </span>
            {option.detail ? (
              <span className="text-small leading-snug text-muted">{option.detail}</span>
            ) : null}
            <CheckCircleIcon
              weight="fill"
              aria-hidden
              className="absolute top-2 right-2 size-5 text-accent-strong opacity-0 transition-opacity group-data-checked:opacity-100"
            />
          </Radio.Root>
        ))}
      </RadioGroup>
      <div aria-live="polite">
        {error ? (
          <p
            id={`${id}-error`}
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
