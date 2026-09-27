// How a repair reads from the tenant's side: what each status means for them, the line under
// each stage of the timeline, and the full history in plain words.

import type { ReactNode } from 'react'
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  HourglassMediumIcon,
  LightningIcon,
  ProhibitIcon,
  SealCheckIcon,
  WarningOctagonIcon,
  WrenchIcon,
  XCircleIcon,
  ClockIcon,
  type Icon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { jobStages, type JobStage, type JobStageKey } from '@/components/slate/job-timeline'
import type { BadgeProps } from '@/components/ui/badge'
import {
  TRADE_TYPE_LABELS,
  type IsoDateTime,
  type Job,
  type JobEvent,
  type JobStatus,
  type PersonCard,
  type Urgency,
} from '@/domain/types'
import type { People } from './data'
import { upcomingVisit, visitToConfirm } from './data'
import { firstName, visitWindow } from './format'

type Tone = NonNullable<BadgeProps['tone']>

/** What each status means to the tenant, in their words, with an icon so it never relies on hue. */
export const JOB_STATUS_META: Record<JobStatus, { label: string; icon: Icon; tone: Tone }> = {
  reported: { label: 'Waiting for approval', icon: HourglassMediumIcon, tone: 'neutral' },
  approved: { label: 'Approved', icon: SealCheckIcon, tone: 'info' },
  quoting: { label: 'Getting quotes', icon: ClipboardTextIcon, tone: 'info' },
  instructed: { label: 'Go-ahead given', icon: WrenchIcon, tone: 'info' },
  booked: { label: 'Visit booked', icon: CalendarCheckIcon, tone: 'accent' },
  in_progress: { label: 'Work under way', icon: WrenchIcon, tone: 'accent' },
  completed: { label: 'Work done', icon: CheckCircleIcon, tone: 'positive' },
  confirmed: { label: 'Fixed', icon: CheckCircleIcon, tone: 'positive' },
  declined: { label: 'Declined', icon: XCircleIcon, tone: 'critical' },
  cancelled: { label: 'Cancelled', icon: ProhibitIcon, tone: 'neutral' },
}

export const URGENCY_META: Record<
  Urgency,
  { label: string; icon: Icon; tone: Tone; definition: string; examples: string }
> = {
  emergency: {
    label: 'Emergency',
    icon: WarningOctagonIcon,
    tone: 'critical',
    definition: 'Danger to people or the home right now.',
    examples:
      'A gas smell, water pouring through a ceiling, sparking electrics, no way to lock the front door, or no heating in freezing weather.',
  },
  urgent: {
    label: 'Urgent',
    icon: LightningIcon,
    tone: 'caution',
    definition: 'It needs fixing within a few days.',
    examples:
      'No hot water, a leak you can catch in a bucket, a toilet that won’t flush when it’s the only one, or a fridge that’s stopped.',
  },
  routine: {
    label: 'Routine',
    icon: ClockIcon,
    tone: 'neutral',
    definition: 'It can wait a couple of weeks.',
    examples: 'A dripping tap, a sticking door, a loose handle or a small patch of mould.',
  },
}

export function tradeWord(trade: PersonCard | undefined): string {
  const type = trade?.tradeProfile?.trades[0]
  return type ? TRADE_TYPE_LABELS[type].toLowerCase() : 'trade'
}

/** "Aileen Christie" or "you". Agents are named as themselves; the chip says who they act for. */
function who(people: People, id: string | null, me: string): string {
  if (!id) return BRAND.name
  if (id === me) return 'You'
  const card = people.get(id as PersonCard['id'])
  return card ? card.displayName : 'Someone'
}

/**
 * The shared stage names read as done ("Approved"). The stage in progress reads as what's
 * happening instead, so a repair waiting for approval never says "Now: Approved".
 */
const CURRENT_LABELS: Record<JobStageKey, string> = {
  reported: 'Reported',
  approved: 'Approval',
  booked: 'Booking',
  visit: 'Visit',
  fixed: 'Work under way',
  rated: 'Ratings',
}

/** The job's stages as the tenant reads them, with a line under each. */
export function tenantJobStages(
  job: Job,
  people: People,
  landlord: PersonCard | null | undefined,
  now: IsoDateTime,
): JobStage[] {
  return jobStages(job, stageDetails(job, people, landlord, now)).map((stage) =>
    stage.state === 'current' ? { ...stage, label: CURRENT_LABELS[stage.key] } : stage,
  )
}

