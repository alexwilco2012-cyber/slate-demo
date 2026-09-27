// One review: about you (one public reply within 30 days, a "disputes this" note, report) or by
// you (one dated update). The review itself never changes.

import { useState } from 'react'
import { useParams } from 'react-router'
import { ArrowBendUpLeftIcon, ScalesIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import { ROLE_LABELS, type RatingId } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { ReviewCard, subjectRoleOf } from '@/components/slate/review-card'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { CheckedTextarea } from '../components/checked-text'
import { ReportDialog } from '../components/report-dialog'
import { ReviewPolicyLink } from '../components/review-item'
import { Section } from '../components/section'
import { ErrorPanel, PageSkeleton } from '../components/states'
import { errorMessage, fieldErrors } from '../lib/errors'

export default function ReviewPage() {
  const { ratingId } = useParams()
  const id = ratingId as RatingId
  const viewer = useViewer()
  const { api } = useSlate()
  const toast = useToast()
  const { state, refresh } = useSlateQuery((api) => api.getReview(viewer, id), [viewer, id])
  const [reply, setReply] = useState('')
  const [update, setUpdate] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const detail = state.data

  if (state.status === 'error' && !detail) {
    return (
      <PortalPage title="Review" width="narrow">
        <ErrorPanel error={state.error} onRetry={refresh} />
      </PortalPage>
    )
  }
  if (detail === null) {
    return (
      <PortalPage title="Review" width="narrow">
        <PageHeader
          back={{ to: '/landlord/ratings', label: 'Reviews and ratings' }}
          title="This review isn’t available"
          description="It may still be sealed until everyone has rated, or it may have been taken down."
        />
      </PortalPage>
    )
  }
  if (!detail) {
    return (
      <PortalPage title="Review" width="narrow">
        <PageSkeleton label="Loading the review" />
      </PortalPage>
    )
  }

  const { review, can, replyClosesAt, aboutMe, mine } = detail
  const rater = ROLE_LABELS[review.reviewer.role].toLowerCase()
  const subjectRole = subjectRoleOf(review.direction)

  async function sendReply() {
    if (!reply.trim()) return setError('Write your reply first.')
    setBusy('reply')
    try {
      await api.replyToReview(viewer, id, reply)
      toast.success('Reply posted', {
        description: 'It shows under the review, with today’s date.',
      })
      setReply('')
    } catch (err) {
      setError(fieldErrors(err).body ?? errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function dispute() {
    setBusy('dispute')
    try {
      await api.disputeReview(viewer, id)
      toast.success('Marked as disputed', {
        description: `Readers see “${ROLE_LABELS[subjectRole]} disputes this” on the review.`,
      })
      setDisputing(false)
    } catch (err) {
      toast.error('That didn’t work', { description: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  async function sendUpdate() {
    setBusy('update')
    try {
      await api.addReviewUpdate(viewer, id, update)
      toast.success('Update added', {
        description: 'It shows with its date. Your original rating stays as it was.',
      })
      setUpdate('')
    } catch (err) {
      setError(fieldErrors(err).body ?? errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PortalPage title="Review" width="narrow">
      <PageHeader
        back={{ to: '/landlord/ratings', label: 'Reviews and ratings' }}
        eyebrow={aboutMe ? `About you, from a verified ${rater}` : mine ? 'Your rating' : 'Review'}
        title={aboutMe ? 'A review about you' : 'Your review'}
      />
      <section aria-labelledby="the-review" className="flex flex-col gap-3">
        <h2 id="the-review" className="sr-only">
          The review
        </h2>
        <ReviewCard review={review} onReport={can.report ? () => setReporting(true) : undefined} />
        <ReviewPolicyLink className="self-start" />
      </section>

      {aboutMe && can.reply ? (
        <Section
          title="Reply publicly"
          headingLevel="h2"
          description={`One reply, shown under the review for everyone to read. Up to ${RATING_RULES.reply.maxLength} characters${replyClosesAt ? `, until ${formatDate(replyClosesAt)}` : ''}. Keep to the facts and stay polite. It reflects on you.`}
        >
          <CheckedTextarea
            label="Your reply"
            value={reply}
            onChange={(value) => {
              setReply(value)
              setError(undefined)
            }}
            maxLength={RATING_RULES.reply.maxLength}
            rows={5}
            error={error}
            onBlockedChange={setBlocked}
          />
          <Button
            className="self-end"
            loading={busy === 'reply'}
            disabled={blocked}
            iconStart={<ArrowBendUpLeftIcon weight="bold" aria-hidden />}
            onClick={sendReply}
          >
            Post reply
          </Button>
        </Section>
      ) : aboutMe && review.reply ? (
        <p className="text-small text-muted">
          You’ve replied. Each review gets one reply, which can’t be edited.
        </p>
      ) : aboutMe ? (
        <p className="text-small text-muted">The 30 days to reply to this review have passed.</p>
      ) : null}

      {aboutMe && can.dispute ? (
        <Section
          title="Disagree with it?"
          headingLevel="h2"
          description={`You can mark the review as disputed. Readers see “${ROLE_LABELS[subjectRole]} disputes this” beside it. If it’s untrue and damaging, or fake, report it instead and we’ll look into it.`}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              iconStart={<ScalesIcon weight="bold" aria-hidden />}
              onClick={() => setDisputing(true)}
            >
              Mark as disputed
            </Button>
            <Button variant="ghost" onClick={() => setReporting(true)}>
              Report it
            </Button>
          </div>
        </Section>
      ) : null}

      {mine && can.update ? (
        <Section
          title="Add an update"
          headingLevel="h2"
          description="If something has changed since, you can add one dated update. Your original rating stays exactly as it was."
        >
          <Textarea
            label="Your update"
            value={update}
            onChange={(event) => {
              setUpdate(event.target.value)
              setError(undefined)
            }}
            maxLength={1000}
            showCount
            rows={4}
            error={error}
          />
          <Button className="self-end" loading={busy === 'update'} onClick={sendUpdate}>
            Add update
          </Button>
        </Section>
      ) : null}

      <ReportDialog
        target={{ kind: 'rating', ratingId: id }}
        what="this review"
        open={reporting}
        onOpenChange={setReporting}
      />
      <Dialog open={disputing} onOpenChange={setDisputing}>
        <DialogContent
          title="Mark this review as disputed?"
          description={`“${ROLE_LABELS[subjectRole]} disputes this” appears on the review for everyone. You can only do this once, and it can’t be taken back.`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDisputing(false)}>
                Cancel
              </Button>
              <Button loading={busy === 'dispute'} onClick={dispute}>
                Mark as disputed
              </Button>
            </>
          }
        />
      </Dialog>
    </PortalPage>
  )
}
