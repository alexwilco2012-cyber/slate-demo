// Quotes: trades price jobs they were chosen for, or jobs on the board; the landlord picks one.

import { SlateError, type SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import { LINE_ITEM_KINDS, type Job, type Quote, type QuoteLineItem } from '@/domain/types'
import {
  forbidden,
  invalidState,
  landlordSide,
  managesProperty,
  notFound,
  requireJobAsLandlord,
  requireRole,
  resolveViewer,
} from '../access'
import { requireCredential } from '../credentials'
import { addDaysToDate, isBefore, ukDate } from '../dates'
import { appendEvent } from '../events'
import { hrefs } from '../hrefs'
import { instructJob } from '../instruct'
import { formatPence, quoteTotals } from '../money'
import { firstName, notify } from '../notify'
import { ensureJobThread } from '../threads'
import { invalid, optionalText, requireDate, requireOneOf, requireText } from '../validate'
import type { LocalContext } from './context'

type QuoteMethods = 'submitQuote' | 'withdrawQuote' | 'listQuotes' | 'acceptQuote' | 'declineQuote'

/** How far ahead a quote may say it holds its price. */
const MAX_VALID_DAYS = 90

function checkLines(lines: unknown): QuoteLineItem[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw invalid('lineItems', 'Add at least one line to the quote.')
  }
  if (lines.length > 20) throw invalid('lineItems', 'A quote can have up to 20 lines.')
  return lines.map((raw: Partial<QuoteLineItem>, index) => {
    const quantity = raw.quantity
    if (typeof quantity !== 'number' || !(quantity > 0) || quantity > 1000) {
      throw invalid('lineItems', `Line ${index + 1}: enter a quantity above zero.`)
    }
    const unitPence = raw.unitPence
    if (
      typeof unitPence !== 'number' ||
      !Number.isInteger(unitPence) ||
      unitPence < 0 ||
      unitPence > 10_000_000
    ) {
      throw invalid('lineItems', `Line ${index + 1}: enter the price in whole pence.`)
    }
    return {
      description: requireText(raw.description, {
        field: 'lineItems',
        label: `a description for line ${index + 1}`,
        max: 120,
      }),
      kind: requireOneOf(
        raw.kind,
        LINE_ITEM_KINDS,
        'lineItems',
        `Line ${index + 1}: choose a kind.`,
      ),
      quantity: Math.round(quantity * 100) / 100,
      unitPence,
    }
  })
}

/** Where a trade may quote: a job they were chosen for, or an open job on the board. */
function canQuote(job: Job, tradeId: string, now: string): boolean {
  if (job.status !== 'quoting' || job.acceptedQuoteId) return false
  if (job.tradeId) return job.tradeId === tradeId
  return job.board !== undefined && (!job.board.closesAt || isBefore(now, job.board.closesAt))
}

