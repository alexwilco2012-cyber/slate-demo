// Ratings: what the tenant still owes, what they've written (sealed ones with their reveal dates)
// and what's been said about them, with the difference between passport ratings from landlords
// and private ones from trades made plain.

import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  IdentificationCardIcon,
  PencilSimpleIcon,
  StarIcon,
} from '@phosphor-icons/react'
import type { ReviewDetail, SlateApi, Viewer } from '@/data/api'
import { useDemoNow, useSlateQuery } from '@/data'
import type { RatingId } from '@/domain/types'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { formatDate } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { ReviewCard, SealedReviewCard } from '@/components/slate/review-card'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { Explainer, QueryError, ReviewPolicyLink, TabCount } from '../components/basics'
import { RatingTaskCard } from '../components/rating-task-card'
import { ReportDialog } from '../components/report-dialog'
import { RevealMoment } from '../components/reveal'
import { loadHomes, loadPeople } from '../lib/data'
import { firstName } from '../lib/format'
import { ratePath } from '../lib/ratings'

async function loadRatings(api: SlateApi, viewer: Viewer) {
  const [tasks, mine, fromLandlords, fromTrades, jobs, homes] = await Promise.all([
    api.listRatingTasks(viewer),
    api.listMyRatings(viewer),
    api.listReviews(viewer, { direction: 'landlord->tenant', subjectId: viewer.personId }),
    api.listReviews(viewer, { direction: 'trade->tenant', subjectId: viewer.personId }),
    api.listJobs(viewer),
    loadHomes(api, viewer),
  ])
  const revealedMine = mine.filter((rating) => rating.state === 'revealed')
  const details = await Promise.all(
    [
      ...revealedMine.map((r) => r.id),
      ...fromLandlords.map((r) => r.ratingId),
      ...fromTrades.map((r) => r.ratingId),
    ].map((id) => api.getReview(viewer, id)),
  )
  const byId = new Map<RatingId, ReviewDetail>()
  for (const detail of details) if (detail) byId.set(detail.review.ratingId, detail)
  const people = await loadPeople(api, viewer, [
    ...tasks.map((t) => t.subjectId),
    ...mine.map((r) => r.subjectId),
  ])
  const about = (
    context: { kind: 'job'; jobId: string } | { kind: 'tenancy'; tenancyId: string },
  ) =>
    context.kind === 'job'
      ? (jobs.find((job) => job.id === context.jobId)?.title ?? 'A repair')
      : (homes.find((home) => home.tenancy.id === context.tenancyId)?.property.addressLine ??
        'A tenancy')
  return { tasks, mine, fromLandlords, fromTrades, details: byId, people, about }
}

export function RatingsPage() {
  const viewer = useViewer()
  const now = useDemoNow()
  const [reporting, setReporting] = useState<RatingId | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const { state, refresh } = useSlateQuery((api) => loadRatings(api, viewer), [viewer])

  const report = (id: RatingId) => {
    setReporting(id)
    setReportOpen(true)
  }

  return (
    <PortalPage title="Ratings">
      <PageHeader
        title="Ratings"
        description="Ratings only come from real repairs and tenancies. Each one stays sealed until both sides have rated, or the window closes."
      />
      {state.status === 'loading' ? (
        <LoadingRegion label="Loading your ratings" className="flex flex-col gap-4">
          <Skeleton className="h-11 w-80 max-w-full" />
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-44 w-full rounded-card" />
        </LoadingRegion>
      ) : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your ratings" onRetry={refresh} />
      ) : null}
      {state.data ? (
        <RatingsTabs data={state.data} now={now} personId={viewer.personId} onReport={report} />
      ) : null}
      {reporting ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          target={{ kind: 'rating', ratingId: reporting }}
          what="this review"
        />
      ) : null}
    </PortalPage>
  )
}

type RatingsData = Awaited<ReturnType<typeof loadRatings>>

