// One home: its details and EPC, the tenancy and deposit, certificates, repair history, and what
// tenants say about it (the property sub-score, from "Home matched the advert and was safe").

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  HouseLineIcon,
  PlusIcon,
  VaultIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery, type ActionItem } from '@/data'
import {
  DEPOSIT_SCHEME_LABELS,
  EPC_BANDS,
  PROPERTY_TYPE_LABELS,
  type EpcBand,
  type Job,
  type PersonCard,
  type PersonId,
  type PropertyId,
  type Tenancy,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { ScoreSummary } from '@/components/slate/score-summary'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ComplianceManager } from '../components/compliance'
import { HomeArt } from '../components/home-art'
import { JobStatusBadge } from '../components/job-status'
import { NewJobDialog } from '../components/new-job-dialog'
import { ReviewItem, ReviewPolicyLink } from '../components/review-item'
import { Section } from '../components/section'
import { ErrorPanel, PageSkeleton } from '../components/states'
import { isMissing } from '../lib/errors'
import { useAccountId, usePeople, usePermissions } from '../lib/data'
import { revealLater } from '../lib/dom'
import { firstName, flatOf, formatPounds, ordinal, streetOf } from '../lib/format'
import { actionsByJob, actionText, byLatest, isOpen, waitingText } from '../lib/jobs'
import { formatShortDate } from '../lib/time'

/** What a repair is waiting for, in the same words as the repairs list. */
function NextOnJob({
  action,
  job,
  people,
}: {
  action: ActionItem | undefined
  job: Job
  people: ReadonlyMap<PersonId, PersonCard>
}) {
  return action ? (
    <span className="text-small font-semibold text-accent-text">{actionText(action, people)}</span>
  ) : (
    <span className="text-small text-muted">{waitingText(job, people)}</span>
  )
}

function EpcScale({ band }: { band: EpcBand }) {
  return (
    <div className="flex flex-col gap-1.5">
      <ol className="flex gap-1" aria-label={`EPC band ${band}, on a scale from A (best) to G`}>
        {EPC_BANDS.map((b) => (
          <li
            key={b}
            aria-current={b === band ? 'true' : undefined}
            className={cn(
              'flex h-8 flex-1 items-center justify-center rounded-md text-small font-bold',
              b === band
                ? 'bg-accent text-on-accent ring-2 ring-accent-strong ring-offset-2 ring-offset-surface'
                : 'bg-surface-2 text-muted',
            )}
          >
            {b}
          </li>
        ))}
      </ol>
      <p className="text-caption text-muted">A is the most efficient, G the least.</p>
    </div>
  )
}

