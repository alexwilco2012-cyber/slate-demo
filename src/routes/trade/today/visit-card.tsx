import { Link } from 'react-router'
import {
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClockIcon,
  DoorOpenIcon,
  HardHatIcon,
  KeyIcon,
  NavigationArrowIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { IsoDateTime, PersonCard, PersonId, Visit } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { formatTime } from '@/components/slate/format'
import { StatusBadge } from '../components/status-badge'
import { firstNameOf, partiesOf, type StatusTone } from '../lib/job'
import { directionsUrl } from '../lib/places'
import type { JobView } from '../lib/queries'

export type VisitMoment = 'on_site' | 'due' | 'next' | 'later' | 'done' | 'no_access'

const MOMENT: Record<VisitMoment, { label: string; tone: StatusTone; icon: typeof ClockIcon }> = {
  on_site: { label: 'On site now', tone: 'info', icon: HardHatIcon },
  due: { label: 'Due now', tone: 'caution', icon: ClockIcon },
  next: { label: 'Next', tone: 'neutral', icon: ClockIcon },
  later: { label: 'Later today', tone: 'neutral', icon: ClockIcon },
  done: { label: 'Done', tone: 'positive', icon: CheckCircleIcon },
  no_access: { label: 'No access', tone: 'critical', icon: WarningCircleIcon },
}

export function visitMoment(visit: Visit, now: IsoDateTime, isFirstUpcoming: boolean) {
  if (visit.status === 'on_site') return 'on_site'
  if (visit.status === 'done') return 'done'
  if (visit.status === 'no_access') return 'no_access'
  if (visit.startsAt <= now) return 'due'
  return isFirstUpcoming ? 'next' : 'later'
}

/** "9:00" and "am", so the clock can be big and the rest quieter. */
function clockParts(at: IsoDateTime) {
  const [clock = '', period = ''] = formatTime(at).split(/\s+/)
  return { clock, period }
}

export function VisitCard({
  view,
  visit,
  moment,
  people,
  primary,
}: {
  view: JobView
  visit: Visit
  moment: VisitMoment
  people: Record<PersonId, PersonCard>
  /** The one card whose "Open job" is the screen's main action. */
  primary: boolean
}) {
  const { job, property, thread } = view
  const start = clockParts(visit.startsAt)
  const tenants = partiesOf(thread).tenantIds.flatMap((id) => (people[id] ? [people[id]] : []))
  const tenantWords = tenants.map((tenant) => firstNameOf(tenant.displayName)).join(' and ')
  const highlight = moment === 'on_site' || moment === 'due'
  const jobPath = `/trade/jobs/${job.id}`

  return (
    <Card
      as="li"
      variant={highlight ? 'accent' : 'raised'}
      accentBar={highlight}
      padding="none"
      className="@container"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="flex items-baseline gap-1.5 text-ink">
            <span className="figures text-[1.875rem] leading-none font-bold tracking-tight">
              {start.clock}
            </span>
            <span className="font-semibold">{start.period}</span>
            <span className="text-muted">
              <span className="sr-only">until</span>
              <span aria-hidden="true"> to </span>
              {formatTime(visit.endsAt)}
            </span>
          </p>
          <StatusBadge status={MOMENT[moment]} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-title leading-snug font-bold text-ink">{job.title}</h3>
          {property ? (
            <p className="text-ink">
              {property.addressLine}
              <span className="block text-muted">
                {property.neighbourhood} · {property.postcode}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 rounded-control bg-surface/70 p-3 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="flex flex-wrap items-center gap-2 text-small">
            {tenantWords ? (
              <>
                <span className="font-semibold text-ink">{tenantWords}</span>
                <RoleChip role="tenant" />
              </>
            ) : null}
            <span className="flex items-center gap-1.5 text-ink">
              {job.access.keyAllowed ? (
                <KeyIcon weight="bold" aria-hidden className="size-4.5" />
              ) : (
                <DoorOpenIcon weight="bold" aria-hidden className="size-4.5" />
              )}
              {job.access.keyAllowed ? 'Key allowed if nobody’s in' : 'Someone will let you in'}
            </span>
          </p>
          {job.access.notes ? (
            <p className="text-ink">
              <span className="sr-only">Access notes: </span>“{job.access.notes}”
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-(--gap-touch)">
          {property ? (
            <a
              href={directionsUrl(property)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary' })}
            >
              <NavigationArrowIcon weight="bold" aria-hidden />
              Directions
              <span className="sr-only"> (opens maps)</span>
            </a>
          ) : null}
          <Link
            to={{ pathname: jobPath, hash: 'chat' }}
            className={cn(buttonVariants({ variant: 'secondary' }), !property && 'col-span-2')}
          >
            <ChatCircleTextIcon weight="bold" aria-hidden />
            Message
            <span className="sr-only"> about {job.title}</span>
          </Link>
        </div>
        <Link
          to={jobPath}
          className={buttonVariants({ variant: primary ? 'primary' : 'soft', fullWidth: true })}
        >
          Open job
          <span className="sr-only">: {job.title}</span>
        </Link>
      </div>
    </Card>
  )
}
