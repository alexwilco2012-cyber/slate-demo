import { BRAND } from '@/config/brand'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'

const MARK_SIZES = { sm: 'size-7', md: 'size-9', lg: 'size-14' } as const
const WORD_SIZES = { sm: 'text-[1.375rem]', md: 'text-[1.75rem]', lg: 'text-[2.625rem]' } as const
const ROLE_SIZES = { sm: 'text-small', md: 'text-body', lg: 'text-body-l' } as const

/** The mark: two courses of slate roof over a glowing hearth. Same drawing as the PWA icons. */
export function LogoMark({
  size = 'md',
  className,
}: {
  size?: keyof typeof MARK_SIZES
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', MARK_SIZES[size], className)}
    >
      <rect width="64" height="64" rx="15" fill="var(--logo-tile)" />
      <path
        d="M11 29 32 11l21 18"
        fill="none"
        stroke="var(--logo-roof)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 37.5 32 24.5l15 13"
        fill="none"
        stroke="var(--logo-course)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M25 51a7 7 0 0 1 14 0z" fill="var(--logo-hearth)" />
    </svg>
  )
}

/** "for trades" from "Slate for trades", so the brand name stays in src/config/brand.ts. */
export function roleWord(role: Role) {
  const full: string = BRAND.forRole[role]
  return full.startsWith(BRAND.name) ? full.slice(BRAND.name.length).trim() : full
}

export interface LogoProps {
  /** Adds the role word ("for trades") in the role colour: the portal is never shown by colour alone. */
  role?: Role
  size?: keyof typeof MARK_SIZES
  /** Mark only, e.g. a collapsed side bar. The name stays for screen readers. */
  markOnly?: boolean
  className?: string
}

/** The lockup: mark, wordmark and, inside a portal, the role word. */
export function Logo({ role, size = 'md', markOnly, className }: LogoProps) {
  return (
    <span
      data-role-accent={role}
      className={cn('inline-flex max-w-full items-center gap-2.5 text-ink', className)}
    >
      <LogoMark size={size} />
      {markOnly ? (
        <span className="sr-only">{role ? BRAND.forRole[role] : BRAND.name}</span>
      ) : (
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span
            className={cn(
              'font-display leading-none font-semibold tracking-[-0.02em] text-brand',
              WORD_SIZES[size],
            )}
          >
            {BRAND.name}
          </span>
          {role ? (
            <span
              className={cn(
                'leading-tight font-semibold whitespace-nowrap text-accent-text',
                ROLE_SIZES[size],
              )}
            >
              {roleWord(role)}
            </span>
          ) : null}
        </span>
      )}
    </span>
  )
}
