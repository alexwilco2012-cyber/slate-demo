// One repair, everything on one screen: what's happening next, who's coming and their notice,
// the timeline, the conversation, the problem as reported, and the ratings once it's done.

import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  HourglassMediumIcon,
  InfoIcon,
  KeyIcon,
  LockSimpleIcon,
  ProhibitIcon,
  SealCheckIcon,
  StarIcon,
  WrenchIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { SlateError, type RatingTask, type SlateApi, type Viewer } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import { ROOM_LABELS, type Job, type JobId, type PublicReview, type Rating } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/components/slate/format'
import { JobTimeline } from '@/components/slate/job-timeline'
import { PageHeader } from '@/components/slate/page-header'
import { ReviewCard, SealedReviewCard } from '@/components/slate/review-card'
import { NotFound, PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import {
  JobStatusBadge,
  QueryError,
  ReviewPolicyLink,
  Section,
  UrgencyBadge,
} from '../components/basics'
import { Conversation } from '../components/conversation'
import { PhotoGrid } from '../components/photo'
import { RatingTaskCard } from '../components/rating-task-card'
import { ReportDialog } from '../components/report-dialog'
import { RevealMoment } from '../components/reveal'
import { TradeCard } from '../components/trade-card'
import { NoticeLine } from '../components/visit-card'
import {
  homeForProperty,
  loadHomes,
  loadPeople,
  loadTradeScores,
  sameContext,
  upcomingVisit,
  visitToConfirm,
  type People,
  type TenantHome,
} from '../lib/data'
import { dayAndMonth, firstName, visitWindow } from '../lib/format'
import { describeEvent, tenantJobStages, tradeWord } from '../lib/jobs'
import { useHashTarget } from '../lib/use-hash-target'
import { ratePath, sealOf } from '../lib/ratings'
import { describeWindows } from './report/access-grid'
import { ConfirmVisitCard } from './home'

const CANCELLABLE: readonly Job['status'][] = [
  'reported',
  'approved',
  'quoting',
  'instructed',
  'booked',
]

async function loadJobPage(api: SlateApi, viewer: Viewer, jobId: JobId) {
  const job = await api.getJob(viewer, jobId)
  if (!job) return null
  const [homes, tasks, myRatings, aboutMe, thread] = await Promise.all([
    loadHomes(api, viewer),
    api.listRatingTasks(viewer),
    api.listMyRatings(viewer),
    api.listReviews(viewer, { direction: 'trade->tenant', subjectId: viewer.personId }),
    api.getThreadFor(viewer, { kind: 'job', jobId }),
  ])
  const context = { kind: 'job', jobId } as const
  const people = await loadPeople(api, viewer, [
    job.tradeId,
    ...job.timeline.map((event) => event.actorId),
    ...job.visits.map((visit) => visit.tradeId),
    ...tasks.map((task) => task.subjectId),
  ])
  const scores = await loadTradeScores(api, viewer, [job.tradeId])
  // A review's context names the job by title and date only, never by id.
  const theirReview = aboutMe.find(
    (review) =>
      review.context.kind === 'job' &&
      review.context.title === job.title &&
      review.context.completedAt === job.completion?.completedAt,
  )
  return {
    job,
    home: homeForProperty(homes, job.propertyId) ?? null,
    tasks: tasks.filter((task) => sameContext(task.context, context)),
    ratings: myRatings.filter((rating) => sameContext(rating.context, context)),
    theirReview: theirReview ?? null,
    threadId: thread.id,
    people,
    scores,
  }
}

export function JobPage() {
  const { jobId } = useParams()
  const viewer = useViewer()
  const validId = isId('job', jobId) ? jobId : null
  const { state, refresh } = useSlateQuery(
    async (api) => (validId ? loadJobPage(api, viewer, validId) : null),
    [viewer, validId],
  )

  useHashTarget(Boolean(state.data))

  if (!validId || (state.status === 'success' && state.data === null)) return <NotFound />
  if (state.status === 'loading') return <JobSkeleton />
  if (!state.data) {
    return (
      <PortalPage title="Repair">
        <PageHeader back={{ to: '/tenant/repairs', label: 'Repairs' }} title="Repair" />
        <QueryError what="this repair" onRetry={refresh} />
      </PortalPage>
    )
  }
  return <JobView data={state.data} onChanged={refresh} />
}

type JobData = NonNullable<Awaited<ReturnType<typeof loadJobPage>>>

function JobView({ data, onChanged }: { data: JobData; onChanged: () => void }) {
  const viewer = useViewer()
  const now = useDemoNow()
  const { job, home, people } = data
  const trade = job.tradeId ? people.get(job.tradeId) : undefined
  const visit = upcomingVisit(job)
  const toConfirm = visitToConfirm(job)
  const stages = tenantJobStages(job, people, home?.landlord, now)
  const canCancel = job.reportedById === viewer.personId && CANCELLABLE.includes(job.status)
  const street = home?.property.addressLine.split(',').at(-1)?.trim()

  return (
    <PortalPage title={job.title}>
      <PageHeader
        back={{ to: '/tenant/repairs', label: 'Repairs' }}
        eyebrow={`${ROOM_LABELS[job.room]}${street ? ` · ${street}` : ''}`}
        title={job.title}
        meta={
          <>
            <JobStatusBadge status={job.status} size="md" />
            {job.urgency !== 'routine' ? <UrgencyBadge urgency={job.urgency} size="md" /> : null}
            <span className="text-small text-muted">Reported {formatDate(job.createdAt)}</span>
          </>
        }
      />

      {/*
        The source order is the phone's reading order, so focus and screen readers follow what's on
        screen. From 1024px a grid moves the conversation and the problem into a left column and
        stacks who, progress and ratings on the right; the last, flexible row takes up whichever
        column runs longer, so neither side opens gaps in the other.
      */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)] lg:grid-rows-[auto_auto_auto_auto_1fr] lg:gap-x-10">
        <div className="lg:col-start-1 lg:row-start-1">
          {toConfirm ? (
            <ConfirmVisitCard
              job={job}
              visitId={toConfirm.id}
              people={people}
              onConfirmed={onChanged}
            />
          ) : (
            <NextStep job={job} home={home} people={people} tasks={data.tasks} now={now} />
          )}
        </div>

        <div className="flex flex-col gap-8 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-start">
          {trade ? (
            <Section id="whos-coming" title={visit ? 'Who’s coming' : 'Who’s doing the work'}>
              <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
                <TradeCard trade={trade} score={data.scores.get(trade.id)} />
                {visit ? (
                  <div className="flex flex-col gap-2 border-t border-line pt-4">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <CalendarCheckIcon
                        weight="bold"
                        aria-hidden
                        className="size-5 text-accent-text"
                      />
                      {visit.status === 'on_site'
                        ? 'On site now'
                        : visitWindow(visit.startsAt, visit.endsAt, now)}
                    </p>
                    <NoticeLine visit={visit} />
                  </div>
                ) : null}
                <p className="text-caption text-muted">
                  {home?.landlord ? firstName(home.landlord.displayName) : 'Your landlord'} chose{' '}
                  {firstName(trade.displayName)}. The landlord always picks the trade.
                </p>
              </div>
            </Section>
          ) : null}
          <Section id="progress" title="Progress">
            <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
              <JobTimeline stages={stages} />
              <History job={job} people={people} now={now} />
            </div>
          </Section>
          <RatingsSection data={data} />
        </div>

        <Section id="messages" title="Messages" className="lg:col-start-1 lg:row-start-2">
          <div className="rounded-card border border-line bg-surface/60 p-3 sm:p-4">
            <Conversation threadId={data.threadId} label={`Messages about ${job.title}`} />
          </div>
        </Section>
        <ProblemSection job={job} className="lg:col-start-1 lg:row-start-3" />
        {canCancel ? (
          <CancelRepair
            job={job}
            onCancelled={onChanged}
            className="lg:col-start-1 lg:row-start-4"
          />
        ) : null}
      </div>
    </PortalPage>
  )
}

