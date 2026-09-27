// The landlord's home screen: what needs them first, then their homes, then what tenants and
// trades say about them, then what happened recently (SPEC §9: "Actions needed" above the
// portfolio).

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRightIcon,
  BellSimpleIcon,
  CaretDownIcon,
  CoffeeIcon,
  HouseLineIcon,
  SparkleIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery, type AwayFeed } from '@/data'
import type { ComplianceItem, NotificationRecord, PropertyId } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/slate/page-header'
import { ScoreSummary } from '@/components/slate/score-summary'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { PortalPage, timeAgo } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { ActionRow } from '../components/action-row'
import { HomeCard } from '../components/home-card'
import { CountPill, Section } from '../components/section'
import { CardGridSkeleton, ErrorPanel, ListSkeleton } from '../components/states'
import { ReviewPolicyLink } from '../components/review-item'
import { describeAction, peopleIn, type ActionView } from '../lib/actions'
import {
  currentTenancyOf,
  useAccountId,
  usePeople,
  usePortfolio,
  upcomingTenancyOf,
} from '../lib/data'
import { firstName } from '../lib/format'
import { formatLongDay, greeting } from '../lib/time'
import { paidOnTimeText } from '@/domain/rating/display'
import { notificationIcon } from '../lib/notification-icons'

const FIRST_ACTIONS = 5

// "While you were away" is read once per visit and kept, then marked seen (reading it after
// marking would come back empty). Kept outside React, per data layer, so a re-mount doesn't read
// it again.
const awayFeeds = new WeakMap<object, Map<string, Promise<AwayFeed>>>()
const dismissedAway = new Set<string>()

function useAwayFeed() {
  const { api } = useSlate()
  const viewer = useViewer()
  const key = `${viewer.personId}|${viewer.actingForId ?? ''}`
  const [feed, setFeed] = useState<AwayFeed | null>(null)
  const [dismissed, setDismissed] = useState(() => dismissedAway.has(key))
  useEffect(() => {
    let live = true
    const feeds = awayFeeds.get(api) ?? new Map<string, Promise<AwayFeed>>()
    awayFeeds.set(api, feeds)
    let pending = feeds.get(key)
    if (!pending) {
      pending = api.getAwayFeed(viewer).then(async (result) => {
        await api.markAwaySeen(viewer)
        return result
      })
      feeds.set(key, pending)
    }
    pending.then((result) => live && setFeed(result)).catch(() => undefined)
    return () => {
      live = false
    }
  }, [api, viewer, key])
  const dismiss = () => {
    dismissedAway.add(key)
    setDismissed(true)
  }
  return { feed: dismissed ? null : feed, dismiss }
}

function AwayBanner() {
  const { feed, dismiss } = useAwayFeed()
  if (!feed?.summary) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 rounded-card bg-brand-tint p-4 text-brand"
    >
      <SparkleIcon weight="fill" aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">{feed.summary}</p>
        <a
          href="#recent"
          className="self-start text-small font-semibold underline underline-offset-4"
        >
          See what’s new
        </a>
      </div>
      <IconButton
        label="Hide this"
        icon={<XIcon weight="bold" />}
        size="sm"
        variant="ghost"
        onClick={dismiss}
        className="-my-1 -mr-1 text-brand"
      />
    </motion.div>
  )
}

