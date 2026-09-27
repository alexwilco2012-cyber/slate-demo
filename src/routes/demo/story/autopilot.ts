// "Skip ahead": does the current step for whoever's turn it is, through the same SlateApi calls
// their phone would make, so every portal updates live just as if they had tapped it themselves.

import type { DemoControls, RatingInput, SlateApi } from '@/data/api'
import { PLACEHOLDER_SCHEME } from '@/data'
import { criteriaFor, type RatingDirection, type ScaleScore } from '@/domain/criteria'
import type {
  AccessSlot,
  AccessWindow,
  CriteriaAnswers,
  ImageRef,
  IsoDateTime,
  Job,
  QuoteLineItem,
} from '@/domain/types'
import { CAST } from '../cast'
import { addDaysToDay, addMinutes, daysFrom, ukAt, ukDay } from '../lib/time'
import { repairVisit, type RatingLine, type StepId, type StoryState } from './model'

export interface Autopilot {
  api: SlateApi
  demo: DemoControls
}

const sample = (slug: string, alt: string): ImageRef => ({
  url: `${PLACEHOLDER_SCHEME}photo/${slug}`,
  alt,
})

const REPORT = {
  title: 'Leak under the kitchen sink',
  description:
    'Water is dripping from the pipe under the kitchen sink. There’s a small puddle in the cupboard every morning and the base is going soft.',
  photo: sample('leak-under-kitchen-sink', 'Water pooling in the cupboard under the kitchen sink'),
}

/** The hour a visit would start in each of the tenant's access slots. */
const SLOT_START: Record<AccessSlot, number> = {
  morning: 9,
  afternoon: 13,
  evening: 17,
  all_day: 10,
}

/** Most of what people say is good: this is a repair that went well. */
const SCORE_FOR_SCALE = { judgement: 4, frequency: 5, yesPartlyNo: 5 } as const

const COMMENTS: Partial<Record<RatingDirection, string>> = {
  'tenant->trade':
    'In my experience a careful plumber. He came when he said, put a sheet down under the sink and left the cupboard tidier than he found it.',
  'landlord->trade':
    'In my experience clear and reliable. The final price matched the quote, and the photos showed exactly what was done.',
  'trade->landlord':
    'In my experience a good client. A clear description with a photo up front, and a quick go-ahead once the quote was in.',
}

function need<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`The story has no ${what} yet.`)
  return value
}

async function report({ api }: Autopilot, now: IsoDateTime): Promise<void> {
  const sarah = CAST.tenant.viewer
  const [tenancy] = await api.listTenancies(sarah, { status: ['confirmed'] })
  const home = need(tenancy, 'current home for Sarah')
  const today = ukDay(now)
  const windows: AccessWindow[] = [
    { date: addDaysToDay(today, 3), slot: 'afternoon' },
    { date: addDaysToDay(today, 4), slot: 'morning' },
  ]
  await api.createJob(sarah, {
    propertyId: home.propertyId,
    room: 'kitchen',
    category: 'leak',
    title: REPORT.title,
    description: REPORT.description,
    photos: [REPORT.photo],
    urgency: 'urgent',
    access: {
      windows,
      keyAllowed: false,
      notes: 'The buzzer sticks, so give me a call from the door.',
    },
  })
}

async function quote({ api }: Autopilot, job: Job, now: IsoDateTime): Promise<void> {
  const kev = CAST.trade.viewer
  const saved = await api.listSavedLineItems(kev)
  const pick = (kind: QuoteLineItem['kind'], prefer?: RegExp) =>
    saved.find((item) => item.kind === kind && (!prefer || prefer.test(item.description))) ??
    saved.find((item) => item.kind === kind)
  const lines = [pick('callout'), pick('materials', /trap/i), pick('labour')].filter(
    (item) => item !== undefined,
  )
  const lineItems: QuoteLineItem[] =
    lines.length > 0
      ? lines.map(({ description, kind, unitPence }) => ({
          description,
          kind,
          quantity: 1,
          unitPence,
        }))
      : [
          {
            description: 'Replace the leaking trap and seals',
            kind: 'labour',
            quantity: 1,
            unitPence: 9500,
          },
        ]
  await api.submitQuote(kev, {
    jobId: job.id,
    lineItems,
    notes: 'I’ll bring a new trap and seals, and check the other joints while I’m there.',
    validUntil: addDaysToDay(ukDay(now), 30),
  })
}

