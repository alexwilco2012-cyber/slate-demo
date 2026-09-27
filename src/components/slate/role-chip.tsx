import { ROLE_LABELS, type Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'

export interface RoleChipProps {
  role: Role
  /** Replaces the role word, e.g. "Agent for Graham". The icon still shows the role. */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

/** Icon, word and tint together, so a role never depends on colour alone. */
export function RoleChip({ role, label, size = 'sm', className }: RoleChipProps) {
  return (
    <span
      data-role-accent={role}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-accent-tint font-semibold leading-none whitespace-nowrap text-accent-text',
        size === 'sm' ? 'h-6 px-2 text-caption' : 'h-7 px-2.5 text-small',
        className,
      )}
    >
      <RoleIcon role={role} weight="bold" className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      <span className="truncate">{label ?? ROLE_LABELS[role]}</span>
    </span>
  )
}
