import { ROLE_LABELS, type Role } from '@/domain/types'
import { cn } from './cn'
import { RoleIcon } from './role-icon'

const SIZES = {
  xs: {
    box: 'size-7 text-[0.6875rem]',
    badge: 'size-3.5 -right-0.5 -bottom-0.5 ring-[1.5px]',
    icon: 'size-2.5',
  },
  sm: {
    box: 'size-9 text-caption',
    badge: 'size-4 -right-0.5 -bottom-0.5 ring-2',
    icon: 'size-2.5',
  },
  md: { box: 'size-11 text-small', badge: 'size-5 -right-1 -bottom-0.5 ring-2', icon: 'size-3' },
  lg: { box: 'size-14 text-body-l', badge: 'size-6 -right-1 -bottom-0.5 ring-2', icon: 'size-3.5' },
  xl: {
    box: 'size-20 text-display-m',
    badge: 'size-8 -right-0.5 bottom-0 ring-[3px]',
    icon: 'size-4.5',
  },
} as const

const TONES = 6

function initialsOf(name: string) {
  const words = name
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const letters = words.length > 1 ? [words[0]![0], words[1]![0]] : [words[0]?.[0], words[0]?.[1]]
  return letters.filter(Boolean).join('').toUpperCase()
}

/** Same seed, same tone: a cheap stable hash, no randomness. */
function toneOf(seed: string) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return (hash % TONES) + 1
}

export interface AvatarProps {
  name: string
  /** Adds the role badge (key, buildings or wrench) in the role colour. */
  role?: Role
  /** Keeps the colour stable across renames. Defaults to the name. */
  seed?: string
  src?: string
  size?: keyof typeof SIZES
  /** Hide from screen readers when the name is already written next to it. */
  decorative?: boolean
  className?: string
}

/** A generated avatar (no real photos needed), with the person's role as an icon, not a colour. */
export function Avatar({ name, role, seed, src, size = 'md', decorative, className }: AvatarProps) {
  const s = SIZES[size]
  const label = role ? `${name}, ${ROLE_LABELS[role].toLowerCase()}` : name
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn('relative inline-flex shrink-0', className)}
    >
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full font-semibold tracking-wide text-ink select-none',
          s.box,
        )}
        style={{ backgroundColor: `var(--avatar-${toneOf(seed ?? name)})` }}
      >
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initialsOf(name)}</span>
        )}
      </span>
      {role ? (
        <span
          data-role-accent={role}
          aria-hidden="true"
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-accent text-on-accent ring-surface',
            s.badge,
          )}
        >
          <RoleIcon role={role} weight="bold" className={s.icon} />
        </span>
      ) : null}
    </span>
  )
}
