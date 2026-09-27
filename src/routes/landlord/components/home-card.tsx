// One home in the portfolio: a drawing of it, who lives there, the rent, whether its certificates
// are in order and what repairs are open. The whole card opens the home's page.

import { Link } from 'react-router'
import {
  CheckCircleIcon,
  CircleDashedIcon,
  ClockCountdownIcon,
  WarningOctagonIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { ComplianceItem, Job, PersonCard, PersonId, Property, Tenancy } from '@/domain/types'
import { DOCUMENT_TYPE_INFO, PROPERTY_TYPE_LABELS } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { useDemoNow } from '@/data'
import { count, firstName, flatOf, formatPounds, joinNames, streetOf } from '../lib/format'
import { isOpen } from '../lib/jobs'
import { formatShortDate } from '../lib/time'
import { HomeArt } from './home-art'

export interface ComplianceCounts {
  expired: number
  dueSoon: number
  toArrange: number
  booked: number
}

/**
 * Counts of the certificates a home must have. Recommended ones, such as an inventory, are left
 * out so the card agrees with "Actions needed"; the documents page lists everything.
 */
export function complianceCounts(items: readonly ComplianceItem[]): ComplianceCounts {
  const required = items.filter((i) => DOCUMENT_TYPE_INFO[i.type].required !== 'recommended')
  return {
    expired: required.filter((i) => i.status === 'EXPIRED').length,
    dueSoon: required.filter((i) => i.status === 'DUE_SOON').length,
    toArrange: required.filter((i) => i.status === 'TO_ARRANGE').length,
    booked: required.filter((i) => i.status === 'BOOKED').length,
  }
}

/**
 * "Certificates: 1 expired, 2 due soon, 1 not on file", or "Certificates up to date", each part
 * with its own icon.
 */
export function ComplianceLine({
  counts,
  className,
}: {
  counts: ComplianceCounts
  className?: string
}) {
  const parts = [
    counts.expired > 0 && {
      icon: WarningOctagonIcon,
      text: `${counts.expired} expired`,
      className: 'text-critical font-semibold',
    },
    counts.dueSoon > 0 && {
      icon: ClockCountdownIcon,
      text: `${counts.dueSoon} due soon`,
      className: 'text-caution',
    },
    counts.toArrange > 0 && {
      icon: CircleDashedIcon,
      text: `${counts.toArrange} not on file`,
      className: 'text-ink',
    },
  ].filter((part): part is Exclude<typeof part, false> => Boolean(part))

  if (parts.length === 0) {
    return (
      <p className={cn('flex items-center gap-1.5 text-small text-positive', className)}>
        <CheckCircleIcon weight="fill" aria-hidden className="size-4 shrink-0" />
        Certificates up to date
      </p>
    )
  }
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-small', className)}>
      <span className="text-muted">
        Certificates<span className="sr-only">:</span>
      </span>
      {parts.map((part) => (
        <span key={part.text} className={cn('inline-flex items-center gap-1', part.className)}>
          <part.icon weight="bold" aria-hidden className="size-4 shrink-0" />
          {part.text}
        </span>
      ))}
    </p>
  )
}

export interface HomeCardProps {
  property: Property
  current?: Tenancy
  upcoming?: Tenancy
  jobs: readonly Job[]
  compliance: readonly ComplianceItem[]
  people: ReadonlyMap<PersonId, PersonCard>
  headingLevel?: 'h2' | 'h3' | 'h4'
}

export function HomeCard({
  property,
  current,
  upcoming,
  jobs,
  compliance,
  people,
  headingLevel: Heading = 'h3',
}: HomeCardProps) {
  const now = useDemoNow()
  const names = (tenancy: Tenancy) =>
    joinNames(tenancy.tenantIds.map((id) => firstName(people.get(id)?.displayName ?? 'Tenant')))
  const open = jobs.filter(isOpen).length
  const flat = flatOf(property)

  return (
    // On phones the drawing becomes a narrow strip beside the details, so a list of homes stays
    // short enough to scan.
    <article className="group relative flex overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:flex-col">
      <div
        data-role-accent="landlord"
        className="w-22 shrink-0 overflow-hidden border-r border-line sm:hidden"
      >
        <HomeArt property={property} framing="close" />
      </div>
      <div
        data-role-accent="landlord"
        className="h-28 overflow-hidden border-b border-line max-sm:hidden"
      >
        <HomeArt property={property} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <Heading className="text-title font-semibold leading-snug text-ink">
            <Link
              to={`/landlord/homes/${property.id}`}
              className="rounded-sm no-underline outline-none after:absolute after:inset-0 after:content-['']"
            >
              {streetOf(property)}
            </Link>
          </Heading>
          <p className="text-small text-muted">
            {[flat, property.neighbourhood, property.postcode].filter(Boolean).join(' · ')}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-small">
          <div className="flex min-w-0 flex-col">
            <dt className="text-muted">{!current && upcoming ? 'Moving in' : 'Tenants'}</dt>
            <dd className="font-semibold text-ink">
              {current
                ? names(current)
                : upcoming
                  ? `${names(upcoming)}, ${formatShortDate(upcoming.startDate, now)}`
                  : 'Nobody yet'}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col">
            <dt className="text-muted">{current ? 'Rent' : 'Home'}</dt>
            <dd className="figures font-semibold text-ink">
              {current ? (
                <>
                  {formatPounds(current.rentPencePerMonth)}
                  <span className="font-normal text-muted"> a month</span>
                </>
              ) : (
                <span className="font-normal text-muted">
                  {PROPERTY_TYPE_LABELS[property.type]}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3">
          <ComplianceLine counts={complianceCounts(compliance)} />
          <p className="flex items-center gap-1.5 text-small text-ink">
            <WrenchIcon weight="bold" aria-hidden className="size-4 shrink-0 text-muted" />
            {open === 0 ? 'No open repairs' : count(open, 'open repair')}
          </p>
        </div>
      </div>
    </article>
  )
}
