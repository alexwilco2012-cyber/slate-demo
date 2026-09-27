// One open job on the board: everything a trade needs to decide (what, where, how urgent, and the
// client's record with other trades), then the quote builder, or the quote they already sent.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowUUpLeftIcon,
  CalendarXIcon,
  ClipboardTextIcon,
  HouseLineIcon,
  MapPinIcon,
  SealCheckIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import {
  JOB_CATEGORY_LABELS,
  PROPERTY_TYPE_LABELS,
  QUOTE_STATUS_LABELS,
  ROOM_LABELS,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { plural } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ClientScore, PaidOnTime } from '../components/client-record'
import { DistanceBadge, UrgencyBadge, distanceText } from '../components/job-meta'
import { Fact, LoadError, PageSkeleton, Section } from '../components/page-bits'
import { PhotoGrid } from '../components/photos'
import { QuoteTable } from '../components/quote-table'
import { StatusBadge } from '../components/status-badge'
import { WithdrawQuoteDialog } from '../components/withdraw-quote-dialog'
import { firstNameOf, statusMeta } from '../lib/job'
import { formatShortDay } from '../lib/time'
import { loadPost, type PostData } from './load'
import { credentialText } from './post-card'
import { QuoteBuilder } from './quote-builder'

export default function BoardPostPage() {
  const { jobId } = useParams()
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    (api) => (isId('job', jobId) ? loadPost(api, viewer, jobId) : Promise.resolve(null)),
    [viewer, jobId],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Job board" width="wide">
        <PageSkeleton label="Loading the job" />
      </PortalPage>
    )
  }
  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Job board" width="wide">
        <PageHeader back={{ to: '/trade/board', label: 'Job board' }} title="Open job" />
        <LoadError what="this job" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Job closed">
        <PageHeader back={{ to: '/trade/board', label: 'Job board' }} title="This job has closed" />
        <EmptyState
          icon={CalendarXIcon}
          headingLevel="h2"
          title="No longer taking quotes"
          description="The landlord has chosen someone, or called the job off. There are other open jobs on the board."
          action={
            <Link to="/trade/board" className={buttonVariants({ variant: 'primary' })}>
              Back to the job board
            </Link>
          }
        />
      </PortalPage>
    )
  }
  return <Post data={state.data} />
}

