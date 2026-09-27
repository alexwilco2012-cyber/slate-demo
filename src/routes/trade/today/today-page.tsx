// The trade's home: today's visits in time order, then what needs them, new work on the board,
// quotes waiting for an answer and who owes them money.

import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  CaretRightIcon,
  ClipboardTextIcon,
  ClockCountdownIcon,
  HourglassMediumIcon,
  InvoiceIcon,
  PencilSimpleLineIcon,
  StarIcon,
  SunHorizonIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery, type ActionItem, type AwayFeed } from '@/data'
import { ROLE_LABELS } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/slate/page-header'
import { StatTile } from '@/components/slate/stat-tile'
import { formatPence, plural } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { PostTeaser } from '../board/post-card'
import { PaidOnTime } from '../components/client-record'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { TaskRow } from '../components/task-row'
import { currentVisit, firstNameOf, paymentState, partiesOf } from '../lib/job'
import { useAwayFeed, type JobView } from '../lib/queries'
import { formatLongDay, formatShortDay, greeting, relativeDay, ukDay } from '../lib/time'
import { paymentWords } from '../jobs/next-step'
import { loadToday, type TodayData } from './load'
import { VisitCard, visitMoment } from './visit-card'

const EASE = [0.22, 1, 0.36, 1] as const

export function TodayPage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const now = useDemoNow()
  const { state, refresh } = useSlateQuery((api) => loadToday(api, viewer), [viewer])
  const away = useAwayFeed(viewer)
  const firstName = firstNameOf(person.displayName, person.displayName)

  return (
    <PortalPage title="Today" width="wide">
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading today’s jobs" />
      ) : state.data === undefined ? (
        <>
          <PageHeader eyebrow={formatLongDay(now)} title={`${greeting(now)}, ${firstName}`} />
          <LoadError what="today’s jobs" onRetry={refresh} />
        </>
      ) : (
        <Today
          data={state.data}
          now={now}
          firstName={firstName}
          feed={away.feed}
          onDismissFeed={away.dismiss}
        />
      )}
    </PortalPage>
  )
}

