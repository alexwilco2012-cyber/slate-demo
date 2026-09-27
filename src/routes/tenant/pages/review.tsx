// One review: for a review of the tenant, their one public reply, the "Tenant disputes this" note
// and the report button; for the tenant's own review, their one dated update. The rating itself
// never changes.

import { useState } from 'react'
import { useParams } from 'react-router'
import {
  ArrowBendUpLeftIcon,
  EyeSlashIcon,
  LockKeyIcon,
  PencilSimpleLineIcon,
  ScalesIcon,
} from '@phosphor-icons/react'
import { SlateError, type ReviewDetail } from '@/data/api'
import { useSlate, useSlateQuery } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import { RATING_CONFIG } from '@/domain/rating'
import { isId } from '@/domain/ids'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { ReviewCard } from '@/components/slate/review-card'
import { NotFound, PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { Explainer, QueryError, ReviewPolicyLink } from '../components/basics'
import { ReportDialog } from '../components/report-dialog'

const WOULD_AGAIN_WORDS = { yes: 'Yes', no: 'No', not_sure: 'Not sure' } as const

export function ReviewPage() {
  const { ratingId } = useParams()
  const viewer = useViewer()
  const validId = isId('rating', ratingId) ? ratingId : null
  const { state, refresh } = useSlateQuery(
    async (api) => (validId ? api.getReview(viewer, validId) : null),
    [viewer, validId],
  )

  if (!validId || (state.status === 'success' && !state.data)) return <NotFound />
  if (state.status === 'loading') {
    return (
      <PortalPage title="Review" width="narrow">
        <LoadingRegion label="Loading the review" className="flex flex-col gap-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-72 w-full rounded-card" />
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Review" width="narrow">
        <PageHeader back={{ to: '/tenant/ratings', label: 'Ratings' }} title="Review" />
        <QueryError what="this review" onRetry={refresh} />
      </PortalPage>
    )
  }
  return <ReviewView detail={state.data} />
}

function ReviewView({ detail }: { detail: ReviewDetail }) {
  const { review, can, mine, aboutMe, rating } = detail
  const [reportOpen, setReportOpen] = useState(false)
  const privateToMe = review.direction === 'trade->tenant'
  const title = mine ? 'Your review' : aboutMe ? 'A review of you' : 'Review'

  return (
    <PortalPage title={title} width="narrow">
      <PageHeader
        back={{ to: '/tenant/ratings', label: 'Ratings' }}
        eyebrow={review.context.kind === 'job' ? review.context.title : 'End of tenancy'}
        title={title}
      />
      {privateToMe && aboutMe ? (
        <Explainer icon={<EyeSlashIcon weight="bold" />} title="Only you see this">
          <p>
            Trades’ ratings of tenants are private. Your landlord only sees whether you gave access.
          </p>
        </Explainer>
      ) : null}
      {review.direction === 'landlord->tenant' && aboutMe ? (
        <Explainer icon={<LockKeyIcon weight="bold" />} title="Part of your tenant passport">
          <p>Never public. Landlords only see it if you share your passport with them.</p>
        </Explainer>
      ) : null}

      <h2 className="sr-only">The review</h2>
      <ReviewCard
        review={review}
        onReport={can.report ? () => setReportOpen(true) : undefined}
        headingLevel="h3"
      />

      {mine && rating ? (
        <section
          aria-labelledby="private-title"
          className="flex flex-col gap-2 rounded-card bg-surface-2 p-4 text-small text-ink"
        >
          <h2 id="private-title" className="font-semibold">
            Only you can see
          </h2>
          <p>
            Would you {review.direction === 'tenant->trade' ? 'work with them' : 'rent from them'}{' '}
            again?{' '}
            <span className="font-semibold">
              {rating.wouldAgain ? WOULD_AGAIN_WORDS[rating.wouldAgain] : 'Not answered'}
            </span>
          </p>
          {rating.privateNote ? <p>Your private note: “{rating.privateNote}”</p> : null}
        </section>
      ) : null}

      {can.reply ? <ReplyForm detail={detail} /> : null}
      {can.dispute ? <DisputeAction detail={detail} /> : null}
      {can.update ? <UpdateForm detail={detail} /> : null}
      {aboutMe && !can.reply && !review.reply ? (
        <p className="text-small text-muted">
          The {RATING_RULES.reply.withinDays} days to reply to this review have passed.
        </p>
      ) : null}

      <ReviewPolicyLink />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ kind: 'rating', ratingId: review.ratingId }}
        what="this review"
      />
    </PortalPage>
  )
}

