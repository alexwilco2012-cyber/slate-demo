// How a repair reads from the landlord's side: its status in words and an icon, whether it is
// waiting on them, and what it is waiting for otherwise.

import {
  BellRingingIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  HardHatIcon,
  ProhibitIcon,
  ReceiptIcon,
  SealCheckIcon,
  ThumbsUpIcon,
  XCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { ActionItem } from '@/data'
import type { Job, JobId, JobStatus, PersonCard, PersonId } from '@/domain/types'
import type { BadgeProps } from '@/components/ui/badge'
import { formatDate } from '@/components/slate/format'
import { firstName } from './format'
import { formatClock, formatLongDay } from './time'

export const JOB_STATUS_META: Record<
  JobStatus,
  { icon: Icon; tone: NonNullable<BadgeProps['tone']> }
> = {
  reported: { icon: BellRingingIcon, tone: 'caution' },
  approved: { icon: ThumbsUpIcon, tone: 'info' },
  quoting: { icon: ReceiptIcon, tone: 'info' },
  instructed: { icon: ClipboardTextIcon, tone: 'info' },
  booked: { icon: CalendarCheckIcon, tone: 'info' },
  in_progress: { icon: HardHatIcon, tone: 'info' },
  completed: { icon: CheckCircleIcon, tone: 'caution' },
  confirmed: { icon: SealCheckIcon, tone: 'positive' },
  declined: { icon: ProhibitIcon, tone: 'neutral' },
  cancelled: { icon: XCircleIcon, tone: 'neutral' },
}

/** The four ways the repairs list is filtered. */
export const JOB_PHASES = ['needs_you', 'in_hand', 'done', 'closed'] as const
export type JobPhase = (typeof JOB_PHASES)[number]
export const JOB_PHASE_LABELS: Record<JobPhase, string> = {
  needs_you: 'Needs you',
  in_hand: 'In hand',
  done: 'Done',
  closed: 'Declined or cancelled',
}

/** Job actions from listActionsNeeded, by job, so lists can say what each job needs. */
export function actionsByJob(actions: readonly ActionItem[]): Map<JobId, ActionItem> {
  const map = new Map<JobId, ActionItem>()
  for (const action of actions) {
    if ('jobId' in action && !map.has(action.jobId)) map.set(action.jobId, action)
    if (action.kind === 'leave_rating' && action.task.context.kind === 'job') {
      const jobId = action.task.context.jobId
      if (!map.has(jobId)) map.set(jobId, action)
    }
  }
  return map
}

/**
 * Which filter a repair falls under. A rating still to leave doesn't make a finished repair "need
 * you": it's counted with the ratings, so the repairs count matches the one in the navigation.
 */
export function phaseOf(job: Job, action: ActionItem | undefined): JobPhase {
  if (job.status === 'declined' || job.status === 'cancelled') return 'closed'
  if (action && action.kind !== 'leave_rating') return 'needs_you'
  if (job.status === 'confirmed') return 'done'
  return 'in_hand'
}

type People = ReadonlyMap<PersonId, PersonCard>

function nameOf(people: People, id: PersonId | undefined, fallback = 'The trade') {
  const card = id ? people.get(id) : undefined
  return card ? firstName(card.displayName) : fallback
}

/** What the landlord needs to do, in a few words: "Approve or decline". */
export function actionText(action: ActionItem, people: People): string {
  switch (action.kind) {
    case 'approve_job':
      return 'Approve or decline'
    case 'choose_trade':
      return 'Choose a trade'
    case 'compare_quotes':
      return action.quoteCount === 1 ? 'A quote to look at' : `Compare ${action.quoteCount} quotes`
    case 'instruct_trade':
      return 'Give the go-ahead'
    case 'confirm_job':
      return 'Confirm the work is done'
    case 'pay_invoice':
      return action.overdue ? 'Invoice overdue' : 'Invoice to pay'
    case 'leave_rating':
      return `Rate ${nameOf(people, action.task.subjectId, 'them')}`
    default:
      return 'Needs you'
  }
}

/** What a job is waiting for when it isn't waiting for the landlord. */
export function waitingText(job: Job, people: People): string {
  const trade = nameOf(people, job.tradeId)
  const visit = job.visits.find((v) => v.status === 'booked' || v.status === 'on_site')
  switch (job.status) {
    case 'reported':
      return 'Waiting for approval'
    case 'approved':
      return job.board ? 'On the job board' : 'Approved'
    case 'quoting':
      if (job.acceptedQuoteId) return `Quote accepted from ${trade}`
      if (job.tradeId) return `Waiting for ${trade}’s quote`
      return job.board?.closesAt
        ? `Waiting for quotes · closes ${formatDate(job.board.closesAt)}`
        : 'Waiting for quotes'
    case 'instructed':
      return `${trade} will book a visit`
    case 'booked':
      return visit
        ? `${trade} visits ${formatLongDay(visit.startsAt)}, ${formatClock(visit.startsAt)}`
        : 'Visit booked'
    case 'in_progress':
      return `${trade} is on site`
    case 'completed':
      return `${trade} says it’s done`
    case 'confirmed':
      return job.landlordConfirmedAt ? `Done ${formatDate(job.landlordConfirmedAt)}` : 'Done'
    case 'declined':
      return 'You declined this'
    case 'cancelled':
      return 'Cancelled'
  }
}

/** Jobs still open: anything not finished, declined or cancelled. */
export function isOpen(job: Pick<Job, 'status'>): boolean {
  return !['confirmed', 'declined', 'cancelled'].includes(job.status)
}

/** Most recent first by the last thing that happened. */
export function byLatest(a: Job, b: Job): number {
  return b.updatedAt.localeCompare(a.updatedAt)
}