export function quotesApi(ctx: LocalContext): Pick<SlateApi, QuoteMethods> {
  return {
    async submitQuote(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'trade')
        const job = tx.get('jobs', input.jobId)
        if (!job) throw notFound('job')
        if (!canQuote(job, actor.person.id, tx.now)) {
          throw invalidState('This job is not taking quotes from you right now.')
        }
        const today = ukDate(tx.now)
        requireCredential(actor.person, job.credentialNeeded, today)
        const mine = tx
          .rows('quotes')
          .find(
            (q) => q.jobId === job.id && q.tradeId === actor.person.id && q.status === 'submitted',
          )
        if (mine) {
          throw new SlateError(
            'already_done',
            "You've already sent a quote for this job. Withdraw it first to send a new one.",
          )
        }
        const lineItems = checkLines(input.lineItems)
        const validUntil = requireDate(input.validUntil, 'validUntil', 'how long the price holds')
        if (validUntil < today || validUntil > addDaysToDate(today, MAX_VALID_DAYS)) {
          throw invalid(
            'validUntil',
            `Choose a date between today and ${MAX_VALID_DAYS} days from now.`,
          )
        }
        const earliestStart =
          input.earliestStart === undefined
            ? undefined
            : requireDate(input.earliestStart, 'earliestStart', 'the earliest start')
        if (earliestStart && earliestStart < today) {
          throw invalid('earliestStart', 'The earliest start cannot be in the past.')
        }
        const notes = optionalText(input.notes, { field: 'notes', label: 'your notes', max: 1000 })
        const quote: Quote = {
          id: newId('quote'),
          jobId: job.id,
          tradeId: actor.person.id,
          lineItems,
          ...quoteTotals(lineItems, actor.person.tradeProfile?.vatRegistered ?? false),
          validUntil,
          status: 'submitted',
          submittedAt: tx.now,
        }
        if (notes) quote.notes = notes
        if (earliestStart) quote.earliestStart = earliestStart
        tx.put('quotes', quote)
        appendEvent(tx, job, { kind: 'quote_submitted', quoteId: quote.id }, actor.person.id)
        const property = tx.get('properties', job.propertyId)
        const business = actor.person.tradeProfile?.businessName ?? actor.person.displayName
        notify(tx, {
          to: property ? landlordSide(tx, property) : [],
          role: 'landlord',
          kind: 'quote_received',
          title: `Quote from ${business}: ${job.title}`,
          body: `${formatPence(quote.totalPence)} in total${quote.vatPence ? ', including VAT' : ''}.`,
          href: hrefs.job('landlord', job.id),
          ref: { entity: 'quote', id: quote.id },
        })
        return quote
      })
    },

    async withdrawQuote(viewer, quoteId, rawReason) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'trade')
        const quote = tx.get('quotes', quoteId)
        if (!quote) throw notFound('quote')
        if (quote.tradeId !== actor.person.id) throw forbidden()
        if (quote.status === 'withdrawn') {
          throw new SlateError('already_done', 'You have already withdrawn this quote.')
        }
        if (quote.status !== 'submitted') {
          throw invalidState('Only a quote still waiting for an answer can be withdrawn.')
        }
        const reason = optionalText(rawReason, { field: 'reason', label: 'the reason', max: 300 })
        const withdrawn = tx.put('quotes', { ...quote, status: 'withdrawn', decidedAt: tx.now })
        const job = tx.get('jobs', quote.jobId)
        if (job) {
          appendEvent(tx, job, { kind: 'quote_withdrawn', quoteId: quote.id }, actor.person.id)
          const property = tx.get('properties', job.propertyId)
          const business = actor.person.tradeProfile?.businessName ?? actor.person.displayName
          notify(tx, {
            to: property ? landlordSide(tx, property) : [],
            role: 'landlord',
            kind: 'quote_withdrawn',
            title: `${business} withdrew their quote: ${job.title}`,
            body: reason ?? 'You can choose another quote, or ask someone else.',
            href: hrefs.job('landlord', job.id),
            ref: { entity: 'quote', id: quote.id },
          })
        }
        return withdrawn
      })
    },

    async listQuotes(viewer, jobId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const job = db.get('jobs', jobId)
      if (!job) return []
      const property = db.get('properties', job.propertyId)
      const quotes = db
        .rows('quotes')
        .filter((q) => q.jobId === job.id)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
      if (actor.role === 'landlord' && property && managesProperty(actor, property)) return quotes
      if (actor.role === 'trade') return quotes.filter((q) => q.tradeId === actor.person.id)
      // Prices are between the landlord and the trade; tenants don't see them.
      return []
    },

    async acceptQuote(viewer, quoteId, options = {}) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const quote = tx.get('quotes', quoteId)
        if (!quote) throw notFound('quote')
        const { job } = requireJobAsLandlord(tx, actor, quote.jobId, 'accept_quotes')
        if (quote.status !== 'submitted') throw invalidState('That quote is no longer open.')
        const today = ukDate(tx.now)
        if (quote.validUntil < today) {
          throw invalidState('That quote has expired. Ask the trade for a fresh one.')
        }
        if (job.status !== 'quoting' || job.acceptedQuoteId) {
          throw invalidState('This job already has an accepted quote.')
        }
        if (job.tradeId && job.tradeId !== quote.tradeId) {
          throw invalidState('Another trade is instructed on this job.')
        }
        const trade = tx.get('people', quote.tradeId)
        if (!trade) throw notFound('trade')
        requireCredential(trade, job.credentialNeeded, today)

        tx.put('quotes', { ...quote, status: 'accepted', decidedAt: tx.now })
        for (const other of tx.rows('quotes')) {
          if (other.jobId !== job.id || other.id === quote.id || other.status !== 'submitted')
            continue
          tx.put('quotes', { ...other, status: 'declined', decidedAt: tx.now })
          notify(tx, {
            to: [other.tradeId],
            role: 'trade',
            kind: 'quote_declined',
            title: `Not chosen this time: ${job.title}`,
            body: 'Thanks for quoting. The landlord went with another quote.',
            href: hrefs.jobBoard(),
            ref: { entity: 'quote', id: other.id },
          })
        }

        const next: Job = { ...job, tradeId: trade.id, acceptedQuoteId: quote.id }
        if (job.board && (!job.board.closesAt || isBefore(tx.now, job.board.closesAt))) {
          next.board = { ...job.board, closesAt: tx.now }
        }
        let saved = next
        if (!job.tradeId) {
          saved = appendEvent(
            tx,
            saved,
            { kind: 'trade_chosen', tradeId: trade.id, route: 'job_board' },
            actor.person.id,
          )
        }
        saved = appendEvent(
          tx,
          saved,
          { kind: 'quote_accepted', quoteId: quote.id },
          actor.person.id,
        )
        ensureJobThread(tx, saved)
        if (options.instruct) {
          const note = optionalText(options.note, { field: 'note', label: 'your note', max: 500 })
          return instructJob(tx, saved, trade, actor.person.id, actor.actingAs, note)
        }
        const landlord = tx.get('people', actor.actingAs)
        notify(tx, {
          to: [trade.id],
          role: 'trade',
          kind: 'quote_accepted',
          title: `${landlord?.displayName ?? 'The landlord'} accepted your quote: ${job.title}`,
          body: `${firstName(tx, actor.person.id)} will confirm when to go ahead. Then you can book a visit.`,
          href: hrefs.job('trade', job.id),
          ref: { entity: 'quote', id: quote.id },
        })
        return saved
      })
    },

    async declineQuote(viewer, quoteId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const quote = tx.get('quotes', quoteId)
        if (!quote) throw notFound('quote')
        const { job } = requireJobAsLandlord(tx, actor, quote.jobId, 'accept_quotes')
        if (quote.status !== 'submitted') throw invalidState('That quote is no longer open.')
        const declined = tx.put('quotes', { ...quote, status: 'declined', decidedAt: tx.now })
        notify(tx, {
          to: [quote.tradeId],
          role: 'trade',
          kind: 'quote_declined',
          title: `Quote not accepted: ${job.title}`,
          href: job.tradeId === quote.tradeId ? hrefs.job('trade', job.id) : hrefs.jobBoard(),
          ref: { entity: 'quote', id: quote.id },
        })
        return declined
      })
    },
  }
}