function NextStep({
  job,
  home,
  people,
  tasks,
  now,
}: {
  job: Job
  home: TenantHome | null
  people: People
  tasks: RatingTask[]
  now: string
}) {
  const landlord = home?.landlord ? firstName(home.landlord.displayName) : 'Your landlord'
  const trade = job.tradeId ? people.get(job.tradeId) : undefined
  const tradeName = trade ? firstName(trade.displayName) : 'The trade'
  const visit = upcomingVisit(job)
  const owed = tasks.filter((task) => task.status !== 'submitted')
  const reason = [...job.timeline]
    .reverse()
    .find((event) => event.kind === 'declined' || event.kind === 'cancelled')
  const revealedAt = job.timeline.find((event) => event.kind === 'ratings_revealed')?.at

  let icon: ReactNode = <HourglassMediumIcon weight="duotone" />
  let title: string
  let body: ReactNode = null
  let tone: 'accent' | 'neutral' | 'critical' = 'neutral'
  let action: { to: string; label: string } | null = null

  switch (job.status) {
    case 'reported':
      title = `Waiting for ${landlord} to approve it`
      body = 'You’ll hear as soon as they do. Add anything useful in the messages below.'
      break
    case 'approved':
    case 'quoting':
      icon = <SealCheckIcon weight="duotone" />
      title = 'Approved'
      body =
        job.status === 'quoting'
          ? `${landlord} is getting quotes and will choose who does the work.`
          : `${landlord} is choosing who’ll fix it.`
      break
    case 'instructed':
      icon = <WrenchIcon weight="duotone" />
      title = `${tradeName} has the go-ahead`
      body = 'They’ll book a visit and send you written notice first.'
      break
    case 'booked':
      icon = <CalendarCheckIcon weight="duotone" />
      tone = 'accent'
      title = visit ? visitWindow(visit.startsAt, visit.endsAt, now) : 'Visit booked'
      body = `${trade ? `${trade.displayName}, ${tradeWord(trade)},` : 'The trade'} is coming. Need to change it? Say so in the messages.`
      break
    case 'in_progress':
      icon = <WrenchIcon weight="duotone" />
      tone = 'accent'
      title = `${tradeName} is on site`
      body = 'Once they mark it done, we’ll ask you to confirm the visit happened.'
      break
    case 'completed':
    case 'confirmed':
      icon = owed.length ? <StarIcon weight="duotone" /> : <CheckCircleIcon weight="duotone" />
      tone = owed.length ? 'accent' : 'neutral'
      title = owed.length ? 'Fixed? Tell us how it went' : 'All done'
      action = rateAction(owed, landlord, tradeName)
      body = owed.length
        ? rateNudge(owed, landlord)
        : job.status === 'completed'
          ? `${tradeName} marked it done. ${landlord} will confirm it too.`
          : revealedAt
            ? `We revealed the ratings on ${dayAndMonth(revealedAt)}. They’re below.`
            : 'Thanks for rating. You’ll see what everyone said once we reveal the ratings.'
      break
    case 'declined':
      icon = <XCircleIcon weight="duotone" />
      tone = 'critical'
      title = `${landlord} declined this repair`
      body =
        reason && reason.kind === 'declined'
          ? `“${reason.reason}” Ask about it in the messages.`
          : null
      break
    case 'cancelled':
      icon = <ProhibitIcon weight="duotone" />
      title = 'This repair was cancelled'
      body = reason && reason.kind === 'cancelled' ? `“${reason.reason}”` : null
      break
  }

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-4 rounded-card p-4 sm:p-5',
        tone === 'accent' &&
          'border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint',
        tone === 'neutral' && 'border border-line bg-surface shadow-soft',
        tone === 'critical' && 'border border-critical bg-critical-tint',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-6',
          tone === 'critical'
            ? 'bg-surface text-critical'
            : 'bg-surface text-accent-text shadow-soft',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body-l leading-snug font-semibold text-ink">{title}</p>
        {body ? <p className="text-small text-ink">{body}</p> : null}
        {action ? (
          <Link
            to={action.to}
            className={cn(buttonVariants({ size: 'sm' }), 'mt-2 self-start max-xs:w-full')}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** One rating owed: straight to its form. Two: down to the ratings on this page. */
function rateAction(
  owed: readonly RatingTask[],
  landlord: string,
  tradeName: string,
): { to: string; label: string } | null {
  const [only, ...rest] = owed
  if (!only) return null
  if (rest.length > 0) return { to: '#ratings', label: `Rate ${tradeName} and ${landlord}` }
  return {
    to: ratePath(only.direction, only.context),
    label: only.direction === 'tenant->trade' ? `Rate ${tradeName}’s visit` : `Rate ${landlord}`,
  }
}

/** "Rate it by 2 Oct. Graham never sees your answers on their own." */
function rateNudge(owed: readonly RatingTask[], landlord: string): string {
  const closes = owed.map((task) => task.closesAt).sort()[0]!
  const shieldedOnly = owed.every((task) => sealOf(task.direction, task.context) !== 'double_blind')
  return `Open until ${dayAndMonth(closes)}. ${
    shieldedOnly
      ? `${landlord} never sees your answers on their own.`
      : 'Answers stay sealed until everyone has rated, then they’re revealed together.'
  }`
}

function History({ job, people, now }: { job: Job; people: People; now: string }) {
  const viewer = useViewer()
  const lines = [...job.timeline].reverse().flatMap((event) => {
    const described = describeEvent(event, job, people, viewer.personId, now)
    return described ? [{ event, ...described }] : []
  })
  return (
    <details className="group border-t border-line pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control font-semibold text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <ClockCounterClockwiseIcon weight="bold" aria-hidden className="size-4.5" />
        Everything that’s happened
        <span className="text-small font-normal text-muted">({lines.length})</span>
      </summary>
      <ol className="mt-2 flex flex-col">
        {lines.map(({ event, title, detail }) => (
          <li
            key={event.id}
            className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0"
          >
            <p className="text-small font-semibold text-ink">{title}</p>
            {detail ? <p className="text-small text-muted">{detail}</p> : null}
            <p className="figures text-caption text-muted">
              <time dateTime={event.at}>{formatDate(event.at)}</time>
            </p>
          </li>
        ))}
      </ol>
    </details>
  )
}

function ProblemSection({ job, className }: { job: Job; className?: string }) {
  const windows = describeWindows(job.access.windows)
  return (
    <Section id="problem" title="The problem" className={className}>
      <div className="@container flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
        <p className="text-body whitespace-pre-line text-ink">{job.description}</p>
        {job.photos.length > 0 ? <PhotoGrid images={job.photos} /> : null}
        <dl className="flex flex-col gap-3 border-t border-line pt-4 text-small">
          <div className="flex flex-col gap-1">
            <dt className="font-semibold text-ink">When someone can get in</dt>
            <dd className="text-ink">
              {windows.length ? (
                <ul className="flex flex-col gap-0.5">
                  {windows.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted">No times given</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-semibold text-ink">If you’re out</dt>
            <dd className="flex items-start gap-2 text-ink">
              <KeyIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
              <span>
                {job.access.keyAllowed
                  ? 'They can use a key to get in.'
                  : 'They’ll only come when you’re home.'}
                {job.access.notes ? (
                  <span className="text-muted"> “{job.access.notes}”</span>
                ) : null}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  )
}

function RatingsSection({ data, className }: { data: JobData; className?: string }) {
  const viewer = useViewer()
  const now = useDemoNow()
  const [reporting, setReporting] = useState(false)
  const { job, tasks, ratings, theirReview, people } = data
  if (tasks.length === 0 && ratings.length === 0 && !theirReview) return null

  const subjectName = (id: string) => people.get(id as Rating['subjectId'])?.displayName ?? 'them'
  const toDo = tasks.filter((task) => task.status !== 'submitted')
  const sent = ratings.filter((rating) => rating.state === 'sealed')
  const revealed = ratings.filter((rating) => rating.state === 'revealed')

  return (
    <Section id="ratings" title="Ratings" className={className}>
      <div className="flex flex-col gap-3">
        {toDo.map((task) => (
          <RatingTaskCard
            key={task.direction}
            task={task}
            subjectName={subjectName(task.subjectId)}
            about={job.title}
            now={now}
          />
        ))}
        {sent.map((rating) => (
          <SealedReviewCard
            key={rating.id}
            seal={rating.seal}
            raterRole="tenant"
            revealAt={rating.revealAt}
            context={`Your rating of ${firstName(subjectName(rating.subjectId))}`}
          />
        ))}
        {revealed.map((rating) => (
          <Link
            key={rating.id}
            to={`/tenant/reviews/${rating.id}`}
            className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-surface p-4 text-ink no-underline shadow-soft hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CheckCircleIcon weight="fill" aria-hidden className="size-5 shrink-0 text-positive" />
            <span className="flex-1 font-semibold">
              Your review of {firstName(subjectName(rating.subjectId))} is published
            </span>
            <span className="text-small text-accent-text">View</span>
          </Link>
        ))}
        {theirReview ? (
          <TheirReview
            review={theirReview}
            tradeName={job.tradeId ? subjectName(job.tradeId) : 'The trade'}
            personId={viewer.personId}
            now={now}
            onReport={() => setReporting(true)}
          />
        ) : null}
        {ratings.some((r) => r.seal === 'retaliation_shield') ? (
          <p className="flex items-start gap-2 text-small text-muted">
            <LockSimpleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            Your rating of how your landlord handled this never appears on its own.
          </p>
        ) : null}
        <ReviewPolicyLink />
      </div>
      {theirReview ? (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          target={{ kind: 'rating', ratingId: theirReview.ratingId }}
          what="this review"
        />
      ) : null}
    </Section>
  )
}

function TheirReview({
  review,
  tradeName,
  personId,
  now,
  onReport,
}: {
  review: PublicReview
  tradeName: string
  personId: Rating['raterId']
  now: string
  onReport: () => void
}) {
  return (
    <RevealMoment personId={personId} id={review.ratingId} revealedAt={review.revealedAt} now={now}>
      <div className="flex flex-col gap-2">
        <p className="text-small font-semibold text-ink">
          What {firstName(tradeName)} said about you
        </p>
        <ReviewCard review={review} onReport={onReport} headingLevel="h3" />
        <p className="flex items-start gap-2 text-small text-muted">
          <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
          Only you see this. Your landlord only sees whether you gave access.
        </p>
        <Link
          to={`/tenant/reviews/${review.ratingId}`}
          className="inline-flex min-h-11 items-center self-start text-small font-semibold text-accent-text underline underline-offset-4"
        >
          Open the review to reply, add a note or report it
        </Link>
      </div>
    </RevealMoment>
  )
}

function CancelRepair({
  job,
  onCancelled,
  className,
}: {
  job: Job
  onCancelled: () => void
  className?: string
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function cancel() {
    if (reason.trim().length < 3) {
      setError('Say why, in a few words. It helps your landlord.')
      return
    }
    setBusy(true)
    try {
      await api.cancelJob(viewer, job.id, reason.trim())
      setOpen(false)
      toast.success('Repair cancelled', { description: 'We’ve told everyone involved.' })
      onCancelled()
    } catch (caught) {
      setError(
        caught instanceof SlateError
          ? (caught.fields.reason ?? caught.message)
          : 'That didn’t work. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2 border-t border-line pt-5', className)}>
      <p className="text-small text-muted">Fixed it yourself, or no longer needed?</p>
      <Button
        variant="danger"
        size="sm"
        className="self-start"
        onClick={() => setOpen(true)}
        iconStart={<ProhibitIcon weight="bold" aria-hidden />}
      >
        Cancel this repair
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Cancel this repair?"
          description="We’ll tell your landlord and anyone booked to visit. You can report it again later if you need to."
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Keep it</Button>} />
              <Button variant="danger-solid" loading={busy} onClick={cancel}>
                Cancel the repair
              </Button>
            </>
          }
        >
          <Textarea
            label="Why are you cancelling?"
            hint="For example, it stopped by itself."
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(undefined)
            }}
            maxLength={500}
            rows={3}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function JobSkeleton() {
  return (
    <PortalPage title="Repair">
      <LoadingRegion label="Loading the repair" className="flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-80 w-full rounded-card" />
          </div>
        </div>
      </LoadingRegion>
    </PortalPage>
  )
}
