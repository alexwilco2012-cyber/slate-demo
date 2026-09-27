// A repair from the landlord's side: the one next step first, then quotes, visits, the invoice,
// what the tenant reported, the trade, progress and the conversation. Used as a full page and
// inside the detail drawer on the repairs list.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  ChatsCircleIcon,
  KeyIcon,
  LockSimpleIcon,
  WrenchIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import {
  ACCESS_SLOT_LABELS,
  JOB_CATEGORY_LABELS,
  ROLE_LABELS,
  ROOM_LABELS,
  type JobId,
  type PersonCard,
  type PersonId,
} from '@/domain/types'
import { buttonVariants, Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatPence } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { useViewer } from '@/session'
import { JobProgress } from '../../components/job-progress'
import { JobStatusBadge, UrgencyBadge } from '../../components/job-status'
import { PhotoTile } from '../../components/photo-tile'
import { Section } from '../../components/section'
import { ErrorPanel, PageSkeleton } from '../../components/states'
import { ReviewPolicyLink } from '../../components/review-item'
import { TradeScoreHalves } from '../../components/trade-card'
import { TradeProfileSheet } from '../../components/trade-profile-sheet'
import { rateHref } from '../../lib/actions'
import { usePeople, usePermissions } from '../../lib/data'
import { reveal, revealLater } from '../../lib/dom'
import { errorMessage, isMissing } from '../../lib/errors'
import { firstName, placeOf } from '../../lib/format'
import { formatClock, formatLongDay, formatShortDate } from '../../lib/time'
import { ApproveStep } from './approve'
import { ConfirmStep, PaymentCard, PriceCheck } from './completion'
import { FindTradeStep } from './find-trade'
import { InstructStep } from './instruct'
import { peopleOnJob, useJobData, type JobData } from './job-data'
import { QuotesCompare } from './quotes'
import { JobHeadingLevel, StepCard, useJobHeadings } from './step-card'
import { BookVisitDialog, VisitList } from './visit'

// A reported job is declined rather than cancelled, so it isn't offered here.
const CANCELLABLE = new Set(['approved', 'quoting', 'instructed', 'booked'])

type People = ReadonlyMap<PersonId, PersonCard>

