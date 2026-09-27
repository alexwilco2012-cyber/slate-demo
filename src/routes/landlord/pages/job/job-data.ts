// Everything the job page needs in one read, so the page appears whole rather than in pieces.

import { useSlateQuery, type RatingTask, type ThreadSummary } from '@/data'
import type { Job, JobId, PersonId, Property, Quote, Tenancy, TradeScore } from '@/domain/types'
import { useViewer } from '@/session'

export interface JobData {
  job: Job
  property: Property | null
  tenancy: Tenancy | null
  quotes: Quote[]
  /** Scores of every trade who quoted or was chosen, by trade. */
  scores: Map<PersonId, TradeScore>
  /** The landlord's own rating task for this job, if one is open or done. */
  ratingTask: RatingTask | undefined
  /** "Access given: yes/no" from the trade's rating of the tenant, once revealed. */
  accessGiven: boolean | null
  thread: ThreadSummary | undefined
}

export function useJobData(jobId: JobId) {
  const viewer = useViewer()
  return useSlateQuery(
    async (api): Promise<JobData | null> => {
      const job = await api.getJob(viewer, jobId)
      if (!job) return null
      const [quotes, property, tenancy, tasks, accessGiven, threads] = await Promise.all([
        api.listQuotes(viewer, jobId),
        api.getProperty(viewer, job.propertyId),
        job.tenancyId ? api.getTenancy(viewer, job.tenancyId) : Promise.resolve(null),
        api.listRatingTasks(viewer),
        job.status === 'completed' || job.status === 'confirmed'
          ? api.getAccessGiven(viewer, jobId).catch(() => null)
          : Promise.resolve(null),
        api.listThreads(viewer),
      ])
      const tradeIds = [
        ...new Set([...quotes.map((q) => q.tradeId), ...(job.tradeId ? [job.tradeId] : [])]),
      ]
      const scores = new Map<PersonId, TradeScore>(
        await Promise.all(
          tradeIds.map(async (id) => [id, await api.getTradeScore(viewer, id)] as const),
        ),
      )
      return {
        job,
        property,
        tenancy,
        quotes,
        scores,
        ratingTask: tasks.find(
          (task) =>
            task.context.kind === 'job' &&
            task.context.jobId === jobId &&
            task.direction === 'landlord->trade',
        ),
        accessGiven,
        thread: threads.find(
          (t) => t.thread.context.kind === 'job' && t.thread.context.jobId === jobId,
        ),
      }
    },
    [viewer, jobId],
  )
}

/** Everyone the page names: reporter, trades, tenants and whoever did each step. */
export function peopleOnJob(data: JobData | null | undefined): PersonId[] {
  if (!data) return []
  const { job, quotes, tenancy } = data
  return [
    job.reportedById,
    ...(job.tradeId ? [job.tradeId] : []),
    ...quotes.map((q) => q.tradeId),
    ...(tenancy?.tenantIds ?? []),
    ...job.timeline.flatMap((event) => (event.actorId ? [event.actorId] : [])),
  ]
}
