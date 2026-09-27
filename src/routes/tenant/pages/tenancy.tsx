// The tenancy: the home, the landlord, key dates, the deposit, the agreement and the safety
// certificates the landlord has shared (with their expiry in words and days), and the
// end-of-tenancy rating when it's due. /tenant/tenancies shows the current one.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ChatsCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
  HouseLineIcon,
  InfoIcon,
  LockSimpleIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import type { SlateApi, Viewer } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { RELATIONSHIPS } from '@/domain/criteria'
import { isId } from '@/domain/ids'
import {
  DOCUMENT_TYPE_INFO,
  LETTING_RULES,
  type DocumentRecord,
  type DocumentStatus,
  type TenancyId,
} from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { ComplianceCalendarRow, ComplianceTable } from '@/components/slate/compliance-calendar'
import { DocumentCard } from '@/components/slate/document-card'
import { DOCUMENT_ICONS } from '@/components/slate/document-meta'
import { daysBetween, formatDate, formatMonthYear, plural } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { SealedReviewCard } from '@/components/slate/review-card'
import { BRAND } from '@/config/brand'
import { NotFound, PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QueryError, ReviewPolicyLink, Section } from '../components/basics'
import { DepositCard, LandlordRow } from '../components/home-card'
import { RatingTaskCard } from '../components/rating-task-card'
import {
  loadHomes,
  loadPeople,
  ratingFor,
  taskFor,
  upcomingVisit,
  type TenantHome,
} from '../lib/data'
import { firstName, ordinal, pounds, ukDate } from '../lib/format'

const PAPERWORK: readonly DocumentRecord['type'][] = ['tenancy_agreement', 'inventory']

function statusOf(
  document: DocumentRecord,
  today: string,
  bookedFor?: string,
): { status: DocumentStatus; daysLeft: number | null } {
  if (!document.expiresAt) return { status: 'OK', daysLeft: null }
  const daysLeft = daysBetween(today, document.expiresAt)
  // A lapse is never hidden behind a booking; a renewal booked before then says so.
  if (daysLeft < 0) return { status: 'EXPIRED', daysLeft }
  if (bookedFor) return { status: 'BOOKED', daysLeft }
  if (daysLeft <= LETTING_RULES.documentDueSoonDays) return { status: 'DUE_SOON', daysLeft }
  return { status: 'OK', daysLeft }
}

async function loadTenancyPage(api: SlateApi, viewer: Viewer, tenancyId: TenancyId | null) {
  const homes = await loadHomes(api, viewer)
  const home = tenancyId
    ? homes.find((h) => h.tenancy.id === tenancyId)
    : (homes.find((h) => h.tenancy.status === 'confirmed') ??
      homes.find((h) => h.tenancy.status === 'proposed'))
  if (!home) return { home: null, homes }
  const context = { kind: 'tenancy', tenancyId: home.tenancy.id } as const
  const [documents, tasks, ratings, threads, people, jobs] = await Promise.all([
    api.listDocuments(viewer, { propertyId: home.property.id }),
    api.listRatingTasks(viewer),
    api.listMyRatings(viewer),
    api.listThreads(viewer),
    loadPeople(api, viewer, [...home.tenancy.tenantIds, ...home.property.agentIds]),
    api.listJobs(viewer, { propertyId: home.property.id }),
  ])
  // Certificate renewals with a visit booked, e.g. the EICR, by document type.
  const booked = new Map<string, string>()
  for (const job of jobs) {
    const visit = upcomingVisit(job)
    if (job.complianceType && visit) booked.set(job.complianceType, ukDate(visit.startsAt))
  }
  return {
    home,
    homes,
    documents: documents.filter((d) => !d.tenancyId || d.tenancyId === home.tenancy.id),
    task: taskFor(tasks, 'tenant->landlord', context) ?? null,
    rating: ratingFor(ratings, 'tenant->landlord', context) ?? null,
    threadId:
      threads.find(
        (t) =>
          t.thread.context.kind === 'tenancy' && t.thread.context.tenancyId === home.tenancy.id,
      )?.thread.id ?? null,
    people,
    booked,
  }
}

