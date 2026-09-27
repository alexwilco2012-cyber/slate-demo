// The compliance calendar for every home: what has expired, what's due, what's booked, with the
// Scottish renewal intervals spelled out. A plain table, as SPEC §9 asks.

import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  ClockCountdownIcon,
  WarningOctagonIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_INFO,
  DOCUMENT_TYPES,
  type ComplianceItem,
  type DocumentStatus,
  type PropertyId,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ComplianceManager } from '../components/compliance'
import { expiryMonth, monthName, MonthStrip, nextTwelveMonths } from '../components/month-strip'
import { Section } from '../components/section'
import { SelectField } from '../components/select-field'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { usePermissions, usePortfolio } from '../lib/data'
import { placeOf } from '../lib/format'
import { ukDate } from '../lib/time'

const TILES: { status: DocumentStatus; icon: Icon; tone: string }[] = [
  { status: 'EXPIRED', icon: WarningOctagonIcon, tone: 'text-critical' },
  { status: 'DUE_SOON', icon: ClockCountdownIcon, tone: 'text-caution' },
  { status: 'TO_ARRANGE', icon: CircleDashedIcon, tone: 'text-ink' },
  { status: 'BOOKED', icon: CalendarCheckIcon, tone: 'text-info' },
  { status: 'OK', icon: CheckCircleIcon, tone: 'text-positive' },
]

type Filter = DocumentStatus | 'attention' | 'all'

/** Certificates for one home include the landlord's own, such as their registration. */
function inHome(item: ComplianceItem, home: PropertyId | 'all') {
  return home === 'all' || item.propertyId === home || item.propertyId === null
}

/** Items grouped by home, keeping the calendar's most-urgent-first order between groups. */
function groupByHome(items: readonly ComplianceItem[]): [PropertyId | null, ComplianceItem[]][] {
  const groups = new Map<PropertyId | null, ComplianceItem[]>()
  for (const item of items)
    groups.set(item.propertyId, [...(groups.get(item.propertyId) ?? []), item])
  return [...groups.entries()]
}

function renewalText(months: number | null) {
  if (months === null) return 'Doesn’t expire'
  if (months % 12 === 0) return months === 12 ? 'Every year' : `Every ${months / 12} years`
  return `Every ${months} months`
}

const REQUIRED_WORDS = {
  yes: 'Required',
  if_gas: 'Required where there’s gas',
  recommended: 'Recommended',
}