function NextStep({ data, people }: { data: JobData; people: People }) {
  const { job, property, quotes, tenancy, ratingTask } = data
  const can = usePermissions()
  const [booking, setBooking] = useState(false)
  const trade = job.tradeId ? people.get(job.tradeId) : undefined
  const tradeName = trade ? firstName(trade.displayName) : 'The trade'
  const business = trade?.tradeProfile?.businessName ?? trade?.displayName ?? 'The trade'
  const tenantId =
    tenancy?.tenantIds[0] ?? (job.reportedAs === 'tenant' ? job.reportedById : undefined)
  const tenantName = tenantId
    ? firstName(people.get(tenantId)?.displayName ?? 'Your tenant')
    : undefined
  const reporter = people.get(job.reportedById)?.displayName ?? 'Your tenant'
  const accepted = quotes.find((q) => q.id === job.acceptedQuoteId)
  const openQuotes = quotes.filter((q) => q.status === 'submitted')
  const noPermission = (
    <StepCard
      tone="waiting"
      title="Waiting for the landlord"
      description="The landlord hasn’t given you permission for this step."
    />
  )

  switch (job.status) {
    case 'reported':
      return can('approve_repairs') ? (
        <ApproveStep job={job} reporterName={reporter} />
      ) : (
        noPermission
      )
    case 'approved':
      if (!can('instruct_trades')) return noPermission
      return <FindTradeStep job={job} property={property} />
    case 'quoting':
      if (accepted) {
        return can('instruct_trades') ? (
          <InstructStep job={job} trade={trade} quote={accepted} tenantName={tenantName} />
        ) : (
          noPermission
        )
      }
      // Once the trade they asked has quoted, it's there to look at: no longer waiting.
      if (job.tradeId && openQuotes.length === 0) {
        return (
          <>
            <StepCard
              tone="waiting"
              title={`Waiting for ${tradeName}’s quote`}
              description={`You asked ${business} to quote. When it arrives you can accept it below, then give them the go-ahead.`}
            />
            {job.urgency === 'emergency' && can('instruct_trades') ? (
              <InstructStep job={job} trade={trade} quote={undefined} tenantName={tenantName} />
            ) : null}
          </>
        )
      }
      return openQuotes.length > 0 ? (
        <StepCard
          title={
            openQuotes.length === 1 ? 'A quote to look at' : `Compare ${openQuotes.length} quotes`
          }
          description={`Look at what each covers, when they can start and what others say about them. Accept one to choose that trade.${job.board?.closesAt ? ` Quotes close ${formatLongDay(job.board.closesAt)}.` : ''}`}
          actions={
            <Button
              onClick={() =>
                reveal(document.getElementById('quotes-heading'), { block: 'start', focus: true })
              }
            >
              See the quotes
            </Button>
          }
        />
      ) : (
        <StepCard
          tone="waiting"
          title="Out for quotes"
          description={`On the job board${job.board?.closesAt ? ` until ${formatLongDay(job.board.closesAt)} at ${formatClock(job.board.closesAt)}` : ''}. Trades see the area, never the address. We’ll tell you as each quote arrives.`}
        />
      )
    case 'instructed':
      return (
        <StepCard
          tone="waiting"
          title={`${tradeName} will book a visit`}
          description={`${business} has the go-ahead. They’ll book a time${tenantName ? ` and ${tenantName} gets` : ', and the tenant gets'} at least 48 hours’ written notice. If you’ve agreed a time already, you can book it yourself.`}
          actions={
            can('instruct_trades') ? (
              <Button
                variant="secondary"
                iconStart={<CalendarPlusIcon weight="bold" aria-hidden />}
                onClick={() => setBooking(true)}
              >
                Book the visit
              </Button>
            ) : null
          }
        >
          <BookVisitDialog
            job={job}
            trade={trade}
            tenantName={tenantName}
            open={booking}
            onOpenChange={setBooking}
          />
        </StepCard>
      )
    case 'booked': {
      const visit = job.visits.find((v) => v.status === 'booked')
      return (
        <StepCard
          tone="waiting"
          title="Visit booked"
          description={
            visit
              ? `${tradeName} visits ${formatLongDay(visit.startsAt)} from ${formatClock(visit.startsAt)} to ${formatClock(visit.endsAt)}. ${tenantName ?? 'The tenant'} has written notice.`
              : undefined
          }
        />
      )
    }
    case 'in_progress':
      return (
        <StepCard
          tone="waiting"
          title={`${tradeName} is there now`}
          description="When they mark the work done, you’ll be asked to confirm it."
        />
      )
    case 'completed':
      return can('approve_repairs') ? (
        <ConfirmStep job={job} trade={trade} quote={accepted} tenantName={tenantName} />
      ) : (
        noPermission
      )
    case 'confirmed': {
      const task = ratingTask
      const owes = task && task.status !== 'submitted'
      return (
        <StepCard
          tone={owes ? 'now' : 'done'}
          title={owes ? `Rate ${tradeName}` : 'Done'}
          description={
            owes
              ? `How did ${business} do? ${task.counterpartHasRated ? `${tradeName} has already rated you. Leave yours to see what they said.` : 'Both ratings are revealed together.'} Closes ${formatDate(task.closesAt)}.`
              : `Confirmed ${job.landlordConfirmedAt ? formatDate(job.landlordConfirmedAt) : ''}.${task?.status === 'submitted' ? ` You rated ${tradeName}; both sides’ ratings are revealed together.` : ''}`
          }
          actions={
            owes && job.tradeId ? (
              <Link
                to={rateHref(job.id, 'job', job.tradeId)}
                className={buttonVariants({ variant: 'primary' })}
              >
                Rate {tradeName}
              </Link>
            ) : null
          }
        />
      )
    }
    case 'declined':
    case 'cancelled': {
      const stop = [...job.timeline]
        .reverse()
        .find((e) => e.kind === 'declined' || e.kind === 'cancelled')
      const reason =
        stop && (stop.kind === 'declined' || stop.kind === 'cancelled') ? stop.reason : undefined
      return (
        <StepCard
          tone="done"
          eyebrow="Closed"
          title={job.status === 'declined' ? 'Declined' : 'Cancelled'}
          description={reason ? `“${reason}”` : undefined}
        />
      )
    }
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  )
}

