// Reads most landlord screens share. Each re-runs whenever the data changes, here or in another tab.

import { useCallback } from 'react'
import { useSlateQuery, type QueryResult } from '@/data'
import type {
  Job,
  PersonCard,
  PersonId,
  Property,
  PropertyId,
  TeamPermission,
  Tenancy,
} from '@/domain/types'
import { useViewer } from '@/session'

export interface Portfolio {
  properties: Property[]
  tenancies: Tenancy[]
  jobs: Job[]
  propertyById: Map<PropertyId, Property>
}

/** The homes in this account, their tenancies and every job on them. */
export function usePortfolio() {
  const viewer = useViewer()
  return useSlateQuery(
    async (api): Promise<Portfolio> => {
      const [properties, tenancies, jobs] = await Promise.all([
        api.listProperties(viewer),
        api.listTenancies(viewer),
        api.listJobs(viewer),
      ])
      return {
        properties,
        tenancies,
        jobs,
        propertyById: new Map(properties.map((property) => [property.id, property])),
      }
    },
    [viewer],
  )
}

/** Person cards by id, for names, roles and badges. */
export function usePeople(
  ids: readonly (PersonId | undefined)[],
): QueryResult<Map<PersonId, PersonCard>> {
  const viewer = useViewer()
  const key = [...new Set(ids.filter((id): id is PersonId => Boolean(id)))].sort().join(',')
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const cards = key ? await api.getPeople(viewer, key.split(',') as PersonId[]) : []
      return { key, cards: new Map<PersonId, PersonCard>(cards.map((card) => [card.id, card])) }
    },
    [viewer, key],
  )
  // The first answer usually comes back before a page knows whose names it needs (an empty
  // list). Until the real one arrives it counts as loading, so a page waits for the names
  // instead of flashing "Tenant" in their place.
  const early = state.data !== undefined && state.data.key === '' && key !== ''
  if (state.status === 'loading' || early) {
    return { state: { status: 'loading', data: undefined, error: undefined }, refresh }
  }
  if (state.status === 'error') {
    return { state: { status: 'error', data: state.data?.cards, error: state.error }, refresh }
  }
  return { state: { status: 'success', data: state.data.cards, error: undefined }, refresh }
}

/** Whose account this is: the landlord's own id, or the landlord an agent is working for. */
export function useAccountId(): PersonId {
  const viewer = useViewer()
  return viewer.actingForId ?? viewer.personId
}

/**
 * What the signed-in person may do in this account. A landlord can do everything; a letting
 * agent only what the landlord allowed. The data layer enforces it too; this only hides buttons
 * that would be refused.
 */
export function usePermissions() {
  const viewer = useViewer()
  const { state } = useSlateQuery(
    async (api) => {
      if (!viewer.actingForId) return null
      const team = await api.listTeam(viewer)
      const mine = team.find(
        (member) =>
          member.agent.id === viewer.personId &&
          member.landlord.id === viewer.actingForId &&
          member.membership.status === 'active',
      )
      return mine?.membership.permissions ?? []
    },
    [viewer],
  )
  const permissions = state.data
  return useCallback(
    (permission: TeamPermission) =>
      !viewer.actingForId || (permissions?.includes(permission) ?? true),
    [viewer.actingForId, permissions],
  )
}

/** The tenancy running at a home now, if any. */
export function currentTenancyOf(tenancies: readonly Tenancy[], propertyId: PropertyId) {
  return tenancies.find((t) => t.propertyId === propertyId && t.status === 'confirmed')
}

/** A tenancy agreed but not yet started or confirmed by everyone. */
export function upcomingTenancyOf(tenancies: readonly Tenancy[], propertyId: PropertyId) {
  return tenancies.find((t) => t.propertyId === propertyId && t.status === 'proposed')
}
