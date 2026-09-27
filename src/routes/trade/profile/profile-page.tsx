// The trade's profile and reputation: who they are, their checked credentials (with the dates
// they were checked), their Overall with both halves, the reviews behind it, and the ratings
// they've given landlords and tenants. Plus the business settings quotes use.

import { useState } from 'react'
import { Link } from 'react-router'
import {
  CaretRightIcon,
  FlagIcon,
  PlusIcon,
  SealCheckIcon,
  StarIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { useDemoNow, useSlate, useSlateQuery, type SlateApi, type Viewer } from '@/data'
import { tradeHeadline } from '@/domain/rating'
import { TRADE_TYPE_LABELS, type PersonCard, type Rating } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { RoleIcon } from '@/components/ui/role-icon'
import { PageHeader } from '@/components/slate/page-header'
import { TradeScoreSummary } from '@/components/slate/trade-score'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { formatMonthYear, formatPence, formatScore } from '@/components/slate/format'
import { scoreWords } from '@/components/slate/score-words'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { ReviewItem } from '../components/review-item'
import { TaskRow } from '../components/task-row'
import { errorText } from '../lib/errors'
import { KIND_LABELS, UNIT_LABELS } from '../lib/money'
import { peopleById } from '../lib/queries'
import { formatDayIn, ukDay } from '../lib/time'
import { CredentialSheet } from './credential-sheet'

async function loadProfile(api: SlateApi, viewer: Viewer) {
  const [me, profile, ratings, saved, jobs] = await Promise.all([
    api.getMe(viewer),
    api.getTradeProfile(viewer, viewer.personId),
    api.listMyRatings(viewer),
    api.listSavedLineItems(viewer),
    api.listJobs(viewer),
  ])
  const people = await api.getPeople(viewer, [...new Set(ratings.map((r) => r.subjectId))])
  return {
    me,
    profile,
    ratings,
    saved,
    titles: Object.fromEntries(jobs.map((job) => [job.id, job.title])) as Record<string, string>,
    people: peopleById(people),
  }
}

type ProfileData = Awaited<ReturnType<typeof loadProfile>>

export default function ProfilePage() {
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery((api) => loadProfile(api, viewer), [viewer])
  return (
    <PortalPage title="Your profile" width="wide">
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading your profile" />
      ) : !state.data ? (
        <>
          <PageHeader title="Your profile" />
          <LoadError what="your profile" onRetry={refresh} />
        </>
      ) : (
        <Profile data={state.data} />
      )}
    </PortalPage>
  )
}

