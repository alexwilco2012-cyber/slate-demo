// Appending to a job's timeline. Events are only ever added, never changed or removed.

import { newId } from '@/domain/ids'
import type { Job, JobEvent, PersonId } from '@/domain/types'
import type { Draft } from './tx'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A job event before it has an id, a time and an actor. */
export type NewJobEvent = DistributiveOmit<JobEvent, 'id' | 'at' | 'actorId'>

export function eventOf(event: NewJobEvent, at: string, actorId: PersonId | null): JobEvent {
  // Adding back exactly the omitted base fields rebuilds a JobEvent of the same kind.
  return { ...event, id: newId('event'), at, actorId } as JobEvent
}

/** Adds an event at the draft's "now" and saves the job. Pass the latest copy of the job. */
export function appendEvent(
  tx: Draft,
  job: Job,
  event: NewJobEvent,
  actorId: PersonId | null = null,
): Job {
  return tx.put('jobs', {
    ...job,
    timeline: [...job.timeline, eventOf(event, tx.now, actorId)],
    updatedAt: tx.now,
  })
}
