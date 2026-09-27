// How a landlord is as a client, from other trades: "Paid on time on X of Y jobs" and the client
// rating. Trades see this before they quote, so a slow payer is visible up front.

import { CheckCircleIcon, ClockCountdownIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { paidOnTimeText } from '@/domain/rating'
import type { ClientRating } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatScore, plural } from '@/components/slate/format'
import { scoreWords } from '@/components/slate/score-words'

type PaymentRecord = 'good' | 'mixed' | 'poor' | 'none'

export function paymentRecord(rating: ClientRating): PaymentRecord {
  const { onTime, jobs } = rating.paidOnTime
  if (jobs === 0) return 'none'
  const share = onTime / jobs
  if (share >= 0.8) return 'good'
  if (share < 0.5) return 'poor'
  return 'mixed'
}

/** "Paid on time on 0 of 3 jobs", with an icon that says the same thing as the words. */
export function PaidOnTime({
  rating,
  as: Element = 'p',
  className,
}: {
  rating: ClientRating
  /** 'span' inside a link, where a paragraph isn't allowed. */
  as?: 'p' | 'span'
  className?: string
}) {
  const record = paymentRecord(rating)
  const Glyph =
    record === 'good' ? CheckCircleIcon : record === 'poor' ? WarningCircleIcon : ClockCountdownIcon
  return (
    <Element
      className={cn(
        'flex items-start gap-2 font-semibold',
        record === 'poor' ? 'text-critical' : 'text-ink',
        className,
      )}
    >
      <Glyph
        weight={record === 'none' ? 'regular' : 'fill'}
        aria-hidden
        className={cn(
          'mt-0.5 size-5 shrink-0',
          record === 'good' && 'text-positive',
          record === 'mixed' && 'text-muted',
        )}
      />
      <span>{record === 'none' ? 'No payment record yet' : paidOnTimeText(rating.paidOnTime)}</span>
    </Element>
  )
}

/** "Client rating 4.3 · Better than expected · 4 reviews", or "New" before 3 reviewers. */
export function ClientScore({ rating, className }: { rating: ClientRating; className?: string }) {
  const { score, reviewCount } = rating.summary
  return (
    <p className={cn('text-small text-muted', className)}>
      Client rating from trades:{' '}
      {score !== null ? (
        <>
          <span className="figures font-bold text-ink">{formatScore(score)}</span>
          <span className="sr-only"> out of 5</span>{' '}
          <span className="text-ink">{scoreWords(score)}</span> · {plural(reviewCount, 'review')}
        </>
      ) : (
        <span className="text-ink">New · {plural(reviewCount, 'verified review')}</span>
      )}
    </p>
  )
}