async function book({ api }: Autopilot, job: Job, now: IsoDateTime): Promise<void> {
  // The first time the tenant offered that still gives 48 hours' notice, with an hour to spare.
  const earliest = Date.parse(now) + 49 * 60 * 60 * 1000
  const offered = job.access.windows
    .map((window) => ukAt(window.date, SLOT_START[window.slot]))
    .filter((at) => Date.parse(at) >= earliest)
    .sort()[0]
  const startsAt = offered ?? ukAt(addDaysToDay(ukDay(now), 3), 10)
  await api.bookVisit(CAST.trade.viewer, job.id, {
    purpose: 'repair',
    startsAt,
    endsAt: addMinutes(startsAt, 120),
    emergency: false,
    note: 'I’ll need to turn the water off for about half an hour.',
  })
}

async function work({ api }: Autopilot, job: Job, finalPricePence: number | undefined) {
  const kev = CAST.trade.viewer
  const visit = need(repairVisit(job), 'visit')
  if (visit.status === 'booked') await api.startVisit(kev, job.id, visit.id)
  await api.markComplete(kev, job.id, {
    photos: [
      sample('sink-trap-before', 'The old sink trap, cracked where it meets the waste pipe'),
      sample('sink-trap-after', 'The new sink trap fitted, with the cupboard dry underneath'),
    ],
    note: 'Replaced the cracked trap and both seals. Left the cupboard door open so the base can dry out.',
    ...(finalPricePence !== undefined ? { finalPricePence } : {}),
    invoiceDueInDays: 14,
  })
}

function answersFor(direction: RatingDirection): CriteriaAnswers {
  const answers: Record<string, ScaleScore> = {}
  criteriaFor(direction, 'job').forEach((criterion, index) => {
    const usual: ScaleScore = SCORE_FOR_SCALE[criterion.scale]
    answers[criterion.id] = index === 0 && criterion.scale === 'judgement' ? 5 : usual
  })
  return answers
}

async function rate({ api }: Autopilot, job: Job, lines: readonly RatingLine[]): Promise<void> {
  for (const line of lines) {
    if (line.status !== 'to_do' && line.status !== 'draft') continue
    const comment = COMMENTS[line.direction]
    const input: RatingInput = {
      direction: line.direction,
      context: { kind: 'job', jobId: job.id },
      subjectId: CAST[line.subject].personId,
      answers: answersFor(line.direction),
      wouldAgain: 'yes',
      ...(comment ? { comment } : {}),
    }
    await api.submitRating(CAST[line.rater].viewer, input)
  }
}

/** Does the current step. Rejects with the data layer's own error if a rule says no. */
export async function skipAhead(pilot: Autopilot, step: StepId, state: StoryState): Promise<void> {
  const { api, demo } = pilot
  const now = demo.now()
  if (step === 'report') return report(pilot, now)
  const job = need(state.snapshot.job, 'repair')
  const graham = CAST.landlord.viewer
  switch (step) {
    case 'approve':
      await api.approveJob(graham, job.id, { note: 'Thanks for the photo. I’ll get someone out.' })
      return
    case 'choose':
      await api.chooseTrade(graham, job.id, { tradeId: CAST.trade.personId, route: 'saved_trades' })
      return
    case 'quote':
      return quote(pilot, job, now)
    case 'instruct': {
      const sent = need(state.snapshot.quote, 'quote')
      await api.acceptQuote(graham, sent.id, {
        instruct: true,
        note: 'Sarah is in most afternoons. Thanks, Kev.',
      })
      return
    }
    case 'book':
      return book(pilot, job, now)
    case 'visit_day': {
      const visit = need(state.visit, 'visit')
      const days = daysFrom(now, addMinutes(visit.startsAt, -15))
      if (days > 0) await demo.advanceClock(days)
      return
    }
    case 'work':
      return work(pilot, job, state.snapshot.quote?.totalPence)
    case 'confirm_visit': {
      const visit = need(repairVisit(job), 'visit')
      await api.confirmVisit(CAST.tenant.viewer, job.id, visit.id)
      return
    }
    case 'confirm_job':
      await api.confirmJob(graham, job.id)
      return
    case 'rate':
      return rate(pilot, job, state.ratings)
    case 'reveal':
      await demo.advanceToNextReveal({ kind: 'job', jobId: job.id })
      return
  }
}