function Post({ data }: { data: PostData }) {
  const { post, landlord, client, propertyType, quotes, saved, me } = data
  const now = useDemoNow()
  const [withdrawing, setWithdrawing] = useState(false)
  const openQuote = quotes.find((quote) => quote.status === 'submitted')
  const accepted = quotes.find((quote) => quote.status === 'accepted')
  const last = quotes.at(-1)
  const landlordName = firstNameOf(landlord?.displayName, 'The landlord')
  const stillOpen = !post.closesAt || post.closesAt > now

  return (
    <PortalPage title={post.title} width="wide">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          <PageHeader
            back={{ to: '/trade/board', label: 'Job board' }}
            eyebrow={JOB_CATEGORY_LABELS[post.category]}
            title={post.title}
            meta={
              <>
                <UrgencyBadge urgency={post.urgency} />
                <DistanceBadge post={post} />
              </>
            }
          />
          <p className="text-body-l text-ink">{post.description}</p>
          {post.photos.length > 0 ? <PhotoGrid photos={post.photos} /> : null}

          <dl className="grid grid-cols-1 gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:grid-cols-2">
            <Fact label="Area" icon={<MapPinIcon weight="bold" />}>
              {post.neighbourhood}, {post.postcodeDistrict}
              <span className="block font-normal text-muted">
                {distanceText(post)}
                {post.inServiceArea ? ' · in your area' : ' · outside your usual area'}
              </span>
            </Fact>
            <Fact label="Home" icon={<HouseLineIcon weight="bold" />}>
              {propertyType ? PROPERTY_TYPE_LABELS[propertyType] : 'Not given'}
              <span className="block font-normal text-muted">{ROOM_LABELS[post.room]}</span>
            </Fact>
            <Fact label="Quotes so far" icon={<UsersThreeIcon weight="bold" />}>
              {post.quoteCount === 0 ? 'None yet' : plural(post.quoteCount, 'quote')}
            </Fact>
            <Fact label="Closes" icon={<ClipboardTextIcon weight="bold" />}>
              {post.closesAt ? formatShortDay(post.closesAt) : 'When the landlord chooses'}
            </Fact>
            {post.credentialNeeded ? (
              <Fact
                label="You’ll need"
                icon={<SealCheckIcon weight="fill" />}
                className="sm:col-span-2"
              >
                {credentialText(post.credentialNeeded)}
              </Fact>
            ) : null}
          </dl>

          <section
            aria-labelledby="client-title"
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft"
          >
            <h2 id="client-title" className="text-small font-bold text-muted">
              The client, from other trades
            </h2>
            <div className="flex items-center gap-3">
              {landlord ? (
                <Avatar
                  name={landlord.displayName}
                  seed={landlord.avatarSeed}
                  role="landlord"
                  size="md"
                  decorative
                />
              ) : null}
              <div className="flex min-w-0 flex-col">
                <p className="font-bold text-ink">{landlord?.displayName ?? 'Landlord'}</p>
                {client ? <ClientScore rating={client} /> : null}
              </div>
            </div>
            {client ? <PaidOnTime rating={client} /> : null}
            <p className="text-small text-muted">
              Trades rate their clients after each job: clear description, paid on time, access
              arranged, fair to deal with.{' '}
              <Link
                to="/policies/reviews"
                className="font-semibold text-accent-text underline underline-offset-2"
              >
                Review policy
              </Link>
            </p>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {openQuote ? (
            <>
              <Section title="Your quote" headingLevel="h2">
                <div className="@container flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft">
                  <p className="flex flex-wrap items-center gap-2 text-ink">
                    <StatusBadge status={statusMeta('quote_sent')} />
                    <span className="text-small text-muted">
                      Sent {formatShortDay(openQuote.submittedAt)} · holds until{' '}
                      {formatShortDay(openQuote.validUntil)}
                    </span>
                  </p>
                  <QuoteTable quote={openQuote} caption="Your quote" />
                  {openQuote.notes ? (
                    <p className="rounded-control bg-surface-2 p-3 text-ink">
                      <span className="block text-small font-semibold text-muted">Your note</span>
                      {openQuote.notes}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 border-t border-line pt-4 @md:flex-row @md:items-center @md:justify-between">
                    <p className="text-ink">
                      {landlordName} is choosing. We’ll tell you either way.
                    </p>
                    <Button
                      variant="danger"
                      iconStart={<ArrowUUpLeftIcon weight="bold" aria-hidden />}
                      onClick={() => setWithdrawing(true)}
                      className="shrink-0 @sm:self-start"
                    >
                      Withdraw quote
                    </Button>
                  </div>
                </div>
              </Section>
              <WithdrawQuoteDialog
                quote={openQuote}
                landlordName={landlordName}
                open={withdrawing}
                onOpenChange={setWithdrawing}
              />
            </>
          ) : accepted ? (
            <EmptyState
              icon={SealCheckIcon}
              title="Your quote was accepted"
              description={`${landlordName} chose you. The job is on your list now.`}
              action={
                <Link
                  to={`/trade/jobs/${post.jobId}`}
                  className={buttonVariants({ variant: 'primary' })}
                >
                  Open the job
                </Link>
              }
            />
          ) : stillOpen ? (
            <>
              <header className="flex flex-col gap-1">
                <h2 className="font-display text-display-l font-semibold text-ink">Send a quote</h2>
                <p className="text-ink">
                  {last
                    ? `Your last quote was ${QUOTE_STATUS_LABELS[last.status].toLowerCase()}. You can send a new one while the job is open.`
                    : `${landlordName} sees your total, your lines and your note.`}
                </p>
              </header>
              <QuoteBuilder
                jobId={post.jobId}
                saved={saved}
                vatRegistered={me.tradeProfile?.vatRegistered ?? false}
                landlordName={landlordName}
              />
            </>
          ) : (
            <EmptyState
              icon={CalendarXIcon}
              title="Quotes have closed"
              description={`${landlordName} is choosing from the quotes they have.`}
            />
          )}
        </div>
      </div>
    </PortalPage>
  )
}
