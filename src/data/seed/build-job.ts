// Turns a short, readable story of a repair into the records the store holds: the job with its
// timeline, visits and 48-hour notices, its quotes, and the job's message thread. Writing jobs as
// stories keeps the seed easy to read and makes every timeline agree with its visits and quotes.

import { quoteTotals } from '@/data/local/money'
import { noticeText } from '@/data/local/notice'
import { hoursBetween } from '@/data/local/dates'
import type {
  CredentialRequirement,
  DocumentType,
  IsoDate,
  IsoDateTime,
  Job,
  JobAccess,
  JobCategory,
  JobEvent,
  JobId,
  JobStatus,
  LineItemKind,
  Message,
  MessageAuthor,
  Person,
  PaymentTermsDays,
  PersonId,
  Photo,
  Property,
  Quote,
  QuoteId,
  QuoteLineItem,
  Role,
  Room,
  Tenancy,
  TenancyId,
  Thread,
  ThreadMember,
  TradeChoiceRoute,
  Urgency,
  Visit,
  VisitId,
  VisitPurpose,
  VisitStatus,
} from '@/domain/types'
import { addDaysToDate, ukDate } from '@/data/local/dates'
import type { NewJobEvent } from '@/data/local/events'
import { photo } from './placeholders'

export interface PhotoSeed {
  slug: string
  alt: string
}

/** [description, kind, quantity, unit price in pence] */
export type LineSeed = [string, LineItemKind, number, number]

export interface QuoteSeed {
  id: QuoteId
  trade: PersonId
  at: IsoDateTime
  lines: LineSeed[]
  notes?: string
  earliestStart?: IsoDate
  /** Days the price holds for. Defaults to 30. */
  validDays?: number
  outcome?: { status: 'accepted' | 'declined' | 'withdrawn'; at: IsoDateTime; by: PersonId }
}

export interface VisitSeed {
  id: VisitId
  purpose: VisitPurpose
  bookedAt: IsoDateTime
  bookedBy: PersonId
  startsAt: IsoDateTime
  endsAt: IsoDateTime
  emergency?: boolean
  note?: string
  status: VisitStatus
  startedAt?: IsoDateTime
  finishedAt?: IsoDateTime
  tenantConfirmedAt?: IsoDateTime
  /** Who confirmed the visit. Defaults to the tenant who reported the job, or the first tenant. */
  tenantConfirmedBy?: PersonId
}

export interface MessageSeed {
  by: PersonId
  at: IsoDateTime
  body: string
  photos?: PhotoSeed[]
}

export interface JobSeed {
  id: JobId
  propertyId: Property['id']
  tenancyId?: TenancyId
  reporter: PersonId
  reportedAs: Role
  title: string
  room: Room
  category: JobCategory
  description: string
  urgency: Urgency
  access: JobAccess
  photos?: PhotoSeed[]
  complianceType?: DocumentType
  credential?: CredentialRequirement
  status: JobStatus
  reportedAt: IsoDateTime
  approved?: { at: IsoDateTime; by: PersonId; note?: string }
  declined?: { at: IsoDateTime; by: PersonId; reason: string }
  cancelled?: { at: IsoDateTime; by: PersonId; reason: string }
  board?: { at: IsoDateTime; by: PersonId; closesAt: IsoDateTime }
  chosen?: {
    trade: PersonId
    at: IsoDateTime
    by: PersonId
    route: Exclude<TradeChoiceRoute, 'job_board'>
  }
  quotes?: QuoteSeed[]
  /**
   * The landlord's go-ahead. Left out, it is taken to have come with the accepted quote, for any
   * job that got as far as being instructed.
   */
  instructed?: { at: IsoDateTime; by: PersonId; note?: string }
  visits?: VisitSeed[]
  completion?: { at: IsoDateTime; pricePence?: number; note?: string; photos?: PhotoSeed[] }
  /** The trade's invoice, and when (if ever) it was paid. */
  payment?: {
    invoicedAt: IsoDateTime
    dueInDays: PaymentTermsDays
    amountPence?: number
    paid?: { at: IsoDateTime; by: 'landlord' | 'trade' }
  }
  confirmed?: { at: IsoDateTime; by: PersonId }
  messages?: MessageSeed[]
  /** Members who haven't opened the thread since their own last message. */
  unreadFor?: PersonId[]
}

