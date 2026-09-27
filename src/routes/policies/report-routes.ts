// The four ways to report something on Slate (SPEC §6), in plain words, with each route's clock
// worked out from REPORT_ROUTE_INFO so the words always match what the data layer enforces.

import { REPORT_ROUTE_INFO, REPORT_ROUTES, type ClockRule, type ReportRoute } from '@/domain/types'

export interface ReportRouteCopy {
  route: ReportRoute
  /** Anchor on /policies/reporting. */
  anchor: string
  /** What the person reporting chooses, in their words. */
  label: string
  /** The law or rule behind it. */
  basis: string
  /** "We tell the person who posted it within 48 working hours." */
  clock: string
  /** Whether the clock is set in law or is our own promise. */
  clockSource: string
  whenToUse: string
  whatHappens: string[]
}

const UNIT_WORDS: Record<ClockRule['unit'], [one: string, many: string]> = {
  hours: ['hour', 'hours'],
  working_hours: ['working hour', 'working hours'],
  days: ['day', 'days'],
  working_days: ['working day', 'working days'],
}

/** Curly apostrophes for copy that comes from the domain with straight ones. */
export function curly(text: string): string {
  return text.replace(/'/g, '’')
}

export function clockText(clock: ClockRule): string {
  const [one, many] = UNIT_WORDS[clock.unit]
  const span = `${clock.amount} ${clock.amount === 1 ? one : many}`
  switch (clock.step) {
    case 'notify_poster':
      return `We tell the person who posted it within ${span}.`
    case 'review':
      return `We review it within ${span}.`
    case 'acknowledge':
      return `We acknowledge your request within ${span}.`
  }
}

const DETAIL: Record<ReportRoute, Pick<ReportRouteCopy, 'anchor' | 'whenToUse' | 'whatHappens'>> = {
  defamation: {
    anchor: 'defamation',
    whenToUse:
      'A review or message says something untrue about you that could harm your reputation.',
    whatHappens: [
      'Tell us which words are untrue and why.',
      'We send your complaint to the person who posted it. You can ask us to leave your name off.',
      'They can defend what they wrote or agree to remove it. If they don’t answer in time, we remove it.',
      'While this runs, the review may be hidden. It is never edited to suit either side.',
    ],
  },
  illegal: {
    anchor: 'illegal',
    whenToUse:
      'Something breaks the law: threats, harassment, hate, or anything else that’s illegal.',
    whatHappens: [
      'Tell us what’s wrong and where.',
      'We look at it quickly and take it down if it’s illegal.',
      'We tell you what we decided and why.',
    ],
  },
  fake: {
    anchor: 'fake',
    whenToUse:
      'You think a review wasn’t written by the person it says, or was paid for, swapped or written to harm a competitor.',
    whatHappens: [
      'Tell us why you think it’s fake.',
      'The review shows a “Pending check” label while we look. No other kind of report adds a label.',
      'If it’s fake, we remove it and recalculate the score. If not, the label comes off.',
    ],
  },
  data_protection: {
    anchor: 'data-protection',
    whenToUse:
      'You want to see, correct or remove personal information about you, or object to how it’s used.',
    whatHappens: [
      'Tell us what information you mean and what you’d like us to do.',
      'We acknowledge your request, then answer it within the time the law allows.',
      'If we can’t do what you ask, we explain why and how to complain to the Information Commissioner’s Office.',
    ],
  },
}

export const REPORT_ROUTE_COPY: ReportRouteCopy[] = REPORT_ROUTES.map((route) => {
  const info = REPORT_ROUTE_INFO[route]
  return {
    route,
    label: curly(info.label),
    basis: info.basis,
    clock: clockText(info.clock),
    clockSource: info.clock.source === 'law' ? 'Set in law' : 'Our own target',
    ...DETAIL[route],
  }
})
