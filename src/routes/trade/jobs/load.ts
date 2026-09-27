// Everything the job screen needs, except the messages (the chat reads those itself).

import type { RatingTask, SlateApi, Viewer } from '@/data'
import type {
  ClientRating,
  Job,
  JobId,
  PersonCard,
  PersonId,
  Property,
  Rating,
  RatingId,
  Quote,
  Thread,
} from '@/domain/types'
import { peopleById } from '../lib/queries'

export interface JobData {
  job: Job
  property: Property | null
  thread: Thread | undefined
  /** The trade's own quotes, oldest first. */
  quotes: Quote[]
  people: Record<PersonId, PersonCard>
  landlord: PersonCard | undefined
  client: ClientRating | undefined
  /** Ratings the trade owes, or has written, on this job. */
  tasks: RatingTask[]
  /** The trade's own sent ratings on this job, to say whether each is sealed or revealed. */
  sent: Record<RatingId, Rating>
}

export type JobLoad = { found: true; data: JobData } | { found: false; onBoard: boolean }

export async function loadJob(api: SlateApi, viewer: Viewer, jobId: JobId): Promise<JobLoad> {
  const job = await api.getJob(viewer, jobId)
  if (!job) {
    // Not instructed on it: it may still be open on the job board.
    const post = await api.getJobBoardPost(viewer, jobId).catch(() => null)
    return { found: false, onBoard: post !== null }
  }
  const [property, threads, quotes, tasks] = await Promise.all([
    api.getProperty(viewer, job.propertyId),
    api.listThreads(viewer),
    api.listQuotes(viewer, job.id),
    api.listRatingTasks(viewer),
  ])
  let thread = threads.find(
    (summary) => summary.thread.context.kind === 'job' && summary.thread.context.jobId === job.id,
  )?.thread
  if (!thread) {
    thread = await api.getThreadFor(viewer, { kind: 'job', jobId: job.id }).catch(() => undefined)
  }
  const landlordId = property?.landlordId
  const [people, client] = await Promise.all([
    api.getPeople(viewer, [
      ...(thread?.members.map((member) => member.personId) ?? []),
      ...(landlordId ? [landlordId] : []),
    ]),
    landlordId ? api.getClientRating(viewer, landlordId).catch(() => undefined) : undefined,
  ])
  const byId = peopleById(people)
  const mine = tasks.filter((task) => task.context.kind === 'job' && task.context.jobId === job.id)
  const written = await Promise.all(
    mine.flatMap((task) => (task.ratingId ? [api.getRating(viewer, task.ratingId)] : [])),
  )
  return {
    found: true,
    data: {
      job,
      property,
      thread,
      quotes,
      people: byId,
      landlord: landlordId ? byId[landlordId] : undefined,
      client,
      tasks: mine,
      sent: Object.fromEntries(
        written.flatMap((rating) => (rating ? [[rating.id, rating] as const] : [])),
      ),
    },
  }
}
