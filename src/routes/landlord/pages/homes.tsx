import { useMemo } from 'react'
import {
  CurrencyGbpIcon,
  HouseLineIcon,
  ShieldWarningIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import type { ComplianceItem, PropertyId } from '@/domain/types'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { StatTile } from '@/components/slate/stat-tile'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { HomeCard } from '../components/home-card'
import { CardGridSkeleton, ErrorPanel } from '../components/states'
import { currentTenancyOf, usePeople, usePortfolio, upcomingTenancyOf } from '../lib/data'
import { formatPounds } from '../lib/format'
import { isOpen } from '../lib/jobs'

export default function HomesPage() {
  const viewer = useViewer()
  const portfolio = usePortfolio()
  const calendar = useSlateQuery((api) => api.getComplianceCalendar(viewer), [viewer])
  const data = portfolio.state.data
  const people = usePeople((data?.tenancies ?? []).flatMap((t) => t.tenantIds))

  const byProperty = useMemo(() => {
    const map = new Map<PropertyId, ComplianceItem[]>()
    for (const item of calendar.state.data ?? []) {
      if (item.propertyId) map.set(item.propertyId, [...(map.get(item.propertyId) ?? []), item])
    }
    return map
  }, [calendar.state.data])

  const stats = useMemo(() => {
    if (!data) return null
    const let_ = data.properties.filter((p) => currentTenancyOf(data.tenancies, p.id))
    const rent = let_.reduce(
      (sum, p) => sum + (currentTenancyOf(data.tenancies, p.id)?.rentPencePerMonth ?? 0),
      0,
    )
    const attention = (calendar.state.data ?? []).filter(
      (i) => i.status === 'EXPIRED' || i.status === 'DUE_SOON',
    ).length
    return {
      homes: data.properties.length,
      let: let_.length,
      rent,
      open: data.jobs.filter(isOpen).length,
      attention,
    }
  }, [data, calendar.state.data])

  return (
    <PortalPage title="Homes" width="wide">
      <PageHeader
        title="Your homes"
        description="Each home’s tenants, rent, certificates and repairs."
      />
      {stats ? (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="At a glance">
          <li>
            <StatTile
              label="Homes"
              icon={HouseLineIcon}
              value={stats.homes}
              hint={`${stats.let} let now`}
            />
          </li>
          <li>
            <StatTile
              label="Rent each month"
              icon={CurrencyGbpIcon}
              value={formatPounds(stats.rent)}
              hint="From current tenancies"
            />
          </li>
          <li>
            <StatTile
              label="Open repairs"
              icon={WrenchIcon}
              value={stats.open}
              hint="Across your homes"
              to="/landlord/repairs?show=all"
            />
          </li>
          <li>
            <StatTile
              label="Certificates"
              icon={ShieldWarningIcon}
              value={stats.attention}
              hint="expired or due soon"
              tone={stats.attention > 0 ? 'accent' : 'default'}
              to="/landlord/documents"
            />
          </li>
        </ul>
      ) : null}
      {portfolio.state.status === 'error' && !data ? (
        <ErrorPanel error={portfolio.state.error} onRetry={portfolio.refresh} />
      ) : !data ? (
        <CardGridSkeleton cards={6} label="Loading your homes" />
      ) : data.properties.length === 0 ? (
        <EmptyState
          icon={HouseLineIcon}
          title="No homes yet"
          description="Homes you let appear here. A letting agent sees the homes the landlord has shared with them."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.properties.map((property) => (
            <li key={property.id} className="flex [&>article]:flex-1">
              <HomeCard
                property={property}
                current={currentTenancyOf(data.tenancies, property.id)}
                upcoming={upcomingTenancyOf(data.tenancies, property.id)}
                jobs={data.jobs.filter((j) => j.propertyId === property.id)}
                compliance={byProperty.get(property.id) ?? []}
                people={people.state.data ?? new Map()}
                headingLevel="h2"
              />
            </li>
          ))}
        </ul>
      )}
    </PortalPage>
  )
}
