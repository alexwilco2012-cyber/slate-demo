// Records reshaped for screens: what others may see of a person, a review without the rater's
// identity, a thread with its unread count. Pure functions over the data; nothing here writes.

import type { JobBoardPost, TeamMember, ThreadSummary } from '@/data/api'
import { distanceBandOf, milesBetween } from '@/domain/places'
import type {
  Job,
  JobEvent,
  Person,
  PersonCard,
  PersonId,
  PublicReview,
  Rating,
  ReviewContext,
  TeamMembership,
  Thread,
} from '@/domain/types'
import { ukDate } from './dates'
import { toPublicReview } from '@/domain/rating'
import type { Reader } from './tx'

export function personCard(person: Person): PersonCard {
  const card: PersonCard = {
    id: person.id,
    displayName: person.displayName,
    roles: [...person.roles],
    avatarSeed: person.avatarSeed,
    postcodeDistrict: person.postcodeDistrict,
    badges: person.badges,
    joinedAt: person.joinedAt,
  }
  if (person.tradeProfile) card.tradeProfile = person.tradeProfile
  return card
}

/** What a review was about, without ids that could identify the reviewer. */
function reviewContext(db: Reader, rating: Rating): ReviewContext {
  if (rating.context.kind === 'job') {
    const job = db.get('jobs', rating.context.jobId)
    return {
      kind: 'job',
      title: job?.title ?? 'Repair',
      category: job?.category ?? 'other',
      completedAt: job?.completion?.completedAt ?? job?.updatedAt ?? rating.createdAt,
    }
  }
  const tenancy = db.get('tenancies', rating.context.tenancyId)
  return {
    kind: 'tenancy',
    startDate: tenancy?.startDate ?? ukDate(rating.createdAt),
    endDate: tenancy?.endDate ?? null,
  }
}

/**
 * A revealed rating as others see it: "Verified tenant · AB10 · 2025", never a name, and without
 * the private note or the would-again answer. Null for anything not shown on its own.
 */
export function publicReview(db: Reader, rating: Rating): PublicReview | null {
  const property = db.get('properties', rating.propertyId)
  return toPublicReview(rating, {
    district: property?.postcodeDistrict ?? '',
    context: reviewContext(db, rating),
    replies: db.rows('replies'),
    updates: db.rows('updates'),
    disputes: db.rows('disputes'),
    reports: db.rows('reports'),
  })
}

export function threadSummary(db: Reader, thread: Thread, viewerId: PersonId): ThreadSummary {
  const blocked = blockedBy(db, viewerId)
  const member = thread.members.find((m) => m.personId === viewerId)
  const messages = db
    .rows('messages')
    .filter((m) => m.threadId === thread.id && !(m.author && blocked.has(m.author.personId)))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const lastReadAt = member?.lastReadAt
  const unreadCount = messages.filter(
    (m) => m.author?.personId !== viewerId && (lastReadAt === undefined || m.sentAt > lastReadAt),
  ).length
  return { thread, lastMessage: messages.at(-1) ?? null, unreadCount }
}

/** People the viewer has blocked. Their messages are hidden from the viewer everywhere. */
export function blockedBy(db: Reader, viewerId: PersonId): Set<PersonId> {
  return new Set(
    db
      .rows('blocks')
      .filter((b) => b.blockerId === viewerId)
      .map((b) => b.blockedId),
  )
}

/** The area only, never the address, until the landlord chooses a trade. */
export function jobBoardPost(db: Reader, job: Job, trade: Person): JobBoardPost | null {
  const property = db.get('properties', job.propertyId)
  if (!property || !job.board) return null
  const quotes = db.rows('quotes').filter((q) => q.jobId === job.id && q.status !== 'withdrawn')
  const mine = quotes.find((q) => q.tradeId === trade.id)
  const milesAway = milesBetween(trade.postcodeDistrict, property.postcodeDistrict)
  const post: JobBoardPost = {
    jobId: job.id,
    title: job.title,
    category: job.category,
    room: job.room,
    description: job.description,
    photos: job.photos,
    urgency: job.urgency,
    neighbourhood: property.neighbourhood,
    postcodeDistrict: property.postcodeDistrict,
    postedAt: job.board.postedAt,
    quoteCount: quotes.length,
    landlordId: property.landlordId,
    milesAway,
    distanceBand: distanceBandOf(milesAway),
    inServiceArea:
      trade.tradeProfile?.serviceDistricts.includes(property.postcodeDistrict) ?? false,
  }
  if (job.credentialNeeded) post.credentialNeeded = job.credentialNeeded
  if (job.board.closesAt) post.closesAt = job.board.closesAt
  if (mine) post.myQuoteId = mine.id
  return post
}

/** Timeline steps that are about money, which is between the landlord and the trade. */
const MONEY_EVENTS: ReadonlySet<JobEvent['kind']> = new Set([
  'quote_submitted',
  'quote_withdrawn',
  'invoice_sent',
  'payment_recorded',
])

/**
 * A job as each side may see it. Landlords see everything. Tenants never see prices, quotes or
 * invoices. A trade sees their own quotes on the timeline but never other trades'.
 */
export function jobFor(
  db: Reader,
  job: Job,
  side: 'tenant' | 'landlord' | 'trade',
  viewerId: PersonId,
): Job {
  if (side === 'landlord') return job
  if (side === 'tenant') {
    const { payment: _payment, ...rest } = job
    const shaped: Job = { ...rest, timeline: job.timeline.filter((e) => !MONEY_EVENTS.has(e.kind)) }
    if (job.completion) {
      const { finalPricePence: _price, ...completion } = job.completion
      shaped.completion = completion
    }
    return shaped
  }
  const theirs = new Set(
    db
      .rows('quotes')
      .filter((q) => q.jobId === job.id && q.tradeId === viewerId)
      .map((q) => q.id),
  )
  return {
    ...job,
    timeline: job.timeline.filter(
      (e) =>
        !(
          (e.kind === 'quote_submitted' ||
            e.kind === 'quote_withdrawn' ||
            e.kind === 'quote_accepted') &&
          !theirs.has(e.quoteId)
        ),
    ),
  }
}

export function teamMember(db: Reader, membership: TeamMembership): TeamMember | null {
  const agency = db.get('agencies', membership.agencyId)
  const agent = db.get('people', membership.agentId)
  const landlord = db.get('people', membership.landlordId)
  if (!agency || !agent || !landlord) return null
  return { membership, agency, agent: personCard(agent), landlord: personCard(landlord) }
}
