import { useId, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import {
  CheckCircleIcon,
  CheckIcon,
  CircleHalfIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { SCALES, type ScaleId } from '@/domain/criteria'
import type { ScaleScore } from '@/domain/types'
import { cn } from '@/components/ui/cn'

const YES_PARTLY_NO_ICONS: Partial<Record<ScaleScore, Icon>> = {
  5: CheckIcon,
  3: CircleHalfIcon,
  1: XIcon,
}

/**
 * Radio groups normally wrap, so one arrow press too many turns "Outstanding" into "Well below"
 * and selects it. On a rating scale that is a costly slip, so the ends are hard stops.
 */
function stopAtEnds(event: KeyboardEvent<HTMLDivElement>) {
  const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
  const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft'
  if (!forward && !back) return
  const radios = Array.from(event.currentTarget.querySelectorAll('[role="radio"]'))
  const index = radios.indexOf(event.target as Element)
  if ((forward && index === radios.length - 1) || (back && index === 0)) {
    event.preventDefault()
    event.stopPropagation()
  }
}

/**
 * Five across, a label must fit its column. "Outstanding" is the longest single word (about 5.7em
 * wide), so the words shrink with the column, from the body size down to no less than 14px: each
 * column is a fifth of the box less the gaps, 12px of padding and 2px of border.
 */
const FIVE_ACROSS_LABEL: CSSProperties = {
  ['--scale-label' as string]:
    'clamp(0.875rem, calc(((100cqi - 4 * var(--scale-gap)) / 5 - 14px) / 5.9), var(--fs-body))',
}

/** Rising steps: an ordinal cue beside the words that can't be mistaken for stars. */
function Steps({ score }: { score: ScaleScore }) {
  return (
    <span aria-hidden="true" className="flex h-5 shrink-0 items-end gap-[3px]">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          style={{ height: `${36 + step * 12.8}%` }}
          className={cn(
            'w-[5px] rounded-[1.5px]',
            step <= score ? 'bg-current' : 'shadow-[inset_0_0_0_1.25px_currentColor] opacity-50',
          )}
        />
      ))}
    </span>
  )
}

export interface PlainWordsScaleProps {
  /** The criterion, worded as agreed, e.g. "Fixed problems quickly". */
  label: ReactNode
  scale: ScaleId
  value?: ScaleScore
  defaultValue?: ScaleScore
  onValueChange?: (score: ScaleScore) => void
  hint?: ReactNode
  error?: ReactNode
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

/**
 * The rating input: plain words, never stars (SPEC §5 rule 5). Five options from "Well below" to
 * "Outstanding" or "Never" to "Always", or three for "Yes / Partly / No". A radio group, so arrow
 * keys move between answers (stopping at the ends rather than wrapping).
 *
 * The layout follows the space the scale is given, not the screen: full-width rows (big thumb
 * targets) until its own box is 34em wide (544px, or 612px with the trade portal's 18px text),
 * then five across. It works the same in a phone, a drawer, a dialog or a narrow column.
 */
export function PlainWordsScale(props: PlainWordsScaleProps) {
  const {
    label,
    scale,
    value,
    defaultValue,
    onValueChange,
    hint,
    error,
    name,
    required,
    disabled,
    className,
  } = props
  const id = useId()
  const points = SCALES[scale]
  const threePoint = points.length === 3
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div id={`${id}-label`} className="text-body-l font-semibold leading-snug text-ink">
        {label}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-1 text-small text-muted">
          {hint}
        </p>
      ) : null}
      {/* The container the layout measures. Its font size sets what 34em means. */}
      <div
        style={FIVE_ACROSS_LABEL}
        className="@container text-body [--scale-gap:0.5rem] trade:[--scale-gap:0.75rem]"
      >
        <RadioGroup
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
          onValueChange={(next) => onValueChange?.(next as ScaleScore)}
          onKeyDownCapture={stopAtEnds}
          className={cn(
            'mt-1 grid gap-(--scale-gap)',
            threePoint ? 'grid-cols-3' : 'grid-cols-1 @min-[34em]:grid-cols-5',
          )}
        >
          {points.map((point) => {
            const Glyph = threePoint ? YES_PARTLY_NO_ICONS[point.score] : undefined
            return (
              <Radio.Root
                key={point.score}
                value={point.score}
                className={cn(
                  'group relative flex items-center rounded-control border border-input-border bg-surface text-ink',
                  'transition-[background-color,border-color,box-shadow,scale] duration-(--duration-quick) ease-out-soft active:scale-[0.98]',
                  'hover:border-[color-mix(in_oklab,var(--input-border),var(--ink)_35%)] hover:bg-surface-2',
                  'data-checked:border-accent-strong data-checked:bg-accent data-checked:text-on-accent data-checked:shadow-soft data-checked:hover:bg-accent-hover',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  'data-disabled:cursor-not-allowed data-disabled:opacity-60',
                  threePoint
                    ? 'min-h-18 flex-col justify-center gap-1.5 px-2 py-3 text-center trade:min-h-20'
                    : 'min-h-14 gap-3 px-4 py-2.5 text-left trade:@max-[34em]:min-h-16 @min-[34em]:min-h-24 @min-[34em]:flex-col @min-[34em]:justify-center @min-[34em]:gap-2 @min-[34em]:px-1.5 @min-[34em]:text-center',
                )}
              >
                {Glyph ? (
                  <Glyph weight="bold" aria-hidden className="size-6 shrink-0" />
                ) : (
                  <Steps score={point.score} />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 text-body leading-tight font-semibold [overflow-wrap:break-word] hyphens-auto',
                    !threePoint &&
                      '@min-[34em]:w-full @min-[34em]:flex-none @min-[34em]:text-(length:--scale-label)',
                  )}
                >
                  {point.label}
                </span>
                <CheckCircleIcon
                  weight="fill"
                  aria-hidden
                  className={cn(
                    'size-6 shrink-0 opacity-0 transition-opacity duration-(--duration-quick) group-data-checked:opacity-100',
                    threePoint
                      ? 'absolute top-1.5 right-1.5 size-5'
                      : '@min-[34em]:absolute @min-[34em]:top-1.5 @min-[34em]:right-1.5 @min-[34em]:size-5',
                  )}
                />
              </Radio.Root>
            )
          })}
        </RadioGroup>
      </div>
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
