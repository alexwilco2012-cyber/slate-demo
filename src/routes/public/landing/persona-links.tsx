import { Link } from 'react-router'
import { ROLES, ROLE_LABELS } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/components/ui/cn'
import { sessionHref } from '@/session'
import { ROLE_STORIES } from '../content/roles'

/** A link that opens a portal signed in as a demo persona, e.g. "Try as Sarah". */
export function personaHref(role: keyof typeof ROLE_STORIES) {
  const { personId } = ROLE_STORIES[role].persona
  return sessionHref(`/${role}`, { personId, activeRole: role })
}

/** "Sarah · Tenant", "Graham · Landlord", "Kev · Trade": one tap into each portal. */
export function PersonaLinks({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {ROLES.map((role) => {
        const { persona } = ROLE_STORIES[role]
        return (
          <li key={role}>
            <Link
              to={personaHref(role)}
              className="group inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3.5 pl-1 text-small text-ink no-underline shadow-soft transition-[border-color,box-shadow,translate] duration-(--duration-quick) ease-out-soft hover:-translate-y-px hover:border-input-border hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar
                name={persona.name}
                seed={persona.personId}
                role={role}
                size="sm"
                decorative
              />
              <span>
                <span className="sr-only">Try as</span>{' '}
                <span className="font-semibold">{persona.name}</span>
                <span className="text-muted"> · {ROLE_LABELS[role]}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
