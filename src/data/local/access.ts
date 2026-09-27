// Who may do what. Every API method resolves the Viewer here first, so the rules live in one
// place: a letting agent acts only inside a landlord's account, only on the homes they're
// assigned to, and only with the permissions the landlord gave them.

import { SlateError, type Viewer } from '@/data/api'
import type {
  Job,
  Person,
  PersonId,
  Property,
  PropertyId,
  Role,
  TeamMembership,
  TeamPermission,
  Tenancy,
} from '@/domain/types'
import { jobTenantIds } from '@/domain/rating'
import type { Reader } from './tx'

export interface Actor {
  person: Person
  role: Role
  /** Whose account this is: the landlord, when an agent is acting for one. */
  actingAs: PersonId
  /** Set for a letting agent working in a landlord's account. */
  membership?: TeamMembership
}

export function forbidden(message = "You don't have access to that."): SlateError {
  return new SlateError('forbidden', message)
}

export function notFound(what: string): SlateError {
  return new SlateError('not_found', `We couldn't find that ${what}.`)
}

export function invalidState(message: string): SlateError {
  return new SlateError('invalid_state', message)
}

export function activeMembership(
  db: Reader,
  agentId: PersonId,
  landlordId: PersonId,
): TeamMembership | undefined {
  return db
    .rows('memberships')
    .find((m) => m.agentId === agentId && m.landlordId === landlordId && m.status === 'active')
}

/** Checks the viewer is a real person using a portal they hold. Rejects with forbidden if not. */
export function resolveViewer(db: Reader, viewer: Viewer): Actor {
  const person = db.get('people', viewer.personId)
  if (!person) throw forbidden('Sign in again to carry on.')
  if (!person.roles.includes(viewer.role)) {
    throw forbidden(`This account doesn't have the ${viewer.role} portal yet.`)
  }
  if (viewer.actingForId && viewer.actingForId !== person.id) {
    if (viewer.role !== 'landlord') throw forbidden('Only letting agents can act for a landlord.')
    const membership = activeMembership(db, person.id, viewer.actingForId)
    if (!membership) throw forbidden("You're not on this landlord's team.")
    return { person, role: viewer.role, actingAs: viewer.actingForId, membership }
  }
  return { person, role: viewer.role, actingAs: person.id }
}

export function requireRole(actor: Actor, role: Role, message?: string): void {
  if (actor.role !== role) {
    throw forbidden(message ?? `Only the ${role} portal can do that.`)
  }
}

export function hasPermission(actor: Actor, permission: TeamPermission): boolean {
  return !actor.membership || actor.membership.permissions.includes(permission)
}

/** The landlord of the home, or an agent assigned to it with the permission. */
export function managesProperty(
  actor: Actor,
  property: Property,
  permission?: TeamPermission,
): boolean {
  if (actor.role !== 'landlord' || property.landlordId !== actor.actingAs) return false
  if (!actor.membership) return true
  if (!property.agentIds.includes(actor.person.id)) return false
  return permission === undefined || actor.membership.permissions.includes(permission)
}

export function requireManagedProperty(
  db: Reader,
  actor: Actor,
  propertyId: PropertyId,
  permission?: TeamPermission,
): Property {
  const property = db.get('properties', propertyId)
  if (!property) throw notFound('home')
  if (!managesProperty(actor, property)) throw forbidden("That home isn't in your account.")
  if (permission && !managesProperty(actor, property, permission)) {
    throw forbidden("The landlord hasn't given you permission to do that.")
  }
  return property
}

/** The landlord and any agents assigned to the home: everyone who hears about its jobs. */
export function landlordSide(db: Reader, property: Property): PersonId[] {
  const agents = property.agentIds.filter((agentId) =>
    activeMembership(db, agentId, property.landlordId),
  )
  return [property.landlordId, ...agents]
}

export function isConfirmed(tenancy: Tenancy): boolean {
  return tenancy.status === 'confirmed'
}

/** The tenancy running at the home now, if any. */
export function currentTenancy(db: Reader, propertyId: PropertyId): Tenancy | undefined {
  return db.rows('tenancies').find((t) => t.propertyId === propertyId && t.status === 'confirmed')
}

/** Tenancies the person is, or was, a tenant on. */
export function tenanciesOf(db: Reader, personId: PersonId): Tenancy[] {
  return db.rows('tenancies').filter((t) => t.tenantIds.includes(personId))
}

/**
 * The tenants a job concerns, as the rating engine counts them: whoever reported it, or everyone
 * on a landlord-raised job, on a tenancy both sides confirmed here.
 */
export function jobTenants(db: Reader, job: Job): PersonId[] {
  return jobTenantIds(job, db.get('tenancies', job.tenancyId) ?? null)
}

/** Everyone on the tenancy a job belongs to, who can all see it. */
function tenantsWhoSee(db: Reader, job: Job): PersonId[] {
  const tenancy = db.get('tenancies', job.tenancyId)
  const ids = new Set<PersonId>(tenancy ? tenancy.tenantIds : [])
  if (job.reportedAs === 'tenant') ids.add(job.reportedById)
  return [...ids]
}

export type JobSide = 'tenant' | 'landlord' | 'trade'

/** How the viewer is involved in a job, or null if they aren't. */
export function jobSide(db: Reader, actor: Actor, job: Job): JobSide | null {
  const property = db.get('properties', job.propertyId)
  if (!property) return null
  switch (actor.role) {
    case 'landlord':
      return managesProperty(actor, property) ? 'landlord' : null
    case 'tenant':
      return tenantsWhoSee(db, job).includes(actor.person.id) ? 'tenant' : null
    case 'trade':
      return job.tradeId === actor.person.id ? 'trade' : null
  }
}

export function requireJob(db: Reader, actor: Actor, jobId: string): { job: Job; side: JobSide } {
  const job = db.get('jobs', jobId)
  if (!job) throw notFound('job')
  const side = jobSide(db, actor, job)
  if (!side) throw forbidden("That job isn't one of yours.")
  return { job, side }
}

export function requireJobAsLandlord(
  db: Reader,
  actor: Actor,
  jobId: string,
  permission: TeamPermission,
): { job: Job; property: Property } {
  const job = db.get('jobs', jobId)
  if (!job) throw notFound('job')
  const property = requireManagedProperty(db, actor, job.propertyId, permission)
  return { job, property }
}

export function requireJobAsTrade(db: Reader, actor: Actor, jobId: string): Job {
  requireRole(actor, 'trade')
  const job = db.get('jobs', jobId)
  if (!job) throw notFound('job')
  if (job.tradeId !== actor.person.id) throw forbidden("You haven't been instructed on that job.")
  return job
}

/** Everyone involved in a job, for notifications and the job thread. */
export function jobParties(db: Reader, job: Job): { role: Role; personId: PersonId }[] {
  const property = db.get('properties', job.propertyId)
  const parties: { role: Role; personId: PersonId }[] = []
  for (const personId of tenantsWhoSee(db, job)) parties.push({ role: 'tenant', personId })
  if (property) {
    for (const personId of landlordSide(db, property)) parties.push({ role: 'landlord', personId })
  }
  if (job.tradeId) parties.push({ role: 'trade', personId: job.tradeId })
  return parties
}