function Today({
  data,
  now,
  firstName,
  feed,
  onDismissFeed,
}: {
  data: TodayData
  now: string
  firstName: string
  feed: AwayFeed | null
  onDismissFeed: () => void
}) {
  const today = ukDay(now)
  const visits = data.views
    .flatMap((view) =>
      view.job.visits
        .filter((visit) => ukDay(visit.startsAt) === today && visit.status !== 'cancelled')
        .map((visit) => ({ view, visit })),
    )
    .sort((a, b) => a.visit.startsAt.localeCompare(b.visit.startsAt))
  const firstUpcoming = visits.find(
    ({ visit }) => visit.status === 'booked' && visit.startsAt > now,
  )?.visit.id
  const primaryVisit =
    visits.find(({ visit }) => visit.status === 'on_site')?.visit.id ??
    visits.find(({ visit }) => visit.status === 'booked')?.visit.id

  const upcoming = data.views
    .flatMap((view) => {
      const visit = currentVisit(view.job)
      return visit && ukDay(visit.startsAt) > today ? [{ view, visit }] : []
    })
    .sort((a, b) => a.visit.startsAt.localeCompare(b.visit.startsAt))
  const waitingGoAhead = data.views.filter(
    (view) => view.job.status === 'quoting' && view.job.acceptedQuoteId,
  )

  const tasks = data.actions.filter((action) => action.kind !== 'leave_rating')
  const ratings = data.actions.filter(
    (action): action is Extract<ActionItem, { kind: 'leave_rating' }> =>
      action.kind === 'leave_rating',
  )
  const owed = data.views.filter((view) => {
    const payment = paymentState(view.job.payment, today)
    return payment.kind === 'due' || payment.kind === 'late'
  })
  const owedTotal = owed.reduce((sum, view) => sum + (view.job.payment?.amountPence ?? 0), 0)
  const late = owed.filter((view) => paymentState(view.job.payment, today).kind === 'late')
  const lateTotal = late.reduce((sum, view) => sum + (view.job.payment?.amountPence ?? 0), 0)
  const lateCount = late.length

  const summary = [
    visits.length === 0 ? 'No visits today' : `${plural(visits.length, 'visit')} today`,
    tasks.length > 0 ? `${plural(tasks.length, 'thing')} that need you` : null,
  ]
    .filter(Boolean)
    .join(' and ')

  return (
    <>
      <PageHeader
        eyebrow={formatLongDay(now)}
        title={`${greeting(now)}, ${firstName}`}
        description={`${summary}.`}
      />

      <AnimatePresence initial={false}>
        {feed && feed.items.length > 0 ? (
          <motion.div
            key="away"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: -24 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <AwayCard feed={feed} onDismiss={onDismissFeed} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-10">
          <Section title="Today" count={visits.length}>
            {visits.length === 0 ? (
              <EmptyState
                icon={CalendarCheckIcon}
                title="No visits today"
                description="Landlords post new jobs on the board most days. A clear quote puts you in the running."
                action={
                  <Link to="/trade/board" className={buttonVariants({ variant: 'primary' })}>
                    Find work on the job board
                  </Link>
                }
              />
            ) : (
              <ol className="flex flex-col gap-4" aria-label="Today’s visits in time order">
                {visits.map(({ view, visit }) => (
                  <VisitCard
                    key={visit.id}
                    view={view}
                    visit={visit}
                    people={data.people}
                    moment={visitMoment(visit, now, visit.id === firstUpcoming)}
                    primary={visit.id === primaryVisit}
                  />
                ))}
              </ol>
            )}
          </Section>

          {tasks.length > 0 ? (
            <Section title="Needs you" count={tasks.length}>
              <ul className="flex flex-col gap-3">
                {tasks.map((action) => (
                  <ActionRow key={actionKey(action)} action={action} data={data} today={today} />
                ))}
              </ul>
            </Section>
          ) : null}

          {upcoming.length > 0 || waitingGoAhead.length > 0 ? (
            <Section title="Coming up">
              <ul className="flex flex-col gap-3">
                {upcoming.map(({ view, visit }) => (
                  <TaskRow
                    key={visit.id}
                    to={`/trade/jobs/${view.job.id}`}
                    icon={CalendarCheckIcon}
                    title={view.job.title}
                    detail={`${relativeDay(ukDay(visit.startsAt), today)}, ${formatShortDay(visit.startsAt)} · ${view.property?.neighbourhood ?? ''}`}
                  />
                ))}
                {waitingGoAhead.map((view) => (
                  <TaskRow
                    key={view.job.id}
                    to={`/trade/jobs/${view.job.id}`}
                    icon={HourglassMediumIcon}
                    title={view.job.title}
                    detail="Quote accepted. You can book once the landlord gives the go-ahead."
                  />
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div className="flex flex-col gap-10">
          <Section
            title="New on the board"
            count={data.newPosts.length}
            link={{ to: '/trade/board', label: 'See all', context: 'open jobs on the job board' }}
          >
            {data.newPosts.length === 0 ? (
              <p className="rounded-card border border-dashed border-input-border p-4 text-muted">
                Nothing new for your trade right now. We’ll show new jobs here as landlords post
                them.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.newPosts.slice(0, 3).map((post) => (
                  <PostTeaser key={post.jobId} post={post} client={data.clients[post.landlordId]} />
                ))}
              </ul>
            )}
          </Section>

          {data.waiting.length > 0 ? (
            <Section
              title="Quotes waiting"
              count={data.waiting.length}
              link={{ to: '/trade/quotes', label: 'See all', context: 'your quotes' }}
            >
              <ul className="flex flex-col gap-3">
                {data.waiting.map(({ quote, post, title }) => (
                  <TaskRow
                    key={quote.id}
                    to={post ? `/trade/board/${post.jobId}` : `/trade/jobs/${quote.jobId}`}
                    icon={PencilSimpleLineIcon}
                    title={title}
                    detail={`Sent ${formatShortDay(quote.submittedAt)}${post ? ` · ${post.neighbourhood}` : ''}`}
                    aside={formatPence(quote.totalPence)}
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          <Section
            title="Money owed to you"
            link={{ to: '/trade/quotes?tab=invoices', label: 'See all', context: 'invoices' }}
          >
            {owed.length === 0 ? (
              <p className="rounded-card border border-dashed border-input-border p-4 text-muted">
                Nobody owes you anything right now. Invoices you send show here until they’re paid.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Owed"
                    value={formatPence(owedTotal)}
                    hint={plural(owed.length, 'invoice')}
                    icon={ClockCountdownIcon}
                  />
                  <StatTile
                    label="Late"
                    value={formatPence(lateTotal)}
                    hint={
                      lateCount > 0 ? `${plural(lateCount, 'invoice')} past due` : 'Nothing late'
                    }
                    icon={WarningCircleIcon}
                  />
                </div>
                <ul className="flex flex-col gap-3">
                  {owed.map((view) => (
                    <OwedRow key={view.job.id} view={view} data={data} today={today} />
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {ratings.length > 0 ? (
            <Section title="Ratings to leave" count={ratings.length}>
              <ul className="flex flex-col gap-3">
                {ratings.map(({ task }) => {
                  const who = task.direction === 'trade->landlord' ? 'landlord' : 'tenant'
                  const name = firstNameOf(data.people[task.subjectId]?.displayName, 'them')
                  const jobId = task.context.kind === 'job' ? task.context.jobId : ''
                  const job = data.views.find((view) => view.job.id === jobId)?.job
                  return (
                    <TaskRow
                      key={`${task.direction}-${jobId}`}
                      to={`/trade/jobs/${jobId}/rate/${who}`}
                      icon={StarIcon}
                      title={`Rate ${name}, the ${ROLE_LABELS[who].toLowerCase()}`}
                      detail={`${job?.title ?? 'Job'} · ${
                        task.counterpartHasRated
                          ? `${name} has rated you. Leave yours to see what they said.`
                          : `By ${formatShortDay(task.closesAt)}`
                      }`}
                    />
                  )
                })}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </>
  )
}

function actionKey(action: ActionItem): string {
  if (action.kind === 'leave_rating') return `${action.kind}-${action.task.direction}`
  if ('jobId' in action) return `${action.kind}-${action.jobId}`
  return action.kind
}

function ActionRow({
  action,
  data,
  today,
}: {
  action: ActionItem
  data: TodayData
  today: string
}) {
  if (!('jobId' in action)) return null
  const view = data.views.find((candidate) => candidate.job.id === action.jobId)
  const title = view?.job.title ?? 'Job'
  const tenants = partiesOf(view?.thread)
    .tenantIds.map((id) => firstNameOf(data.people[id]?.displayName, ''))
    .filter(Boolean)
  switch (action.kind) {
    case 'book_visit': {
      const windows = view?.job.access.windows.filter((window) => window.date > today) ?? []
      return (
        <TaskRow
          to={`/trade/jobs/${action.jobId}?book=1`}
          icon={CalendarPlusIcon}
          tone="info"
          title={`Book a visit: ${title}`}
          detail={
            windows.length > 0 && tenants.length > 0
              ? `You have the go-ahead. ${tenants.join(' and ')} can do ${windows
                  .slice(0, 2)
                  .map((window) => formatShortDay(window.date))
                  .join(' or ')}.`
              : 'You have the go-ahead. Pick a time and the tenant gets written notice.'
          }
        />
      )
    }
    case 'send_quote':
      return (
        <TaskRow
          to={`/trade/jobs/${action.jobId}/quote`}
          icon={PencilSimpleLineIcon}
          tone="info"
          title={`Send a quote: ${title}`}
          detail="The landlord chose you to price this job."
        />
      )
    case 'send_invoice':
      return (
        <TaskRow
          to={`/trade/jobs/${action.jobId}?invoice=1`}
          icon={InvoiceIcon}
          tone="caution"
          title={`Send your invoice: ${title}`}
          detail="The work is done. Send the bill so the landlord can pay you."
        />
      )
    case 'payment_overdue': {
      const landlordId = view?.property?.landlordId
      const landlord = landlordId ? data.people[landlordId] : undefined
      return (
        <TaskRow
          to={`/trade/jobs/${action.jobId}`}
          icon={WarningCircleIcon}
          tone="critical"
          title={`${firstNameOf(landlord?.displayName, 'The landlord')} hasn’t paid`}
          detail={`${title} · ${plural(action.daysOverdue, 'day')} late`}
          aside={formatPence(action.amountPence)}
        />
      )
    }
    default:
      return <TaskRow to={`/trade/jobs/${action.jobId}`} icon={ClipboardTextIcon} title={title} />
  }
}

function OwedRow({ view, data, today }: { view: JobView; data: TodayData; today: string }) {
  const payment = paymentState(view.job.payment, today)
  const landlordId = view.property?.landlordId
  const landlord = landlordId ? data.people[landlordId] : undefined
  const client = landlordId ? data.clients[landlordId] : undefined
  const late = payment.kind === 'late'
  return (
    <li>
      <Link
        to={`/trade/jobs/${view.job.id}`}
        className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 pr-3 text-ink no-underline shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="leading-snug font-bold">{landlord?.displayName ?? 'Landlord'}</span>
              <span className="text-small text-muted">{view.job.title}</span>
            </span>
            <span className="figures shrink-0 text-body-l font-bold">
              {formatPence(view.job.payment?.amountPence ?? 0)}
            </span>
          </span>
          <span
            className={
              late
                ? 'flex items-center gap-1.5 font-semibold text-critical'
                : 'flex items-center gap-1.5'
            }
          >
            {late ? <WarningCircleIcon weight="fill" aria-hidden className="size-5" /> : null}
            {paymentWords(payment)}
          </span>
          {late && client ? <PaidOnTime rating={client} as="span" className="text-small" /> : null}
        </span>
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}

function AwayCard({ feed, onDismiss }: { feed: AwayFeed; onDismiss: () => void }) {
  return (
    <section
      aria-labelledby="away-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
        >
          <SunHorizonIcon weight="duotone" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="away-title" className="font-bold text-ink">
            While you were away
          </h2>
          {feed.summary ? <p className="text-small text-muted">{feed.summary}</p> : null}
        </div>
        <IconButton
          label="Dismiss updates"
          icon={<XIcon weight="bold" />}
          variant="quiet"
          size="sm"
          onClick={onDismiss}
        />
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {feed.items.slice(0, 4).map((item) => (
          <li key={item.key}>
            <Link
              to={item.href}
              className="flex min-h-12 flex-col justify-center gap-0.5 py-2.5 text-ink no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-semibold">{item.title}</span>
              {item.body ? (
                <span className="line-clamp-2 text-small text-muted">{item.body}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
