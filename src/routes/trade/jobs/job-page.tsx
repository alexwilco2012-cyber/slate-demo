// One job, on one screen: where it is and how to get in, what's wrong, what happens next, the
// money, the ratings and the conversation. On a computer the conversation sits beside the job;
// on a phone it follows it. The main action always sits in the dock at the foot of the screen.

import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import {
  ArrowUUpLeftIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CarProfileIcon,
  CheckCircleIcon,
  DoorIcon,
  HardHatIcon,
  InvoiceIcon,
  PencilSimpleLineIcon,
  SignpostIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import { JOB_CATEGORY_LABELS, type Message, type Quote } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ActionDock } from '../components/action-dock'
import { PaidOnTime } from '../components/client-record'
import { UrgencyBadge } from '../components/job-meta'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { CameraButton, PhotoQueue, usePhotoQueue } from '../components/photos'
import { StatusBadge } from '../components/status-badge'
import { WithdrawQuoteDialog } from '../components/withdraw-quote-dialog'
import { errorText } from '../lib/errors'
import {
  currentVisit,
  firstNameOf,
  isWorkFinished,
  partiesOf,
  paymentState,
  tradeStatus,
} from '../lib/job'
import { ukDay } from '../lib/time'
import { BookVisitSheet } from './book-visit-sheet'
import { CompleteSheet } from './complete-sheet'
import { JobChat } from './job-chat'
import { JobRatings } from './job-ratings'
import { GettingIn, JobPlace, Money, TheProblem, WorkDone } from './job-sections'
import { loadJob, type JobData } from './load'
import { InvoiceSheet, PaymentReceivedDialog } from './money-sheets'
import { nextStep, paymentWords } from './next-step'
import { TradeProgress } from './trade-progress'
import { NoAccessSheet, OnMyWaySheet, RearrangeSheet } from './visit-sheets'

type SheetKind =
  | 'book'
  | 'quote-visit'
  | 'on-my-way'
  | 'no-access'
  | 'rearrange'
  | 'complete'
  | 'invoice'
  | 'paid'
  | 'withdraw'

export default function JobPage() {
  const { jobId } = useParams()
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    (api) =>
      isId('job', jobId)
        ? loadJob(api, viewer, jobId)
        : Promise.resolve({ found: false as const, onBoard: false }),
    [viewer, jobId],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Job" width="wide">
        <PageSkeleton label="Loading the job" />
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Job" width="wide">
        <PageHeader back={{ to: '/trade', label: 'Jobs' }} title="Job" />
        <LoadError what="this job" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data.found) {
    if (state.data.onBoard) return <Navigate to={`/trade/board/${jobId}`} replace />
    return (
      <PortalPage title="Job not found">
        <PageHeader back={{ to: '/trade', label: 'Jobs' }} title="This job isn’t on your list" />
        <EmptyState
          icon={SignpostIcon}
          headingLevel="h2"
          title="Nothing to show"
          description="You can see jobs a landlord has chosen you for. Jobs taking quotes are on the job board."
          action={
            <Link to="/trade/board" className={buttonVariants({ variant: 'primary' })}>
              Go to the job board
            </Link>
          }
        />
      </PortalPage>
    )
  }
  return <JobScreen data={state.data.data} />
}

