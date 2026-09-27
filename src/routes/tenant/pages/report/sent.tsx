// After sending a report: a clear "it's with them", and what happens next, in order.

import { Link, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { isId } from '@/domain/ids'
import { useSlateQuery } from '@/data'
import { LETTING_RULES } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { BRAND } from '@/config/brand'
import { NotFound, PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QueryError, UrgencyBadge } from '../../components/basics'
import { EmergencyAdvice } from '../../components/emergency-advice'
import { currentHome, loadHomes } from '../../lib/data'
import { firstName } from '../../lib/format'

/** A tick that draws itself in, once. Still for anyone who prefers less motion. */
function SentMark() {
  const reduce = useReducedMotion()
  return (
    <motion.span
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="flex size-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-raised ring-8 ring-accent-tint"
    >
      <svg viewBox="0 0 24 24" className="size-10" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </motion.span>
  )
}

export function ReportSentPage() {
  const { jobId } = useParams()
  const viewer = useViewer()
  const validId = isId('job', jobId) ? jobId : null
  const { state, refresh } = useSlateQuery(
    async (api) => {
      if (!validId) return null
      const [job, homes] = await Promise.all([api.getJob(viewer, validId), loadHomes(api, viewer)])
      return job ? { job, home: currentHome(homes) } : null
    },
    [viewer, validId],
  )

  if (!validId || (state.status === 'success' && !state.data)) return <NotFound />
  if (state.status === 'loading') {
    return (
      <PortalPage title="Report sent" width="narrow">
        <LoadingRegion label="Loading" className="flex flex-col items-center gap-4 pt-8">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-40 w-full rounded-card" />
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Report sent" width="narrow">
        <QueryError what="your report" onRetry={refresh} />
      </PortalPage>
    )
  }

  const { job, home } = state.data
  const landlord = home?.landlord ? firstName(home.landlord.displayName) : 'Your landlord'
  const emergency = job.urgency === 'emergency'
  const steps = [
    {
      title: `${landlord} approves it`,
      body: emergency
        ? 'You marked it as an emergency, so they know it can’t wait.'
        : 'They, or their letting agent, look at what you’ve sent and your photos.',
    },
    {
      title: `${landlord} chooses who fixes it`,
      body: `They pick the trade themselves. ${BRAND.name} never chooses for them.`,
    },
    {
      title: 'You get written notice before any visit',
      body: emergency
        ? `In an emergency, someone can come without ${LETTING_RULES.visitNoticeHours} hours’ notice.`
        : `At least ${LETTING_RULES.visitNoticeHours} hours ahead, with who’s coming and when.`,
    },
    {
      title: 'You confirm it’s done, then rate it',
      body: 'Ratings stay sealed until everyone has rated, so nobody can react to anyone else’s.',
    },
  ]

  return (
    <PortalPage title="Report sent" width="narrow" className="gap-8">
      <header className="flex flex-col items-center gap-5 pt-2 text-center sm:pt-6">
        <SentMark />
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-display-l font-semibold text-ink">Sent to {landlord}</h1>
          <p className="max-w-md text-body-l text-muted">
            <span className="font-semibold text-ink">{job.title}</span> is on its way.{' '}
            {landlord === 'Your landlord' ? 'They' : landlord} can see it now, and you’ll hear as
            soon as anything changes.
          </p>
          <UrgencyBadge urgency={job.urgency} size="md" />
        </div>
      </header>

      {emergency ? <EmergencyAdvice /> : null}

      <section aria-labelledby="next-title" className="flex flex-col gap-4">
        <h2 id="next-title" className="font-display text-display-m font-semibold text-ink">
          What happens next
        </h2>
        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.06, duration: 0.25 }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-9 bottom-1 left-4 w-0.5 -translate-x-1/2 bg-line"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-8 shrink-0 items-center justify-center rounded-full font-semibold figures',
                  index === 0
                    ? 'bg-accent text-on-accent'
                    : 'border-2 border-input-border bg-surface text-muted',
                )}
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5 pt-1">
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="text-small text-muted">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link
          to={`/tenant/jobs/${job.id}`}
          className={cn(buttonVariants({ size: 'lg' }), 'sm:flex-1')}
        >
          Follow your repair
        </Link>
        <Link
          to="/tenant"
          className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'sm:flex-1')}
        >
          Back to home
        </Link>
      </div>
    </PortalPage>
  )
}
