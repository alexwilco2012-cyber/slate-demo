// Ratings the trade owes and has sent: landlords (seen by other trades) and tenants (private).

import { Link } from 'react-router'
import {
  CheckCircleIcon,
  EyeIcon,
  LockSimpleIcon,
  PencilSimpleLineIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import type { RatingTask } from '@/data'
import { ROLE_LABELS, type Rating } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { TaskRow } from '../components/task-row'
import { firstNameOf } from '../lib/job'
import { peopleById } from '../lib/queries'
import { formatShortDay } from '../lib/time'

export default function RatingsPage() {
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [tasks, mine, jobs] = await Promise.all([
        api.listRatingTasks(viewer),
        api.listMyRatings(viewer),
        api.listJobs(viewer),
      ])
      const people = await api.getPeople(viewer, [...new Set(tasks.map((task) => task.subjectId))])
      return {
        tasks,
        ratings: Object.fromEntries(mine.map((rating) => [rating.id, rating])) as Record<
          string,
          Rating
        >,
        titles: Object.fromEntries(jobs.map((job) => [job.id, job.title])) as Record<
          string,
          string
        >,
        people: peopleById(people),
      }
    },
    [viewer],
  )

  return (
    <PortalPage title="Ratings">
      <PageHeader
        back={{ to: '/trade/profile', label: 'Profile' }}
        title="Ratings"
        description="Rate the landlord and the tenant after each job. Both sides stay hidden until both have rated, then they’re revealed together."
      />
      <p className="-mt-2 text-small text-muted">
        <Link to="/policies/reviews" className="font-semibold text-accent-text underline">
          Read how ratings work in our review policy
        </Link>
      </p>
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading your ratings" cards={2} />
      ) : !state.data ? (
        <LoadError what="your ratings" onRetry={refresh} />
      ) : (
        <Lists data={state.data} />
      )}
    </PortalPage>
  )
}

function Lists({
  data,
}: {
  data: {
    tasks: RatingTask[]
    ratings: Record<string, Rating>
    titles: Record<string, string>
    people: Record<string, { displayName: string }>
  }
}) {
  const toDo = data.tasks.filter((task) => task.status !== 'submitted')
  const submittedAt = (task: RatingTask) =>
    (task.ratingId ? data.ratings[task.ratingId]?.submittedAt : undefined) ?? ''
  // Newest first, so a rating that's still sealed sits above the ones long since revealed.
  const sent = data.tasks
    .filter((task) => task.status === 'submitted')
    .sort((a, b) => submittedAt(b).localeCompare(submittedAt(a)))
  const describe = (task: RatingTask) => {
    const who = task.direction === 'trade->landlord' ? 'landlord' : 'tenant'
    const jobId = task.context.kind === 'job' ? task.context.jobId : ''
    const name = firstNameOf(data.people[task.subjectId]?.displayName, `the ${who}`)
    return { who, jobId, name, title: data.titles[jobId] ?? 'Job' } as const
  }

  if (data.tasks.length === 0) {
    return (
      <EmptyState
        icon={StarIcon}
        headingLevel="h2"
        title="No ratings yet"
        description="When you finish a job, you can rate the landlord and the tenant here."
        action={
          <Link to="/trade" className={buttonVariants({ variant: 'primary' })}>
            Go to your jobs
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <Section title="To do" count={toDo.length}>
        {toDo.length === 0 ? (
          <p className="text-muted">You’re all caught up.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {toDo.map((task) => {
              const { who, jobId, name, title } = describe(task)
              return (
                <TaskRow
                  key={`${task.direction}-${jobId}`}
                  to={`/trade/jobs/${jobId}/rate/${who}`}
                  icon={task.counterpartHasRated ? EyeIcon : PencilSimpleLineIcon}
                  tone={task.counterpartHasRated ? 'info' : 'neutral'}
                  title={`Rate ${name}, the ${ROLE_LABELS[who].toLowerCase()}`}
                  detail={`${title} · ${task.status === 'draft' ? 'Draft saved · ' : ''}${
                    task.counterpartHasRated ? `${name} has rated you · ` : ''
                  }by ${formatShortDay(task.closesAt)}`}
                />
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Sent" count={sent.length}>
        {sent.length === 0 ? (
          <p className="text-muted">Nothing sent yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sent.map((task) => {
              const { who, jobId, name, title } = describe(task)
              const rating = task.ratingId ? data.ratings[task.ratingId] : undefined
              const revealed = rating?.state === 'revealed'
              return (
                <TaskRow
                  key={`${task.direction}-${jobId}`}
                  to={revealed && rating ? `/trade/reviews/${rating.id}` : `/trade/jobs/${jobId}`}
                  icon={revealed ? CheckCircleIcon : LockSimpleIcon}
                  tone={revealed ? 'positive' : 'neutral'}
                  title={`${name}, the ${ROLE_LABELS[who].toLowerCase()}`}
                  detail={`${title} · ${
                    revealed
                      ? 'Revealed'
                      : rating?.revealAt
                        ? `Sealed until ${formatShortDay(rating.revealAt)} at the latest`
                        : 'Sealed until everyone has rated'
                  }`}
                />
              )
            })}
          </ul>
        )}
      </Section>
    </div>
  )
}
