// The words of the guided story: a title per step, what to tap next, and which screen to open in
// which phone when someone asks to be shown.

import { BRAND } from '@/config/brand'
import type { RatingDirection } from '@/domain/criteria'
import { CAST, type CastKey } from '../cast'
import { dayLabel, timeLabel } from '../lib/time'
import { STEP_ACTORS, type RatingLine, type StepActor, type StepId, type StoryState } from './model'

export interface StepCopy {
  title: string
  /** Shown once the step is done, in the list of steps. */
  doneTitle: string
}

export const STEP_COPY: Record<StepId, StepCopy> = {
  report: { title: 'Sarah reports a leak', doneTitle: 'Sarah reported a leak' },
  approve: { title: 'Graham approves the repair', doneTitle: 'Graham approved it' },
  choose: { title: 'Graham chooses the trade', doneTitle: 'Graham chose the trade' },
  quote: { title: 'Kev sends a quote', doneTitle: 'Kev sent a quote' },
  instruct: { title: 'Graham says go ahead', doneTitle: 'Graham gave the go-ahead' },
  book: { title: 'Kev books the visit', doneTitle: 'Kev booked the visit' },
  visit_day: { title: 'The day of the visit', doneTitle: 'The day of the visit' },
  work: { title: 'Kev fixes the leak', doneTitle: 'Kev fixed the leak' },
  confirm_visit: { title: 'Sarah confirms Kev came', doneTitle: 'Sarah confirmed the visit' },
  confirm_job: { title: 'Graham confirms the job', doneTitle: 'Graham confirmed the job' },
  rate: { title: 'Everyone rates', doneTitle: 'Everyone rated' },
  reveal: { title: 'Revealed together', doneTitle: 'Revealed together' },
}

/** What to do now, in a sentence or two. */
export function stepHint(id: StepId, state: StoryState): string {
  const visit = state.visit
  switch (id) {
    case 'report':
      return 'In Sarah’s phone, tap Report a problem. Choose Kitchen, then Leak or drip, and say it’s under the sink.'
    case 'approve':
      return 'The leak is already in Graham’s Actions needed. Open it and tap Approve.'
    case 'choose':
      return `Tap Your saved trades, then Ask Kev to quote. Or post it to the job board for Kev to find. ${BRAND.name} never picks for him.`
    case 'quote':
      return state.onBoard
        ? 'Kev finds the leak on his job board. He opens it and sends a quote from his saved lines.'
        : 'The job is in Kev’s Needs you list. He taps Send a quote, adds a few quick lines and sends it.'
    case 'instruct':
      return 'Kev’s quote is on the repair already. Graham taps Accept, with ‘Give Kev the go-ahead’ ticked.'
    case 'book':
      return 'Kev taps Book a visit. Today and tomorrow are greyed out, because Sarah gets at least 48 hours’ written notice.'
    case 'visit_day':
      return visit
        ? `The visit is ${dayLabel(visit.startsAt)} at ${timeLabel(visit.startsAt)}. Move the clock on and all three phones move with it.`
        : 'Move the clock on to the day of the visit.'
    case 'work':
      return 'Kev taps On my way, then I’ve arrived. Once it’s fixed, he marks the work done with before and after photos.'
    case 'confirm_visit':
      return 'Sarah opens her repair and confirms Kev came. That opens her rating of him.'
    case 'confirm_job':
      return 'Graham checks Kev’s photos and confirms the work is done. That opens his rating of Kev.'
    case 'rate':
      return 'Each rating is sealed the moment it’s sent. Nobody sees anything until everyone has rated or the window closes.'
    case 'reveal':
      return 'Some ratings are still to come. Move the clock to the end of the window and what’s in is revealed, all at once.'
  }
}

export function actorLabel(actor: StepActor): string {
  if (actor === 'clock') return 'The demo clock'
  if (actor === 'everyone') return 'Everyone’s turn'
  return `${CAST[actor].firstName}’s turn`
}

export function stepActor(id: StepId): StepActor {
  return STEP_ACTORS[id]
}

export interface FrameTarget {
  cast: CastKey
  path: string
}

/** The screen that shows a step, in the phone of the person who does it. */
export function stepTarget(id: StepId, state: StoryState): FrameTarget | null {
  const jobId = state.snapshot.job?.id
  if (id === 'report') return { cast: 'tenant', path: '/tenant/report' }
  if (!jobId) return null
  switch (id) {
    case 'approve':
    case 'choose':
    case 'confirm_job':
      return { cast: 'landlord', path: `/landlord/jobs/${jobId}` }
    case 'instruct':
      return { cast: 'landlord', path: `/landlord/jobs/${jobId}#quotes` }
    case 'quote':
      return state.onBoard
        ? { cast: 'trade', path: `/trade/board/${jobId}` }
        : { cast: 'trade', path: `/trade/jobs/${jobId}/quote` }
    case 'book':
    case 'visit_day':
    case 'work':
      return { cast: 'trade', path: `/trade/jobs/${jobId}` }
    case 'confirm_visit':
      return { cast: 'tenant', path: `/tenant/jobs/${jobId}` }
    case 'rate': {
      const next = state.ratings.find((r) => r.status !== 'submitted' && r.status !== 'not_open')
      return next ? ratingTarget(next, jobId) : null
    }
    case 'reveal':
      return null
  }
}

const RATING_PATHS: Record<RatingDirection, (jobId: string) => string> = {
  'tenant->trade': (jobId) => `/tenant/jobs/${jobId}/rate/trade`,
  'tenant->landlord': (jobId) => `/tenant/jobs/${jobId}/rate/landlord`,
  'trade->tenant': (jobId) => `/trade/jobs/${jobId}/rate/tenant`,
  'trade->landlord': (jobId) => `/trade/jobs/${jobId}/rate/landlord`,
  'landlord->trade': (jobId) => `/landlord/ratings/rate/job/${jobId}/${CAST.trade.personId}`,
  // Not part of a repair; listed so every direction has a home.
  'landlord->tenant': () => '/landlord/ratings',
}

export function ratingTarget(line: RatingLine, jobId: string): FrameTarget {
  return { cast: line.rater, path: RATING_PATHS[line.direction](jobId) }
}

export function ratingLineLabel(line: RatingLine): string {
  return `${CAST[line.rater].firstName} rates ${CAST[line.subject].firstName}`
}

/** After a step is done for them, each phone shows where the story now stands for its person. */
export function landingPaths(state: StoryState): Partial<Record<CastKey, string>> {
  const job = state.snapshot.job
  if (!job) return { tenant: '/tenant', landlord: '/landlord', trade: '/trade' }
  const kevOnJob = job.tradeId === CAST.trade.personId
  const paths: Partial<Record<CastKey, string>> = {
    tenant: `/tenant/jobs/${job.id}`,
    landlord: `/landlord/jobs/${job.id}`,
  }
  if (kevOnJob) paths.trade = `/trade/jobs/${job.id}`
  else if (state.onBoard) paths.trade = `/trade/board/${job.id}`
  if (state.current === 'rate') {
    // Straight to each person's first rating still to give.
    for (const key of ['tenant', 'landlord', 'trade'] as const) {
      const owed = state.ratings.find(
        (r) => r.rater === key && (r.status === 'to_do' || r.status === 'draft'),
      )
      if (owed) paths[key] = ratingTarget(owed, job.id).path
    }
  }
  if (state.current === null) {
    // Sarah's repair shows the reveal; Kev's profile has the new reviews.
    paths.trade = '/trade/profile'
  }
  return paths
}
