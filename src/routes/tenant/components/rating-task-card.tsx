// A rating the tenant owes: who and what for, how long is left, and how its seal works.

import { Link } from 'react-router'
import {
  EyeSlashIcon,
  HourglassMediumIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
} from '@phosphor-icons/react'
import type { RatingTask } from '@/data/api'
import type { IsoDateTime } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import { daysBetween, formatWeekday } from '@/components/slate/format'
import { ratePath, sealLine, sealOf, taskTitle } from '../lib/ratings'

function closesText(closesAt: IsoDateTime, now: IsoDateTime) {
  const days = daysBetween(now, closesAt)
  if (days <= 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes ${formatWeekday(closesAt)} · ${days} days left`
}

export function RatingTaskCard({
  task,
  subjectName,
  about,
  now,
  className,
}: {
  task: RatingTask
  subjectName: string
  /** What it's about, e.g. the job title or the address. */
  about: string
  now: IsoDateTime
  className?: string
}) {
  const shielded = sealOf(task.direction, task.context) === 'retaliation_shield'
  const subjectRole = task.direction === 'tenant->trade' ? 'trade' : 'landlord'
  const draft = task.status === 'draft'
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-card border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          data-role-accent={subjectRole}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-soft"
        >
          <RoleIcon role={subjectRole} weight="bold" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-body-l leading-snug font-semibold text-ink">
            {taskTitle(task, subjectName)}
          </h3>
          <p className="text-small text-muted">{about}</p>
        </div>
      </div>
      <p className="flex items-start gap-2 text-small text-ink">
        {shielded ? (
          <LockSimpleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        ) : (
          <EyeSlashIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        )}
        <span className={cn(task.counterpartHasRated && !shielded && 'font-semibold')}>
          {sealLine(task, subjectName)}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="flex items-center gap-1.5 text-small text-muted">
          <HourglassMediumIcon weight="bold" aria-hidden className="size-4" />
          {closesText(task.closesAt, now)}
        </p>
        <Link
          to={ratePath(task.direction, task.context)}
          className={cn(buttonVariants({ size: 'sm' }), 'max-xs:w-full')}
        >
          {draft ? <PencilSimpleIcon weight="bold" aria-hidden /> : null}
          {draft ? 'Finish your rating' : 'Rate now'}
        </Link>
      </div>
    </article>
  )
}
