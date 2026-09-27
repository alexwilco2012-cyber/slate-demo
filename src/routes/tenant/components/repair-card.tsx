// A repair in a list: what and where, its status in words, and a compact timeline.

import { Link } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import { ROOM_LABELS, type IsoDateTime, type Job, type PersonCard } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatDate } from '@/components/slate/format'
import { JobTimeline } from '@/components/slate/job-timeline'
import type { People } from '../lib/data'
import { tenantJobStages } from '../lib/jobs'
import { JobStatusBadge, UrgencyBadge } from './basics'

export function RepairCard({
  job,
  people,
  landlord,
  now,
  showTimeline = true,
  className,
}: {
  job: Job
  people: People
  landlord: PersonCard | null | undefined
  now: IsoDateTime
  showTimeline?: boolean
  className?: string
}) {
  const stages = tenantJobStages(job, people, landlord, now)
  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-body-l leading-snug font-semibold text-ink">
            {/* The whole card is the link; the heading carries its name. */}
            <Link
              to={`/tenant/jobs/${job.id}`}
              className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-card"
            >
              {job.title}
            </Link>
          </h3>
          <p className="text-small text-muted">
            {ROOM_LABELS[job.room]} · Reported {formatDate(job.createdAt)}
          </p>
        </div>
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="mt-1.5 size-4 shrink-0 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <JobStatusBadge status={job.status} />
        {job.urgency !== 'routine' ? <UrgencyBadge urgency={job.urgency} /> : null}
      </div>
      {showTimeline ? <JobTimeline stages={stages} variant="compact" /> : null}
    </article>
  )
}
