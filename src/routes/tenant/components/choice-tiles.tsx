// Big, thumb-sized choices for one-question-per-screen flows: a radio group drawn as tiles with an
// icon, words and a tick, so the choice never relies on colour.

import type { ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CheckCircleIcon, type Icon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

export interface ChoiceTile<V extends string> {
  value: V
  label: string
  description?: ReactNode
  icon?: Icon
}

export function ChoiceTiles<V extends string>({
  labelledBy,
  describedBy,
  options,
  value,
  onValueChange,
  layout = 'grid',
  invalid,
  className,
}: {
  /** The id of the question heading that names the group. */
  labelledBy: string
  describedBy?: string
  options: readonly ChoiceTile<V>[]
  value: V | undefined
  onValueChange: (value: V) => void
  /** 'grid': square-ish tiles, two or three across. 'list': full-width rows with a description. */
  layout?: 'grid' | 'list'
  invalid?: boolean
  className?: string
}) {
  return (
    <RadioGroup
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      value={value ?? null}
      onValueChange={(next) => onValueChange(next as V)}
      className={cn(
        'grid gap-2.5',
        layout === 'grid' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
        className,
      )}
    >
      {options.map((option) => {
        const Glyph = option.icon
        return (
          <Radio.Root
            key={option.value}
            value={option.value}
            className={cn(
              'group relative flex rounded-card border border-input-border bg-surface text-left text-ink shadow-soft',
              'transition-[background-color,border-color,box-shadow,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98]',
              'hover:border-[color-mix(in_oklab,var(--input-border),var(--ink)_35%)] hover:bg-surface-2/60',
              'data-checked:border-accent-strong data-checked:bg-accent-tint data-checked:shadow-[inset_0_0_0_1.5px_var(--accent-strong)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              layout === 'grid'
                ? 'min-h-24 flex-col items-start justify-between gap-3 p-3.5'
                : 'min-h-16 items-center gap-3.5 px-4 py-3',
            )}
          >
            {Glyph ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent-text transition-colors duration-(--duration-quick) group-data-checked:bg-surface',
                  layout === 'grid' ? 'size-10' : 'size-10',
                )}
              >
                <Glyph weight="duotone" className="size-6" />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-6">
              <span className="text-body leading-snug font-semibold">{option.label}</span>
              {option.description ? (
                <span className="text-small leading-snug text-muted">{option.description}</span>
              ) : null}
            </span>
            <CheckCircleIcon
              weight="fill"
              aria-hidden
              className={cn(
                'absolute size-6 text-accent-text opacity-0 transition-[opacity,scale] duration-(--duration-quick) group-data-checked:opacity-100',
                layout === 'grid' ? 'top-3 right-3' : 'top-1/2 right-3.5 -translate-y-1/2',
              )}
            />
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}
