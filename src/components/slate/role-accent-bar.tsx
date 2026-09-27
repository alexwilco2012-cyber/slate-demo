import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'

/**
 * The 4px portal bar. Without a role it takes the surrounding portal's accent. Decorative: the
 * role word in the lockup and the role chips carry the meaning.
 */
export function RoleAccentBar({
  role,
  orientation = 'horizontal',
  className,
}: {
  role?: Role
  orientation?: 'horizontal' | 'vertical'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-role-accent={role}
      className={cn(
        'block shrink-0 bg-accent',
        orientation === 'horizontal' ? 'h-1 w-full' : 'w-1 self-stretch',
        className,
      )}
    />
  )
}
