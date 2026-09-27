// One review. About the trade: their one public reply (within 30 days) and the visible "Trade
// disputes this" note. Written by the trade: their private answers and one dated update. Anyone
// else's words can be reported. The review itself never changes.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowBendUpLeftIcon,
  PencilSimpleLineIcon,
  ScalesIcon,
  SignpostIcon,
} from '@phosphor-icons/react'
import { useSlate, useSlateQuery, type ReviewDetail } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import { isId } from '@/domain/ids'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { ReviewItem } from '../components/review-item'
import { errorText, fieldError } from '../lib/errors'

const WOULD_AGAIN = { yes: 'Yes', no: 'No', not_sure: 'Not sure' } as const

export default function ReviewPage() {
  const { ratingId } = useParams()
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    (api) => (isId('rating', ratingId) ? api.getReview(viewer, ratingId) : Promise.resolve(null)),
    [viewer, ratingId],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Review" width="narrow">
        <PageSkeleton label="Loading the review" cards={1} />
      </PortalPage>
    )
  }
  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Review" width="narrow">
        <PageHeader back={{ to: '/trade/profile', label: 'Profile' }} title="Review" />
        <LoadError what="this review" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Review" width="narrow">
        <PageHeader back={{ to: '/trade/profile', label: 'Profile' }} title="Review" />
        <EmptyState
          icon={SignpostIcon}
          headingLevel="h2"
          title="This review isn’t available"
          description="It may still be sealed until both sides have rated, or we may have taken it down after a report."
          action={
            <Link to="/trade/profile" className={buttonVariants({ variant: 'primary' })}>
              Your reviews
            </Link>
          }
        />
      </PortalPage>
    )
  }
  return <Review detail={state.data} />
}

function Review({ detail }: { detail: ReviewDetail }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const { review, mine, aboutMe, rating, can } = detail
  const [reply, setReply] = useState('')
  const [update, setUpdate] = useState('')
  const [errors, setErrors] = useState<{ reply?: string; update?: string }>({})
  const [busy, setBusy] = useState<'reply' | 'update' | 'dispute' | null>(null)
  const [disputing, setDisputing] = useState(false)

  async function run(kind: 'reply' | 'update' | 'dispute') {
    setBusy(kind)
    setErrors({})
    try {
      if (kind === 'reply') {
        await api.replyToReview(viewer, review.ratingId, reply)
        setReply('')
        toast.success('Reply posted', { description: 'It shows under the review for everyone.' })
      } else if (kind === 'update') {
        await api.addReviewUpdate(viewer, review.ratingId, update)
        setUpdate('')
        toast.success('Update added', { description: 'It shows with today’s date.' })
      } else {
        await api.disputeReview(viewer, review.ratingId)
        setDisputing(false)
        toast.success('Dispute note added', {
          description: 'The review now says “Trade disputes this”.',
        })
      }
    } catch (error) {
      const field = fieldError(error, 'body')
      if (field && kind !== 'dispute') setErrors({ [kind]: field })
      else toast.error('That didn’t work', { description: errorText(error) })
    } finally {
      setBusy(null)
    }
  }

  const title = aboutMe ? 'A review of you' : mine ? 'Your rating' : 'Review'
  return (
    <PortalPage title={title} width="narrow">
      <PageHeader
        back={
          mine
            ? { to: '/trade/ratings', label: 'Ratings' }
            : { to: '/trade/profile', label: 'Profile' }
        }
        title={title}
        description={
          mine && review.direction === 'trade->landlord'
            ? 'Other trades see this on the landlord’s client profile, without your name.'
            : mine && review.direction === 'trade->tenant'
              ? 'Only the tenant sees this. Their landlord only sees whether you got in.'
              : aboutMe
                ? 'It’s on your public profile. We never name the reviewer.'
                : undefined
        }
      />

      <section aria-labelledby="the-review">
        <h2 id="the-review" className="sr-only">
          The review
        </h2>
        <ReviewItem review={review} aboutMe={aboutMe} mine={mine} linkToPage={false} />
      </section>

      {mine && rating ? (
        <Section title="Only you see this" headingLevel="h2">
          <dl className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
            <div>
              <dt className="text-small text-muted">Would you work with them again?</dt>
              <dd className="font-semibold text-ink">
                {rating.wouldAgain ? WOULD_AGAIN[rating.wouldAgain] : 'Not answered'}
              </dd>
            </div>
            {rating.privateNote ? (
              <div>
                <dt className="text-small text-muted">Private note</dt>
                <dd className="text-ink">{rating.privateNote}</dd>
              </div>
            ) : null}
            {rating.submittedAt ? (
              <div>
                <dt className="text-small text-muted">Sent</dt>
                <dd className="text-ink">{formatDate(rating.submittedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </Section>
      ) : null}

      {can.reply ? (
        <Section
          title="Reply publicly"
          headingLevel="h2"
          description={`One reply, shown under the review.${detail.replyClosesAt ? ` Post it by ${formatDate(detail.replyClosesAt)}.` : ''} Keep to the job and don’t name the reviewer.`}
        >
          <Textarea
            label="Your reply"
            hideLabel
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={RATING_RULES.reply.maxLength}
            showCount
            rows={4}
            error={errors.reply}
          />
          <Button
            loading={busy === 'reply'}
            iconStart={<ArrowBendUpLeftIcon weight="bold" aria-hidden />}
            onClick={() => run('reply')}
            disabled={reply.trim().length === 0}
            className="sm:self-start"
          >
            Post reply
          </Button>
        </Section>
      ) : null}

      {can.update ? (
        <Section
          title="Add an update"
          headingLevel="h2"
          description="One dated update, shown under your rating. The rating itself doesn’t change."
        >
          <Textarea
            label="Your update"
            hideLabel
            value={update}
            onChange={(event) => setUpdate(event.target.value)}
            maxLength={1000}
            showCount
            rows={3}
            error={errors.update}
          />
          <Button
            variant="secondary"
            loading={busy === 'update'}
            iconStart={<PencilSimpleLineIcon weight="bold" aria-hidden />}
            onClick={() => run('update')}
            disabled={update.trim().length === 0}
            className="sm:self-start"
          >
            Add update
          </Button>
        </Section>
      ) : null}

      {can.dispute ? (
        <Section
          title="Disagree with it?"
          headingLevel="h2"
          description="You can add a visible “Trade disputes this” note. The review stays up. If it’s untrue and damaging, report it instead."
        >
          <Button
            variant="secondary"
            iconStart={<ScalesIcon weight="bold" aria-hidden />}
            onClick={() => setDisputing(true)}
            className="sm:self-start"
          >
            Add a dispute note
          </Button>
          <Dialog open={disputing} onOpenChange={setDisputing}>
            <DialogContent
              title="Add “Trade disputes this”?"
              description="Everyone who reads the review sees the note. You can only add it once, and you can’t take it off."
              size="sm"
              footer={
                <>
                  <DialogClose render={<Button variant="secondary">Cancel</Button>} />
                  <Button loading={busy === 'dispute'} onClick={() => run('dispute')}>
                    Add the note
                  </Button>
                </>
              }
            />
          </Dialog>
        </Section>
      ) : null}
    </PortalPage>
  )
}
