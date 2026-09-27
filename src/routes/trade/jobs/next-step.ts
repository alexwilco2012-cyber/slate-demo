// The "Next" card on a job: one line on where it stands for the trade, and one on what to do.

import { ACCESS_SLOT_LABELS, type IsoDate, type Job, type Visit } from '@/domain/types'
import { formatPence, formatTime, plural } from '@/components/slate/format'
import type { PaymentState, TradeStatus } from '../lib/job'
import { formatDayIn, formatShortDay, relativeDay, ukDay } from '../lib/time'

/** "16 days late", "Due in 4 days", "Due today", "Paid". */
export function paymentWords(payment: PaymentState): string | undefined {
  switch (payment.kind) {
    case 'late':
      return `${plural(payment.daysLate, 'day')} late`
    case 'due':
      return payment.daysLeft === 0 ? 'Due today' : `Due in ${plural(payment.daysLeft, 'day')}`
    case 'paid':
      return 'Paid'
    default:
      return undefined
  }
}

/** "Mon 28 Sept, Tue 29 Sept or Thu 1 Oct" */
function orList(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`
}

export interface NextStep {
  title: string
  body: string
}

export function nextStep({
  job,
  status,
  visit,
  payment,
  today,
  tenantName,
  landlordName,
}: {
  job: Job
  status: TradeStatus
  visit: Visit | undefined
  payment: PaymentState
  today: IsoDate
  tenantName: string
  landlordName: string
}): NextStep {
  const amount = formatPence(job.payment?.amountPence ?? 0)
  const due = job.payment ? formatShortDay(job.payment.dueOn) : ''
  switch (status.key) {
    case 'to_quote':
      return {
        title: 'Send a quote',
        body: `${landlordName} chose you to price this job. Build it from your saved lines in a minute.`,
      }
    case 'quote_sent':
      return {
        title: 'Quote sent',
        body: `${landlordName} is deciding. You can withdraw your quote until they do.`,
      }
    case 'awaiting_go_ahead':
      return {
        title: 'Quote accepted',
        body: `${landlordName} will give you the go-ahead. Then you can book a visit.`,
      }
    case 'to_book': {
      const windows = job.access.windows.filter((window) => window.date > today)
      const times = windows
        .slice(0, 3)
        .map(
          (window) =>
            `${formatShortDay(window.date)} ${ACCESS_SLOT_LABELS[window.slot].toLowerCase()}`,
        )
      return {
        title: 'Book a visit',
        body:
          windows.length > 0
            ? `You have the go-ahead. ${tenantName} can do ${orList(times)}. We send the written notice when you book.`
            : `You have the go-ahead. We send ${tenantName} the written notice when you book.`,
      }
    }
    case 'booked':
      return visit
        ? {
            title: `${relativeDay(ukDay(visit.startsAt), today)}, ${formatTime(visit.startsAt)} to ${formatTime(visit.endsAt)}`,
            body: visit.notice.emergency
              ? 'Booked as an emergency, so no notice was needed.'
              : `${tenantName} got written notice on ${formatShortDay(visit.notice.givenAt)}.`,
          }
        : { title: 'Visit booked', body: '' }
    case 'on_site':
      return {
        title: 'You’re on site',
        body: 'Take photos as you go. When you’ve finished, mark the work done and send your invoice in the same step.',
      }
    case 'to_invoice':
      return {
        title: 'Send your invoice',
        body: `The work is done. Once you send it, ${landlordName} pays you directly.`,
      }
    case 'done':
      return {
        title: 'No invoice sent',
        body: `${job.completion ? `You finished this on ${formatDayIn(job.completion.completedAt, today)}. ` : ''}If you’re still owed for it, send an invoice.`,
      }
    case 'awaiting_payment':
      return {
        title: 'Waiting for payment',
        body: `${amount} due ${due}. ${landlordName} pays you directly.`,
      }
    case 'payment_late':
      return {
        title: `Payment ${paymentWords(payment) ?? 'late'}`,
        body: `${amount} was due ${due}. We told ${landlordName} the day it fell overdue.`,
      }
    case 'paid':
      return {
        title: 'Paid',
        body: `${amount} paid${job.payment?.paidAt ? ` on ${formatShortDay(job.payment.paidAt)}` : ''}.`,
      }
    default: {
      const cancelled = job.timeline.findLast((event) => event.kind === 'cancelled')
      return {
        title: 'Called off',
        body: cancelled?.kind === 'cancelled' ? cancelled.reason : 'This job was called off.',
      }
    }
  }
}