export interface BuiltJob {
  job: Job
  quotes: Quote[]
  thread: Thread
  messages: Message[]
}

export interface SeedLookup {
  person(id: PersonId): Person
  property(id: Property['id']): Property
  tenancy(id: TenancyId | undefined): Tenancy | undefined
}

/** Statuses a job only reaches after the landlord's go-ahead. */
const INSTRUCTED_OR_LATER: ReadonlySet<JobStatus> = new Set([
  'instructed',
  'booked',
  'in_progress',
  'completed',
  'confirmed',
])

function acceptedQuoteTotal(seed: JobSeed, lookup: SeedLookup): number | undefined {
  const accepted = seed.quotes?.find((q) => q.outcome?.status === 'accepted')
  if (!accepted) return undefined
  const lines = accepted.lines.map(([description, kind, quantity, unitPence]) => ({
    description,
    kind,
    quantity,
    unitPence,
  }))
  const vatRegistered = lookup.person(accepted.trade).tradeProfile?.vatRegistered ?? false
  return quoteTotals(lines, vatRegistered).totalPence
}

export function buildJob(seed: JobSeed, lookup: SeedLookup): BuiltJob {
  const slug = seed.id.slice('job_'.length)
  const property = lookup.property(seed.propertyId)
  const tenancy = lookup.tenancy(seed.tenancyId)
  const accepted = seed.quotes?.find((q) => q.outcome?.status === 'accepted')
  const tradeId = seed.chosen?.trade ?? accepted?.trade
  const trade = tradeId ? lookup.person(tradeId) : undefined

  const roleOf = (personId: PersonId): MessageAuthor => {
    if (personId === property.landlordId) return { personId, role: 'landlord' }
    if (property.agentIds.includes(personId)) {
      return { personId, role: 'landlord', actingForId: property.landlordId }
    }
    if (lookup.person(personId).roles.includes('trade')) return { personId, role: 'trade' }
    return { personId, role: 'tenant' }
  }

  // ─── Timeline ────────────────────────────────────────────────────────────────────────────
  const events: { at: IsoDateTime; actorId: PersonId | null; event: NewJobEvent }[] = []
  const add = (at: IsoDateTime, actorId: PersonId | null, event: NewJobEvent) =>
    events.push({ at, actorId, event })

  add(seed.reportedAt, seed.reporter, { kind: 'reported' })
  if (seed.approved) {
    const note = seed.approved.note
    add(
      seed.approved.at,
      seed.approved.by,
      note ? { kind: 'approved', note } : { kind: 'approved' },
    )
  }
  if (seed.declined) {
    add(seed.declined.at, seed.declined.by, { kind: 'declined', reason: seed.declined.reason })
  }
  if (seed.board) add(seed.board.at, seed.board.by, { kind: 'posted_to_board' })
  if (seed.chosen) {
    add(seed.chosen.at, seed.chosen.by, {
      kind: 'trade_chosen',
      tradeId: seed.chosen.trade,
      route: seed.chosen.route,
    })
  }

  const quotes: Quote[] = (seed.quotes ?? []).map((q) => {
    const lineItems: QuoteLineItem[] = q.lines.map(([description, kind, quantity, unitPence]) => ({
      description,
      kind,
      quantity,
      unitPence,
    }))
    const vatRegistered = lookup.person(q.trade).tradeProfile?.vatRegistered ?? false
    const quote: Quote = {
      id: q.id,
      jobId: seed.id,
      tradeId: q.trade,
      lineItems,
      ...quoteTotals(lineItems, vatRegistered),
      validUntil: addDaysToDate(ukDate(q.at), q.validDays ?? 30),
      status: q.outcome?.status ?? 'submitted',
      submittedAt: q.at,
    }
    if (q.notes) quote.notes = q.notes
    if (q.earliestStart) quote.earliestStart = q.earliestStart
    if (q.outcome) quote.decidedAt = q.outcome.at
    add(q.at, q.trade, { kind: 'quote_submitted', quoteId: q.id })
    if (q.outcome?.status === 'accepted') {
      add(q.outcome.at, q.outcome.by, { kind: 'quote_accepted', quoteId: q.id })
      if (!seed.chosen) {
        add(q.outcome.at, q.outcome.by, {
          kind: 'trade_chosen',
          tradeId: q.trade,
          route: 'job_board',
        })
      }
    }
    if (q.outcome?.status === 'withdrawn') {
      add(q.outcome.at, q.trade, { kind: 'quote_withdrawn', quoteId: q.id })
    }
    return quote
  })

  // ─── The landlord's go-ahead ─────────────────────────────────────────────────────────────
  const wentAhead = INSTRUCTED_OR_LATER.has(seed.status) || seed.instructed !== undefined
  const instruction =
    seed.instructed ??
    (wentAhead && accepted?.outcome
      ? { at: accepted.outcome.at, by: accepted.outcome.by }
      : undefined)
  if (instruction && tradeId) {
    add(instruction.at, instruction.by, {
      kind: 'trade_instructed',
      tradeId,
      ...(accepted ? { quoteId: accepted.id } : {}),
      ...(seed.instructed?.note ? { note: seed.instructed.note } : {}),
    })
  }

  // ─── Visits, each with its written notice on the thread ─────────────────────────────────
  const messages: Message[] = []
  const threadId: Thread['id'] = `thread_${slug}`
  const visits: Visit[] = (seed.visits ?? []).map((v) => {
    if (!trade) throw new Error(`${seed.id}: a visit needs a trade`)
    const emergency = v.emergency ?? false
    const messageId: Message['id'] = `message_${v.id.slice('visit_'.length)}_notice`
    messages.push({
      id: messageId,
      threadId,
      author: roleOf(v.bookedBy),
      kind: 'notice',
      body: noticeText({
        tradeName: trade.displayName,
        ...(trade.tradeProfile?.trades[0] ? { trade: trade.tradeProfile.trades[0] } : {}),
        purpose: v.purpose,
        category: seed.category,
        ...(seed.complianceType ? { complianceType: seed.complianceType } : {}),
        givenAt: v.bookedAt,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        emergency,
        ...(v.note ? { note: v.note } : {}),
      }),
      attachments: [],
      sentAt: v.bookedAt,
    })
    add(v.bookedAt, v.bookedBy, { kind: 'visit_booked', visitId: v.id })
    if (v.startedAt) add(v.startedAt, trade.id, { kind: 'visit_started', visitId: v.id })
    if (v.tenantConfirmedAt) {
      const confirmer =
        v.tenantConfirmedBy ??
        (seed.reportedAs === 'tenant' ? seed.reporter : (tenancy?.tenantIds[0] ?? null))
      add(v.tenantConfirmedAt, confirmer, { kind: 'visit_confirmed', visitId: v.id })
    }
    const visit: Visit = {
      id: v.id,
      tradeId: trade.id,
      purpose: v.purpose,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      notice: {
        givenAt: v.bookedAt,
        givenById: v.bookedBy,
        messageId,
        hoursGiven: Math.round(hoursBetween(v.bookedAt, v.startsAt) * 10) / 10,
        emergency,
      },
      status: v.status,
    }
    if (v.startedAt) visit.startedAt = v.startedAt
    if (v.finishedAt) visit.finishedAt = v.finishedAt
    if (v.tenantConfirmedAt) visit.tenantConfirmedAt = v.tenantConfirmedAt
    return visit
  })

  if (seed.completion && trade) add(seed.completion.at, trade.id, { kind: 'completed' })
  if (seed.confirmed) add(seed.confirmed.at, seed.confirmed.by, { kind: 'confirmed' })
  let payment: Job['payment']
  if (seed.payment && trade) {
    const amountPence =
      seed.payment.amountPence ?? seed.completion?.pricePence ?? acceptedQuoteTotal(seed, lookup)
    if (amountPence === undefined) throw new Error(`${seed.id}: an invoice needs an amount`)
    const dueOn = addDaysToDate(ukDate(seed.payment.invoicedAt), seed.payment.dueInDays)
    payment = { amountPence, invoicedAt: seed.payment.invoicedAt, dueOn }
    add(seed.payment.invoicedAt, trade.id, { kind: 'invoice_sent', amountPence, dueOn })
    const paid = seed.payment.paid
    if (paid) {
      payment.paidAt = paid.at
      payment.paidRecordedBy = paid.by
      const payer = paid.by === 'trade' ? trade.id : property.landlordId
      add(paid.at, payer, { kind: 'payment_recorded', by: paid.by })
    }
  }
  if (seed.cancelled) {
    add(seed.cancelled.at, seed.cancelled.by, { kind: 'cancelled', reason: seed.cancelled.reason })
  }

  events.sort((a, b) => a.at.localeCompare(b.at))
  const timeline = events.map(
    ({ at, actorId, event }, index) =>
      ({ ...event, id: `event_${slug}_${index + 1}`, at, actorId }) as JobEvent,
  )

  // ─── The job ─────────────────────────────────────────────────────────────────────────────
  const photos: Photo[] = (seed.photos ?? []).map((p) =>
    photo(p.slug, p.alt, seed.reporter, seed.reportedAt),
  )
  const job: Job = {
    id: seed.id,
    propertyId: seed.propertyId,
    reportedById: seed.reporter,
    reportedAs: seed.reportedAs,
    title: seed.title,
    room: seed.room,
    category: seed.category,
    description: seed.description,
    photos,
    urgency: seed.urgency,
    access: seed.access,
    status: seed.status,
    visits,
    timeline,
    createdAt: seed.reportedAt,
    updatedAt: timeline.at(-1)?.at ?? seed.reportedAt,
  }
  if (tenancy) job.tenancyId = tenancy.id
  if (seed.credential) job.credentialNeeded = seed.credential
  if (seed.complianceType) job.complianceType = seed.complianceType
  if (tradeId) job.tradeId = tradeId
  if (seed.board) job.board = { postedAt: seed.board.at, closesAt: seed.board.closesAt }
  if (accepted) job.acceptedQuoteId = accepted.id
  if (seed.completion && trade) {
    job.completion = {
      completedAt: seed.completion.at,
      photos: (seed.completion.photos ?? []).map((p) =>
        photo(p.slug, p.alt, trade.id, seed.completion?.at ?? seed.reportedAt),
      ),
    }
    if (seed.completion.pricePence !== undefined) {
      job.completion.finalPricePence = seed.completion.pricePence
    }
    if (seed.completion.note) job.completion.note = seed.completion.note
  }
  if (seed.confirmed) job.landlordConfirmedAt = seed.confirmed.at
  if (payment) job.payment = payment

  // ─── The thread ──────────────────────────────────────────────────────────────────────────
  ;(seed.messages ?? []).forEach((m, index) => {
    messages.push({
      id: `message_${slug}_${index + 1}`,
      threadId,
      author: roleOf(m.by),
      kind: 'text',
      body: m.body,
      attachments: (m.photos ?? []).map((p) => photo(p.slug, p.alt, m.by, m.at)),
      sentAt: m.at,
    })
  })
  messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const lastMessageAt = messages.at(-1)?.sentAt

  const memberIds: { personId: PersonId; joinedAt: IsoDateTime }[] = []
  const tenantIds = tenancy
    ? tenancy.tenantIds
    : seed.reportedAs === 'tenant'
      ? [seed.reporter]
      : []
  for (const personId of tenantIds) memberIds.push({ personId, joinedAt: seed.reportedAt })
  for (const personId of [property.landlordId, ...property.agentIds]) {
    memberIds.push({ personId, joinedAt: seed.reportedAt })
  }
  if (tradeId) {
    memberIds.push({
      personId: tradeId,
      joinedAt: seed.chosen?.at ?? accepted?.outcome?.at ?? seed.reportedAt,
    })
  }
  const members: ThreadMember[] = memberIds.map(({ personId, joinedAt }) => {
    const author = roleOf(personId)
    const member: ThreadMember = { personId, role: author.role, joinedAt }
    if (author.actingForId) member.actingForId = author.actingForId
    const ownLast = messages.filter((m) => m.author?.personId === personId).at(-1)?.sentAt
    const readUpTo = seed.unreadFor?.includes(personId) ? ownLast : lastMessageAt
    if (readUpTo) member.lastReadAt = readUpTo
    return member
  })

  const thread: Thread = {
    id: threadId,
    context: { kind: 'job', jobId: seed.id },
    title: seed.title,
    members,
    createdAt: seed.reportedAt,
  }
  if (lastMessageAt) thread.lastMessageAt = lastMessageAt

  return { job, quotes, thread, messages }
}
