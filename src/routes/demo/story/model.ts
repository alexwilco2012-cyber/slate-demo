// Where the story has got to, worked out from the data alone: whatever anyone taps in any of the
// three phones (or "Skip ahead" does for them) moves it on. Nothing here is stored.

import type { RatingTask, SlateApi } from '@/data/api'
import { DEMO_NOW } from '@/data'
import type { RatingDirection } from '@/domain/criteria'
import {
  JOB_PIPELINE,
  type IsoDateTime,
  type Job,
  type JobStatus,
  type Quote,
  type Visit,
} from '@/domain/types'
import { CAST, CAST_ORDER, type CastKey } from '../cast'
import { ukDay } from '../lib/time'

export const STEP_IDS = [
  'report',
  'approve',
  'choose',
  'quote',
  'instruct',
  'book',
  'visit_day',
  'work',
  'confirm_visit',
  'confirm_job',
  'rate',
  'reveal',
] as const
export type StepId = (typeof STEP_IDS)[number]

/** Who acts: one of the three phones, the demo clock, or everyone who still owes a rating. */
export type StepActor = CastKey | 'clock' | 'everyone'

export interface StorySnapshot {
  now: IsoDateTime
  /** The repair Sarah reported in this demo session, as the landlord sees it. */
  job: Job | null
  /** The live quote on it (sent or accepted), newest first. */
  quote: Quote | null
  /** Ratings owed or written on the job, by any of the three. */
  tasks: RatingTask[]
}

export interface RatingLine {
  direction: RatingDirection
  rater: CastKey
  subject: CastKey
  status: 'not_open' | RatingTask['status']
  /** Sarah's per-repair rating of Graham: never revealed on its own (the retaliation shield). */
  shielded: boolean
}

export type StepStatus = 'done' | 'current' | 'upcoming'

export type Derailment = 'declined' | 'cancelled' | 'other_trade'

export interface StoryState {
  snapshot: StorySnapshot
  status: Record<StepId, StepStatus>
  /** The first step not yet done, or null once the whole story has been told. */
  current: StepId | null
  /** Steps done, for the progress bar. */
  doneCount: number
  /**
   * The story can't go on as told: the repair was declined or called off, or Graham chose a trade
   * other than Kev, whose phone isn't on the page.
   */
  derailed: Derailment | null
  visit: Visit | null
  /** The job went to the board rather than to a trade Graham picked himself. */
  onBoard: boolean
  ratings: RatingLine[]
}

/** The five ratings a finished repair owes, in the order the story lists them. */
export const RATING_LINES: readonly Omit<RatingLine, 'status'>[] = [
  { direction: 'tenant->trade', rater: 'tenant', subject: 'trade', shielded: false },
  { direction: 'tenant->landlord', rater: 'tenant', subject: 'landlord', shielded: true },
  { direction: 'trade->tenant', rater: 'trade', subject: 'tenant', shielded: false },
  { direction: 'trade->landlord', rater: 'trade', subject: 'landlord', shielded: false },
  { direction: 'landlord->trade', rater: 'landlord', subject: 'trade', shielded: false },
]

const EMPTY: StorySnapshot = { now: DEMO_NOW, job: null, quote: null, tasks: [] }

/** Reads everything the story depends on, as the three people themselves would see it. */
export async function loadStory(api: SlateApi, now: IsoDateTime): Promise<StorySnapshot> {
  const reported = await api.listJobs(CAST.tenant.viewer)
  // Seed jobs were all reported before the demo's "now"; anything later is this session's.
  const mine = reported
    .filter((job) => job.reportedById === CAST.tenant.personId && job.createdAt > DEMO_NOW)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!mine) return { ...EMPTY, now }

  const landlord = CAST.landlord.viewer
  const [job, quotes, ...taskLists] = await Promise.all([
    api.getJob(landlord, mine.id),
    api.listQuotes(landlord, mine.id),
    ...CAST_ORDER.map((key) => api.listRatingTasks(CAST[key].viewer)),
  ])
  const quote =
    quotes
      .filter((q) => q.status === 'submitted' || q.status === 'accepted')
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null
  const tasks = taskLists
    .flat()
    .filter((task) => task.context.kind === 'job' && task.context.jobId === mine.id)
  return { now, job: job ?? mine, quote, tasks }
}

