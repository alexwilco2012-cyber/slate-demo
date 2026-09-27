// The landlord's go-ahead to the trade they chose. It is its own step on the timeline, after the
// quote is accepted and before anything is booked, so the job always shows that the landlord (or
// their agent) made the choice: Slate never assigns, matches or dispatches (SPEC §4).

import type { Job, Person, PersonId } from '@/domain/types'
import { formatPence } from './money'
import { appendEvent } from './events'
import { hrefs } from './hrefs'
import { firstName, notify, notifyJobParties } from './notify'
import { ensureJobThread, postMessage } from './threads'
import type { Draft } from './tx'

export function instructJob(
  tx: Draft,
  job: Job,
  trade: Person,
  actorId: PersonId,
  landlordId: PersonId,
  note: string | undefined,
): Job {
  const quote = tx.get('quotes', job.acceptedQuoteId)
  const saved = appendEvent(
    tx,
    { ...job, status: 'instructed' },
    {
      kind: 'trade_instructed',
      tradeId: trade.id,
      ...(quote ? { quoteId: quote.id } : {}),
      ...(note ? { note } : {}),
    },
    actorId,
  )
  const business = trade.tradeProfile?.businessName ?? trade.displayName
  const thread = ensureJobThread(tx, saved)
  postMessage(
    tx,
    thread,
    null,
    'system',
    `${firstName(tx, actorId)} instructed ${business} to do the work. They will book a visit and send written notice first.`,
  )
  const landlord = tx.get('people', landlordId)
  notify(tx, {
    to: [trade.id],
    role: 'trade',
    kind: 'trade_instructed',
    title: `${landlord?.displayName ?? 'The landlord'} instructed you: ${job.title}`,
    body: [
      quote ? `Go ahead at ${formatPence(quote.totalPence)}.` : 'Go ahead as agreed.',
      'Book a visit next. The tenant gets the written notice automatically.',
      note,
    ]
      .filter(Boolean)
      .join(' '),
    href: hrefs.job('trade', job.id),
    ref: { entity: 'job', id: job.id },
  })
  notifyJobParties(
    tx,
    saved,
    actorId,
    {
      kind: 'trade_instructed',
      title: `${business} will do the work: ${job.title}`,
      body: "They'll book a time with at least 48 hours' written notice.",
    },
    ['tenant'],
  )
  return saved
}
