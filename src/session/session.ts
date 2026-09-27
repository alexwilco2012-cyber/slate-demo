// Who is signed in, per browser tab. The demo shows several people at once (three tabs, or three
// iframes on the demo page), so the session can't live with the shared data: each tab keeps its
// own in sessionStorage, and each iframe its own key within that (iframes share their tab's
// sessionStorage).

import type { Viewer } from '@/data/api'
import { isId, type PersonId } from '@/domain/ids'
import { ROLES, type Role } from '@/domain/types'

export interface Session {
  personId: PersonId
  /** The portal in use. The URL decides: opening /landlord switches a landlord who also rents. */
  activeRole: Role
  /** A letting agent working inside this landlord's account (landlord portal only). */
  actingForLandlordId?: PersonId
}

export const SESSION_KEY = 'slate-session'

/** Where a signed-out visitor is sent from a portal: the public site's persona picker. */
export const START_PATH = '/start'

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Checks something read from storage or a URL. Anything malformed is treated as signed out. */
export function parseSession(value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) return null
  const { personId, activeRole, actingForLandlordId } = value as Record<string, unknown>
  if (!isId('person', personId) || !isRole(activeRole)) return null
  const session: Session = { personId, activeRole }
  if (isId('person', actingForLandlordId)) session.actingForLandlordId = actingForLandlordId
  return session
}

export function sameSession(a: Session | null, b: Session | null): boolean {
  return (
    a?.personId === b?.personId &&
    a?.activeRole === b?.activeRole &&
    a?.actingForLandlordId === b?.actingForLandlordId
  )
}

/** The Viewer every SlateApi call takes. Only the landlord portal acts for someone else. */
export function viewerOf(session: Session): Viewer {
  const { personId, activeRole, actingForLandlordId } = session
  return activeRole === 'landlord' && actingForLandlordId
    ? { personId, role: activeRole, actingForId: actingForLandlordId }
    : { personId, role: activeRole }
}

// ─── ?as=<personId>&role=<role>[&for=<landlordId>] ────────────────────────────────────────────

const PARAMS = { person: 'as', role: 'role', actingFor: 'for' } as const

export function hasSessionParams(search: string): boolean {
  return new URLSearchParams(search).has(PARAMS.person)
}

/**
 * The session a URL asks for. `role` may be left out on a portal path (/tenant?as=person_sarah).
 * Null when the parameters don't make sense; the person is checked against the data later.
 */
export function sessionFromParams(search: string, pathname: string): Session | null {
  const params = new URLSearchParams(search)
  const pathRole = pathname.split('/')[1]
  return parseSession({
    personId: params.get(PARAMS.person),
    activeRole: params.get(PARAMS.role) ?? pathRole,
    actingForLandlordId: params.get(PARAMS.actingFor) ?? undefined,
  })
}

/** The query string without the session parameters, e.g. '?tab=quotes' or ''. */
export function withoutSessionParams(search: string): string {
  const params = new URLSearchParams(search)
  for (const name of Object.values(PARAMS)) params.delete(name)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/** A link that opens a page as someone, e.g. for the demo page's iframes. */
export function sessionHref(path: string, session: Session): string {
  const params = new URLSearchParams({ [PARAMS.person]: session.personId })
  params.set(PARAMS.role, session.activeRole)
  if (session.actingForLandlordId) params.set(PARAMS.actingFor, session.actingForLandlordId)
  return `${path}${path.includes('?') ? '&' : '?'}${params.toString()}`
}
