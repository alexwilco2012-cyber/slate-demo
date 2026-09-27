// The guard in front of every portal. A signed-out visitor goes to the persona picker; someone
// signed in is checked against the data (they may have been removed by a demo reset) and moved
// to the portal the URL asks for, if they hold it.

import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { Navigate, useLocation, type Location } from 'react-router'
import type { SlateApi } from '@/data/api'
import { hrefs, useSlateQuery } from '@/data'
import type { PersonId } from '@/domain/ids'
import { ROLES, type Person, type PersonCard, type Role } from '@/domain/types'
import { useToast } from '@/components/ui/toast'
import { useSession } from './hooks'
import { hasSessionParams, sameSession, START_PATH, type Session } from './session'

export interface PortalState {
  /** The portal on screen. */
  role: Role
  /** The signed-in person, fresh after every change to the data. */
  person: Person
  /** Letting agents: the landlords whose accounts they work in. Empty for everyone else. */
  landlords: PersonCard[]
}

const PortalContext = createContext<PortalState | null>(null)

/** The portal on screen and who is using it. Only inside a portal route. */
export function usePortal(): PortalState {
  const portal = useContext(PortalContext)
  if (!portal) throw new Error('usePortal() only works inside a portal route.')
  return portal
}

/** The same, or null outside a portal (the public site, the 404 page). */
export function useOptionalPortal(): PortalState | null {
  return useContext(PortalContext)
}

/** What the gate hands the persona picker in location.state. */
export interface StartState {
  /** Where to go back to after choosing someone, e.g. '/landlord/jobs/job_x'. */
  from: string
}

/** The page to open after signing in: where the visitor was going, or the portal's home. */
export function returnPathAfterSignIn(state: unknown, role: Role): string {
  const from = (state as Partial<StartState> | null)?.from
  if (typeof from === 'string' && from.startsWith(`/${role}`)) return from
  return hrefs.home(role)
}

function pathOf(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`
}

type Access =
  | { kind: 'unknown' }
  | { kind: 'other-portal'; role: Role }
  | { kind: 'ok'; session: Session; person: Person; landlords: PersonCard[] }

/** getMe for whichever role the person holds: it rejects for a portal they don't have. */
async function findPerson(
  api: SlateApi,
  personId: PersonId,
  first: Role[],
): Promise<Person | null> {
  for (const role of new Set([...first, ...ROLES])) {
    try {
      return await api.getMe({ personId, role })
    } catch {
      // Not this role, or not this person: try the next.
    }
  }
  return null
}

async function agentLandlords(api: SlateApi, person: Person): Promise<PersonCard[]> {
  try {
    const team = await api.listTeam({ personId: person.id, role: 'landlord' })
    return team
      .filter((member) => member.agent.id === person.id && member.membership.status === 'active')
      .map((member) => member.landlord)
  } catch {
    return []
  }
}

async function checkAccess(api: SlateApi, session: Session, role: Role): Promise<Access> {
  const person = await findPerson(api, session.personId, [role, session.activeRole])
  if (!person) return { kind: 'unknown' }
  if (!person.roles.includes(role)) {
    const home = person.roles.includes(session.activeRole) ? session.activeRole : person.roles[0]
    return home ? { kind: 'other-portal', role: home } : { kind: 'unknown' }
  }

  const landlords = role === 'landlord' ? await agentLandlords(api, person) : []
  let actingFor = session.actingForLandlordId
  if (actingFor && !landlords.some((landlord) => landlord.id === actingFor)) actingFor = undefined
  // A letting agent always works inside a landlord's account.
  const isAgent = person.badges.some((badge) => badge.kind === 'agent_team')
  if (!actingFor && isAgent) actingFor = landlords[0]?.id

  const next: Session = { personId: person.id, activeRole: role }
  if (actingFor) next.actingForLandlordId = actingFor
  return { kind: 'ok', session: next, person, landlords }
}

export interface PortalGateProps {
  role: Role
  /** Shown while the session is checked; the portal's skeleton. */
  fallback?: ReactNode
  children: ReactNode
}

/** Wrap each portal route in this. Everything inside can call useViewer() and usePortal(). */
export function PortalGate({ role, fallback = null, children }: PortalGateProps) {
  const location = useLocation()
  const { session } = useSession()
  // SessionFromUrl is applying ?as= this very moment.
  if (hasSessionParams(location.search)) return fallback
  if (!session) {
    const state: StartState = { from: pathOf(location) }
    return <Navigate to={START_PATH} replace state={state} />
  }
  return (
    <SignedInGate role={role} session={session} fallback={fallback}>
      {children}
    </SignedInGate>
  )
}

function SignedInGate({
  role,
  session,
  fallback,
  children,
}: PortalGateProps & { session: Session }) {
  const { signIn, signOut } = useSession()
  const toast = useToast()
  const location = useLocation()
  const { state } = useSlateQuery(
    (api) => checkAccess(api, session, role),
    [session.personId, session.activeRole, session.actingForLandlordId, role],
  )
  const access = state.data

  // Put the session right (portal from the URL, agent's landlord) before anything renders.
  useLayoutEffect(() => {
    if (access?.kind === 'ok' && !sameSession(access.session, session)) signIn(access.session)
    if (access?.kind === 'other-portal')
      signIn({ personId: session.personId, activeRole: access.role })
  }, [access, session, signIn])

  const unknown = access?.kind === 'unknown'
  useEffect(() => {
    if (!unknown) return
    signOut()
    toast.info('Choose someone to try', {
      description: 'That person isn’t in the demo any more. The demo data may have been reset.',
    })
  }, [unknown, signOut, toast])

  if (!access) return fallback
  switch (access.kind) {
    case 'unknown':
      return <Navigate to={START_PATH} replace state={{ from: pathOf(location) }} />
    case 'other-portal':
      return <Navigate to={hrefs.home(access.role)} replace />
    case 'ok':
      if (!sameSession(access.session, session)) return fallback
      return (
        <PortalContext.Provider
          value={{ role, person: access.person, landlords: access.landlords }}
        >
          {children}
        </PortalContext.Provider>
      )
  }
}
