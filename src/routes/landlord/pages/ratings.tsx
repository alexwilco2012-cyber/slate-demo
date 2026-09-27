// Reviews and ratings: what tenants and trades say about you (with a reply to each), the ratings
// you owe, and tenant passports shared with you.

import { Link, useSearchParams } from 'react-router'
import {
  ChatTeardropTextIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  LockSimpleIcon,
  PencilSimpleLineIcon,
} from '@phosphor-icons/react'
import { useSlateQuery, type RatingTask } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import { paidOnTimeText } from '@/domain/rating/display'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { RoleIcon } from '@/components/ui/role-icon'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { PageHeader } from '@/components/slate/page-header'
import { ScoreSummary } from '@/components/slate/score-summary'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ReviewItem, ReviewPolicyLink } from '../components/review-item'
import { CountPill, Section } from '../components/section'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { rateHref } from '../lib/actions'
import { useAccountId, usePeople, usePortfolio } from '../lib/data'
import { firstName, placeOf } from '../lib/format'
import { PassportsPanel } from './passports'

type Tab = 'about' | 'owed' | 'passports'

function AboutYou() {
  const viewer = useViewer()
  const accountId = useAccountId()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [score, client, fromTenants, fromTrades, landlord] = await Promise.all([
        api.getLandlordScore(viewer, { landlordId: accountId }),
        api.getClientRating(viewer, accountId),
        api.listReviews(viewer, { direction: 'tenant->landlord', subjectId: accountId }),
        api.listReviews(viewer, { direction: 'trade->landlord', subjectId: accountId }),
        api.getPerson(viewer, accountId),
      ])
      return { score, client, fromTenants, fromTrades, landlord }
    },
    [viewer, accountId],
  )
  const data = state.data
  if (state.status === 'error' && !data) return <ErrorPanel error={state.error} onRetry={refresh} />
  if (!data) return <ListSkeleton rows={3} label="Loading what people say about you" />
  const registration = data.landlord?.badges.find((b) => b.kind === 'landlord_registration')

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card padding="lg" className="gap-4">
          <ScoreSummary
            title={
              <span className="flex items-center gap-2">
                <RoleIcon role="tenant" weight="bold" aria-hidden className="size-5 text-muted" />
                What tenants say about you
              </span>
            }
            headingLevel="h2"
            summary={data.score}
            direction="tenant->landlord"
            facts={[
              data.score.propertySubScore !== null
                ? `Homes as advertised: ${data.score.propertySubScore.toFixed(1)} out of 5`
                : null,
              'Public on your profile and each home’s page',
            ].filter((f): f is string => f !== null)}
          />
          {registration ? <VerifiedBadge badge={registration} className="self-start" /> : null}
        </Card>
        <Card padding="lg" className="gap-4">
          <ScoreSummary
            title={
              <span className="flex items-center gap-2">
                <RoleIcon role="trade" weight="bold" aria-hidden className="size-5 text-muted" />
                What trades say about you
              </span>
            }
            headingLevel="h2"
            summary={data.client.summary}
            direction="trade->landlord"
            facts={[paidOnTimeText(data.client.paidOnTime), 'Only trades and you can see this']}
          />
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-card border border-dashed border-input-border bg-surface-2 p-4">
        <LockSimpleIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" />
        <p className="text-body text-ink">
          Your current tenants can rate how each repair was handled. We seal those ratings and never
          show them one by one. They only count inside your score, at the end of the tenancy or once{' '}
          {RATING_RULES.shieldReleaseTenantRaters} different tenants have rated you.
        </p>
      </div>

      <Section
        title="Reviews from tenants"
        meta={<CountPill value={data.fromTenants.length} label="reviews" />}
        description="You can post one public reply to each, within 30 days, and mark a review as disputed."
      >
        {data.fromTenants.length === 0 ? (
          <EmptyState
            icon={ChatTeardropTextIcon}
            title="No tenant reviews yet"
            description="Tenants can review you when a tenancy you both confirmed comes to an end."
          />
        ) : (
          data.fromTenants.map((review) => (
            <ReviewItem key={review.ratingId} review={review} aboutMe />
          ))
        )}
      </Section>

      <Section
        title="Reviews from trades"
        meta={<CountPill value={data.fromTrades.length} label="reviews" />}
        description="How trades found you as a client. Other trades see these; tenants don’t."
      >
        {data.fromTrades.length === 0 ? (
          <EmptyState
            icon={ChatTeardropTextIcon}
            title="No trade reviews yet"
            description="Trades can rate you for 30 days after a job, once your rating of them is in."
          />
        ) : (
          data.fromTrades.map((review) => (
            <ReviewItem key={review.ratingId} review={review} aboutMe />
          ))
        )}
      </Section>
      <ReviewPolicyLink className="self-start" />
    </div>
  )
}

