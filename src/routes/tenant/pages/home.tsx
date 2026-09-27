// The tenant's home screen: a calm hello, the one big action (report a problem), anything waiting
// on them, visits coming up, open repairs, their home and deposit, and what happened while away.

import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckIcon,
  FireIcon,
  HouseLineIcon,
  PlusIcon,
  SmileyIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { ActionItem } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import type { Job, JobId, VisitId } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { BRAND } from '@/config/brand'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { QueryError, Section } from '../components/basics'
import { ActivityList, AwaySummary, useAwayFeed } from '../components/away-feed'
import { DepositCard, HomeCard } from '../components/home-card'
import { RatingTaskCard } from '../components/rating-task-card'
import { RepairCard } from '../components/repair-card'
import { VisitCard } from '../components/visit-card'
import {
  currentHome,
  isOpen,
  loadHomes,
  loadPeople,
  upcomingVisit,
  type People,
  type TenantHome,
} from '../lib/data'
import { GAS_EMERGENCY } from '../lib/emergency'
import { firstName, greeting, longDate } from '../lib/format'
import { ratePath } from '../lib/ratings'
import { tradeWord } from '../lib/jobs'

const list = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
}

export function TenantHomePage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const now = useDemoNow()
  const feed = useAwayFeed()
  const { state, refresh } = useSlateQuery(
    async (a) => {
      const [homes, jobs, actions, notifications] = await Promise.all([
        loadHomes(a, viewer),
        a.listJobs(viewer),
        a.listActionsNeeded(viewer),
        a.listNotifications(viewer),
      ])
      const ids = [
        ...jobs.map((job) => job.tradeId),
        ...actions.flatMap((item) => (item.kind === 'leave_rating' ? [item.task.subjectId] : [])),
      ]
      return {
        homes,
        jobs,
        actions,
        notifications,
        people: await loadPeople(a, viewer, ids),
      }
    },
    [viewer],
  )

  const home = state.data ? currentHome(state.data.homes) : null

  return (
    <PortalPage title="Home">
      <header className="flex flex-col gap-2">
        <p className="text-small font-semibold text-muted">
          {longDate(now)}
          {home ? ` · ${home.property.addressLine.split(',').at(-1)?.trim()}` : ''}
        </p>
        <h1 className="font-display text-display-l font-semibold text-ink">
          {greeting(now)}, {firstName(person.displayName)}
        </h1>
        {feed ? <AwaySummary feed={feed} className="mt-1" /> : null}
      </header>

      {state.status === 'loading' ? <HomeSkeleton /> : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your home screen" onRetry={refresh} />
      ) : null}

      {state.data ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
            {home ? <ReportHero home={home} /> : null}
            <NeedsYou
              actions={state.data.actions}
              jobs={state.data.jobs}
              homes={state.data.homes}
              people={state.data.people}
              now={now}
              onChanged={refresh}
            />
            <Visits jobs={state.data.jobs} people={state.data.people} now={now} />
            <OpenRepairs jobs={state.data.jobs} people={state.data.people} home={home} now={now} />
            {!home ? <NoHome movedOut={state.data.homes.length > 0} /> : null}
          </div>
          <aside aria-label="Your home and recent activity" className="flex min-w-0 flex-col gap-8">
            {home ? (
              <Section id="your-home" title="Your home">
                {/* Side by side on a tablet; stacked in the phone column and the desktop aside. */}
                <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-1">
                  <HomeCard home={home} />
                  <DepositCard tenancy={home.tenancy} />
                </div>
              </Section>
            ) : null}
            <Section id="activity" title="Recent activity">
              <ActivityList feed={feed} recent={state.data.notifications} now={now} />
            </Section>
          </aside>
        </div>
      ) : null}
    </PortalPage>
  )
}

