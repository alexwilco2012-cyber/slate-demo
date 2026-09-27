// Rating the landlord and the tenant once the work is done. Each card says plainly who will see
// the rating and when, because the two are very different.

import { Link } from 'react-router'
import {
  CheckCircleIcon,
  EyeIcon,
  LockSimpleIcon,
  PencilSimpleLineIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import type { RatingTask } from '@/data'
import type { PersonCard, PersonId, Rating, RatingId } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { formatDate } from '@/components/slate/format'
import { firstNameOf } from '../lib/job'
import { formatShortDay } from '../lib/time'

export type RateWho = 'landlord' | 'tenant'

export function directionOf(who: RateWho) {
  return who === 'landlord' ? 'trade->landlord' : 'trade->tenant'
}

function visibility(who: RateWho, name: string) {
  return who === 'landlord'
    ? `Other trades see it on ${name}’s client profile once ${name}’s rating of you is locked in. ${name} sees only the overall client rating, never who said what.`
    : `Only ${name} sees it. ${name}’s landlord only sees whether you got in as arranged. If you felt unsafe, say so and our moderators will look into it.`
}

function statusLine(task: RatingTask, rating: Rating | undefined, name: string) {
  if (task.status === 'submitted') {
    if (rating?.state === 'revealed') {
      return {
        icon: CheckCircleIcon,
        text: `Sent and revealed${rating.revealedAt ? ` on ${formatDate(rating.revealedAt)}` : ''}.`,
      }
    }
    return {
      icon: LockSimpleIcon,
      text: rating?.revealAt
        ? `Sent and sealed. It comes out with the other ratings on this job, by ${formatShortDay(rating.revealAt)} at the latest.`
        : 'Sent and sealed. It comes out once everyone on this job has rated.',
    }
  }
  if (task.counterpartHasRated) {
    return {
      icon: EyeIcon,
      text: `${name} has rated you. Leave yours to see what they said. Due by ${formatShortDay(task.closesAt)}.`,
    }
  }
  return {
    icon: PencilSimpleLineIcon,
    text: `${task.status === 'draft' ? 'Draft saved. ' : ''}Due by ${formatShortDay(task.closesAt)}.`,
  }
}

export function JobRatings({
  jobId,
  tasks,
  sent,
  people,
}: {
  jobId: string
  tasks: readonly RatingTask[]
  sent: Record<RatingId, Rating>
  people: Record<PersonId, PersonCard>
}) {
  const cards = (['landlord', 'tenant'] as const).flatMap((who) => {
    const task = tasks.find((candidate) => candidate.direction === directionOf(who))
    return task ? [{ who, task }] : []
  })
  if (cards.length === 0) return null
  return (
    <ul className="grid gap-4 @2xl:grid-cols-2">
      {cards.map(({ who, task }) => {
        const name = firstNameOf(people[task.subjectId]?.displayName, `the ${who}`)
        const rating = task.ratingId ? sent[task.ratingId] : undefined
        const line = statusLine(task, rating, name)
        const LineIcon = line.icon
        const done = task.status === 'submitted'
        return (
          <li
            key={who}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title font-bold text-ink">Rate {name}</h3>
              <RoleChip role={who} />
            </div>
            <p className="flex items-start gap-2 text-small text-ink">
              <ShieldCheckIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>{visibility(who, name)}</span>
            </p>
            <p className="flex items-start gap-2 text-small text-muted">
              <LineIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>{line.text}</span>
            </p>
            {done ? (
              rating?.state === 'revealed' ? (
                <Link
                  to={`/trade/reviews/${rating.id}`}
                  className={cn(buttonVariants({ variant: 'secondary' }), 'mt-auto')}
                >
                  See your rating
                </Link>
              ) : null
            ) : (
              <Link
                to={`/trade/jobs/${jobId}/rate/${who}`}
                className={cn(buttonVariants({ variant: 'soft' }), 'mt-auto')}
              >
                {task.status === 'draft' ? 'Finish your rating' : `Rate ${name}`}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
