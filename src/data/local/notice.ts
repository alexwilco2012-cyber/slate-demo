// The written notice a tenant gets before a visit (Scotland: 48 hours, except in an emergency).
// The same wording is used by the seed and by bookVisit, so every notice on the record reads alike.

import {
  TRADE_TYPE_LABELS,
  type DocumentType,
  type JobCategory,
  type VisitPurpose,
} from '@/domain/types'
import { formatClock, formatDay, formatNotice, hoursBetween } from './dates'

export interface NoticeInput {
  tradeName: string
  trade?: keyof typeof TRADE_TYPE_LABELS
  purpose: VisitPurpose
  /** The job's category, so a clean isn't announced as a repair. */
  category?: JobCategory
  complianceType?: DocumentType
  givenAt: string
  startsAt: string
  endsAt: string
  emergency: boolean
  note?: string
}

const CHECK_WORDING: Partial<Record<DocumentType, string>> = {
  gas_safety: 'carry out the annual gas safety check',
  eicr: 'carry out the electrical safety inspection (EICR)',
  smoke_heat_alarms: 'test the smoke and heat alarms',
  co_alarms: 'test the carbon monoxide alarms',
  legionella: 'carry out the legionella risk assessment',
  pat: 'test the portable appliances',
  epc: 'carry out the energy performance survey',
}

function purposeWording(input: NoticeInput): string {
  if (input.purpose === 'quote') return 'take a look and work out a price'
  if (input.purpose === 'safety_check') {
    return (
      (input.complianceType && CHECK_WORDING[input.complianceType]) ?? 'carry out a safety check'
    )
  }
  return input.category === 'cleaning' ? 'do the clean' : 'carry out the repair'
}

export function noticeText(input: NoticeInput): string {
  const who = input.trade
    ? `${input.tradeName} (${TRADE_TYPE_LABELS[input.trade].toLowerCase()})`
    : input.tradeName
  const when = `${formatDay(input.startsAt)} between ${formatClock(input.startsAt)} and ${formatClock(input.endsAt)}`
  const what = purposeWording(input)
  const hours = hoursBetween(input.givenAt, input.startsAt)
  const lead = input.emergency
    ? `Emergency visit: ${who} will come on ${when} to ${what}. Emergencies don't need 48 hours' notice.`
    : `Notice of a visit: ${who} will come on ${when} to ${what}. That's ${formatNotice(hours)} notice; the minimum in Scotland is 48 hours.`
  return input.note ? `${lead}\n\n${input.note}` : lead
}