export default function DocumentsPage() {
  const viewer = useViewer()
  const can = usePermissions()
  const [params, setParams] = useSearchParams()
  const portfolio = usePortfolio()
  const calendar = useSlateQuery((api) => api.getComplianceCalendar(viewer), [viewer])
  const data = portfolio.state.data
  const items = calendar.state.data

  const filter = (params.get('show') ?? 'attention') as Filter
  const home = (params.get('home') ?? 'all') as PropertyId | 'all'
  const month = params.get('month')
  const now = useDemoNow()
  const months = useMemo(() => nextTwelveMonths(ukDate(now)), [now])

  const counts = useMemo(() => {
    const result: Record<DocumentStatus, number> = {
      EXPIRED: 0,
      DUE_SOON: 0,
      TO_ARRANGE: 0,
      BOOKED: 0,
      OK: 0,
    }
    for (const item of items ?? []) if (inHome(item, home)) result[item.status] += 1
    return result
  }, [items, home])

  const byMonth = useMemo(() => {
    const result = new Map<string, number>()
    for (const item of items ?? []) {
      const key = expiryMonth(item)
      if (key && inHome(item, home)) result.set(key, (result.get(key) ?? 0) + 1)
    }
    return result
  }, [items, home])

  const shown = (items ?? []).filter((item) => {
    if (!inHome(item, home)) return false
    if (month) return expiryMonth(item) === month
    if (filter === 'all') return true
    if (filter === 'attention')
      return item.status === 'EXPIRED' || item.status === 'DUE_SOON' || item.status === 'TO_ARRANGE'
    return item.status === filter
  })

  function set(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  return (
    <PortalPage title="Documents" width="wide">
      <PageHeader
        title="Documents and certificates"
        description="When each certificate runs out, what’s booked and what to arrange. We remind you 60 days before anything is due."
      />

      <ul
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3"
        aria-label="Certificates by status"
      >
        {TILES.map(({ status, icon: Glyph, tone }, index) => {
          const active = filter === status && !month
          return (
            <li key={status} className={cn(index === TILES.length - 1 && 'max-sm:col-span-2')}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => set({ show: active ? null : status, month: null })}
                className={cn(
                  'flex w-full flex-col gap-2 rounded-card border p-3.5 text-left transition-[box-shadow,border-color] duration-(--duration-quick) hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:flex-row max-sm:items-center max-sm:justify-between sm:p-4',
                  active
                    ? 'border-accent-strong bg-accent-tint'
                    : 'border-line bg-surface shadow-soft',
                )}
              >
                <span className={cn('flex items-center gap-1.5 text-small font-semibold', tone)}>
                  <Glyph weight="bold" aria-hidden className="size-4.5" />
                  {DOCUMENT_STATUS_LABELS[status]}
                </span>
                <span className="font-display figures text-display-m leading-none font-semibold text-ink sm:text-display-l">
                  {items ? counts[status] : '–'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Section
        title="The next 12 months"
        headingLevel="h2"
        description="How many certificates run out each month. Choose a month to list them."
      >
        <MonthStrip
          months={months}
          counts={byMonth}
          selected={month}
          onSelect={(next) => set({ month: next })}
        />
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectField
          label="Show"
          className="sm:w-72"
          value={month ? 'month' : filter}
          onValueChange={(value) => {
            if (value !== 'month') set({ show: value === 'attention' ? null : value, month: null })
          }}
          options={[
            { value: 'attention', label: 'Needs attention' },
            ...TILES.map((t) => ({ value: t.status, label: DOCUMENT_STATUS_LABELS[t.status] })),
            { value: 'all', label: 'Everything' },
            ...(month ? [{ value: 'month', label: `Running out: ${monthName(month)}` }] : []),
          ]}
        />
        <SelectField
          label="Home"
          className="sm:w-72"
          value={home}
          onValueChange={(value) => set({ home: value === 'all' ? null : value })}
          options={[
            { value: 'all', label: 'All homes' },
            ...(data?.properties ?? []).map((p) => ({ value: p.id, label: placeOf(p) })),
          ]}
        />
      </div>

      {(calendar.state.status === 'error' || portfolio.state.status === 'error') &&
      (!items || !data) ? (
        <ErrorPanel
          error={calendar.state.error ?? portfolio.state.error}
          onRetry={() => {
            calendar.refresh()
            portfolio.refresh()
          }}
        />
      ) : !items || !data ? (
        <ListSkeleton rows={5} label="Loading your certificates" />
      ) : month && shown.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title={`Nothing runs out in ${monthName(month)}`}
          description="At this home, nothing is due that month."
          action={
            <Button variant="secondary" onClick={() => set({ month: null })}>
              Show what needs attention
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title={filter === 'attention' ? 'Nothing needs attention' : 'Nothing to show'}
          description={
            filter === 'attention'
              ? 'Every required certificate is in date or booked. We’ll remind you 60 days before the next one is due.'
              : 'Try another filter.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-5" aria-label="Certificates by home">
          {groupByHome(shown).map(([propertyId, group]) => {
            const property = propertyId ? data.propertyById.get(propertyId) : undefined
            return (
              <li
                key={propertyId ?? 'all'}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
              >
                <h2 className="text-title font-semibold text-ink">
                  {property ? (
                    <Link
                      to={`/landlord/homes/${property.id}/documents`}
                      className="underline-offset-4 hover:underline"
                    >
                      {placeOf(property)}
                    </Link>
                  ) : (
                    'All your homes'
                  )}
                </h2>
                <ComplianceManager
                  items={group}
                  properties={data.properties}
                  tenancies={data.tenancies}
                  caption={
                    property
                      ? `Certificates for ${placeOf(property)}`
                      : 'Certificates for all your homes'
                  }
                  hideCaption
                  canManage={can('manage_documents')}
                  jobs={data.jobs}
                />
              </li>
            )
          })}
        </ul>
      )}

      <Section
        title="How often each one is renewed"
        headingLevel="h2"
        description="Scottish rules: gas safety every 12 months, the EICR every 5 years and landlord registration every 3 years. For alarms, CO detectors and legionella these are the reminders we suggest."
      >
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
          <table className="slate-table">
            <caption className="sr-only">Renewal intervals</caption>
            <thead>
              <tr>
                <th scope="col">Certificate or check</th>
                <th scope="col">How often</th>
                <th scope="col">Needed</th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENT_TYPES.map((type) => {
                const info = DOCUMENT_TYPE_INFO[type]
                return (
                  <tr key={type}>
                    <td
                      data-primary
                      data-label="Certificate or check"
                      className="font-semibold text-ink"
                    >
                      {info.label}
                    </td>
                    <td data-label="How often">{renewalText(info.renewalMonths)}</td>
                    <td data-label="Needed" className="text-muted">
                      {REQUIRED_WORDS[info.required]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </PortalPage>
  )
}
