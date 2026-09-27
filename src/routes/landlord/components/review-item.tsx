import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRightIcon, ScalesIcon } from '@phosphor-icons/react'
import { useDemoNow } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import type { PublicReview } from '@/domain/types'
import { ReviewCard } from '@/components/slate/review-card'
import { cn } from '@/components/ui/cn'
import { ReportDialog } from './report-dialog'

export const REVIEW_POLICY_PATH = '/policies/reviews'

/** The plain-English review policy, linked from every rating (SPEC §6). */
export function ReviewPolicyLink({ className }: { className?: string }) {
  return (
    <Link
      to={REVIEW_POLICY_PATH}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-control text-small font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <ScalesIcon weight="bold" aria-hidden className="size-4" />
      How reviews work
    </Link>
  )
}

export interface ReviewItemProps {
  review: PublicReview
  /** The review is about this account, so it opens to its own page to reply or dispute. */
  aboutMe?: boolean
  headingLevel?: 'h3' | 'h4'
}

/** A review with its Report button, the policy link and, when it's about you, a way in to reply. */
export function ReviewItem({ review, aboutMe = false, headingLevel }: ReviewItemProps) {
  const navigate = useNavigate()
  const now = useDemoNow()
  const [reporting, setReporting] = useState(false)
  const href = `/landlord/reviews/${review.ratingId}`
  // The one reply is open for 30 days after the reveal; the review page checks it properly.
  const replyOpen =
    aboutMe &&
    !review.reply &&
    Date.parse(now) - Date.parse(review.revealedAt) < RATING_RULES.reply.withinDays * 86_400_000
  return (
    <div className="flex flex-col gap-1">
      <ReviewCard
        review={review}
        headingLevel={headingLevel}
        // A tenant passport never shows a single number (SPEC §5), not even per review; the
        // shared card shows each review's mean in its header, so it's hidden here.
        className={cn(review.direction === 'landlord->tenant' && '[&>header>p:last-child]:hidden')}
        onReport={() => setReporting(true)}
        onReply={replyOpen ? () => navigate(href) : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 px-1">
        <ReviewPolicyLink />
        {aboutMe ? (
          <Link
            to={href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control text-small font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Open review
            <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
          </Link>
        ) : null}
      </div>
      <ReportDialog
        target={{ kind: 'rating', ratingId: review.ratingId }}
        what="this review"
        open={reporting}
        onOpenChange={setReporting}
      />
    </div>
  )
}