function WhatWasReported({ data, people }: { data: JobData; people: People }) {
  const h = useJobHeadings()
  const { job, property } = data
  const reporter = people.get(job.reportedById)
  // Someone in the landlord's account who isn't the landlord is their letting agent.
  const reporterRole =
    job.reportedAs === 'landlord' && property && job.reportedById !== property.landlordId
      ? 'letting agent'
      : ROLE_LABELS[job.reportedAs].toLowerCase()
  return (
    <Section title="What was reported" headingLevel={h.section} size="small" id="details">
      <p className="max-w-prose text-body-l whitespace-pre-line text-ink">{job.description}</p>
      {job.photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos">
          {job.photos.map((photo) => (
            <li key={photo.id}>
              <PhotoTile image={photo} />
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label="Reported by">
          {reporter ? `${reporter.displayName} (${reporterRole})` : ROLE_LABELS[job.reportedAs]}
          <span className="block text-small text-muted">
            {formatLongDay(job.createdAt)}, {formatClock(job.createdAt)}
          </span>
        </Fact>
        <Fact label="Where and what">
          {ROOM_LABELS[job.room]} · {JOB_CATEGORY_LABELS[job.category]}
        </Fact>
        {job.access.windows.length > 0 ? (
          <Fact label="Good times to visit">
            <ul className="flex flex-col">
              {job.access.windows.map((w) => (
                <li key={`${w.date}-${w.slot}`}>
                  {formatLongDay(w.date)}, {ACCESS_SLOT_LABELS[w.slot].toLowerCase()}
                </li>
              ))}
            </ul>
          </Fact>
        ) : null}
        {job.access.keyAllowed || job.access.notes ? (
          <Fact label="Access">
            <span className="flex items-start gap-1.5">
              <KeyIcon weight="bold" aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
              <span>
                {job.access.keyAllowed ? 'A key can be used. ' : ''}
                {job.access.notes ? `“${job.access.notes}”` : ''}
              </span>
            </span>
          </Fact>
        ) : null}
      </dl>
    </Section>
  )
}

function TenantView({ data, people }: { data: JobData; people: People }) {
  const h = useJobHeadings()
  const { job, tenancy, accessGiven } = data
  if (!tenancy || !['completed', 'confirmed'].includes(job.status)) return null
  const tenant = firstName(people.get(tenancy.tenantIds[0]!)?.displayName ?? 'Your tenant')
  return (
    <Section title={`What ${tenant} thinks of this repair`} headingLevel={h.section} size="small">
      <div className="flex items-start gap-3 rounded-card border border-dashed border-input-border bg-surface-2 p-4">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-soft"
        >
          <LockSimpleIcon weight="bold" className="size-5" />
        </span>
        <p className="text-body text-ink">
          Tenants can rate how a repair was handled, but you never see one tenant’s rating on its
          own. It stays sealed and only counts inside your overall score, at the end of the tenancy
          or once {RATING_RULES.shieldReleaseTenantRaters} different tenants have rated you. That
          way nobody has to worry about rating the landlord they live with.{' '}
          <Link to="/landlord/ratings" className="font-semibold text-accent-text underline">
            Your overall score
          </Link>
        </p>
      </div>
      {accessGiven !== null ? (
        <p className="text-small text-ink">
          <span className="font-semibold">Access given as arranged:</span>{' '}
          {accessGiven ? 'Yes' : 'No'}
          <span className="text-muted">
            {' '}
            · from the trade’s rating. It’s the only part you see.
          </span>
        </p>
      ) : null}
    </Section>
  )
}

function TradePanel({ data, people }: { data: JobData; people: People }) {
  const h = useJobHeadings()
  const [profile, setProfile] = useState(false)
  const { job, scores, property } = data
  if (!job.tradeId) return null
  const trade = people.get(job.tradeId)
  const score = scores.get(job.tradeId)
  return (
    <Section title="The trade" headingLevel={h.section} size="small">
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
        <div>
          <p className="font-semibold text-ink">
            {trade?.tradeProfile?.businessName ?? trade?.displayName}
          </p>
          <p className="text-small text-muted">{trade?.displayName}</p>
        </div>
        {score ? <TradeScoreHalves score={score} /> : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Button variant="secondary" size="sm" onClick={() => setProfile(true)}>
            Reviews and profile
          </Button>
          <ReviewPolicyLink />
        </div>
      </div>
      <TradeProfileSheet
        tradeId={profile ? job.tradeId : null}
        district={property?.postcodeDistrict}
        onOpenChange={setProfile}
      />
    </Section>
  )
}

function Conversation({ data }: { data: JobData }) {
  const h = useJobHeadings()
  const { thread } = data
  if (!thread) return null
  return (
    <Section title="Conversation" headingLevel={h.section} size="small">
      <Link
        to={`/landlord/messages/${thread.thread.id}`}
        className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 no-underline shadow-soft transition-shadow hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
        >
          <ChatsCircleIcon weight="duotone" className="size-5.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold text-ink">
            {thread.unreadCount > 0
              ? `${thread.unreadCount} new ${thread.unreadCount === 1 ? 'message' : 'messages'}`
              : 'Messages about this repair'}
          </span>
          {thread.lastMessage ? (
            <span className="line-clamp-2 text-small text-muted">{thread.lastMessage.body}</span>
          ) : null}
        </span>
        <ArrowRightIcon
          weight="bold"
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </Section>
  )
}

function CancelJob({ data, onCancelled }: { data: JobData; onCancelled?: () => void }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const can = usePermissions()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  if (!CANCELLABLE.has(data.job.status) || !can('approve_repairs')) return null

  async function cancel() {
    if (reason.trim().length < 3) return setError('Say why, so the tenant and any trades know.')
    setBusy(true)
    try {
      await api.cancelJob(viewer, data.job.id, reason)
      toast.success('Repair cancelled', { description: 'Everyone involved has been told why.' })
      setOpen(false)
      onCancelled?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-line pt-4">
      <Button
        variant="ghost"
        iconStart={<XCircleIcon weight="bold" aria-hidden />}
        onClick={() => setOpen(true)}
      >
        Cancel this repair
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Cancel this repair?"
          description="Any booked visit is cancelled, open quotes are closed, and everyone involved is told your reason. This can’t be undone."
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Keep it
              </Button>
              <Button variant="danger-solid" loading={busy} onClick={cancel}>
                Cancel repair
              </Button>
            </>
          }
        >
          <Textarea
            label="Reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(undefined)
            }}
            maxLength={500}
            showCount
            rows={3}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export interface JobDetailProps {
  jobId: JobId
  /** 'page' adds the page heading; 'drawer' sits under the drawer's own title. */
  variant: 'page' | 'drawer'
  header?: (data: JobData, people: People) => ReactNode
}

export function useJobDetail(jobId: JobId) {
  const query = useJobData(jobId)
  const people = usePeople(peopleOnJob(query.state.data))
  return { ...query, people: people.state.data }
}

export function JobDetail({ jobId, variant, header }: JobDetailProps) {
  const { state, refresh, people } = useJobDetail(jobId)
  const data = state.data
  const can = usePermissions()
  const { hash } = useLocation()
  const ready = Boolean(data && people)

  // Links such as "Compare quotes" open the page at that part (#quotes, #payment).
  useEffect(() => {
    if (!ready || !hash) return
    return revealLater(hash.slice(1), 120)
  }, [ready, hash])

  // When a step is done, the button that did it goes with it and focus would drop to the top of
  // the page. Move it to the new next step instead, but only when focus was lost that way, so an
  // update from someone else never pulls focus away from what the landlord is doing.
  const container = useRef<HTMLDivElement>(null)
  const status = data?.job.status
  const shownStatus = useRef(status)
  useEffect(() => {
    const before = shownStatus.current
    shownStatus.current = status
    if (!before || !status || before === status) return
    const timer = window.setTimeout(() => {
      const active = document.activeElement
      if (active && active !== document.body) return
      reveal(container.current?.querySelector('[data-step-heading]'), {
        block: 'nearest',
        focus: true,
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [status])

  const missing = data === null || (state.status === 'error' && !data && isMissing(state.error))
  if (state.status === 'error' && !data && !missing)
    return <ErrorPanel error={state.error} onRetry={refresh} />
  if (missing) {
    const back = (
      <Link to="/landlord/repairs" className={buttonVariants({ variant: 'primary' })}>
        Back to repairs
      </Link>
    )
    const description =
      'It may be on a home that isn’t in this account, or the demo data may have been reset.'
    // On its own page this is the page's heading; in the drawer it sits under the drawer's title.
    return variant === 'page' ? (
      <PageHeader
        back={{ to: '/landlord/repairs', label: 'Repairs' }}
        title="We couldn’t find that repair"
        description={description}
        actions={back}
      />
    ) : (
      <EmptyState
        icon={WrenchIcon}
        title="We couldn’t find that repair"
        description={description}
        action={back}
      />
    )
  }
  if (!data || !people) return <PageSkeleton label="Loading the repair" />

  const { job, quotes, property } = data
  const accepted = quotes.find((q) => q.id === job.acceptedQuoteId)
  const showQuotes = quotes.length > 0 || (job.status === 'quoting' && !job.tradeId)
  // Two or more quotes to weigh up get the page's full width, so they sit side by side with room
  // to read; the progress moves below them.
  const comparing =
    job.status === 'quoting' &&
    !job.acceptedQuoteId &&
    quotes.filter((q) => q.status === 'submitted').length >= 2
  const wide = variant === 'page' && !comparing
  const h = variant === 'page' ? ({ section: 'h2' } as const) : ({ section: 'h3' } as const)

  return (
    <JobHeadingLevel.Provider value={variant === 'page' ? 2 : 3}>
      <div ref={container} className="flex flex-col gap-6">
        {header?.(data, people)}
        <div
          className={cn(
            'flex flex-col gap-8',
            wide && 'lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10',
          )}
        >
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-4">
              <NextStep data={data} people={people} />
            </div>
            {showQuotes ? (
              <Section
                id="quotes"
                title="Quotes"
                headingLevel={h.section}
                size="small"
                description={
                  job.acceptedQuoteId
                    ? `You accepted ${accepted ? formatPence(accepted.totalPence) : 'a quote'}.`
                    : 'Prices include VAT where the trade charges it.'
                }
              >
                <QuotesCompare
                  job={job}
                  quotes={quotes}
                  scores={data.scores}
                  people={people}
                  canDecide={can('accept_quotes')}
                />
              </Section>
            ) : null}
            {job.visits.length > 0 ? (
              <Section title="Visits" headingLevel={h.section} size="small">
                <VisitList job={job} trade={job.tradeId ? people.get(job.tradeId) : undefined} />
              </Section>
            ) : null}
            {job.payment ? (
              <Section id="payment" title="Invoice" headingLevel={h.section} size="small">
                <PaymentCard job={job} trade={job.tradeId ? people.get(job.tradeId) : undefined} />
              </Section>
            ) : job.status === 'confirmed' && (accepted || job.completion?.finalPricePence) ? (
              <Section title="Cost" headingLevel={h.section} size="small">
                <PriceCheck job={job} quote={accepted} />
              </Section>
            ) : null}
            <TenantView data={data} people={people} />
            <WhatWasReported data={data} people={people} />
            {/* Below the side column's breakpoint, the trade and progress come before the
              conversation rather than after everything. */}
            <div className={cn('flex flex-col gap-8', wide && 'lg:hidden')}>
              <TradePanel data={data} people={people} />
              <Section title="Progress" headingLevel={h.section} size="small">
                <JobProgress job={job} people={people} />
              </Section>
            </div>
            <Conversation data={data} />
            <CancelJob data={data} />
          </div>
          {wide ? (
            <aside
              className="flex flex-col gap-8 max-lg:hidden lg:sticky lg:top-28"
              aria-label="About this repair"
            >
              {property ? (
                <Link
                  to={`/landlord/homes/${property.id}`}
                  className="flex flex-col gap-0.5 rounded-card border border-line bg-surface p-4 no-underline shadow-soft hover:shadow-raised"
                >
                  <span className="text-small text-muted">Home</span>
                  <span className="font-semibold text-ink">{placeOf(property)}</span>
                  <span className="text-small text-muted">{property.postcode}</span>
                </Link>
              ) : null}
              <TradePanel data={data} people={people} />
              <Section title="Progress" headingLevel={h.section} size="small">
                <JobProgress job={job} people={people} />
              </Section>
            </aside>
          ) : null}
        </div>
      </div>
    </JobHeadingLevel.Provider>
  )
}

/** Status, urgency and when, under the job's title. */
export function JobMeta({ data }: { data: JobData }) {
  const { job } = data
  const now = useDemoNow()
  return (
    <>
      <JobStatusBadge status={job.status} size="md" />
      <UrgencyBadge urgency={job.urgency} size="md" />
      <span className="text-small text-muted">Reported {formatShortDate(job.createdAt, now)}</span>
    </>
  )
}
