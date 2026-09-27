// After sending a rating. If the other side had already rated, both are revealed together: the
// lock opens and their review of the trade slides in. Otherwise it stays sealed until they rate
// or the window closes, and the page says when that will be.

import { Link } from 'react-router'
import { motion } from 'motion/react'
import { LockSimpleIcon, LockSimpleOpenIcon } from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import type { PublicReview, Rating } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import type { RateWho } from '../jobs/job-ratings'
import { formatShortDay } from '../lib/time'
import type { RateData } from './load'
import { ReviewItem } from '../components/review-item'

const EASE = [0.22, 1, 0.36, 1] as const

export function RatingSent({
  rating,
  data,
  who,
  name,
}: {
  rating: Rating
  data: RateData
  who: RateWho
  name: string
}) {
  const viewer = useViewer()
  const revealed = rating.state === 'revealed'
  const { job } = data
  // What they said about the trade on this job, now it's out.
  const { state } = useSlateQuery(
    async (api) => {
      if (!revealed) return null
      const profile = await api.getTradeProfile(viewer, viewer.personId)
      const list = who === 'landlord' ? profile?.fromLandlords : profile?.fromTenants
      return (
        list?.find(
          (review: PublicReview) =>
            review.propertyId === job.propertyId &&
            review.context.kind === 'job' &&
            review.context.title === job.title,
        ) ?? null
      )
    },
    [viewer, revealed, who, job.id],
  )
  const theirs = state.data

  return (
    <PortalPage title={`Rated ${name}`} width="narrow">
      <PageHeader back={{ to: `/trade/jobs/${job.id}`, label: 'Back to the job' }} title="Sent" />

      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-5 py-8 text-center shadow-soft"
      >
        <span className="relative flex size-18 items-center justify-center rounded-full bg-accent-tint text-accent-text">
          {revealed ? (
            <>
              <motion.span
                initial={{ opacity: 1, rotate: 0 }}
                animate={{ opacity: 0, rotate: -12 }}
                transition={{ delay: 0.35, duration: 0.25 }}
                className="absolute"
              >
                <LockSimpleIcon weight="duotone" aria-hidden className="size-9" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3, ease: EASE }}
                className="absolute"
              >
                <LockSimpleOpenIcon weight="duotone" aria-hidden className="size-9" />
              </motion.span>
            </>
          ) : (
            <LockSimpleIcon weight="duotone" aria-hidden className="size-9" />
          )}
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="font-display text-display-l font-semibold text-ink">
            {revealed ? 'Both ratings are in' : `Your rating of ${name} is sealed`}
          </h2>
          <p className="text-body-l text-ink">
            {revealed
              ? `${name} had already rated you, so both are revealed together now.`
              : rating.revealAt
                ? `Nobody sees it until ${name} rates you too, or ${formatShortDay(rating.revealAt)} at the latest. Then both are revealed together.`
                : `Nobody sees it until everyone on this job has rated. Then they’re revealed together.`}
          </p>
          {who === 'landlord' ? (
            <p className="text-small text-muted">
              Other trades see yours on {name}’s client profile once {name}’s rating of you is
              locked in.
            </p>
          ) : (
            <p className="text-small text-muted">
              Only {name} sees yours. Their landlord only sees whether you got in as arranged.
            </p>
          )}
        </div>
      </motion.section>

      {revealed && theirs ? (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.35, ease: EASE }}
          aria-labelledby="their-review"
          className="flex flex-col gap-3"
        >
          <h2 id="their-review" className="font-display text-display-m font-semibold text-ink">
            What {name} said about you
          </h2>
          <ReviewItem review={theirs} aboutMe />
        </motion.section>
      ) : null}

      <div className="flex flex-col gap-(--gap-touch) sm:flex-row">
        <Link to={`/trade/jobs/${job.id}`} className={buttonVariants({ variant: 'primary' })}>
          Back to the job
        </Link>
        <Link to="/trade/ratings" className={buttonVariants({ variant: 'secondary' })}>
          Your ratings
        </Link>
      </div>
    </PortalPage>
  )
}
