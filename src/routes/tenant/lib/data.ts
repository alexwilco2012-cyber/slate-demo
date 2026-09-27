// Reads the tenant screens share. Each loader takes the API and the viewer, so a page can combine
// several into one useSlateQuery and show one skeleton while they load.

import type { RatingTask, SlateApi, Viewer } from '@/data/api'
import type {
  ContextRef,
  Job,
  JobStatus,
  LandlordScore,
  PersonCard,
  PersonId,
  Property,
  PropertyId,
  Rating,
  RatingDirection,
  Tenancy,
  TradeScore,
} from '@/domain/types'

export type People = ReadonlyMap<PersonId, PersonCard>

/** Cards for everyone named on a screen, looked up once. */
export async function loadPeople(
  api: SlateApi,
  viewer: Viewer,
  ids: Iterable<PersonId | null | undefined>,
): Promise<People> {
  const wanted = [...new Set([...ids].filter((id): id is PersonId => Boolean(id)))]
  if (wanted.length === 0) return new Map()
  const cards = await api.getPeople(viewer, wanted)
  return new Map(cards.map((card) => [card.id, card]))
}

/** A home the tenant rents or rented, with the landlord and what tenants say about them. */
export interface TenantHome {
  tenancy: Tenancy
  property: Property
  landlord: PersonCard | null
  score: LandlordScore
  registrationVerified: boolean
}

const CURRENT_FIRST: Record<Tenancy['status'], number> = { confirmed: 0, proposed: 1, ended: 2 }

/** Every tenancy, the current one first, then proposed, then past ones newest first. */
export async function loadHomes(api: SlateApi, viewer: Viewer): Promise<TenantHome[]> {
  const [tenancies, properties] = await Promise.all([
    api.listTenancies(viewer),
    api.listProperties(viewer),
  ])
  const byId = new Map(properties.map((property) => [property.id, property]))
  const sorted = [...tenancies].sort(
    (a, b) =>
      CURRENT_FIRST[a.status] - CURRENT_FIRST[b.status] || b.startDate.localeCompare(a.startDate),
  )
  const homes = await Promise.all(
    sorted.map(async (tenancy): Promise<TenantHome | null> => {
      const property =
        byId.get(tenancy.propertyId) ?? (await api.getProperty(viewer, tenancy.propertyId))
      if (!property) return null
      const [profile, score] = await Promise.all([
        api.getLandlordProfile(viewer, tenancy.landlordId),
        api.getLandlordScore(viewer, { landlordId: tenancy.landlordId }),
      ])
      return {
        tenancy,
        property,
        landlord: profile?.landlord ?? null,
        score,
        registrationVerified: profile?.registrationVerified ?? false,
      }
    }),
  )
  return homes.filter((home): home is TenantHome => home !== null)
}

/** The home the tenant lives in now: a confirmed tenancy that hasn't ended. */
export function currentHome(homes: readonly TenantHome[]): TenantHome | null {
  return homes.find((home) => home.tenancy.status === 'confirmed') ?? null
}

export const OPEN_STATUSES: readonly JobStatus[] = [
  'reported',
  'approved',
  'quoting',
  'instructed',
  'booked',
  'in_progress',
]
export const DONE_STATUSES: readonly JobStatus[] = ['completed', 'confirmed']
export const CLOSED_STATUSES: readonly JobStatus[] = ['declined', 'cancelled']

export function isOpen(job: Pick<Job, 'status'>): boolean {
  return OPEN_STATUSES.includes(job.status)
}

/** The next visit that's still to happen, soonest first. */
export function upcomingVisit(job: Job) {
  return job.visits
    .filter((visit) => visit.status === 'booked' || visit.status === 'on_site')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
}

/** A finished visit the tenant hasn't confirmed yet, by the trade on the job. */
export function visitToConfirm(job: Job) {
  return job.visits.find(
    (visit) => visit.status === 'done' && !visit.tenantConfirmedAt && visit.tradeId === job.tradeId,
  )
}

export function sameContext(a: ContextRef, b: ContextRef): boolean {
  if (a.kind === 'job' && b.kind === 'job') return a.jobId === b.jobId
  if (a.kind === 'tenancy' && b.kind === 'tenancy') return a.tenancyId === b.tenancyId
  return false
}

/** The task for one direction on one job or tenancy, if the tenant owes or wrote it. */
export function taskFor(
  tasks: readonly RatingTask[],
  direction: RatingDirection,
  context: ContextRef,
): RatingTask | undefined {
  return tasks.find((task) => task.direction === direction && sameContext(task.context, context))
}

/** The tenant's own rating (draft, sealed or revealed) for a task. */
export function ratingFor(
  ratings: readonly Rating[],
  direction: RatingDirection,
  context: ContextRef,
): Rating | undefined {
  return ratings.find(
    (rating) => rating.direction === direction && sameContext(rating.context, context),
  )
}

/** Trade scores for every trade on the tenant's jobs. */
export async function loadTradeScores(
  api: SlateApi,
  viewer: Viewer,
  tradeIds: Iterable<PersonId | undefined>,
): Promise<ReadonlyMap<PersonId, TradeScore>> {
  const ids = [...new Set([...tradeIds].filter((id): id is PersonId => Boolean(id)))]
  const scores = await Promise.all(ids.map((id) => api.getTradeScore(viewer, id)))
  return new Map(ids.map((id, index) => [id, scores[index]!]))
}

export function propertyLabel(property: Pick<Property, 'addressLine' | 'neighbourhood'>): string {
  return `${property.addressLine}, ${property.neighbourhood}`
}

/** The street part of an address, e.g. "14 Esslemont Avenue" from "Top Floor Right, 14 …". */
export function streetOf(property: Pick<Property, 'addressLine'>): string {
  const parts = property.addressLine.split(',').map((part) => part.trim())
  return parts.at(-1) ?? property.addressLine
}

export function homeForProperty(
  homes: readonly TenantHome[],
  propertyId: PropertyId,
): TenantHome | undefined {
  return homes.find((home) => home.property.id === propertyId)
}
