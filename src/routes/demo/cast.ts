// The three people the demo follows, one phone each. Every call the demo page makes on their
// behalf goes through SlateApi with their Viewer, exactly as their own portal would.

import type { Viewer } from '@/data/api'
import type { PersonId } from '@/domain/ids'
import type { Role } from '@/domain/types'
import { sessionHref } from '@/session'

export type CastKey = Role

export interface CastMember {
  key: CastKey
  role: Role
  personId: PersonId
  firstName: string
  fullName: string
  /** One line under the name on the phone's label. */
  about: string
  viewer: Viewer
}

function member(role: Role, personId: PersonId, fullName: string, about: string): CastMember {
  return {
    key: role,
    role,
    personId,
    firstName: fullName.split(' ')[0] ?? fullName,
    fullName,
    about,
    viewer: { personId, role },
  }
}

export const CAST: Record<CastKey, CastMember> = {
  tenant: member('tenant', 'person_sarah', 'Sarah Laing', 'Tenant in Rosemount'),
  landlord: member(
    'landlord',
    'person_graham',
    'Graham Forbes',
    'Landlord of six homes in Aberdeen',
  ),
  trade: member('trade', 'person_kev', 'Kev Rattray', 'Plumber at Rattray Plumbing'),
}

export const CAST_ORDER: readonly CastKey[] = ['tenant', 'landlord', 'trade']

/** Each phone keeps its own session, stored under its frame name (see src/routes/README.md). */
export function frameName(key: CastKey): string {
  return `slate-demo-${key}`
}

/** A path inside the app, with the base path, e.g. '/slate-demo/tenant/report'. */
export function appPath(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`
}

/** Where each phone starts: its portal's home, signed in as its person. */
export function frameSrc(key: CastKey): string {
  const { personId, role } = CAST[key]
  return sessionHref(appPath(`/${role}`), { personId, activeRole: role })
}
