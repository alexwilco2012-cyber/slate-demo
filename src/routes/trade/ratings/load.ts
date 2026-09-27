import type { RatingTask, SlateApi, Viewer } from '@/data'
import { RELATIONSHIPS } from '@/domain/criteria'
import type { Job, JobId, PersonCard, Rating, RatingDirection } from '@/domain/types'

export interface RateData {
  job: Job
  task: RatingTask
  subject: PersonCard | null
  /** A draft the trade saved earlier. */
  draft: Rating | null
  wouldAgainQuestion: string
}

/** The rating a trade owes on a job in one direction, or has already sent. */
export async function loadRate(
  api: SlateApi,
  viewer: Viewer,
  jobId: JobId,
  direction: RatingDirection,
): Promise<RateData | null> {
  const [job, tasks] = await Promise.all([api.getJob(viewer, jobId), api.listRatingTasks(viewer)])
  if (!job) return null
  const task = tasks.find(
    (candidate) =>
      candidate.direction === direction &&
      candidate.context.kind === 'job' &&
      candidate.context.jobId === jobId,
  )
  if (!task) return null
  const [subject, draft] = await Promise.all([
    api.getPerson(viewer, task.subjectId),
    task.ratingId ? api.getRating(viewer, task.ratingId) : Promise.resolve(null),
  ])
  return {
    job,
    task,
    subject,
    draft: draft?.state === 'draft' ? draft : null,
    wouldAgainQuestion: RELATIONSHIPS[direction].wouldAgainQuestion,
  }
}