function Profile({ data }: { data: ProfileData }) {
  const { me, profile, ratings, saved } = data
  const [adding, setAdding] = useState(false)
  const business = me.tradeProfile
  const headline = profile ? tradeHeadline(profile.score) : null
  const ofLandlords = ratings.filter((rating) => rating.direction === 'trade->landlord')
  const ofTenants = ratings.filter((rating) => rating.direction === 'trade->tenant')

  return (
    <>
      <header className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:p-6">
        <Avatar
          name={me.displayName}
          seed={me.avatarSeed}
          role="trade"
          size="xl"
          decorative
          className="self-start sm:self-center"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-small font-semibold text-muted">
            {business?.trades.map((trade) => TRADE_TYPE_LABELS[trade]).join(', ')}
          </p>
          <h1 className="font-display text-display-l font-semibold text-ink">{me.displayName}</h1>
          {business ? <p className="text-body-l text-ink">{business.businessName}</p> : null}
          <p className="text-small text-muted">
            Based in {me.postcodeDistrict} · on {BRAND.name} since {formatMonthYear(me.joinedAt)}
          </p>
        </div>
      </header>
      {business?.about ? (
        <p className="max-w-prose text-body-l text-ink">{business.about}</p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-10">
          {profile ? (
            <Section title="Your reputation">
              <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
                <TradeScoreSummary score={profile.score} />
                {headline?.note ? <p className="text-small text-ink">{headline.note}</p> : null}
              </div>
            </Section>
          ) : null}

          {profile ? (
            <Section
              title="Reviews of you"
              description="We never name reviewers. You can reply once to each review within 30 days, and add a dispute note."
            >
              <Tabs defaultValue="landlords">
                <TabsList>
                  <TabsTab value="landlords">
                    <RoleIcon role="landlord" weight="bold" />
                    Landlords ({profile.fromLandlords.length})
                  </TabsTab>
                  <TabsTab value="tenants">
                    <RoleIcon role="tenant" weight="bold" />
                    Tenants ({profile.fromTenants.length})
                  </TabsTab>
                </TabsList>
                <TabsPanel value="landlords">
                  <ReviewList reviews={profile.fromLandlords} who="landlords" />
                </TabsPanel>
                <TabsPanel value="tenants">
                  <ReviewList reviews={profile.fromTenants} who="tenants" />
                </TabsPanel>
              </Tabs>
            </Section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <Section
            title="Checked credentials"
            description="Each badge shows the date we checked it. We don’t show scheme logos."
          >
            <div className="flex flex-col gap-3">
              {me.badges.map((badge) => (
                <VerifiedBadge key={badge.kind} badge={badge} variant="detail" />
              ))}
              {me.pendingVerifications.map((pending) => (
                <VerifiedBadge
                  key={`pending-${pending.claim.kind}`}
                  badge={pending.claim}
                  pending
                  variant="detail"
                />
              ))}
              <Button
                variant="secondary"
                iconStart={<PlusIcon weight="bold" aria-hidden />}
                onClick={() => setAdding(true)}
              >
                Add a credential
              </Button>
            </div>
            <CredentialSheet open={adding} onOpenChange={setAdding} />
          </Section>

          <Section
            title="Your client ratings of landlords"
            description="Other trades see these on each landlord’s client profile, without your name, once the landlord’s rating of you is locked in."
          >
            <GivenList
              ratings={ofLandlords}
              data={data}
              empty="You haven’t rated a landlord yet."
            />
          </Section>

          <Section
            title="Your ratings of tenants"
            description="Only the tenant sees each one. Their landlord only sees whether you got in."
          >
            <GivenList ratings={ofTenants} data={data} empty="You haven’t rated a tenant yet." />
          </Section>

          <BusinessSettings
            vatRegistered={business?.vatRegistered ?? false}
            saved={saved}
            data={data}
          />

          <nav aria-label="More" className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              <TaskRow
                to="/trade/ratings"
                icon={StarIcon}
                title="Ratings to leave, and ones you’ve sent"
              />
              <TaskRow
                to="/trade/reports"
                icon={FlagIcon}
                title="Reports"
                detail="Reports about what you wrote, and ones you made"
              />
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}

function ReviewList({
  reviews,
  who,
}: {
  reviews: NonNullable<ProfileData['profile']>['fromLandlords']
  who: 'landlords' | 'tenants'
}) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={SealCheckIcon}
        title={`No reviews from ${who} yet`}
        description={`${who === 'landlords' ? 'Landlords' : 'Tenants'} can rate you after each job you finish.`}
      />
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((review) => (
        <li key={review.ratingId}>
          <ReviewItem review={review} aboutMe />
        </li>
      ))}
    </ul>
  )
}

function meanOf(rating: Rating): number | null {
  const scores = Object.values(rating.answers).filter(
    (value): value is 1 | 2 | 3 | 4 | 5 => typeof value === 'number',
  )
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null
}

const STATE_WORDS: Record<Rating['state'], string> = {
  draft: 'Draft, not sent',
  sealed: 'Sealed until both sides have rated',
  revealed: 'Revealed',
  restricted: 'Hidden while we check a report',
  removed: 'Taken down',
}

function GivenList({
  ratings,
  data,
  empty,
}: {
  ratings: Rating[]
  data: ProfileData
  empty: string
}) {
  const today = ukDay(useDemoNow())
  if (ratings.length === 0) return <p className="text-muted">{empty}</p>
  return (
    <ul className="flex flex-col gap-3">
      {ratings.map((rating) => {
        const person: PersonCard | undefined = data.people[rating.subjectId]
        const jobId = rating.context.kind === 'job' ? rating.context.jobId : ''
        const mean = meanOf(rating)
        const who = rating.direction === 'trade->landlord' ? 'landlord' : 'tenant'
        const to =
          rating.state === 'revealed'
            ? `/trade/reviews/${rating.id}`
            : rating.state === 'draft'
              ? `/trade/jobs/${jobId}/rate/${who}`
              : `/trade/jobs/${jobId}`
        return (
          <li key={rating.id}>
            <Link
              to={to}
              className="group flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 text-ink no-underline shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar
                name={person?.displayName ?? 'Someone'}
                seed={person?.avatarSeed}
                role={who}
                size="sm"
                decorative
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{person?.displayName ?? 'Someone'}</span>
                <span className="text-small text-muted">
                  {data.titles[jobId] ?? 'Job'}
                  {rating.submittedAt ? ` · ${formatDayIn(rating.submittedAt, today)}` : ''}
                </span>
                <span className="text-small text-ink">{STATE_WORDS[rating.state]}</span>
              </span>
              {mean !== null && rating.state !== 'draft' ? (
                <span className="flex shrink-0 flex-col items-end">
                  <span className="figures text-body-l font-bold">{formatScore(mean)}</span>
                  <span className="text-caption text-muted">{scoreWords(mean)}</span>
                </span>
              ) : null}
              <CaretRightIcon weight="bold" aria-hidden className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function BusinessSettings({
  vatRegistered,
  saved,
  data,
}: {
  vatRegistered: boolean
  saved: ProfileData['saved']
  data: ProfileData
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()

  async function setVat(next: boolean) {
    const current = data.me.tradeProfile
    if (!current) return
    try {
      await api.updateMe(viewer, { tradeProfile: { ...current, vatRegistered: next } })
      toast.success(next ? 'We’ll add VAT to your quotes' : 'No VAT on your quotes', {
        description: 'Quotes already sent don’t change.',
      })
    } catch (error) {
      toast.error('Not saved', { description: errorText(error) })
    }
  }

  async function remove(id: (typeof saved)[number]['id'], description: string) {
    try {
      await api.deleteSavedLineItem(viewer, id)
      toast.success(`Removed “${description}”`)
    } catch (error) {
      toast.error('Not removed', { description: errorText(error) })
    }
  }

  return (
    <section
      id="business"
      aria-labelledby="business-title"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2 id="business-title" className="font-display text-display-m font-semibold text-ink">
        Quotes and VAT
      </h2>
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft">
        <Switch
          label="VAT registered"
          description="When this is on, we add 20% VAT to your quotes."
          checked={vatRegistered}
          onCheckedChange={setVat}
        />
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="font-semibold text-ink">Quick lines</p>
          <p className="text-small text-muted">
            Tap these to build a quote. Add new ones from any quote with “Save it for next time”.
          </p>
          {saved.length === 0 ? (
            <p className="text-muted">No quick lines yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {saved.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-ink">{item.description}</span>
                    <span className="figures text-small text-muted">
                      {formatPence(item.unitPence)} {UNIT_LABELS[item.unit]} ·{' '}
                      {KIND_LABELS[item.kind]}
                    </span>
                  </span>
                  <IconButton
                    label={`Remove ${item.description}`}
                    icon={<TrashIcon weight="bold" />}
                    variant="quiet"
                    size="sm"
                    onClick={() => remove(item.id, item.description)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
