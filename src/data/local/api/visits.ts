// Visits: booking with the 48-hour written notice, arriving, finishing, and both sides confirming.

import { SlateError, type SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import {
  LETTING_RULES,
  PAYMENT_TERMS_DAYS,
  type Job,
  type JobPayment,
  type Person,
  type Visit,
} from '@/domain/types'
import {
  forbidden,
  invalidState,
  jobParties,
  jobSide,
  landlordSide,
  notFound,
  requireJob,
  requireJobAsLandlord,
  requireJobAsTrade,
  resolveViewer,
} from '../access'
import {
  addDaysToDate,
  addHours,
  formatClock,
  formatDay,
  hoursBetween,
  isBefore,
  startOfUkDay,
  ukDate,
} from '../dates'
import { formatPence } from '../money'
import { appendEvent } from '../events'
import { hrefs } from '../hrefs'
import { noticeText } from '../notice'
import { firstName, notify, notifyJobParties } from '../notify'
import { photosFrom } from '../photos'
import { authorFor, ensureJobThread, postMessage } from '../threads'
import type { Draft } from '../tx'
import {
  invalid,
  optionalText,
  requireDateTime,
  requireImages,
  requirePence,
  requireText,
} from '../validate'
import type { LocalContext } from './context'
import { BRAND } from '@/config/brand'

type VisitMethods =
  | 'bookVisit'
  | 'cancelVisit'
  | 'startVisit'
  | 'recordNoAccess'
  | 'markComplete'
  | 'confirmVisit'
  | 'confirmJob'
  | 'sendInvoice'
  | 'recordPayment'

const MAX_VISIT_HOURS = 12

/** "on Thursday 1 October", or "today" when it's due on the day. */
function dueText(dueOn: string, today: string): string {
  return dueOn === today ? 'today' : `on ${formatDay(startOfUkDay(dueOn))}`
}

/**
 * The trade's invoice. The amount defaults to the final price they gave when marking the work
 * done, or else the accepted quote.
 */
function invoiceFor(
  tx: Draft,
  job: Job,
  amountPence: number | undefined,
  dueInDays: unknown,
): JobPayment {
  const days = PAYMENT_TERMS_DAYS.find((option) => option === dueInDays)
  if (days === undefined) {
    throw invalid('dueInDays', 'Choose when it should be paid: on the day, or in 7, 14 or 30 days.')
  }
  const amount =
    amountPence !== undefined
      ? requirePence(amountPence, 'amountPence', 'the amount')
      : (job.completion?.finalPricePence ?? tx.get('quotes', job.acceptedQuoteId)?.totalPence)
  if (amount === undefined) throw invalid('amountPence', 'Enter the amount to invoice.')
  return {
    amountPence: amount,
    invoicedAt: tx.now,
    dueOn: addDaysToDate(ukDate(tx.now), days),
  }
}

/** Adds the invoice to the job and tells the landlord's side. */
function sendInvoiceFor(tx: Draft, job: Job, trade: Person, payment: JobPayment): Job {
  const saved = appendEvent(
    tx,
    { ...job, payment },
    { kind: 'invoice_sent', amountPence: payment.amountPence, dueOn: payment.dueOn },
    trade.id,
  )
  const property = tx.get('properties', job.propertyId)
  const business = trade.tradeProfile?.businessName ?? trade.displayName
  notify(tx, {
    to: property ? landlordSide(tx, property) : [],
    role: 'landlord',
    kind: 'payment',
    title: `Invoice from ${business}: ${job.title}`,
    body: `${formatPence(payment.amountPence)}, to pay ${dueText(payment.dueOn, ukDate(tx.now))}. ${BRAND.name} doesn't handle the money: pay ${firstName(tx, trade.id)} directly, then mark it paid.`,
    href: hrefs.job('landlord', job.id),
    ref: { entity: 'job', id: job.id },
  })
  return saved
}

function activeVisit(job: Job): Visit | undefined {
  return job.visits.find((v) => v.status === 'booked' || v.status === 'on_site')
}

function findVisit(job: Job, visitId: string): Visit {
  const visit = job.visits.find((v) => v.id === visitId)
  if (!visit) throw notFound('visit')
  return visit
}

function replaceVisit(job: Job, visit: Visit): Job {
  return { ...job, visits: job.visits.map((v) => (v.id === visit.id ? visit : v)) }
}

export function visitsApi(ctx: LocalContext): Pick<SlateApi, VisitMethods> {
  return {
    async bookVisit(viewer, jobId, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job, side } = requireJob(tx, actor, jobId)
        if (side === 'tenant') throw forbidden('Visits are booked by the trade or the landlord.')
        if (side === 'landlord') requireJobAsLandlord(tx, actor, jobId, 'instruct_trades')
        const trade = tx.get('people', job.tradeId)
        if (!trade) throw invalidState('Choose a trade before booking a visit.')
        if (job.status === 'booked' || activeVisit(job)) {
          throw invalidState('A visit is already booked. Cancel it first to book a different time.')
        }
        const purpose = input.purpose
        if (purpose !== 'quote' && purpose !== 'repair' && purpose !== 'safety_check') {
          throw invalid('purpose', 'Choose what the visit is for.')
        }
        if (purpose === 'quote' && job.status !== 'quoting') {
          throw invalidState(
            'A visit to price the job can only be booked while it is getting quotes.',
          )
        }
        if (purpose !== 'quote' && job.status !== 'instructed') {
          throw invalidState(
            job.status === 'quoting'
              ? 'The landlord needs to instruct the trade before the work is booked.'
              : 'Visits can be booked once the trade is instructed and before the work starts.',
          )
        }
        const startsAt = requireDateTime(input.startsAt, 'startsAt', 'the start of the visit')
        const endsAt = requireDateTime(input.endsAt, 'endsAt', 'the end of the visit')
        if (!isBefore(startsAt, endsAt)) {
          throw invalid('endsAt', 'The visit must end after it starts.')
        }
        if (hoursBetween(startsAt, endsAt) > MAX_VISIT_HOURS) {
          throw invalid('endsAt', `A single visit can be up to ${MAX_VISIT_HOURS} hours.`)
        }
        if (!isBefore(tx.now, startsAt)) {
          throw invalid('startsAt', 'Choose a time that is still to come.')
        }
        const emergency = input.emergency === true
        if (emergency && job.urgency !== 'emergency') {
          throw invalid(
            'emergency',
            "Only jobs reported as emergencies can skip the 48 hours' notice.",
          )
        }
        const hoursGiven = hoursBetween(tx.now, startsAt)
        if (!emergency && hoursGiven < LETTING_RULES.visitNoticeHours) {
          const earliest = addHours(tx.now, LETTING_RULES.visitNoticeHours)
          const message = `In Scotland tenants must get at least 48 hours' written notice of a visit. The earliest you can book is ${formatDay(earliest)} at ${formatClock(earliest)}.`
          throw new SlateError('notice_too_short', message, { startsAt: message })
        }
        const note = optionalText(input.note, { field: 'note', label: 'your note', max: 500 })

        const thread = ensureJobThread(tx, job)
        const tradeType = trade.tradeProfile?.trades[0]
        const notice = postMessage(
          tx,
          thread,
          authorFor(tx.get('threads', thread.id) ?? thread, actor.person.id),
          'notice',
          noticeText({
            tradeName: trade.displayName,
            ...(tradeType ? { trade: tradeType } : {}),
            purpose,
            category: job.category,
            ...(job.complianceType ? { complianceType: job.complianceType } : {}),
            givenAt: tx.now,
            startsAt,
            endsAt,
            emergency,
            ...(note ? { note } : {}),
          }),
        )
        const visit: Visit = {
          id: newId('visit'),
          tradeId: trade.id,
          purpose,
          startsAt,
          endsAt,
          notice: {
            givenAt: tx.now,
            givenById: actor.person.id,
            messageId: notice.id,
            hoursGiven: Math.round(hoursGiven * 10) / 10,
            emergency,
          },
          status: 'booked',
        }
        const next: Job = {
          ...job,
          visits: [...job.visits, visit],
          status: purpose === 'quote' ? job.status : 'booked',
        }
        const saved = appendEvent(
          tx,
          next,
          { kind: 'visit_booked', visitId: visit.id },
          actor.person.id,
        )
        notifyJobParties(tx, saved, actor.person.id, {
          kind: 'visit_booked',
          title: `Visit booked: ${formatDay(startsAt)}, ${formatClock(startsAt)} to ${formatClock(endsAt)}`,
          body: `${trade.displayName} is coming for: ${job.title}. The written notice is on the job.`,
        })
        return saved
      })
    },

    async cancelVisit(viewer, jobId, visitId, rawReason) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job, side } = requireJob(tx, actor, jobId)
        if (side === 'tenant') {
          throw forbidden('Ask the trade or landlord to rearrange; they will send fresh notice.')
        }
        if (side === 'landlord') requireJobAsLandlord(tx, actor, jobId, 'instruct_trades')
        const visit = findVisit(job, visitId)
        if (visit.status !== 'booked') {
          throw invalidState('Only a visit that has not started can be cancelled.')
        }
        const reason = requireText(rawReason, {
          field: 'reason',
          label: 'a reason',
          min: 3,
          max: 300,
        })
        const rest = job.visits.filter((v) => v.id !== visit.id)
        const stillBooked = rest.some((v) => v.status === 'booked' && v.purpose !== 'quote')
        const next: Job = {
          ...replaceVisit(job, { ...visit, status: 'cancelled' }),
          status: job.status === 'booked' && !stillBooked ? 'instructed' : job.status,
        }
        const saved = appendEvent(
          tx,
          next,
          { kind: 'visit_cancelled', visitId, reason },
          actor.person.id,
        )
        const thread = ensureJobThread(tx, saved)
        postMessage(
          tx,
          thread,
          null,
          'system',
          `The visit on ${formatDay(visit.startsAt)} at ${formatClock(visit.startsAt)} is cancelled. ${reason}`,
        )
        notifyJobParties(tx, saved, actor.person.id, {
          kind: 'visit_cancelled',
          title: `Visit cancelled: ${job.title}`,
          body: reason,
        })
        return saved
      })
    },

    async startVisit(viewer, jobId, visitId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const job = requireJobAsTrade(tx, actor, jobId)
        const visit = findVisit(job, visitId)
        if (visit.tradeId !== actor.person.id) throw forbidden("That visit isn't yours.")
        if (visit.status !== 'booked') {
          throw invalidState('That visit has already started or ended.')
        }
        const next: Job = {
          ...replaceVisit(job, { ...visit, status: 'on_site', startedAt: tx.now }),
          status: visit.purpose === 'quote' ? job.status : 'in_progress',
        }
        return appendEvent(tx, next, { kind: 'visit_started', visitId }, actor.person.id)
      })
    },

    async recordNoAccess(viewer, jobId, visitId, rawNote) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const job = requireJobAsTrade(tx, actor, jobId)
        const visit = findVisit(job, visitId)
        if (visit.status !== 'booked' && visit.status !== 'on_site') {
          throw invalidState('That visit has already finished.')
        }
        const note = optionalText(rawNote, { field: 'note', label: 'your note', max: 500 })
        const next: Job = {
          ...replaceVisit(job, { ...visit, status: 'no_access' }),
          // The work still needs doing: back to booking another visit.
          status: visit.purpose === 'quote' ? job.status : 'instructed',
        }
        const saved = appendEvent(
          tx,
          next,
          note ? { kind: 'no_access', visitId, note } : { kind: 'no_access', visitId },
          actor.person.id,
        )
        notifyJobParties(tx, saved, actor.person.id, {
          kind: 'visit_cancelled',
          title: `${firstName(tx, actor.person.id)} couldn't get in: ${job.title}`,
          body: note ?? 'A new visit will need to be booked.',
        })
        return saved
      })
    },

    async markComplete(viewer, jobId, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const job = requireJobAsTrade(tx, actor, jobId)
        if (job.status !== 'booked' && job.status !== 'in_progress') {
          throw invalidState('Only a booked or started job can be marked as done.')
        }
        const visit = job.visits.find(
          (v) =>
            v.tradeId === actor.person.id &&
            v.purpose !== 'quote' &&
            (v.status === 'on_site' || v.status === 'booked'),
        )
        if (!visit) throw invalidState('There is no visit to mark as done.')
        const note = optionalText(input.note, { field: 'note', label: 'your note', max: 1000 })
        const images = requireImages(input.photos ?? [])
        const completion: NonNullable<Job['completion']> = {
          completedAt: tx.now,
          photos: photosFrom(images, actor.person.id, tx.now),
        }
        if (input.finalPricePence !== undefined) {
          completion.finalPricePence = requirePence(
            input.finalPricePence,
            'finalPricePence',
            'the final price',
          )
        }
        if (note) completion.note = note
        const done: Visit = {
          ...visit,
          status: 'done',
          startedAt: visit.startedAt ?? tx.now,
          finishedAt: tx.now,
        }
        let saved = appendEvent(
          tx,
          { ...replaceVisit(job, done), status: 'completed', completion },
          { kind: 'completed' },
          actor.person.id,
        )
        if (input.invoiceDueInDays !== undefined) {
          const payment = invoiceFor(tx, saved, undefined, input.invoiceDueInDays)
          saved = sendInvoiceFor(tx, saved, actor.person, payment)
        }
        const who = firstName(tx, actor.person.id)
        notify(tx, {
          to: jobParties(tx, saved)
            .filter((p) => p.role === 'landlord')
            .map((p) => p.personId),
          role: 'landlord',
          kind: 'job_completed',
          title: `${who} marked the work done: ${job.title}`,
          body: 'Confirm the job is complete so everyone can rate it.',
          href: hrefs.job('landlord', job.id),
          ref: { entity: 'job', id: job.id },
        })
        notify(tx, {
          to: jobParties(tx, saved)
            .filter((p) => p.role === 'tenant')
            .map((p) => p.personId),
          role: 'tenant',
          kind: 'job_completed',
          title: `${who} marked the work done: ${job.title}`,
          body: 'Let us know the visit happened, then you can rate how it went.',
          href: hrefs.job('tenant', job.id),
          ref: { entity: 'job', id: job.id },
        })
        return saved
      })
    },

    async confirmVisit(viewer, jobId, visitId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const job = tx.get('jobs', jobId)
        if (!job) throw notFound('job')
        if (jobSide(tx, actor, job) !== 'tenant') {
          throw forbidden('Only a tenant at the home can confirm the visit happened.')
        }
        const visit = findVisit(job, visitId)
        if (visit.status !== 'done') {
          throw invalidState('You can confirm the visit once the work is done.')
        }
        if (visit.tenantConfirmedAt) {
          throw new SlateError('already_done', "You've already confirmed this visit.")
        }
        return appendEvent(
          tx,
          replaceVisit(job, { ...visit, tenantConfirmedAt: tx.now }),
          { kind: 'visit_confirmed', visitId },
          actor.person.id,
        )
      })
    },

    async confirmJob(viewer, jobId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'approve_repairs')
        if (job.status !== 'completed') {
          throw invalidState(
            job.status === 'confirmed'
              ? 'This job is already confirmed.'
              : 'The trade needs to mark the work done first.',
          )
        }
        const saved = appendEvent(
          tx,
          { ...job, status: 'confirmed', landlordConfirmedAt: tx.now },
          { kind: 'confirmed' },
          actor.person.id,
        )
        notifyJobParties(tx, saved, actor.person.id, {
          kind: 'job_confirmed',
          title: `Confirmed as done: ${job.title}`,
        })
        return saved
      })
    },

    async sendInvoice(viewer, jobId, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const job = requireJobAsTrade(tx, actor, jobId)
        if (job.status !== 'completed' && job.status !== 'confirmed') {
          throw invalidState('Send the invoice once the work is marked done.')
        }
        if (job.payment) {
          throw new SlateError('already_done', 'You have already sent the invoice for this job.')
        }
        const payment = invoiceFor(tx, job, input.amountPence, input.dueInDays)
        return sendInvoiceFor(tx, job, actor.person, payment)
      })
    },

    async recordPayment(viewer, jobId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job, side } = requireJob(tx, actor, jobId)
        if (side === 'tenant') throw forbidden('Payments are between the landlord and the trade.')
        if (side === 'landlord') requireJobAsLandlord(tx, actor, jobId, 'accept_quotes')
        const payment = job.payment
        if (!payment) throw invalidState('There is no invoice on this job yet.')
        if (payment.paidAt) {
          throw new SlateError('already_done', 'This invoice is already marked as paid.')
        }
        const by = side === 'landlord' ? 'landlord' : 'trade'
        const saved = appendEvent(
          tx,
          { ...job, payment: { ...payment, paidAt: tx.now, paidRecordedBy: by } },
          { kind: 'payment_recorded', by },
          actor.person.id,
        )
        const amount = formatPence(payment.amountPence)
        if (by === 'landlord') {
          notify(tx, {
            to: job.tradeId ? [job.tradeId] : [],
            role: 'trade',
            kind: 'payment',
            title: `${firstName(tx, actor.actingAs)} says they've paid: ${job.title}`,
            body: `${amount}. Check it has arrived.`,
            href: hrefs.job('trade', job.id),
            ref: { entity: 'job', id: job.id },
          })
        } else {
          const property = tx.get('properties', job.propertyId)
          notify(tx, {
            to: property ? landlordSide(tx, property) : [],
            role: 'landlord',
            kind: 'payment',
            title: `${firstName(tx, actor.person.id)} has been paid: ${job.title}`,
            body: `${amount} received. Thanks for paying.`,
            href: hrefs.job('landlord', job.id),
            ref: { entity: 'job', id: job.id },
          })
        }
        return saved
      })
    },
  }
}
