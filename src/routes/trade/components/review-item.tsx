// A revealed review with what every rating must carry: a link to the review policy and a Report
// button with the four routes. The person it's about also gets their way to reply or dispute.

import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowBendUpLeftIcon, FlagIcon, ScalesIcon } from '@phosphor-icons/react'
import { useDemoNow } from '@/data'
import { RATING_RULES } from '@/domain/criteria'
import type { PublicReview } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { ReviewCard } from '@/components/slate/review-card'
import { daysBetween, formatDate } from '@/components/slate/format'
import { ReportDialog } from './report-dialog'

export function ReviewItem({
  review,
  aboutMe = false,
  mine = false,
  headingLevel,
  linkToPage = true,
  className,
}: {
  review: PublicReview
  /** Off on the review's own page, where replying happens. */
  linkToPage?: boolean
  /** The trade is the one reviewed: they can reply once and dispute it. */
  aboutMe?: boolean
  /** The trade wrote it: no reporting their own words. */
  mine?: boolean
  headingLevel?: 'h3' | 'h4'
  className?: string
}) {
  const [reporting, setReporting] = useState(false)
  const now = useDemoNow()
  const to = `/trade/reviews/${review.ratingId}`
  // The button names what's still possible: one reply within 30 days, a dispute note at any time.
  const canReply =
    !review.reply && daysBetween(review.revealedAt, now) <= RATING_RULES.reply.withinDays
  const respondLabel = canReply ? 'Reply or dispute' : review.dispute ? 'Open' : 'Dispute'
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-line bg-surface shadow-soft',
        className,
      )}
    >
      <ReviewCard
        review={review}
        headingLevel={headingLevel}
        className="rounded-none border-0 shadow-none"
      />
      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line px-4 py-3 sm:px-5">
        <p className="text-small text-muted">
          Revealed {formatDate(review.revealedAt)} ·{' '}
          <Link
            to="/policies/reviews"
            className="font-semibold text-accent-text underline underline-offset-2"
          >
            Review policy
          </Link>
        </p>
        <div className="flex flex-wrap gap-(--gap-touch)">
          {!linkToPage ? null : aboutMe ? (
            <Link to={to} className={cn(buttonVariants({ variant: 'soft', size: 'sm' }))}>
              {respondLabel === 'Dispute' ? (
                <ScalesIcon weight="bold" aria-hidden />
              ) : (
                <ArrowBendUpLeftIcon weight="bold" aria-hidden />
              )}
              {respondLabel}
            </Link>
          ) : mine ? (
            <Link to={to} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Open<span className="sr-only"> your rating</span>
            </Link>
          ) : null}
          {!mine ? (
            <Button
              variant="ghost"
              size="sm"
              iconStart={<FlagIcon weight="bold" aria-hidden />}
              onClick={() => setReporting(true)}
            >
              Report
            </Button>
          ) : null}
        </div>
      </footer>
      <ReportDialog
        target={{ kind: 'rating', ratingId: review.ratingId }}
        what="this review"
        open={reporting}
        onOpenChange={setReporting}
      />
    </div>
  )
}
