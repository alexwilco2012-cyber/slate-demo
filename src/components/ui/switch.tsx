import { useId, type ReactNode } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { CheckIcon } from '@phosphor-icons/react'
import { cn } from './cn'

export interface SwitchProps {
  label: ReactNode
  description?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  name?: string
  disabled?: boolean
  className?: string
}

/**
 * An on/off setting that applies straight away. The thumb moves and shows a tick when on, so
 * the state never depends on colour.
 */
export function Switch({ label, description, onCheckedChange, className, ...props }: SwitchProps) {
  const descriptionId = useId()
  return (
    <label
      className={cn(
        'flex min-h-(--control-h) cursor-pointer items-center justify-between gap-4 py-2 text-body text-ink',
        props.disabled && 'cursor-not-allowed text-muted',
        className,
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-medium leading-snug">{label}</span>
        {description ? (
          <span id={descriptionId} className="text-small text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <BaseSwitch.Root
        {...props}
        onCheckedChange={(checked) => onCheckedChange?.(checked)}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative inline-flex h-8 w-13 shrink-0 items-center rounded-full border-2 border-input-border bg-surface-2 p-0.5',
          'transition-[background-color,border-color] duration-(--duration-base) ease-out-soft',
          'data-checked:border-accent-strong data-checked:bg-accent',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'data-disabled:opacity-60',
        )}
      >
        <BaseSwitch.Thumb
          className={cn(
            'group flex size-6 items-center justify-center rounded-full bg-muted text-accent shadow-soft',
            'transition-[translate,background-color] duration-(--duration-base) ease-out-soft',
            'data-checked:translate-x-5 data-checked:bg-on-accent',
          )}
        >
          <CheckIcon
            weight="bold"
            aria-hidden
            className="size-3.5 opacity-0 transition-opacity duration-(--duration-quick) group-data-checked:opacity-100"
          />
        </BaseSwitch.Thumb>
      </BaseSwitch.Root>
    </label>
  )
}