function TenancyCard({
  tenancy,
  people,
  label,
}: {
  tenancy: Tenancy
  people: ReadonlyMap<PersonId, PersonCard>
  label: string
}) {
  const tenants = tenancy.tenantIds
    .map((id) => people.get(id))
    .filter((p): p is PersonCard => Boolean(p))
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-small font-semibold text-muted">{label}</p>
        <Link
          to={`/landlord/tenancies/${tenancy.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          Tenancy details
          <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
        </Link>
      </div>
      <ul className="flex flex-wrap gap-4">
        {tenants.map((tenant) => (
          <li key={tenant.id} className="flex items-center gap-2.5">
            <Avatar
              name={tenant.displayName}
              seed={tenant.avatarSeed}
              role="tenant"
              size="md"
              decorative
            />
            <span className="font-semibold text-ink">{tenant.displayName}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-small text-muted">Rent</dt>
          <dd className="figures text-ink">
            <span className="font-semibold">{formatPounds(tenancy.rentPencePerMonth)}</span> a month
            <span className="block text-small text-muted">
              Due on the {ordinal(tenancy.rentDueDay)} of the month
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-small text-muted">
            {tenancy.status === 'proposed' ? 'Starts' : 'Since'}
          </dt>
          <dd className="figures text-ink">{formatDate(tenancy.startDate)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-small text-muted">Deposit</dt>
          <dd className="text-ink">
            {tenancy.deposit ? (
              <>
                <span className="figures font-semibold">
                  {formatPounds(tenancy.deposit.amountPence)}
                </span>
                <span className="flex items-start gap-1.5 text-small text-muted">
                  <VaultIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
                  Held by {DEPOSIT_SCHEME_LABELS[tenancy.deposit.scheme]}, lodged{' '}
                  {formatDate(tenancy.deposit.lodgedOn)}
                </span>
              </>
            ) : (
              <span className="text-muted">Not recorded yet</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function PropertyPage({ section }: { section?: 'documents' }) {
  const { propertyId } = useParams()
  const id = propertyId as PropertyId
  const viewer = useViewer()
  const now = useDemoNow()
  const accountId = useAccountId()
  const can = usePermissions()
  const navigate = useNavigate()
  const [raising, setRaising] = useState(false)
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const property = await api.getProperty(viewer, id)
      if (!property) return null
      const [tenancies, jobs, calendar, score, reviews, actions] = await Promise.all([
        api.listTenancies(viewer, { propertyId: id }),
        api.listJobs(viewer, { propertyId: id }),
        api.getComplianceCalendar(viewer, id),
        api.getLandlordScore(viewer, { propertyId: id }),
        api.listReviews(viewer, {
          direction: 'tenant->landlord',
          subjectId: accountId,
          propertyId: id,
        }),
        api.listActionsNeeded(viewer),
      ])
      return { property, tenancies, jobs, calendar, score, reviews, actions }
    },
    [viewer, id, accountId],
  )
  const data = state.data
  const people = usePeople([
    ...(data?.tenancies ?? []).flatMap((t) => t.tenantIds),
    ...(data?.jobs ?? []).map((job) => job.tradeId),
  ])

  // Links to /homes/:id/documents open the page at its certificates. Runs after the page has
  // scrolled to the top on arrival.
  const ready = Boolean(data)
  useEffect(() => {
    if (section !== 'documents' || !ready) return
    return revealLater('documents')
  }, [section, ready])

  const missing = data === null || (state.status === 'error' && !data && isMissing(state.error))
  if (state.status === 'error' && !data && !missing) {
    return (
      <PortalPage title="Home">
        <ErrorPanel error={state.error} onRetry={refresh} />
      </PortalPage>
    )
  }
  if (missing) {
    return (
      <PortalPage title="Home">
        <PageHeader
          back={{ to: '/landlord/homes', label: 'Homes' }}
          title="We couldn’t find that home"
          description="It isn’t in this account, or the demo data has been reset."
        />
      </PortalPage>
    )
  }
  if (!data || !people.state.data) {
    return (
      <PortalPage title="Home">
        <PageSkeleton label="Loading the home" />
      </PortalPage>
    )
  }

  const { property, tenancies, jobs, calendar, score, reviews, actions } = data
  const nextByJob = actionsByJob(actions)
  const current = tenancies.find((t) => t.status === 'confirmed')
  const upcoming = tenancies.find((t) => t.status === 'proposed')
  const past = tenancies.filter((t) => t.status === 'ended')
  const flat = flatOf(property)
  const sortedJobs = [...jobs].sort(
    (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || byLatest(a, b),
  )
  const tenantNames = people.state.data

  return (
    <PortalPage title={streetOf(property)} width="wide">
      <PageHeader
        back={{ to: '/landlord/homes', label: 'Homes' }}
        eyebrow={`${property.neighbourhood} · ${property.postcode}`}
        title={streetOf(property)}
        description={flat ?? undefined}
        actions={
          <Button
            variant="secondary"
            iconStart={<PlusIcon weight="bold" aria-hidden />}
            onClick={() => setRaising(true)}
          >
            Raise a repair
          </Button>
        }
      />
      <div
        data-role-accent="landlord"
        className="h-40 overflow-hidden rounded-card border border-line sm:h-52"
      >
        <HomeArt property={property} />
      </div>

      <nav aria-label="On this page" className="-mt-2 flex flex-wrap gap-2">
        {[
          ['#tenancy', 'Tenancy'],
          ['#documents', 'Certificates'],
          ['#repairs', 'Repairs'],
          ['#reviews', 'What tenants say'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'bg-surface-2')}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-10">
          <Section id="tenancy" title="Tenancy">
            {current ? (
              <TenancyCard tenancy={current} people={tenantNames} label="Living here now" />
            ) : null}
            {upcoming ? (
              <TenancyCard tenancy={upcoming} people={tenantNames} label="Moving in" />
            ) : null}
            {!current && !upcoming ? (
              <EmptyState
                icon={HouseLineIcon}
                title="Nobody lives here right now"
                description="When you agree a tenancy, it appears here once you and your tenants have confirmed it."
              />
            ) : null}
            {past.length > 0 ? (
              <details className="rounded-card border border-line bg-surface px-4 py-3">
                <summary className="min-h-11 content-center font-semibold text-ink">
                  Past tenancies ({past.length})
                </summary>
                <ul className="mt-2 flex flex-col divide-y divide-line">
                  {past.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/landlord/tenancies/${t.id}`}
                        className="flex min-h-11 items-center justify-between gap-3 py-2 no-underline hover:underline"
                      >
                        <span className="text-ink">
                          {t.tenantIds
                            .map((pid) => firstName(tenantNames.get(pid)?.displayName ?? 'Tenant'))
                            .join(' and ')}
                        </span>
                        <span className="figures text-small text-muted">
                          {formatDate(t.startDate)} to {t.endDate ? formatDate(t.endDate) : 'now'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Section>
        </div>

        <aside className="flex flex-col gap-6" aria-label="About the home">
          <section
            aria-labelledby="facts"
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
          >
            <h2 id="facts" className="text-title font-semibold text-ink">
              The home
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-small text-muted">Type</dt>
                <dd className="text-ink">{PROPERTY_TYPE_LABELS[property.type]}</dd>
              </div>
              <div>
                <dt className="text-small text-muted">Bedrooms</dt>
                <dd className="figures text-ink">{property.bedrooms}</dd>
              </div>
              <div>
                <dt className="text-small text-muted">Gas supply</dt>
                <dd className="text-ink">{property.hasGasSupply ? 'Yes' : 'No gas'}</dd>
              </div>
              <div>
                <dt className="text-small text-muted">Deposits held by</dt>
                <dd className="text-ink">{DEPOSIT_SCHEME_LABELS[property.depositScheme]}</dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-1.5 text-small text-muted">Energy performance (EPC)</dt>
                <dd>
                  <EpcScale band={property.epcBand} />
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="sub-score"
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
          >
            <h2 id="sub-score" className="text-title font-semibold text-ink">
              Tenants’ view of this home
            </h2>
            {score.propertySubScore !== null ? (
              <p className="flex flex-col gap-0.5">
                <span className="text-small text-muted">
                  Home matched the advert and was safe at move-in
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display figures text-display-l leading-none font-semibold text-ink">
                    {score.propertySubScore.toFixed(1)}
                  </span>
                  <span className="text-small text-muted">out of 5</span>
                </span>
              </p>
            ) : null}
            <ScoreSummary
              summary={score}
              direction="tenant->landlord"
              variant="compact"
              headingLevel="h3"
            />
          </section>
        </aside>
      </div>
      <Section
        id="documents"
        title="Certificates and documents"
        description="Gas safety every 12 months, EICR every 5 years, plus alarms, carbon monoxide detectors and legionella."
      >
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
          <ComplianceManager
            items={calendar}
            properties={[property]}
            tenancies={tenancies}
            caption={`Certificates for ${streetOf(property)}`}
            hideCaption
            canManage={can('manage_documents')}
            jobs={jobs}
          />
        </div>
      </Section>

      <Section
        id="repairs"
        title="Repairs"
        meta={<span className="text-small text-muted">{jobs.filter(isOpen).length} open</span>}
      >
        {sortedJobs.length === 0 ? (
          <EmptyState
            icon={WrenchIcon}
            title="No repairs yet"
            description="Repairs reported here, and the ones you raise, are kept with the home."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
            {sortedJobs.map((job) => (
              <li key={job.id}>
                <Link
                  to={`/landlord/jobs/${job.id}`}
                  className="flex flex-col gap-1.5 px-4 py-3.5 no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-ink">{job.title}</span>
                    <span className="text-small text-muted">
                      Reported {formatShortDate(job.createdAt, now)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end">
                    <JobStatusBadge status={job.status} />
                    <NextOnJob action={nextByJob.get(job.id)} job={job} people={tenantNames} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="reviews"
        title="What tenants say about this home"
        description="Reviews from tenants who lived here, after their tenancy ended. Public on your profile."
      >
        {reviews.length === 0 ? (
          <EmptyState
            icon={ChatCircleTextIcon}
            title="No reviews of this home yet"
            description="Tenants can review at the end of a tenancy you’ve both confirmed here."
          />
        ) : (
          reviews.map((review) => <ReviewItem key={review.ratingId} review={review} aboutMe />)
        )}
        {reviews.length === 0 ? <ReviewPolicyLink /> : null}
      </Section>
      <NewJobDialog
        open={raising}
        onOpenChange={setRaising}
        properties={[property]}
        onCreated={(job) => navigate(`/landlord/jobs/${job.id}`)}
      />
    </PortalPage>
  )
}