/** The line under each stage of the job's timeline. */
function stageDetails(
  job: Job,
  people: People,
  landlord: PersonCard | null | undefined,
  now: IsoDateTime,
): Partial<Record<JobStageKey, ReactNode>> {
  const landlordName = landlord ? firstName(landlord.displayName) : 'your landlord'
  const trade = job.tradeId ? people.get(job.tradeId) : undefined
  const visit = upcomingVisit(job)
  const toConfirm = visitToConfirm(job)
  const details: Partial<Record<JobStageKey, ReactNode>> = {}

  const reporter = people.get(job.reportedById)
  details.reported =
    job.reportedAs === 'tenant'
      ? 'You reported it'
      : `Raised by ${reporter ? reporter.displayName : landlordName}`

  if (job.status === 'reported') details.approved = `Waiting for ${landlordName}`
  else if (job.status === 'declined') details.approved = `${landlordName} said no`

  if (visit) {
    details.booked = trade ? `${trade.displayName}, ${tradeWord(trade)}` : undefined
    details.visit =
      visit.status === 'on_site' ? 'On site now' : visitWindow(visit.startsAt, visit.endsAt, now)
  } else if (job.status === 'approved') {
    details.booked = `${landlordName} is choosing a trade`
  } else if (job.status === 'quoting') {
    details.booked = trade
      ? `${trade.displayName} is quoting for the work`
      : 'Trades are sending quotes'
  } else if (job.status === 'instructed') {
    details.booked = trade
      ? `${trade.displayName} has the go-ahead and will book a visit`
      : 'A trade has the go-ahead'
  }

  if (job.status === 'in_progress')
    details.fixed = trade ? `${firstName(trade.displayName)} is on site` : 'On site now'
  else if (toConfirm) details.visit = 'Did it happen? Confirm it below.'

  if (job.status === 'completed')
    details.fixed = `Waiting for ${landlordName} to confirm it’s fixed`

  const opened = [...job.timeline].reverse().find((event) => event.kind === 'ratings_opened')
  const revealed = job.timeline.some((event) => event.kind === 'ratings_revealed')
  // No date here: each rating on a job has its own window, and the ratings section gives yours.
  if (opened && !revealed) details.rated = 'Sealed until everyone has rated, or time runs out'
  return details
}

/** One step of the full history, in words. Null for steps the tenant doesn't need to see. */
export function describeEvent(
  event: JobEvent,
  job: Job,
  people: People,
  me: string,
  now: IsoDateTime,
): { title: string; detail?: string } | null {
  const actor = who(people, event.actorId, me)
  const name = (id: string) => who(people, id, me)
  switch (event.kind) {
    case 'reported':
      return { title: actor === 'You' ? 'You reported it' : `${actor} raised it` }
    case 'approved':
      return { title: `${actor} approved it`, ...(event.note ? { detail: event.note } : {}) }
    case 'declined':
      return { title: `${actor} declined it`, detail: event.reason }
    case 'posted_to_board':
      return { title: `${actor} asked for quotes on the job board` }
    case 'trade_chosen':
      return { title: `${actor} asked ${name(event.tradeId)} to quote` }
    case 'quote_submitted':
      return { title: 'A quote came in' }
    case 'quote_withdrawn':
      return { title: 'A trade withdrew their quote' }
    case 'quote_accepted':
      return { title: `${actor} accepted a quote` }
    case 'trade_instructed':
      return {
        title: `${actor} told ${name(event.tradeId)} to go ahead`,
        ...(event.note ? { detail: event.note } : {}),
      }
    case 'visit_booked': {
      const visit = job.visits.find((v) => v.id === event.visitId)
      return {
        title: 'Visit booked, with written notice',
        ...(visit ? { detail: visitWindow(visit.startsAt, visit.endsAt, now) } : {}),
      }
    }
    case 'visit_cancelled':
      return { title: `${actor} cancelled a visit`, detail: event.reason }
    case 'visit_started':
      return { title: `${actor} arrived` }
    case 'no_access':
      return { title: `${actor} couldn’t get in`, ...(event.note ? { detail: event.note } : {}) }
    case 'visit_confirmed':
      return { title: `${actor === 'You' ? 'You' : actor} confirmed the visit happened` }
    case 'completed':
      return { title: `${actor} marked the work done` }
    case 'confirmed':
      return { title: `${actor} confirmed it’s fixed` }
    case 'cancelled':
      return { title: `${actor} cancelled the repair`, detail: event.reason }
    case 'photos_added':
      return { title: `${actor} added ${event.count === 1 ? 'a photo' : `${event.count} photos`}` }
    case 'ratings_opened':
      return { title: 'Ratings opened' }
    case 'ratings_revealed':
      return { title: 'Ratings revealed' }
    case 'invoice_sent':
    case 'payment_recorded':
      return null
  }
}
