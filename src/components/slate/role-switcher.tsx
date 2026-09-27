import { useId } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CheckCircleIcon, CheckIcon } from '@phosphor-icons/react'
import { ROLE_LABELS, type Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'

export interface RoleOption {
  role: Role
  /** A line of context, e.g. "2 homes in Ferryhill" or "Flat 2, 41 Rosemount Place". */
  description?: string
}

export interface RoleSwitcherProps {
  /** The roles this person holds. Only rendered when there are two or more. */
  roles: readonly RoleOption[]
  value: Role
  onValueChange: (role: Role) => void
  /** 'cards' for an account page or sheet; 'compact' for the side bar. */
  variant?: 'cards' | 'compact'
  label?: string
  className?: string
}

/**
 * Switch between portals for someone who holds several roles (a landlord who also rents). A radio
 * group: arrow keys move, each option shows its own icon and colour, and the current one a tick.
 */
export function RoleSwitcher({
  roles,
  value,
  onValueChange,
  variant = 'cards',
  label = 'Switch portal',
  className,
}: RoleSwitcherProps) {
  const labelId = useId()
  if (roles.length < 2) return null
  const compact = variant === 'compact'

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        id={labelId}
        className={cn(
          'font-semibold text-ink',
          compact ? 'text-caption tracking-wide text-muted uppercase' : 'text-body',
        )}
      >
        {label}
      </div>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => onValueChange(next as Role)}
        className={cn(
          compact
            ? 'grid auto-cols-fr grid-flow-col gap-1 rounded-[calc(var(--radius-control)+0.25rem)] border border-line bg-surface-2 p-1'
            : 'flex flex-col gap-(--gap-touch)',
        )}
      >
        {roles.map((option) => (
          <Radio.Root
            key={option.role}
            value={option.role}
            data-role-accent={option.role}
            className={cn(
              'group flex min-w-0 items-center text-left text-ink',
              'transition-[background-color,border-color,box-shadow] duration-(--duration-quick) ease-out-soft',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              compact
                ? 'min-h-(--control-h-sm) justify-center gap-1.5 rounded-control px-2 text-small font-semibold hover:bg-surface data-checked:bg-surface data-checked:text-accent-text data-checked:shadow-soft'
                : 'min-h-16 gap-3 rounded-card border border-input-border bg-surface p-3.5 hover:bg-surface-2 data-checked:border-accent-strong data-checked:bg-accent-tint data-checked:shadow-[inset_0_0_0_1px_var(--accent-strong)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                compact ? 'size-5 text-accent-text' : 'size-10 bg-accent text-on-accent',
              )}
            >
              <RoleIcon
                role={option.role}
                weight="bold"
                className={compact ? 'size-4 in-data-checked:hidden' : 'size-5'}
              />
              {/* In the compact switch the tick replaces the icon, as in SegmentedControl. */}
              {compact ? (
                <CheckIcon weight="bold" className="hidden size-4 in-data-checked:block" />
              ) : null}
            </span>
            {compact ? (
              <span className="truncate">{ROLE_LABELS[option.role]}</span>
            ) : (
              <>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold leading-snug">{ROLE_LABELS[option.role]}</span>
                  {option.description ? (
                    <span className="truncate text-small text-muted">{option.description}</span>
                  ) : null}
                </span>
                <Radio.Indicator
                  keepMounted
                  className="flex shrink-0 text-accent-text data-unchecked:invisible"
                >
                  <CheckCircleIcon weight="fill" aria-hidden className="size-6" />
                </Radio.Indicator>
              </>
            )}
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  )
}
