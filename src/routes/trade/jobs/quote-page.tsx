// Quoting for a job a landlord chose the trade for directly (not from the board).

import { Link, Navigate, useParams } from 'react-router'
import { SignpostIcon } from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import { JOB_CATEGORY_LABELS } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QuoteBuilder } from '../board/quote-builder'
import { LoadError, PageSkeleton } from '../components/page-bits'
import { PhotoGrid } from '../components/photos'
import { firstNameOf } from '../lib/job'

export default function QuotePage() {
  const { jobId } = useParams()
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      if (!isId('job', jobId)) return null
      const job = await api.getJob(viewer, jobId)
      if (!job) return null
      const [property, quotes, saved, me] = await Promise.all([
        api.getProperty(viewer, job.propertyId),
        api.listQuotes(viewer, job.id),
        api.listSavedLineItems(viewer),
        api.getMe(viewer),
      ])
      const landlord = property ? await api.getPerson(viewer, property.landlordId) : null
      return { job, property, quotes, saved, me, landlord }
    },
    [viewer, jobId],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Quote" width="wide">
        <PageSkeleton label="Loading" />
      </PortalPage>
    )
  }
  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Quote">
        <PageHeader back={{ to: '/trade', label: 'Jobs' }} title="Quote" />
        <LoadError what="this job" onRetry={refresh} />
      </PortalPage>
    )
  }
  const data = state.data
  if (!data) {
    return (
      <PortalPage title="Quote">
        <PageHeader back={{ to: '/trade', label: 'Jobs' }} title="Quote" />
        <EmptyState
          icon={SignpostIcon}
          headingLevel="h2"
          title="This job isn’t on your list"
          description="You can quote for jobs a landlord has chosen you for, or ones on the job board."
          action={
            <Link to="/trade" className={buttonVariants({ variant: 'primary' })}>
              Go to your jobs
            </Link>
          }
        />
      </PortalPage>
    )
  }
  const { job, property, quotes, saved, me, landlord } = data
  const canQuote =
    job.status === 'quoting' &&
    !job.acceptedQuoteId &&
    !quotes.some((quote) => quote.status === 'submitted')
  if (!canQuote) return <Navigate to={`/trade/jobs/${job.id}`} replace />
  const landlordName = firstNameOf(landlord?.displayName, 'The landlord')

  return (
    <PortalPage title={`Quote: ${job.title}`} width="wide">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <PageHeader
            back={{ to: `/trade/jobs/${job.id}`, label: 'Back to the job' }}
            eyebrow={`${property?.neighbourhood ?? ''} · ${JOB_CATEGORY_LABELS[job.category]}`}
            title={`Quote: ${job.title}`}
            description={`${landlordName} chose you to price this. They see your lines, total and note.`}
          />
          <p className="text-ink">{job.description}</p>
          {job.photos.length > 0 ? <PhotoGrid photos={job.photos} /> : null}
        </div>
        <QuoteBuilder
          jobId={job.id}
          saved={saved}
          vatRegistered={me.tradeProfile?.vatRegistered ?? false}
          landlordName={landlordName}
          doneTo={`/trade/jobs/${job.id}`}
        />
      </div>
    </PortalPage>
  )
}
