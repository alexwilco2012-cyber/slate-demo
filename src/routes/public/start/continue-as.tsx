import { Link } from 'react-router'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { hrefs, useSlateQuery } from '@/data'
import { ROLE_LABELS } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSession } from '@/session'

/** Someone already signed in in this tab can carry on as themselves, or sign out first. */
export function ContinueAs() {
  const { session, viewer, signOut } = useSession()
  const { state } = useSlateQuery(
    async (api) => (viewer ? api.getMe(viewer).catch(() => null) : null),
    [viewer],
  )
  const person = state.data
  if (!session || !person) return null
  const role = session.activeRole

  return (
    <div
      data-role-accent={role}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-3">
        <Avatar
          name={person.displayName}
          seed={person.avatarSeed}
          role={role}
          size="md"
          decorative
        />
        <p className="text-body text-ink">
          You’re signed in as <span className="font-semibold">{person.displayName}</span>
          <span className="text-muted"> · {ROLE_LABELS[role]}</span>
        </p>
      </div>
      <div className="flex flex-col gap-(--gap-touch) sm:flex-row">
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
        <Link to={hrefs.home(role)} className={buttonVariants({ variant: 'primary' })}>
          Carry on as {person.displayName.split(' ')[0]}
          <ArrowRightIcon weight="bold" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
