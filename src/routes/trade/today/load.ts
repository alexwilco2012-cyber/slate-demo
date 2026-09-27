// Everything the Today screen shows, read in one go.

import type { ActionItem, JobBoardPost, SlateApi, Viewer } from '@/data'
import type { ClientRating, PersonId, Quote } from '@/domain/types'
import { loadClientRatings, loadJobs, type JobsOverview } from '../lib/queries'

export interface TodayData extends JobsOverview {
  actions: ActionItem[]
  /** Open jobs for the trade's own kind of work that they haven't quoted for yet. */
  newPosts: JobBoardPost[]
  /** Quotes still waiting for an answer, with the post they're for when it's a board job. */
  waiting: { quote: Quote; post: JobBoardPost | undefined; title: string }[]
  clients: Record<PersonId, ClientRating>
}

export async function loadToday(api: SlateApi, viewer: Viewer): Promise<TodayData> {
  const [overview, actions, mine, everything] = await Promise.all([
    loadJobs(api, viewer),
    api.listActionsNeeded(viewer),
    api.listJobBoard(viewer, { trades: 'mine' }),
    api.listJobBoard(viewer),
  ])
  const quoted = everything.filter((post) => post.myQuoteId)
  const boardQuotes = (await Promise.all(quoted.map((post) => api.listQuotes(viewer, post.jobId))))
    .flat()
    .filter((quote) => quote.status === 'submitted')
  const directQuotes = overview.views.flatMap((view) =>
    view.quotes
      .filter((quote) => quote.status === 'submitted')
      .map((quote) => ({ quote, post: undefined, title: view.job.title })),
  )
  const waiting = [
    ...boardQuotes.map((quote) => {
      const post = quoted.find((candidate) => candidate.jobId === quote.jobId)
      return { quote, post, title: post?.title ?? 'Job' }
    }),
    ...directQuotes,
  ]
  const clients = await loadClientRatings(api, viewer, [
    ...mine.map((post) => post.landlordId),
    ...quoted.map((post) => post.landlordId),
    ...overview.views.flatMap((view) =>
      view.job.payment && view.property ? [view.property.landlordId] : [],
    ),
  ])
  return {
    ...overview,
    actions,
    newPosts: mine.filter((post) => !post.myQuoteId),
    waiting,
    clients,
  }
}