function RatingsTabs({
  data,
  now,
  personId,
  onReport,
}: {
  data: RatingsData
  now: string
  personId: Viewer['personId']
  onReport: (id: RatingId) => void
}) {
  const toDo = data.tasks.filter((task) => task.status !== 'submitted')
  const given = data.mine.filter((rating) => rating.state !== 'draft')
  const aboutCount = data.fromLandlords.length + data.fromTrades.length
  const subject = (id: string) => data.people.get(id as Viewer['personId'])?.displayName ?? 'them'

  return (
    <Tabs defaultValue={toDo.length > 0 ? 'to-do' : 'about-you'}>
      <TabsList>
        <TabsTab value="to-do">
          To do <TabCount count={toDo.length} />
        </TabsTab>
        <TabsTab value="given">
          Sent <TabCount count={given.length} />
        </TabsTab>
        <TabsTab value="about-you">
          About you <TabCount count={aboutCount} />
        </TabsTab>
      </TabsList>

      <TabsPanel value="to-do" className="flex flex-col gap-3">
        <h2 className="sr-only">Ratings to do</h2>
        {toDo.length === 0 ? (
          <EmptyState
            icon={CheckCircleIcon}
            headingLevel="h3"
            title="Nothing to rate right now"
            description="After a visit you’ve confirmed, or when a tenancy ends, we’ll ask you here. There’s never a reward, and you don’t lose anything if you skip it."
          />
        ) : (
          toDo.map((task) => (
            <RatingTaskCard
              key={ratePath(task.direction, task.context)}
              task={task}
              subjectName={subject(task.subjectId)}
              about={data.about(task.context)}
              now={now}
            />
          ))
        )}
        <ReviewPolicyLink />
      </TabsPanel>

      <TabsPanel value="given" className="flex flex-col gap-3">
        <h2 className="sr-only">Ratings you’ve sent</h2>
        {given.length === 0 ? (
          <EmptyState
            icon={StarIcon}
            headingLevel="h3"
            title="You haven’t rated anyone yet"
            description="Your ratings will show here, sealed until they’re revealed."
          />
        ) : (
          given.map((rating) => {
            const name = firstName(subject(rating.subjectId))
            const about = data.about(rating.context)
            if (rating.state === 'revealed') {
              const detail = data.details.get(rating.id)
              return (
                <div key={rating.id} className="flex flex-col gap-2">
                  <p className="text-small font-semibold text-muted">
                    Your review of {name} · {about}
                  </p>
                  {detail ? <ReviewCard review={detail.review} headingLevel="h3" /> : null}
                  <Link
                    to={`/tenant/reviews/${rating.id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 self-start text-small font-semibold text-accent-text underline-offset-4 hover:underline"
                  >
                    <PencilSimpleIcon weight="bold" aria-hidden className="size-4" />
                    {detail?.can.update ? 'Add a dated update' : 'Open the review'}
                  </Link>
                </div>
              )
            }
            return (
              <SealedReviewCard
                key={rating.id}
                seal={rating.seal}
                raterRole="tenant"
                revealAt={rating.revealAt}
                context={`Your rating of ${name} · ${about}${rating.submittedAt ? ` · sent ${formatDate(rating.submittedAt)}` : ''}`}
              />
            )
          })
        )}
        <ReviewPolicyLink />
      </TabsPanel>

      <TabsPanel value="about-you" className="flex flex-col gap-6">
        <section aria-labelledby="from-landlords-title" className="flex flex-col gap-3">
          <h2
            id="from-landlords-title"
            className="font-display text-display-m font-semibold text-ink"
          >
            From your landlords
          </h2>
          <Explainer icon={<IdentificationCardIcon weight="bold" />}>
            <p>
              These make up your tenant passport. They’re never public: you see all of them, and you
              decide who else does.
            </p>
            <Link
              to="/tenant/passport"
              className="inline-flex items-center gap-1 self-start font-semibold text-accent-text underline underline-offset-4"
            >
              Your passport
              <ArrowRightIcon weight="bold" aria-hidden className="size-3.5" />
            </Link>
          </Explainer>
          {data.fromLandlords.length === 0 ? (
            <p className="text-small text-muted">
              No landlord has rated you yet. They can once a tenancy ends.
            </p>
          ) : (
            data.fromLandlords.map((review) => (
              <ReviewAboutMe
                key={review.ratingId}
                detail={data.details.get(review.ratingId)}
                review={review}
                personId={personId}
                now={now}
                onReport={() => onReport(review.ratingId)}
              />
            ))
          )}
        </section>
        <section aria-labelledby="from-trades-title" className="flex flex-col gap-3">
          <h2 id="from-trades-title" className="font-display text-display-m font-semibold text-ink">
            From trades who visited
          </h2>
          <Explainer icon={<EyeSlashIcon weight="bold" />}>
            <p>
              Only you see these. From them, your landlord only sees whether you gave access, yes or
              no.
            </p>
          </Explainer>
          {data.fromTrades.length === 0 ? (
            <p className="text-small text-muted">No trade has rated a visit yet.</p>
          ) : (
            data.fromTrades.map((review) => (
              <ReviewAboutMe
                key={review.ratingId}
                detail={data.details.get(review.ratingId)}
                review={review}
                personId={personId}
                now={now}
                onReport={() => onReport(review.ratingId)}
              />
            ))
          )}
        </section>
        <ReviewPolicyLink />
      </TabsPanel>
    </Tabs>
  )
}

function ReviewAboutMe({
  review,
  detail,
  personId,
  now,
  onReport,
}: {
  review: ReviewDetail['review']
  detail: ReviewDetail | undefined
  personId: Viewer['personId']
  now: string
  onReport: () => void
}) {
  const can = detail?.can
  const actions = [
    can?.reply ? 'reply' : null,
    can?.dispute ? 'add a note that you dispute it' : null,
  ].filter(Boolean)
  return (
    <RevealMoment personId={personId} id={review.ratingId} revealedAt={review.revealedAt} now={now}>
      <div className="flex flex-col gap-1.5">
        <ReviewCard review={review} onReport={onReport} headingLevel="h3" />
        <Link
          to={`/tenant/reviews/${review.ratingId}`}
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-small font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          {actions.length ? `Open to ${actions.join(' or ')}` : 'Open the review'}
          <ArrowRightIcon weight="bold" aria-hidden className="size-3.5" />
        </Link>
      </div>
    </RevealMoment>
  )
}