function stage(status: JobStatus): number {
  return (JOB_PIPELINE as readonly string[]).indexOf(status)
}

function reached(job: Job | null, status: (typeof JOB_PIPELINE)[number]): boolean {
  return job !== null && stage(job.status) >= stage(status)
}

/** The repair visit: the one still to happen, or the one that did. */
export function repairVisit(job: Job | null): Visit | null {
  if (!job) return null
  const visits = job.visits.filter((v) => v.purpose !== 'quote')
  return (
    visits.find((v) => v.status === 'booked' || v.status === 'on_site') ??
    visits.findLast((v) => v.status === 'done') ??
    null
  )
}

function ratingLines(tasks: readonly RatingTask[]): RatingLine[] {
  return RATING_LINES.map((line) => {
    const task = tasks.find(
      (t) => t.direction === line.direction && t.subjectId === CAST[line.subject].personId,
    )
    return { ...line, status: task?.status ?? 'not_open' }
  })
}

export function storyState(snapshot: StorySnapshot): StoryState {
  const { job, quote, now } = snapshot
  const visit = repairVisit(job)
  const ratings = ratingLines(snapshot.tasks)
  const revealed = job?.timeline.some((e) => e.kind === 'ratings_revealed') ?? false
  const everyoneRated =
    ratings.filter((r) => !r.shielded).every((r) => r.status === 'submitted') &&
    ratings.every((r) => r.status === 'submitted' || r.status === 'not_open')

  const done: Record<StepId, boolean> = {
    report: job !== null,
    approve: reached(job, 'approved'),
    choose:
      reached(job, 'quoting') ||
      (job?.timeline.some((e) => e.kind === 'trade_chosen' || e.kind === 'posted_to_board') ??
        false),
    quote: quote !== null || reached(job, 'instructed'),
    instruct: reached(job, 'instructed'),
    book: reached(job, 'booked'),
    visit_day:
      reached(job, 'in_progress') || (visit !== null && ukDay(now) >= ukDay(visit.startsAt)),
    work: reached(job, 'completed'),
    confirm_visit: visit?.tenantConfirmedAt !== undefined || revealed,
    confirm_job: reached(job, 'confirmed'),
    rate: everyoneRated || revealed,
    reveal: revealed,
  }

  const current = STEP_IDS.find((id) => !done[id]) ?? null
  const status = Object.fromEntries(
    STEP_IDS.map((id) => [id, done[id] ? 'done' : id === current ? 'current' : 'upcoming']),
  ) as Record<StepId, StepStatus>
  const derailed: Derailment | null =
    job?.status === 'declined'
      ? 'declined'
      : job?.status === 'cancelled'
        ? 'cancelled'
        : job?.tradeId && job.tradeId !== CAST.trade.personId
          ? 'other_trade'
          : null

  return {
    snapshot,
    status,
    current,
    doneCount: STEP_IDS.filter((id) => done[id]).length,
    derailed,
    visit,
    onBoard: Boolean(job?.board) && !job?.timeline.some((e) => e.kind === 'trade_chosen'),
    ratings,
  }
}

/** Who a step is waiting on, as phones: the one actor, or everyone who still owes a rating. */
export function waitingOn(state: StoryState): CastKey[] {
  switch (state.current) {
    case null:
      return []
    case 'rate':
      return CAST_ORDER.filter((key) =>
        state.ratings.some((r) => r.rater === key && r.status !== 'submitted'),
      )
    default: {
      const actor = STEP_ACTORS[state.current]
      return actor === 'clock' || actor === 'everyone' ? [] : [actor]
    }
  }
}

export const STEP_ACTORS: Record<StepId, StepActor> = {
  report: 'tenant',
  approve: 'landlord',
  choose: 'landlord',
  quote: 'trade',
  instruct: 'landlord',
  book: 'trade',
  visit_day: 'clock',
  work: 'trade',
  confirm_visit: 'tenant',
  confirm_job: 'landlord',
  rate: 'everyone',
  reveal: 'clock',
}
