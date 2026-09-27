// Reads the trade screens share, each one call to useSlateQuery so a screen refreshes as a whole
// when anything changes in this tab or another.

import { useEffect, useState } from 'react'
import { useSlate, type AwayFeed, type SlateApi, type Viewer } from '@/data'
import type {
  ClientRating,
  Job,
  PersonCard,
  PersonId,
  Property,
  Quote,
  Thread,
} from '@/domain/types'

export interface JobView {
  job: Job
  property: Property | null
  thread: Thread | undefined
  /** The trade's own quotes on the job, oldest first. */
  quotes: Quote[]
}

export interface JobsOverview {
  views: JobView[]
  people: Record<PersonId, PersonCard>
}

function unique<T>(values: readonly (T | null | undefined)[]): T[] {
  return [...new Set(values.filter((value): value is T => value != null))]
}

export function peopleById(cards: readonly PersonCard[]): Record<PersonId, PersonCard> {
  return Object.fromEntries(cards.map((card) => [card.id, card]))
}

/** Every job the trade is instructed on, with its home, conversation, quotes and people. */
export async function loadJobs(api: SlateApi, viewer: Viewer): Promise<JobsOverview> {
  const [jobs, threads] = await Promise.all([api.listJobs(viewer), api.listThreads(viewer)])
  const propertyIds = unique(jobs.map((job) => job.propertyId))
  const [properties, quotes] = await Promise.all([
    Promise.all(propertyIds.map((id) => api.getProperty(viewer, id))),
    Promise.all(jobs.map((job) => api.listQuotes(viewer, job.id))),
  ])
  const propertyById = new Map(propertyIds.map((id, index) => [id, properties[index] ?? null]))
  const threadByJob = new Map<string, Thread>()
  for (const { thread } of threads) {
    if (thread.context.kind === 'job') threadByJob.set(thread.context.jobId, thread)
  }
  const people = await api.getPeople(
    viewer,
    unique([
      ...threads.flatMap(({ thread }) => thread.members.map((member) => member.personId)),
      ...properties.map((property) => property?.landlordId),
    ]),
  )
  return {
    views: jobs.map((job, index) => ({
      job,
      property: propertyById.get(job.propertyId) ?? null,
      thread: threadByJob.get(job.id),
      quotes: quotes[index] ?? [],
    })),
    people: peopleById(people),
  }
}

/** Client ratings for the landlords given, for "Paid on time on X of Y jobs". */
export async function loadClientRatings(
  api: SlateApi,
  viewer: Viewer,
  landlordIds: readonly PersonId[],
): Promise<Record<PersonId, ClientRating>> {
  const ids = unique(landlordIds)
  const ratings = await Promise.all(
    ids.map((id) => api.getClientRating(viewer, id).catch(() => null)),
  )
  return Object.fromEntries(
    ids.flatMap((id, index) => {
      const rating = ratings[index]
      return rating ? [[id, rating] as const] : []
    }),
  )
}

// A strict-mode remount runs cleanup and mount back to back: a mark scheduled by the cleanup is
// cancelled by the next mount, so only really leaving the screen marks the feed seen.
let pendingMark: number | undefined

/**
 * "While you were away": read once when the screen opens and kept, then marked seen when the
 * trade leaves the screen (marking empties it). `dismiss` marks it seen straight away.
 */
export function useAwayFeed(viewer: Viewer) {
  const { api } = useSlate()
  const [feed, setFeed] = useState<AwayFeed | null>(null)

  useEffect(() => {
    window.clearTimeout(pendingMark)
    let live = true
    api
      .getAwayFeed(viewer)
      .then((next) => {
        if (live) setFeed(next)
      })
      .catch(() => {
        // Nice to have: without it the screen still shows everything that needs doing.
      })
    return () => {
      live = false
      pendingMark = window.setTimeout(() => void api.markAwaySeen(viewer), 0)
    }
  }, [api, viewer])

  return {
    feed,
    dismiss: () => {
      setFeed(null)
      void api.markAwaySeen(viewer)
    },
  }
}