function JobScreen({ data }: { data: JobData }) {
  const { job, property, thread, quotes, people, landlord, client } = data
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const today = ukDay(now)
  const toast = useToast()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [sheet, setSheetState] = useState<SheetKind | null>(() =>
    params.get('book') ? 'book' : params.get('invoice') ? 'invoice' : null,
  )
  const [busy, setBusy] = useState(false)

  const { state: messagesState } = useSlateQuery(
    (a) => (thread ? a.listMessages(viewer, thread.id) : Promise.resolve([] as Message[])),
    [viewer, thread?.id],
  )
  const messages = messagesState.data

  const setSheet = (next: SheetKind | null) => {
    setSheetState(next)
    if (!next && (params.has('book') || params.has('invoice'))) {
      setParams({}, { replace: true })
    }
  }

  // Arriving from "Message" on the Today screen: bring the conversation into view.
  useEffect(() => {
    if (location.hash === '#chat') {
      document.getElementById('chat')?.scrollIntoView({ block: 'start' })
    }
  }, [location.hash])

  const photos = usePhotoQueue(
    (image) => api.addJobPhotos(viewer, job.id, [image]).then(() => undefined),
    `Photo from site: ${job.title}`,
  )

  const latestQuote: Quote | undefined = quotes.at(-1)
  const acceptedQuote = quotes.find((quote) => quote.id === job.acceptedQuoteId)
  const openQuote = quotes.find((quote) => quote.status === 'submitted')
  const shownQuote = acceptedQuote ?? openQuote ?? latestQuote
  const status = tradeStatus(job, latestQuote, today)
  const visit = currentVisit(job)
  const visitToday = visit ? ukDay(visit.startsAt) === today : false
  const payment = paymentState(job.payment, today)
  const parties = partiesOf(thread)
  const tenantName =
    parties.tenantIds
      .map((id) => firstNameOf(people[id]?.displayName, ''))
      .filter(Boolean)
      .join(' and ') || 'The tenant'
  const landlordName = firstNameOf(landlord?.displayName, 'The landlord')
  const agent = parties.agentIds[0] ? people[parties.agentIds[0]] : undefined
  const vatRegistered = people[viewer.personId]?.tradeProfile?.vatRegistered ?? false
  const onMyWaySent =
    visit !== undefined &&
    (messages ?? []).some(
      (message) =>
        message.author?.personId === viewer.personId &&
        message.body.startsWith('On my way') &&
        ukDay(message.sentAt) === ukDay(visit.startsAt),
    )
  const closed = status.key === 'closed'
  const pendingRatings = data.tasks.filter((task) => task.status !== 'submitted')

  async function arrived() {
    if (!visit) return
    setBusy(true)
    try {
      await api.startVisit(viewer, job.id, visit.id)
      toast.success('You’re on site', {
        description: 'Take photos as you go. Mark the work done when you’ve finished.',
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorText(error) })
    } finally {
      setBusy(false)
    }
  }

  const next = nextStep({
    job,
    status,
    visit,
    payment,
    today,
    tenantName,
    landlordName,
  })

  function primary(label: string, icon: ReactNode, onClick: () => void) {
    return (
      <Button size="trade" iconStart={icon} onClick={onClick} loading={busy}>
        {label}
      </Button>
    )
  }

  /** The one main action for where the job stands, pinned in the dock. */
  function dock(): ReactNode {
    switch (status.key) {
      case 'to_quote':
        return (
          <ActionDock label="Job actions">
            <Link to={`/trade/jobs/${job.id}/quote`} className={buttonVariants({ size: 'trade' })}>
              <PencilSimpleLineIcon weight="bold" aria-hidden />
              Send a quote
            </Link>
          </ActionDock>
        )
      case 'to_book':
        return (
          <ActionDock label="Job actions">
            {primary('Book a visit', <CalendarPlusIcon weight="bold" aria-hidden />, () =>
              setSheet('book'),
            )}
          </ActionDock>
        )
      case 'booked':
        if (!visit || !visitToday) return null
        return (
          <ActionDock label="Job actions">
            {onMyWaySent
              ? primary('I’ve arrived', <HardHatIcon weight="bold" aria-hidden />, arrived)
              : primary('On my way', <CarProfileIcon weight="bold" aria-hidden />, () =>
                  setSheet('on-my-way'),
                )}
          </ActionDock>
        )
      case 'on_site':
        return (
          <ActionDock label="Job actions">
            {primary('Mark the work done', <CheckCircleIcon weight="bold" aria-hidden />, () =>
              setSheet('complete'),
            )}
          </ActionDock>
        )
      case 'to_invoice':
        return (
          <ActionDock label="Job actions">
            {primary('Send your invoice', <InvoiceIcon weight="bold" aria-hidden />, () =>
              setSheet('invoice'),
            )}
          </ActionDock>
        )
      case 'awaiting_payment':
      case 'payment_late':
        return (
          <ActionDock label="Job actions">
            {primary('The money’s arrived', <CheckCircleIcon weight="bold" aria-hidden />, () =>
              setSheet('paid'),
            )}
          </ActionDock>
        )
      case 'paid':
      case 'done': {
        const task = pendingRatings[0]
        if (!task) return null
        const who = task.direction === 'trade->landlord' ? 'landlord' : 'tenant'
        return (
          <ActionDock label="Job actions">
            <Link
              to={`/trade/jobs/${job.id}/rate/${who}`}
              className={buttonVariants({ size: 'trade' })}
            >
              <StarIcon weight="bold" aria-hidden />
              Rate {firstNameOf(people[task.subjectId]?.displayName, 'them')}
            </Link>
          </ActionDock>
        )
      }
      default:
        return null
    }
  }

  /** The other things that make sense now. They sit in the Next card, in the page's flow. */
  function others(): ReactNode {
    switch (status.key) {
      case 'to_quote':
        return !visit ? (
          <Button
            variant="secondary"
            iconStart={<CalendarPlusIcon weight="bold" aria-hidden />}
            onClick={() => setSheet('quote-visit')}
          >
            Visit to price it first
          </Button>
        ) : null
      case 'quote_sent':
        return openQuote ? (
          <Button
            variant="danger"
            iconStart={<ArrowUUpLeftIcon weight="bold" aria-hidden />}
            onClick={() => setSheet('withdraw')}
          >
            Withdraw quote
          </Button>
        ) : null
      case 'booked':
        if (!visit) return null
        if (!visitToday) {
          return (
            <Button
              variant="secondary"
              iconStart={<CalendarXIcon weight="bold" aria-hidden />}
              onClick={() => setSheet('rearrange')}
            >
              Rearrange the visit
            </Button>
          )
        }
        return (
          <>
            {!onMyWaySent ? (
              <Button
                variant="secondary"
                iconStart={<HardHatIcon weight="bold" aria-hidden />}
                onClick={arrived}
                disabled={busy}
              >
                I’ve arrived
              </Button>
            ) : null}
            <Button
              variant="secondary"
              iconStart={<DoorIcon weight="bold" aria-hidden />}
              onClick={() => setSheet('no-access')}
            >
              Couldn’t get in
            </Button>
          </>
        )
      case 'on_site':
        return (
          <CameraButton variant="secondary" onPhotos={photos.add}>
            Add photos
          </CameraButton>
        )
      case 'done':
        return (
          <Button
            variant="secondary"
            iconStart={<InvoiceIcon weight="bold" aria-hidden />}
            onClick={() => setSheet('invoice')}
          >
            Send an invoice
          </Button>
        )
      default:
        return null
    }
  }
  const secondary = others()

  return (
    <PortalPage title={job.title} width="wide">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,27rem)] lg:items-start">
        <div className="@container flex min-w-0 flex-col gap-8">
          <PageHeader
            back={{ to: '/trade', label: 'Jobs' }}
            eyebrow={`${property?.neighbourhood ?? 'Job'} · ${JOB_CATEGORY_LABELS[job.category]}`}
            title={job.title}
            meta={
              <>
                <StatusBadge status={status} />
                <UrgencyBadge urgency={job.urgency} />
              </>
            }
          />

          {property ? (
            <JobPlace
              property={property}
              tenants={parties.tenantIds.flatMap((id) => (people[id] ? [people[id]] : []))}
              landlord={landlord}
              agent={agent}
              landlordName={landlordName}
            />
          ) : null}

          <Card variant="accent" accentBar padding="md" className="gap-4">
            <div aria-live="polite" className="flex flex-col gap-2">
              <p className="text-small font-bold text-ink">Next</p>
              <h2 className="font-display text-display-m font-semibold text-ink">{next.title}</h2>
              {next.body ? <p className="text-ink">{next.body}</p> : null}
            </div>
            {status.key === 'payment_late' && client ? (
              <PaidOnTime
                rating={client}
                className="self-start rounded-control bg-surface px-3 py-2"
              />
            ) : null}
            {secondary ? (
              <div className="flex flex-col gap-(--gap-touch) @md:flex-row @md:*:flex-1">
                {secondary}
              </div>
            ) : null}
            {status.key === 'on_site' ? (
              <PhotoQueue items={photos.items} onRetry={photos.retry} onRemove={photos.remove} />
            ) : null}
            <TradeProgress job={job} className="mt-1" />
          </Card>

          {!closed && !isWorkFinished(job) ? (
            <GettingIn job={job} visit={visit} tenantName={tenantName} today={today} />
          ) : null}

          <TheProblem job={job} names={namesOf(people)}>
            {status.key !== 'on_site' ? (
              <PhotoQueue items={photos.items} onRetry={photos.retry} onRemove={photos.remove} />
            ) : null}
            {!closed && !isWorkFinished(job) && status.key !== 'on_site' ? (
              <CameraButton variant="secondary" onPhotos={photos.add} className="sm:self-start">
                Add photos
              </CameraButton>
            ) : null}
          </TheProblem>

          {job.completion ? <WorkDone completion={job.completion} /> : null}

          {shownQuote || job.payment ? (
            <Money
              today={today}
              payment={job.payment}
              paymentStatus={status}
              paymentLabel={paymentWords(payment)}
              quote={shownQuote}
            />
          ) : null}

          {isWorkFinished(job) && data.tasks.length > 0 ? (
            <Section
              title="Ratings"
              description={
                <>
                  Hidden until both sides have rated, then revealed together.{' '}
                  <Link
                    to="/policies/reviews"
                    className="font-semibold text-accent-text underline underline-offset-2"
                  >
                    Review policy
                  </Link>
                </>
              }
            >
              <JobRatings jobId={job.id} tasks={data.tasks} sent={data.sent} people={people} />
            </Section>
          ) : null}

          {dock()}
        </div>

        {thread ? (
          <aside
            aria-label="Conversation"
            className="lg:sticky lg:top-[calc(4.75rem+1.5rem)] lg:h-[calc(100dvh-4.75rem-3rem)]"
          >
            <JobChat
              thread={thread}
              messages={messages}
              people={people}
              title={job.title}
              variant="panel"
              className="lg:h-full"
            />
          </aside>
        ) : null}
      </div>

      <BookVisitSheet
        open={sheet === 'book' || sheet === 'quote-visit'}
        onOpenChange={(open) => setSheet(open ? sheet : null)}
        job={job}
        tenantName={tenantName}
        purpose={sheet === 'quote-visit' ? 'quote' : 'repair'}
      />
      <OnMyWaySheet
        open={sheet === 'on-my-way'}
        onOpenChange={(open) => setSheet(open ? 'on-my-way' : null)}
        threadId={thread?.id}
        tenantName={tenantName}
      />
      {visit ? (
        <>
          <NoAccessSheet
            open={sheet === 'no-access'}
            onOpenChange={(open) => setSheet(open ? 'no-access' : null)}
            job={job}
            visit={visit}
          />
          <RearrangeSheet
            open={sheet === 'rearrange'}
            onOpenChange={(open) => setSheet(open ? 'rearrange' : null)}
            job={job}
            visit={visit}
          />
        </>
      ) : null}
      <CompleteSheet
        open={sheet === 'complete'}
        onOpenChange={(open) => setSheet(open ? 'complete' : null)}
        job={job}
        quote={acceptedQuote}
        vatRegistered={vatRegistered}
      />
      <InvoiceSheet
        key={job.completion?.completedAt ?? 'invoice'}
        open={sheet === 'invoice'}
        onOpenChange={(open) => setSheet(open ? 'invoice' : null)}
        job={job}
        defaultPence={job.completion?.finalPricePence ?? acceptedQuote?.totalPence}
        landlordName={landlordName}
      />
      <PaymentReceivedDialog
        open={sheet === 'paid'}
        onOpenChange={(open) => setSheet(open ? 'paid' : null)}
        job={job}
        landlordName={landlordName}
      />
      {openQuote ? (
        <WithdrawQuoteDialog
          quote={openQuote}
          landlordName={landlordName}
          open={sheet === 'withdraw'}
          onOpenChange={(open) => setSheet(open ? 'withdraw' : null)}
        />
      ) : null}
    </PortalPage>
  )
}

function namesOf(people: JobData['people']) {
  return Object.fromEntries(
    Object.values(people).map((person) => [person.id, firstNameOf(person.displayName)]),
  )
}
