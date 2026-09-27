// A job as a trade thinks about it: what stage it's at for them, which visit is next and whether
// they've been paid. The status names are theirs ("Ready to book", "Payment late"), not the
// landlord's.

import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  HardHatIcon,
  HourglassMediumIcon,
  InvoiceIcon,
  PaperPlaneTiltIcon,
  PencilSimpleLineIcon,
  WarningCircleIcon,
  XCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { IsoDate, Job, JobPayment, Quote, Thread, Visit } from '@/domain/types'
import { daysFrom, ukDay } from './time'

export type StatusTone = 'neutral' | 'info' | 'positive' | 'caution' | 'critical'

export type TradeStatusKey =
  | 'to_quote'
  | 'quote_sent'
  | 'awaiting_go_ahead'
  | 'to_book'
  | 'booked'
  | 'on_site'
  | 'to_invoice'
  | 'done'
  | 'awaiting_payment'
  | 'payment_late'
  | 'paid'
  | 'closed'

export interface TradeStatus {
  key: TradeStatusKey
  label: string
  tone: StatusTone
  icon: Icon
}

const STATUS: Record<TradeStatusKey, Omit<TradeStatus, 'key'>> = {
  to_quote: { label: 'Quote needed', tone: 'info', icon: PencilSimpleLineIcon },
  quote_sent: { label: 'Quote sent', tone: 'neutral', icon: PaperPlaneTiltIcon },
  awaiting_go_ahead: {
    label: 'Waiting for the go-ahead',
    tone: 'neutral',
    icon: HourglassMediumIcon,
  },
  to_book: { label: 'Ready to book', tone: 'info', icon: CalendarPlusIcon },
  booked: { label: 'Visit booked', tone: 'neutral', icon: CalendarCheckIcon },
  on_site: { label: 'On site', tone: 'info', icon: HardHatIcon },
  to_invoice: { label: 'Invoice to send', tone: 'caution', icon: InvoiceIcon },
  done: { label: 'Work done', tone: 'positive', icon: CheckCircleIcon },
  awaiting_payment: { label: 'Waiting for payment', tone: 'neutral', icon: ClockCountdownIcon },
  payment_late: { label: 'Payment late', tone: 'critical', icon: WarningCircleIcon },
  paid: { label: 'Paid', tone: 'positive', icon: CheckCircleIcon },
  closed: { label: 'Called off', tone: 'neutral', icon: XCircleIcon },
}

/**
 * How long after the work an unsent invoice is still worth a nudge, as on the home screen. Older
 * jobs were settled before invoices went through the app.
 */
export const INVOICE_REMINDER_DAYS = 30

export function statusMeta(key: TradeStatusKey): TradeStatus {
  return { key, ...STATUS[key] }
}

export type PaymentState =
  | { kind: 'none' }
  | { kind: 'due'; daysLeft: number }
  | { kind: 'late'; daysLate: number }
  | { kind: 'paid' }

export function paymentState(payment: JobPayment | undefined, today: IsoDate): PaymentState {
  if (!payment) return { kind: 'none' }
  if (payment.paidAt) return { kind: 'paid' }
  const daysLeft = daysFrom(today, payment.dueOn)
  return daysLeft < 0 ? { kind: 'late', daysLate: -daysLeft } : { kind: 'due', daysLeft }
}

/** The visit that is booked or under way, if any. */
export function currentVisit(job: Job): Visit | undefined {
  return job.visits
    .filter((visit) => visit.status === 'booked' || visit.status === 'on_site')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
}

export function isWorkFinished(job: Job): boolean {
  return job.status === 'completed' || job.status === 'confirmed'
}

/**
 * Where a job stands for the trade. `myQuote` is their latest quote on it, if any.
 */
export function tradeStatus(job: Job, myQuote: Quote | undefined, today: IsoDate): TradeStatus {
  switch (job.status) {
    case 'cancelled':
    case 'declined':
      return statusMeta('closed')
    case 'quoting':
      if (job.acceptedQuoteId) return statusMeta('awaiting_go_ahead')
      return statusMeta(myQuote?.status === 'submitted' ? 'quote_sent' : 'to_quote')
    case 'instructed':
      return statusMeta('to_book')
    case 'booked':
      return statusMeta('booked')
    case 'in_progress':
      return statusMeta('on_site')
    case 'completed':
    case 'confirmed': {
      const payment = paymentState(job.payment, today)
      if (payment.kind === 'none') {
        const finished = job.completion ? daysFrom(ukDay(job.completion.completedAt), today) : 0
        return statusMeta(finished > INVOICE_REMINDER_DAYS ? 'done' : 'to_invoice')
      }
      if (payment.kind === 'late') return statusMeta('payment_late')
      if (payment.kind === 'due') return statusMeta('awaiting_payment')
      return statusMeta('paid')
    }
    default:
      return statusMeta('to_quote')
  }
}

/** A visit that falls on this UK date. */
export function visitIsOn(visit: Visit, day: IsoDate): boolean {
  return ukDay(visit.startsAt) === day
}

/** The people on a job, from its conversation. The landlord's agent is listed separately. */
export function partiesOf(thread: Thread | undefined) {
  const members = thread?.members ?? []
  return {
    tenantIds: members.filter((m) => m.role === 'tenant').map((m) => m.personId),
    landlordIds: members
      .filter((m) => m.role === 'landlord' && !m.actingForId)
      .map((m) => m.personId),
    agentIds: members.filter((m) => m.role === 'landlord' && m.actingForId).map((m) => m.personId),
  }
}

/** "Kev" from "Kev Rattray". */
export function firstNameOf(name: string | undefined, fallback = 'them'): string {
  return name?.split(' ')[0] ?? fallback
}