function ActionsNeeded() {
  const viewer = useViewer()
  const portfolio = usePortfolio()
  const [showAll, setShowAll] = useState(false)
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [actions, team] = await Promise.all([
        api.listActionsNeeded(viewer),
        api.listTeam(viewer),
      ])
      return { actions, team }
    },
    [viewer],
  )
  const data = portfolio.state.data
  const maps = useMemo(
    () => ({
      jobs: new Map((data?.jobs ?? []).map((job) => [job.id, job])),
      tenancies: new Map((data?.tenancies ?? []).map((t) => [t.id, t])),
    }),
    [data],
  )
  const actions = state.data?.actions ?? []
  const people = usePeople(peopleIn(actions, maps.jobs, maps.tenancies))

  const views = useMemo(() => {
    if (!state.data || !data || !people.state.data) return null
    return state.data.actions
      .map((action) =>
        describeAction(action, {
          jobs: maps.jobs,
          tenancies: maps.tenancies,
          properties: data.propertyById,
          people: people.state.data ?? new Map(),
          team: state.data?.team ?? [],
        }),
      )
      .filter((view): view is ActionView => view !== null)
  }, [state.data, data, people.state.data, maps])

  const error = state.status === 'error' ? state.error : portfolio.state.error
  const shown = views ? (showAll ? views : views.slice(0, FIRST_ACTIONS)) : []
  const hidden = views ? views.length - shown.length : 0

  return (
    <Section
      id="actions"
      title="Actions needed"
      meta={views && views.length > 0 ? <CountPill value={views.length} label="waiting" /> : null}
      description={
        views && views.length > 0
          ? 'Most pressing first. Each one opens where you can deal with it.'
          : undefined
      }
    >
      {error && !views ? (
        <ErrorPanel error={error} onRetry={refresh} />
      ) : !views ? (
        <ListSkeleton rows={3} label="Loading what needs you" />
      ) : views.length === 0 ? (
        <EmptyState
          icon={CoffeeIcon}
          title="You’re all caught up"
          description="Nothing needs you right now. When a tenant reports a problem or a certificate is due, it appears here first."
          action={
            <Link to="/landlord/homes" className="font-semibold text-accent-text underline">
              Look over your homes
            </Link>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {shown.map((view) => (
                <motion.li
                  key={view.key}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ActionRow view={view} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {hidden > 0 || showAll ? (
            <Button
              variant="secondary"
              className="self-start"
              aria-expanded={showAll}
              iconEnd={
                <CaretDownIcon weight="bold" aria-hidden className={cn(showAll && 'rotate-180')} />
              }
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Show fewer' : `Show ${hidden} more`}
            </Button>
          ) : null}
        </>
      )}
    </Section>
  )
}

function Portfolio() {
  const viewer = useViewer()
  const portfolio = usePortfolio()
  const calendar = useSlateQuery((api) => api.getComplianceCalendar(viewer), [viewer])
  const data = portfolio.state.data
  const tenantIds = (data?.tenancies ?? []).flatMap((t) => t.tenantIds)
  const people = usePeople(tenantIds)

  const byProperty = useMemo(() => {
    const map = new Map<PropertyId, ComplianceItem[]>()
    for (const item of calendar.state.data ?? []) {
      if (!item.propertyId) continue
      map.set(item.propertyId, [...(map.get(item.propertyId) ?? []), item])
    }
    return map
  }, [calendar.state.data])

  return (
    <Section
      id="homes"
      title="Your homes"
      meta={data ? <CountPill value={data.properties.length} label="homes" /> : null}
      action={
        <Link
          to="/landlord/homes"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          All homes
          <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
        </Link>
      }
    >
      {portfolio.state.status === 'error' && !data ? (
        <ErrorPanel error={portfolio.state.error} onRetry={portfolio.refresh} />
      ) : !data ? (
        <CardGridSkeleton cards={3} label="Loading your homes" />
      ) : data.properties.length === 0 ? (
        <EmptyState
          icon={HouseLineIcon}
          title="No homes here yet"
          description="Homes you let appear here with their tenants, rent, certificates and repairs."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.properties.map((property) => (
            <li key={property.id} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <HomeCard
                  property={property}
                  current={currentTenancyOf(data.tenancies, property.id)}
                  upcoming={upcomingTenancyOf(data.tenancies, property.id)}
                  jobs={data.jobs.filter((job) => job.propertyId === property.id)}
                  compliance={byProperty.get(property.id) ?? []}
                  people={people.state.data ?? new Map()}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Scores() {
  const viewer = useViewer()
  const accountId = useAccountId()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [score, client, landlord] = await Promise.all([
        api.getLandlordScore(viewer, { landlordId: accountId }),
        api.getClientRating(viewer, accountId),
        api.getPerson(viewer, accountId),
      ])
      return { score, client, landlord }
    },
    [viewer, accountId],
  )
  const data = state.data
  const registration = data?.landlord?.badges.find((b) => b.kind === 'landlord_registration')

  return (
    <Section
      id="scores"
      title="What people say about you"
      action={
        <Link
          to="/landlord/ratings"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          Reviews and ratings
          <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
        </Link>
      }
    >
      {state.status === 'error' && !data ? (
        <ErrorPanel error={state.error} onRetry={refresh} />
      ) : !data ? (
        <CardGridSkeleton cards={2} label="Loading your scores" className="lg:grid-cols-2" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="lg" className="gap-4">
            <ScoreSummary
              title="What tenants say about you"
              summary={data.score}
              direction="tenant->landlord"
              variant="compact"
              facts={[
                data.score.propertySubScore !== null
                  ? `Homes as advertised: ${data.score.propertySubScore.toFixed(1)} out of 5`
                  : null,
                'Public on your profile and each home’s page',
              ].filter((fact): fact is string => fact !== null)}
            />
            {registration ? <VerifiedBadge badge={registration} className="self-start" /> : null}
          </Card>
          <Card padding="lg" className="gap-4">
            <ScoreSummary
              title="What trades say about you"
              summary={data.client.summary}
              direction="trade->landlord"
              variant="compact"
              facts={[paidOnTimeText(data.client.paidOnTime), 'Only trades and you can see this']}
            />
          </Card>
        </div>
      )}
      <ReviewPolicyLink className="self-start" />
    </Section>
  )
}

function RecentActivity() {
  const viewer = useViewer()
  const now = useDemoNow()
  const { state, refresh } = useSlateQuery((api) => api.listNotifications(viewer), [viewer])
  const items: NotificationRecord[] = (state.data ?? []).slice(0, 8)
  return (
    <Section id="recent" title="Recent activity">
      {state.status === 'error' && !state.data ? (
        <ErrorPanel error={state.error} onRetry={refresh} />
      ) : !state.data ? (
        <ListSkeleton rows={3} label="Loading recent activity" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellSimpleIcon}
          title="Nothing yet"
          description="Updates on repairs, quotes, certificates and ratings will show here."
        />
      ) : (
        <Card variant="outline" padding="none">
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const Glyph = notificationIcon(item.kind)
              return (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="flex items-start gap-3 px-4 py-3.5 no-underline transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
                    >
                      <Glyph weight="bold" className="size-4.5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn('text-body text-ink', !item.readAt && 'font-semibold')}>
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="text-small text-muted">{item.body}</span>
                      ) : null}
                      <span className="flex items-center gap-2 text-caption text-muted">
                        {!item.readAt ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-accent-text">
                            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
                            New
                          </span>
                        ) : null}
                        <time dateTime={item.createdAt}>{timeAgo(item.createdAt, now)}</time>
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </Section>
  )
}

function NoAccountYet() {
  return (
    <EmptyState
      icon={UsersThreeIcon}
      title="You’re not in a landlord’s account yet"
      description="When a landlord invites you to their team, the invitation appears above. Once you accept, you work inside their account on the homes they share with you."
      action={
        <Link to="/landlord/team" className="font-semibold text-accent-text underline">
          See your invitations
        </Link>
      }
    />
  )
}

export default function HomePage() {
  const viewer = useViewer()
  const { person, landlords } = usePortal()
  const now = useDemoNow()
  const portfolio = usePortfolio()
  const actingFor = landlords.find((l) => l.id === viewer.actingForId)
  const isAgentWithoutAccount =
    !viewer.actingForId && person.badges.some((badge) => badge.kind === 'agent_team')

  return (
    <PortalPage title="Home">
      <PageHeader
        eyebrow={formatLongDay(now)}
        title={`${greeting(now)}, ${firstName(person.displayName)}`}
        description={
          actingFor
            ? `You’re working in ${actingFor.displayName}’s account.`
            : 'Here’s what needs you, and how your homes are doing.'
        }
      />
      <AwayBanner />
      <ActionsNeeded />
      {isAgentWithoutAccount && portfolio.state.data?.properties.length === 0 ? (
        <NoAccountYet />
      ) : (
        <>
          <Portfolio />
          <Scores />
        </>
      )}
      <RecentActivity />
    </PortalPage>
  )
}