/** /tenant/tenancies (the current home) and /tenant/tenancies/:tenancyId */
export function TenancyPage() {
  const { tenancyId } = useParams()
  const viewer = useViewer()
  const wanted = isId('tenancy', tenancyId) ? tenancyId : null
  const { state, refresh } = useSlateQuery(
    (api) => loadTenancyPage(api, viewer, wanted),
    [viewer, wanted],
  )

  if (tenancyId && !wanted) return <NotFound />
  if (state.status === 'loading') {
    return (
      <PortalPage title="Your home">
        <LoadingRegion label="Loading your tenancy" className="flex flex-col gap-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-48 w-full rounded-card" />
              <Skeleton className="h-72 w-full rounded-card" />
            </div>
            <Skeleton className="h-96 w-full rounded-card" />
          </div>
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Your home">
        <PageHeader title="Your home" />
        <QueryError what="your tenancy" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data.home) {
    if (wanted) return <NotFound />
    return (
      <PortalPage title="Your home">
        <PageHeader title="Your home" />
        <EmptyState
          icon={HouseLineIcon}
          headingLevel="h2"
          title={state.data.homes.length ? 'No current tenancy' : 'No tenancy here yet'}
          description="When your landlord adds your tenancy, it appears here for you to check and confirm. Then you’ll see your documents and key dates."
        />
        {state.data.homes.length ? (
          <OtherHomes homes={state.data.homes} title="Your past homes" />
        ) : null}
      </PortalPage>
    )
  }
  return <TenancyView data={state.data as TenancyData} onChanged={refresh} />
}

type TenancyData = Extract<Awaited<ReturnType<typeof loadTenancyPage>>, { documents: unknown }>

function TenancyView({ data, onChanged }: { data: TenancyData; onChanged: () => void }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const navigate = useNavigate()
  const now = useDemoNow()
  const today = ukDate(now)
  const [viewing, setViewing] = useState<DocumentRecord | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { home, homes, documents, task, rating, threadId, people, booked } = data
  const { tenancy, property } = home
  const current = tenancy.status === 'confirmed'
  const needsMyConfirmation =
    tenancy.status === 'proposed' &&
    !tenancy.confirmations.some((c) => c.side === 'tenant' && c.personId === viewer.personId)
  const others = tenancy.tenantIds
    .filter((id) => id !== viewer.personId)
    .map((id) => people.get(id))
    .filter(Boolean)
  const agents = property.agentIds.map((id) => people.get(id)).filter(Boolean)
  const paperwork = documents.filter((d) => PAPERWORK.includes(d.type))
  const certificates = documents
    .filter((d) => !PAPERWORK.includes(d.type))
    .map((document) => ({
      document,
      bookedFor: booked.get(document.type),
      ...statusOf(document, today, booked.get(document.type)),
    }))
    .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999))
  const pastHomes = homes.filter((h) => h.tenancy.id !== tenancy.id)

  async function confirm() {
    setConfirming(true)
    try {
      await api.confirmTenancy(viewer, tenancy.id)
      toast.success('Tenancy confirmed', {
        description: 'You can now report repairs and message your landlord here.',
      })
      onChanged()
    } catch (error) {
      toast.error('That didn’t go through', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setConfirming(false)
    }
  }

  async function openThread() {
    try {
      const thread = await api.getThreadFor(viewer, { kind: 'tenancy', tenancyId: tenancy.id })
      navigate(`/tenant/messages/${thread.id}`)
    } catch {
      toast.error('We couldn’t open the conversation. Try again.')
    }
  }

  const keyDates: { label: string; value: string }[] = [
    { label: 'Tenancy began', value: formatDate(tenancy.startDate) },
    ...(tenancy.endDate ? [{ label: 'Tenancy ended', value: formatDate(tenancy.endDate) }] : []),
    { label: 'Rent', value: `${pounds(tenancy.rentPencePerMonth)} a month` },
    { label: 'Rent due', value: `The ${ordinal(tenancy.rentDueDay)} of each month` },
    ...(tenancy.deposit
      ? [{ label: 'Deposit lodged', value: formatDate(tenancy.deposit.lodgedOn) }]
      : []),
    { label: 'Kind of tenancy', value: 'Private residential tenancy (Scotland)' },
  ]

  return (
    <PortalPage title={current ? 'Your home' : property.addressLine}>
      <PageHeader
        back={current ? undefined : { to: '/tenant/tenancies', label: 'Your home' }}
        eyebrow={`${property.neighbourhood}, ${property.city} ${property.postcode}`}
        title={property.addressLine}
        meta={
          current ? (
            <Badge tone="positive" icon={<CheckCircleIcon weight="bold" aria-hidden />}>
              Your home now
            </Badge>
          ) : tenancy.status === 'proposed' ? (
            <Badge tone="caution" icon={<InfoIcon weight="bold" aria-hidden />}>
              Waiting to be confirmed
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<LockSimpleIcon weight="bold" aria-hidden />}>
              Ended {tenancy.endDate ? formatMonthYear(tenancy.endDate) : ''}
            </Badge>
          )
        }
      />

      {needsMyConfirmation ? (
        <div className="flex flex-col gap-3 rounded-card border border-[color-mix(in_oklab,var(--accent),transparent_70%)] bg-accent-tint p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-body-l font-semibold text-ink">Is this right?</p>
            <p className="text-small text-ink">
              Check the dates and rent below. Confirming means you and your landlord can rate each
              other when it ends.
            </p>
          </div>
          <Button loading={confirming} onClick={confirm}>
            Confirm my tenancy
          </Button>
        </div>
      ) : null}

      {(task && task.status !== 'submitted') || rating ? (
        <Section id="end-rating" title="End of tenancy">
          {task && task.status !== 'submitted' ? (
            <RatingTaskCard
              task={task}
              subjectName={home.landlord?.displayName ?? 'your landlord'}
              about="How the whole tenancy went"
              now={now}
            />
          ) : null}
          {rating && rating.state === 'sealed' ? (
            <SealedReviewCard
              seal={rating.seal}
              raterRole="tenant"
              revealAt={rating.revealAt}
              context="Your end-of-tenancy rating"
            />
          ) : null}
          {rating && rating.state === 'revealed' ? (
            <Link
              to={`/tenant/reviews/${rating.id}`}
              className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-accent-text underline underline-offset-4"
            >
              <CheckCircleIcon weight="fill" aria-hidden className="size-5 text-positive" />
              Your end-of-tenancy review is published
            </Link>
          ) : null}
          <ReviewPolicyLink />
        </Section>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <Section id="key-dates" title="Tenancy details">
            <dl className="grid grid-cols-1 gap-x-6 rounded-card border border-line bg-surface px-4 shadow-soft sm:grid-cols-2 sm:px-5">
              {keyDates.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-0.5 border-b border-line py-3.5 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                >
                  <dt className="text-small text-muted">{row.label}</dt>
                  <dd className="figures font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            id="agreement"
            title="Your agreement"
            description={
              paperwork.length ? 'Shared by your landlord. Open one to see its details.' : undefined
            }
          >
            {paperwork.length === 0 ? (
              <p className="rounded-card border border-dashed border-line p-4 text-small text-muted">
                {current
                  ? 'Nothing shared yet. Your landlord must give you a written tenancy agreement. Ask them for it in your messages.'
                  : `Your landlord didn’t share the agreement on ${BRAND.name}.`}
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paperwork.map((document) => {
                  const Glyph = DOCUMENT_ICONS[document.type]
                  return (
                    <li key={document.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setViewing(document)
                          setViewOpen(true)
                        }}
                        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-soft transition-[box-shadow,translate] duration-(--duration-base) hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-tint text-accent-text"
                        >
                          <Glyph weight="duotone" className="size-6" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="font-semibold text-ink">{document.title}</span>
                          <span className="text-small text-muted">
                            Dated {formatDate(document.issuedAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
          {current && !task && !rating ? (
            <WhenYouMoveOut landlordName={home.landlord?.displayName ?? null} />
          ) : null}
        </div>

        <aside aria-label="Landlord and deposit" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
            <LandlordRow
              landlord={home.landlord}
              score={home.score}
              registrationVerified={home.registrationVerified}
            />
            {agents.length > 0 ? (
              <p className="text-small text-muted">
                Managed with {agents.map((agent) => agent!.displayName).join(', ')},{' '}
                {agents.length === 1 ? 'a letting agent' : 'letting agents'}.
              </p>
            ) : null}
            {others.length > 0 ? (
              <p className="flex items-center gap-2 text-small text-ink">
                <UsersIcon weight="bold" aria-hidden className="size-4 shrink-0 text-muted" />
                Joint tenancy with {others.map((person) => person!.displayName).join(', ')}
              </p>
            ) : null}
            {current || threadId ? (
              <Button
                variant="soft"
                iconStart={<ChatsCircleIcon weight="bold" aria-hidden />}
                onClick={threadId ? () => navigate(`/tenant/messages/${threadId}`) : openThread}
              >
                Message {home.landlord ? firstName(home.landlord.displayName) : 'your landlord'}
              </Button>
            ) : null}
          </div>
          <DepositCard tenancy={tenancy} />
        </aside>
      </div>
      <Section
        id="certificates"
        title="Safety certificates"
        description={
          certificates.length
            ? 'What your landlord has shared. They must have the gas checked every year and the electrics every 5 years.'
            : undefined
        }
      >
        {certificates.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-4 text-small text-muted">
            {current
              ? 'None shared with you yet. Your landlord must give you the gas safety record, electrical safety report (EICR) and energy certificate (EPC). Ask them in your messages.'
              : `Your landlord didn’t share any certificates on ${BRAND.name}.`}
          </p>
        ) : (
          <div className="rounded-card border border-line bg-surface p-2 shadow-soft sm:p-3">
            <ComplianceTable caption="Certificates for your home" hideCaption>
              {certificates.map(({ document, status, daysLeft, bookedFor }) => (
                <ComplianceCalendarRow
                  key={document.id}
                  item={{ type: document.type, status, daysLeft, document, bookedFor }}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      // On phones the rows stack, so the word lines up with the text above it.
                      className="max-sm:-ml-2 max-sm:px-2"
                      onClick={() => {
                        setViewing(document)
                        setViewOpen(true)
                      }}
                    >
                      Details
                      <span className="sr-only">
                        {' '}
                        of the {DOCUMENT_TYPE_INFO[document.type].label}
                      </span>
                    </Button>
                  }
                />
              ))}
            </ComplianceTable>
          </div>
        )}
        {certificates.some((c) => c.status === 'EXPIRED' || c.status === 'DUE_SOON') ? (
          <p className="flex items-start gap-2 text-small text-ink">
            <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            Something due soon or out of date? We remind your landlord too. If they book a check,
            you’ll get written notice first.
          </p>
        ) : null}
      </Section>

      {pastHomes.length > 0 ? <OtherHomes homes={pastHomes} /> : null}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        {viewing ? (
          <DialogContent title={viewing.title} description="Shared with you by your landlord.">
            <div className="flex flex-col gap-4">
              <DocumentCard
                type={viewing.type}
                {...statusOf(viewing, today, booked.get(viewing.type))}
                bookedFor={booked.get(viewing.type)}
                document={viewing}
                headingLevel="h3"
              />
              <p className="flex items-center gap-2 rounded-control bg-surface-2 p-3 text-small text-muted">
                <FileTextIcon weight="bold" aria-hidden className="size-4 shrink-0" />
                {viewing.file.name}
                {viewing.file.sizeBytes ? ` · ${Math.round(viewing.file.sizeBytes / 1024)} KB` : ''}
                . This demo has no real files to open.
              </p>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </PortalPage>
  )
}

/** What happens at the end: the only time a landlord rates the tenant, double-blind. */
function WhenYouMoveOut({ landlordName }: { landlordName: string | null }) {
  const name = landlordName ? firstName(landlordName) : 'your landlord'
  const days = RELATIONSHIPS['tenant->landlord'].occasions[0].windowDays
  return (
    <Section id="move-out" title="When you move out">
      <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
        >
          <ArrowsLeftRightIcon weight="bold" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-2 text-small text-ink">
          <p>
            You and {name} rate each other within {days} days of the tenancy ending. Neither of you
            sees the other’s answers until you’ve both rated or the {days} days are up.
          </p>
          <p className="text-muted">
            Your rating of {name} is public on their profile. Theirs of you goes into your{' '}
            <Link to="/tenant/passport" className="font-semibold text-accent-text underline">
              tenant passport
            </Link>
            , which only you can share.
          </p>
        </div>
      </div>
    </Section>
  )
}

function OtherHomes({
  homes,
  title = 'Your other homes',
}: {
  homes: TenantHome[]
  title?: string
}) {
  return (
    <section aria-labelledby="other-homes-title" className="flex flex-col gap-3">
      <h2 id="other-homes-title" className="font-display text-display-m font-semibold text-ink">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {homes.map((home) => (
          <li key={home.tenancy.id}>
            <Link
              to={`/tenant/tenancies/${home.tenancy.id}`}
              className={cn(
                'flex flex-col gap-0.5 rounded-card border border-line bg-surface p-4 no-underline shadow-soft transition-shadow duration-(--duration-base) hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
            >
              <span className="font-semibold text-ink">{home.property.addressLine}</span>
              <span className="text-small text-muted">
                {home.property.neighbourhood} · {formatMonthYear(home.tenancy.startDate)} to{' '}
                {home.tenancy.endDate ? formatMonthYear(home.tenancy.endDate) : 'now'}
                {home.tenancy.endDate
                  ? ` · ${plural(Math.max(1, Math.round(daysBetween(home.tenancy.startDate, home.tenancy.endDate) / 30.4)), 'month')}`
                  : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/tenant/passport"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start')}
      >
        See what past landlords said in your passport
        <ArrowRightIcon weight="bold" aria-hidden />
      </Link>
    </section>
  )
}