function ReplyForm({ detail }: { detail: ReviewDetail }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function send() {
    if (body.trim().length < 2) {
      setError('Write your reply first.')
      return
    }
    setBusy(true)
    try {
      await api.replyToReview(viewer, detail.review.ratingId, body.trim())
      toast.success('Reply posted', {
        description: 'It shows under the review, with today’s date.',
      })
    } catch (caught) {
      setError(
        caught instanceof SlateError
          ? (caught.fields.body ?? caught.message)
          : 'That didn’t post. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="reply-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
    >
      <h2 id="reply-title" className="flex items-center gap-2 text-title font-semibold text-ink">
        <ArrowBendUpLeftIcon weight="bold" aria-hidden className="size-5 text-accent-text" />
        Reply to this review
      </h2>
      <p className="text-small text-muted">
        You get one reply. It appears under the review
        {detail.replyClosesAt
          ? `, and you can post it until ${formatDate(detail.replyClosesAt)}`
          : ''}
        . Keep it calm and stick to what happened.
      </p>
      <Textarea
        label="Your reply"
        hideLabel
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setError(undefined)
        }}
        maxLength={RATING_RULES.reply.maxLength}
        showCount
        rows={4}
        error={error}
      />
      <Button className="self-start max-sm:w-full" loading={busy} onClick={send}>
        Post reply
      </Button>
    </section>
  )
}

function DisputeAction({ detail }: { detail: ReviewDetail }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function dispute() {
    setBusy(true)
    try {
      await api.disputeReview(viewer, detail.review.ratingId)
      setOpen(false)
      toast.success('Note added', { description: 'The review now shows “Tenant disputes this”.' })
    } catch (caught) {
      toast.error('That didn’t work', {
        description: caught instanceof Error ? caught.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="dispute-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
    >
      <h2 id="dispute-title" className="flex items-center gap-2 text-title font-semibold text-ink">
        <ScalesIcon weight="bold" aria-hidden className="size-5 text-accent-text" />
        Disagree with it?
      </h2>
      <p className="text-small text-muted">
        Add a visible note that says “Tenant disputes this”. The review stays up, and anyone who
        sees it sees your note too. If it’s untrue and damaging, report it instead.
      </p>
      <Button
        variant="secondary"
        className="self-start max-sm:w-full"
        onClick={() => setOpen(true)}
      >
        Add “Tenant disputes this”
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="sm"
          title="Add a dispute note?"
          description="It appears on the review with today’s date. You can add it once, and you can’t take it off."
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Cancel</Button>} />
              <Button loading={busy} onClick={dispute}>
                Add the note
              </Button>
            </>
          }
        />
      </Dialog>
    </section>
  )
}

function UpdateForm({ detail }: { detail: ReviewDetail }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function send() {
    if (body.trim().length < RATING_CONFIG.update.minLength) {
      setError(`Write at least ${RATING_CONFIG.update.minLength} characters.`)
      return
    }
    setBusy(true)
    try {
      await api.addReviewUpdate(viewer, detail.review.ratingId, body.trim())
      toast.success('Update added', {
        description: 'It shows under your review, with today’s date.',
      })
    } catch (caught) {
      setError(
        caught instanceof SlateError
          ? (caught.fields.body ?? caught.message)
          : 'That didn’t post. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="update-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
    >
      <h2 id="update-title" className="flex items-center gap-2 text-title font-semibold text-ink">
        <PencilSimpleLineIcon weight="bold" aria-hidden className="size-5 text-accent-text" />
        Add a dated update
      </h2>
      <p className="text-small text-muted">
        Something changed since? You can add one update. Your review itself stays exactly as it was.
      </p>
      <Textarea
        label="Your update"
        hideLabel
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setError(undefined)
        }}
        maxLength={RATING_CONFIG.update.maxLength}
        minLength={RATING_CONFIG.update.minLength}
        showCount
        rows={3}
        error={error}
      />
      <Button className="self-start max-sm:w-full" loading={busy} onClick={send}>
        Add update
      </Button>
    </section>
  )
}