function Owed() {
  const viewer = useViewer()
  const portfolio = usePortfolio()
  const { state, refresh } = useSlateQuery((api) => api.listRatingTasks(viewer), [viewer])
  const tasks = state.data
  const people = usePeople((tasks ?? []).map((t) => t.subjectId))
  const jobs = new Map((portfolio.state.data?.jobs ?? []).map((j) => [j.id, j]))
  if (state.status === 'error' && !tasks)
    return <ErrorPanel error={state.error} onRetry={refresh} />
  if (!tasks || !people.state.data || !portfolio.state.data)
    return <ListSkeleton rows={3} label="Loading your ratings" />

  const todo = tasks
    .filter((t) => t.status !== 'submitted')
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt))
  const done = tasks
    .filter((t) => t.status === 'submitted')
    .sort((a, b) => b.closesAt.localeCompare(a.closesAt))
  const describe = (task: RatingTask) => {
    const person = people.state.data?.get(task.subjectId)
    const name = person?.tradeProfile?.businessName ?? person?.displayName ?? 'Someone'
    const property = portfolio.state.data?.propertyById.get(task.propertyId)
    const about =
      task.context.kind === 'job'
        ? (jobs.get(task.context.jobId)?.title ?? 'A repair')
        : `Tenancy at ${property ? placeOf(property) : 'your home'}`
    const contextId = task.context.kind === 'job' ? task.context.jobId : task.context.tenancyId
    return {
      name,
      first: firstName(person?.displayName ?? name),
      about,
      href: rateHref(contextId, task.context.kind, task.subjectId),
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <Section
        title="Yours to leave"
        meta={todo.length ? <CountPill value={todo.length} label="to leave" /> : null}
      >
        {todo.length === 0 ? (
          <EmptyState
            icon={CheckCircleIcon}
            title="Nothing to rate"
            description="When a job is confirmed or a tenancy ends, you’ll be asked to rate. Both sides are revealed together."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {todo.map((task) => {
              const view = describe(task)
              return (
                <li
                  key={view.href}
                  className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-small font-semibold text-muted">
                      {task.direction === 'landlord->trade' ? 'Rate a trade' : 'Rate a tenant'} ·
                      closes {formatDate(task.closesAt)}
                    </span>
                    <span className="font-semibold text-ink">{view.name}</span>
                    <span className="text-small text-muted">
                      {view.about}
                      {task.counterpartHasRated
                        ? ` · ${view.first} has rated you. Leave yours to see what they said.`
                        : ''}
                    </span>
                  </span>
                  <Link
                    to={view.href}
                    className={buttonVariants({ className: 'self-start sm:self-center' })}
                  >
                    {task.status === 'draft' ? (
                      <>
                        <PencilSimpleLineIcon weight="bold" aria-hidden />
                        Finish rating
                      </>
                    ) : (
                      `Rate ${view.first}`
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
      <Section
        title="You’ve rated"
        description="Sealed until both sides have rated or the window closes, then revealed together."
      >
        {done.length === 0 ? (
          <p className="text-body text-muted">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
            {done.map((task) => {
              const view = describe(task)
              return (
                <li key={view.href}>
                  {task.ratingId ? (
                    <Link
                      to={`/landlord/reviews/${task.ratingId}`}
                      className="flex flex-col gap-0.5 px-4 py-3.5 no-underline hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold text-ink">{view.name}</span>
                        <span className="text-small text-muted">{view.about}</span>
                      </span>
                      <span className="text-small text-muted">
                        Window closed {formatDate(task.closesAt)}
                      </span>
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Section>
      <ReviewPolicyLink className="self-start" />
    </div>
  )
}

export default function RatingsPage() {
  const [params, setParams] = useSearchParams()
  const viewer = useViewer()
  const tab =
    (['about', 'owed', 'passports'] as const).find((t) => t === params.get('tab')) ?? 'about'
  const { state } = useSlateQuery((api) => api.listRatingTasks(viewer), [viewer])
  const owed = (state.data ?? []).filter((t) => t.status !== 'submitted').length

  return (
    <PortalPage title="Reviews and ratings" width="wide">
      <PageHeader
        title="Reviews and ratings"
        description="What tenants and trades say about you, the ratings you owe, and tenant passports shared with you."
      />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = new URLSearchParams(params)
          if (value === 'about') next.delete('tab')
          else next.set('tab', value as Tab)
          setParams(next, { replace: true })
        }}
      >
        {/* Icons drop on phones so all three tabs fit without scrolling sideways. */}
        <TabsList className="max-sm:[&_svg]:hidden">
          <TabsTab value="about">
            <ChatTeardropTextIcon weight="bold" />
            About you
          </TabsTab>
          <TabsTab value="owed">
            <PencilSimpleLineIcon weight="bold" />
            To leave{owed ? ` (${owed})` : ''}
          </TabsTab>
          <TabsTab value="passports">
            <IdentificationCardIcon weight="bold" />
            Passports
          </TabsTab>
        </TabsList>
        <TabsPanel value="about">
          <AboutYou />
        </TabsPanel>
        <TabsPanel value="owed">
          <Owed />
        </TabsPanel>
        <TabsPanel value="passports">
          <PassportsPanel />
        </TabsPanel>
      </Tabs>
    </PortalPage>
  )
}