function ReportHero({ home }: { home: TenantHome | null }) {
  return (
    <section
      aria-labelledby="report-hero-title"
      className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint p-5 sm:p-6"
    >
      {/* A soft glow behind the content: warmth, and a lift for the one big action. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-12 size-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent),transparent_80%),transparent)]"
      />
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-accent-text shadow-soft sm:size-14"
        >
          <WrenchIcon weight="duotone" className="size-7 sm:size-8" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="report-hero-title" className="font-display text-display-m font-semibold text-ink">
            Something needs fixing?
          </h2>
          <p className="max-w-md text-body text-ink">
            {home
              ? 'Tell us what’s wrong and your landlord sees it straight away. It takes about two minutes.'
              : 'You can report problems once your tenancy is set up here.'}
          </p>
        </div>
      </div>
      {home ? (
        <Link
          to="/tenant/report"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'relative w-full sm:ml-18 sm:w-auto sm:self-start sm:px-8',
          )}
        >
          <PlusIcon weight="bold" aria-hidden />
          Report a problem
        </Link>
      ) : null}
      <p className="relative flex items-start gap-2 border-t border-[color-mix(in_oklab,var(--accent),transparent_78%)] pt-3.5 text-small text-ink">
        <FireIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0 text-critical" />
        <span>
          Smell gas? Leave the home and call the {GAS_EMERGENCY.name},{' '}
          <a
            href={GAS_EMERGENCY.tel}
            className="font-semibold whitespace-nowrap text-ink underline"
          >
            {GAS_EMERGENCY.display}
          </a>
          .
        </span>
      </p>
    </section>
  )
}

function NeedsYou({
  actions,
  jobs,
  homes,
  people,
  now,
  onChanged,
}: {
  actions: ActionItem[]
  jobs: Job[]
  homes: TenantHome[]
  people: People
  now: string
  onChanged: () => void
}) {
  const shown = actions.filter(
    (item) =>
      item.kind === 'leave_rating' ||
      item.kind === 'confirm_visit' ||
      item.kind === 'confirm_tenancy',
  )
  if (shown.length === 0) return null
  const jobById = new Map(jobs.map((job) => [job.id, job]))

  return (
    <Section
      id="needs-you"
      title="Waiting for you"
      description={shown.length === 1 ? 'One thing needs you.' : `${shown.length} things need you.`}
    >
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {shown.map((item) => {
            if (item.kind === 'leave_rating') {
              const { task } = item
              const subject = people.get(task.subjectId)
              const about =
                task.context.kind === 'job'
                  ? (jobById.get(task.context.jobId)?.title ?? 'A repair')
                  : (homes.find(
                      (h) =>
                        h.tenancy.id ===
                        (task.context.kind === 'tenancy' ? task.context.tenancyId : ''),
                    )?.property.addressLine ?? 'Your tenancy')
              return (
                <motion.li key={ratePath(task.direction, task.context)} layout {...list}>
                  <RatingTaskCard
                    task={task}
                    subjectName={subject?.displayName ?? 'them'}
                    about={about}
                    now={now}
                  />
                </motion.li>
              )
            }
            if (item.kind === 'confirm_visit') {
              const job = jobById.get(item.jobId)
              if (!job) return null
              return (
                <motion.li key={`visit-${item.visitId}`} layout {...list}>
                  <ConfirmVisitCard
                    job={job}
                    visitId={item.visitId}
                    people={people}
                    onConfirmed={onChanged}
                  />
                </motion.li>
              )
            }
            if (item.kind === 'confirm_tenancy') {
              const home = homes.find((h) => h.tenancy.id === item.tenancyId)
              return (
                <motion.li key={`tenancy-${item.tenancyId}`} layout {...list}>
                  <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
                    <div className="flex items-start gap-3">
                      <HouseLineIcon
                        weight="duotone"
                        aria-hidden
                        className="size-8 shrink-0 text-accent-text"
                      />
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-body-l font-semibold text-ink">Confirm your tenancy</h3>
                        <p className="text-small text-muted">
                          {home?.property.addressLine ?? 'A new home'}. Once you both confirm, you
                          can report repairs and rate each other at the end.
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/tenant/tenancies/${item.tenancyId}`}
                      className={cn(buttonVariants({ size: 'sm' }), 'self-start max-xs:w-full')}
                    >
                      Check and confirm
                    </Link>
                  </article>
                </motion.li>
              )
            }
            return null
          })}
        </AnimatePresence>
      </ul>
    </Section>
  )
}

/** "Did the visit happen?" The tenant's yes opens their rating of the trade. */
export function ConfirmVisitCard({
  job,
  visitId,
  people,
  onConfirmed,
}: {
  job: Job
  visitId: VisitId
  people: People
  onConfirmed?: () => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const trade = job.tradeId ? people.get(job.tradeId) : undefined
  const name = trade ? firstName(trade.displayName) : 'The trade'

  async function confirm(jobId: JobId) {
    setBusy(true)
    try {
      await api.confirmVisit(viewer, jobId, visitId)
      toast.success('Thanks for confirming', {
        description: `You can now rate ${name}’s visit.`,
      })
      onConfirmed?.()
    } catch (error) {
      toast.error('That didn’t go through', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-positive-tint text-positive"
        >
          <CheckIcon weight="bold" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-body-l leading-snug font-semibold text-ink">
            Did {name}’s visit happen?
          </h3>
          <p className="text-small text-muted">
            {job.title}
            {trade ? ` · ${tradeWord(trade)}` : ''}. Confirming lets you rate the visit.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 xs:flex-row">
        <Button size="sm" loading={busy} onClick={() => confirm(job.id)}>
          Yes, it happened
        </Button>
        <Link
          to={`/tenant/jobs/${job.id}#messages`}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          No, something’s wrong
        </Link>
      </div>
    </article>
  )
}

function Visits({ jobs, people, now }: { jobs: Job[]; people: People; now: string }) {
  const visits = jobs
    .flatMap((job) => {
      const visit = upcomingVisit(job)
      return visit ? [{ job, visit }] : []
    })
    .sort((a, b) => a.visit.startsAt.localeCompare(b.visit.startsAt))
  if (visits.length === 0) return null
  return (
    <Section
      id="visits"
      title="Coming up"
      description="Everyone visiting gives you written notice first."
    >
      <ul
        className={cn(
          'grid grid-cols-1 gap-3',
          visits.length > 1 && 'md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2',
        )}
      >
        {visits.map(({ job, visit }) => (
          <li key={visit.id}>
            <VisitCard
              job={job}
              visit={visit}
              trade={people.get(visit.tradeId)}
              now={now}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function OpenRepairs({
  jobs,
  people,
  home,
  now,
}: {
  jobs: Job[]
  people: People
  home: TenantHome | null
  now: string
}) {
  const open = jobs.filter((job) => isOpen(job) || job.status === 'completed')
  if (!home && open.length === 0) return null
  return (
    <Section
      id="open-repairs"
      title="Open repairs"
      action={{ to: '/tenant/repairs', label: 'All repairs' }}
    >
      {open.length === 0 ? (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-line p-4">
          <SmileyIcon weight="duotone" aria-hidden className="size-8 shrink-0 text-accent-text" />
          <p className="text-body text-ink">
            Nothing waiting to be fixed.{' '}
            <span className="text-muted">
              If something breaks, report it and we’ll track it here.
            </span>
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((job) => (
            <li key={job.id}>
              <RepairCard job={job} people={people} landlord={home?.landlord} now={now} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

/** No current tenancy: either not set up yet, or moved out. Both say what comes next. */
function NoHome({ movedOut }: { movedOut: boolean }) {
  return (
    <EmptyState
      icon={HouseLineIcon}
      headingLevel="h2"
      title={movedOut ? 'No current home here' : 'No home set up yet'}
      description={
        movedOut
          ? `When your next landlord adds your tenancy on ${BRAND.name}, you confirm it here. Your passport and past homes stay yours.`
          : `When your landlord adds your tenancy on ${BRAND.name}, it appears here for you to confirm. Then you can report repairs and message them.`
      }
      action={
        movedOut ? (
          <Link to="/tenant/passport" className={buttonVariants()}>
            Your tenant passport
          </Link>
        ) : undefined
      }
      secondaryAction={
        movedOut ? (
          <Link to="/tenant/tenancies" className={buttonVariants({ variant: 'secondary' })}>
            Past homes
          </Link>
        ) : undefined
      }
    />
  )
}

function HomeSkeleton() {
  return (
    <LoadingRegion
      label="Loading your home screen"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    </LoadingRegion>
  )
}
