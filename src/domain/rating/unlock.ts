// Which ratings each person owes on a job or tenancy, and when their windows open and close
// (SPEC §5 rule 1 and the six-relationship table). Worked out from the records on every read, so
// nothing here is stored.
//
// A job's windows open only once the job is complete (rule 1), and then:
// - trade->landlord when the trade marks the work done (30 days);
// - landlord->trade when the landlord confirms it (14 days);
// - tenant->trade when the tenant has also confirmed the trade's visit (14 days);
// - trade->tenant when the trade's visit has also happened (14 days);
// - tenant->landlord, the two per-repair questions, if the tenancy was live at completion
//   (14 days, sealed by the retaliation shield). Not for a certificate renewal such as the annual
//   gas check: that is a routine visit, not a problem the landlord was asked to fix.
// Tenant->trade and trade->tenant are a pair: neither opens once the other's window has closed.
// A tenancy's windows open for both sides once it has ended, if both sides confirmed it here.

import {
  RELATIONSHIPS,
  criteriaFor,
  type CriterionDef,
  type RatingDirection,
  type RelationshipDef,
  type SealRule,
} from '@/domain/criteria'
import type {
  ContextRef,
  IsoDateTime,
  Job,
  JobEventKind,
  PersonId,
  Property,
  PropertyId,
  Rating,
  RatingId,
  Tenancy,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import { addDays, earliestOf, isBefore, latest } from './time'

/** One rating one person owes on one job or tenancy. */
export interface OwedRating {
  readonly direction: RatingDirection
  readonly raterId: PersonId
  readonly subjectId: PersonId
  readonly context: ContextRef
  readonly propertyId: PropertyId
  readonly seal: SealRule
  /** The questions for this occasion. After a repair, tenant->landlord asks only two. */
  readonly criteria: readonly CriterionDef[]
  readonly opensAt: IsoDateTime
  /** The window is open while opensAt <= now < closesAt. */
  readonly closesAt: IsoDateTime
  /** The day 3 and day 10 reminders that fall inside the window. */
  readonly remindAt: readonly IsoDateTime[]
}

type SlotIdentity = Pick<OwedRating, 'direction' | 'raterId' | 'subjectId' | 'context'>

const REVERSED = {
  'tenant->landlord': 'landlord->tenant',
  'landlord->tenant': 'tenant->landlord',
  'landlord->trade': 'trade->landlord',
  'trade->landlord': 'landlord->trade',
  'tenant->trade': 'trade->tenant',
  'trade->tenant': 'tenant->trade',
} as const satisfies Record<RatingDirection, RatingDirection>

/** The same pair of people the other way round, e.g. 'landlord->trade' for 'trade->landlord'. */
export function reverseDirection(direction: RatingDirection): RatingDirection {
  return REVERSED[direction]
}

function hasDoubleBlindOccasion(direction: RatingDirection, context: ContextRef['kind']) {
  const relationship: RelationshipDef = RELATIONSHIPS[direction]
  return relationship.occasions.some((o) => o.context === context && o.seal === 'double_blind')
}

/**
 * Two people who rate each other double-blind on the same job or tenancy: tenant and trade on a
 * job, tenant and landlord at the end of a tenancy. Neither may see the other's rating before
 * they have had their own chance to rate (reveal.ts). Landlord and trade aren't a pair in this
 * sense: trade->landlord already waits for the landlord's rating of the trade.
 */
export function isMutualPair(direction: RatingDirection, context: ContextRef['kind']): boolean {
  const reverse = reverseDirection(direction)
  const one: RelationshipDef = RELATIONSHIPS[direction]
  const other: RelationshipDef = RELATIONSHIPS[reverse]
  if (one.showAfterLocked || other.showAfterLocked) return false
  return hasDoubleBlindOccasion(direction, context) && hasDoubleBlindOccasion(reverse, context)
}

export function windowDaysFor(direction: RatingDirection, context: ContextRef['kind']): number {
  if (context === 'tenancy') return RATING_CONFIG.windowDays.tenancy
  return direction === 'trade->landlord'
    ? RATING_CONFIG.windowDays.tradeRatesLandlord
    : RATING_CONFIG.windowDays.job
}

/** Job and tenancy ids carry their own prefix, so the id alone identifies the context. */
export function contextKey(context: ContextRef): string {
  return context.kind === 'job' ? context.jobId : context.tenancyId
}

/** Identifies one person's rating of another, in one direction, on one job or tenancy. */
export function slotKey(slot: SlotIdentity): string {
  return [contextKey(slot.context), slot.direction, slot.raterId, slot.subjectId].join('|')
}

export function reminderDates(opensAt: IsoDateTime, closesAt: IsoDateTime): IsoDateTime[] {
  return RATING_CONFIG.reminderDays
    .map((day) => addDays(opensAt, day))
    .filter((at) => isBefore(at, closesAt))
}

export function isWindowOpen(slot: Pick<OwedRating, 'opensAt' | 'closesAt'>, now: IsoDateTime) {
  return !isBefore(now, slot.opensAt) && isBefore(now, slot.closesAt)
}

/** Sent, so sealed for good: a draft doesn't count. */
export function isSubmitted(rating: Rating): boolean {
  return rating.state !== 'draft' && rating.submittedAt !== undefined
}

/** The rating filling this slot: the sent one if there is one, otherwise the draft. */
export function ratingForSlot(slot: SlotIdentity, ratings: readonly Rating[]): Rating | undefined {
  const key = slotKey(slot)
  const matching = ratings.filter((rating) => slotKey(rating) === key)
  return matching.find(isSubmitted) ?? matching[0]
}

export function findOwed(owed: readonly OwedRating[], slot: SlotIdentity): OwedRating | undefined {
  const key = slotKey(slot)
  return owed.find((candidate) => slotKey(candidate) === key)
}

// ─── Tenancies ───────────────────────────────────────────────────────────────────────────────

/** Rule 1: ratings unlock only for a tenancy the landlord side and every tenant confirmed here. */
export function isConfirmedByBoth(tenancy: Tenancy): boolean {
  if (tenancy.status === 'proposed' || tenancy.tenantIds.length === 0) return false
  const byLandlord = tenancy.confirmations.some((c) => c.side === 'landlord')
  const byEveryTenant = tenancy.tenantIds.every((id) =>
    tenancy.confirmations.some((c) => c.side === 'tenant' && c.personId === id),
  )
  return byLandlord && byEveryTenant
}

/** When the tenancy ended here, falling back to the start of its end date. */
export function tenancyEndedAt(tenancy: Tenancy): IsoDateTime | null {
  if (tenancy.endedAt) return tenancy.endedAt
  return tenancy.endDate ? `${tenancy.endDate}T00:00:00.000Z` : null
}

function isLiveAt(tenancy: Tenancy, at: IsoDateTime): boolean {
  if (!isConfirmedByBoth(tenancy)) return false
  const [first, ...rest] = tenancy.confirmations.map((c) => c.confirmedAt)
  if (first === undefined) return false
  const confirmedAt = latest(first, ...rest)
  const endedAt = tenancyEndedAt(tenancy)
  return !isBefore(at, confirmedAt) && (endedAt === null || isBefore(at, endedAt))
}

export function owedForTenancy(tenancy: Tenancy): OwedRating[] {
  if (tenancy.status !== 'ended' || !isConfirmedByBoth(tenancy)) return []
  const opensAt = tenancyEndedAt(tenancy)
  if (!opensAt) return []
  const context: ContextRef = { kind: 'tenancy', tenancyId: tenancy.id }
  const { landlordId, propertyId } = tenancy
  return compact(
    tenancy.tenantIds.flatMap((tenantId) => [
      owe('tenant->landlord', tenantId, landlordId, context, propertyId, opensAt),
      owe('landlord->tenant', landlordId, tenantId, context, propertyId, opensAt),
    ]),
  )
}

// ─── Jobs ────────────────────────────────────────────────────────────────────────────────────

/**
 * The tenants who are party to a job. A tenant who reported it is the one who dealt with it, so
 * only they rate and are rated; for a job the landlord raised, every tenant on the tenancy is.
 * Nobody counts unless the tenancy was confirmed here by both sides.
 */
export function jobTenantIds(job: Job, tenancy: Tenancy | null): PersonId[] {
  if (!tenancy || tenancy.id !== job.tenancyId || !isConfirmedByBoth(tenancy)) return []
  if (job.reportedAs === 'tenant' && tenancy.tenantIds.includes(job.reportedById)) {
    return [job.reportedById]
  }
  return [...tenancy.tenantIds]
}

/**
 * The job's home: its landlord, and the letting agents working on it where known. A repair done
 * by the landlord's own side (a landlord, or their agent, who is also a trade) unlocks no trade
 * ratings: nobody rates their own side, and the tenant's view of the repair goes through the
 * sealed per-repair rating, never a public trade review of their current landlord.
 */
export type JobProperty = Pick<Property, 'id' | 'landlordId'> & Partial<Pick<Property, 'agentIds'>>

export function owedForJob(job: Job, property: JobProperty, tenancy: Tenancy | null): OwedRating[] {
  const completedAt = jobCompletedAt(job)
  if (!completedAt || property.id !== job.propertyId) return []

  const context: ContextRef = { kind: 'job', jobId: job.id }
  const landlordId = property.landlordId
  const tenantIds = jobTenantIds(job, tenancy)
  const owed: (OwedRating | null)[] = []
  const slot = (direction: RatingDirection, rater: PersonId, subject: PersonId, at: IsoDateTime) =>
    owe(direction, rater, subject, context, job.propertyId, at)

  const tradeId = job.tradeId
  const byLandlordSide =
    tradeId !== undefined && (tradeId === landlordId || (property.agentIds ?? []).includes(tradeId))
  if (tradeId && !byLandlordSide) {
    owed.push(slot('trade->landlord', tradeId, landlordId, completedAt))
    const confirmedAt = jobConfirmedAt(job)
    if (confirmedAt) {
      owed.push(slot('landlord->trade', landlordId, tradeId, latest(completedAt, confirmedAt)))
    }

    const tradeVisits = job.visits.filter((visit) => visit.tradeId === tradeId)
    const tenantConfirmedAt = earliestOf(
      tradeVisits
        .filter((visit) => visit.status !== 'cancelled' && visit.status !== 'no_access')
        .flatMap((visit) => (visit.tenantConfirmedAt ? [visit.tenantConfirmedAt] : [])),
    )
    const happenedAt = earliestOf(
      tradeVisits
        .filter((visit) => visit.status === 'done')
        .map((visit) => visit.finishedAt ?? visit.endsAt),
    )
    for (const tenantId of tenantIds) {
      const tenantRates = tenantConfirmedAt
        ? slot('tenant->trade', tenantId, tradeId, latest(completedAt, tenantConfirmedAt))
        : null
      const tradeRates = happenedAt
        ? slot('trade->tenant', tradeId, tenantId, latest(completedAt, happenedAt))
        : null
      owed.push(...pairedWindows(tenantRates, tradeRates))
    }
  }

  // Per-repair ratings of the landlord only while they are the tenant's current landlord.
  if (tenancy && !job.complianceType && isLiveAt(tenancy, completedAt)) {
    for (const tenantId of tenantIds) {
      owed.push(slot('tenant->landlord', tenantId, landlordId, completedAt))
    }
  }
  return compact(owed)
}

/**
 * The two sides of a mutual pair (isMutualPair). A side whose window would only open once the
 * other side's window has closed is never owed: by then the other side's rating may have been
 * revealed, so rating back would no longer be blind. A tenant who confirms the visit weeks late
 * has missed this job's ratings, just as the trade would have.
 */
function pairedWindows(one: OwedRating | null, other: OwedRating | null): (OwedRating | null)[] {
  if (!one || !other) return [one, other]
  if (!isBefore(one.opensAt, other.closesAt)) return [other]
  if (!isBefore(other.opensAt, one.closesAt)) return [one]
  return [one, other]
}

function jobCompletedAt(job: Job): IsoDateTime | null {
  if (job.status !== 'completed' && job.status !== 'confirmed') return null
  return job.completion?.completedAt ?? lastEventAt(job, 'completed')
}

function jobConfirmedAt(job: Job): IsoDateTime | null {
  if (job.status !== 'confirmed') return null
  return job.landlordConfirmedAt ?? lastEventAt(job, 'confirmed')
}

function lastEventAt(job: Job, kind: JobEventKind): IsoDateTime | null {
  return job.timeline.findLast((event) => event.kind === kind)?.at ?? null
}

// ─── Reminders and tasks ─────────────────────────────────────────────────────────────────────

export interface DueReminder {
  readonly slot: OwedRating
  readonly at: IsoDateTime
}

/**
 * Reminders falling after `from` and up to `to`, for everyone who hadn't sent their rating by
 * then. Every party is on the same day 3 and day 10 schedule, whichever side they are on.
 */
export function dueReminders(
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  from: IsoDateTime,
  to: IsoDateTime,
): DueReminder[] {
  return owed.flatMap((slot) => {
    const rating = ratingForSlot(slot, ratings)
    const sentAt = rating && isSubmitted(rating) ? rating.submittedAt : undefined
    return slot.remindAt
      .filter((at) => isBefore(from, at) && !isBefore(to, at))
      .filter((at) => sentAt === undefined || isBefore(at, sentAt))
      .map((at) => ({ slot, at }))
  })
}

/** Matches RatingTask in the data layer: one rating the person owes or has sent. */
export interface RatingTaskInfo {
  readonly direction: RatingDirection
  readonly context: ContextRef
  readonly subjectId: PersonId
  readonly propertyId: PropertyId
  readonly opensAt: IsoDateTime
  readonly closesAt: IsoDateTime
  readonly status: 'to_do' | 'draft' | 'submitted'
  readonly ratingId?: RatingId
  /** Drives "Leave yours to see what they said about you". Never says what they said. */
  readonly counterpartHasRated: boolean
}

/** What this person owes or has sent. Windows that closed without a rating are left out. */
export function ratingTasksFor(
  personId: PersonId,
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
): RatingTaskInfo[] {
  return owed.flatMap((slot): RatingTaskInfo[] => {
    if (slot.raterId !== personId) return []
    const mine = ratingForSlot(slot, ratings)
    const sent = mine !== undefined && isSubmitted(mine)
    if (!sent && !isWindowOpen(slot, now)) return []
    const counterpart = ratingForSlot(
      {
        direction: reverseDirection(slot.direction),
        raterId: slot.subjectId,
        subjectId: slot.raterId,
        context: slot.context,
      },
      ratings,
    )
    return [
      {
        direction: slot.direction,
        context: slot.context,
        subjectId: slot.subjectId,
        propertyId: slot.propertyId,
        opensAt: slot.opensAt,
        closesAt: slot.closesAt,
        status: sent ? 'submitted' : mine ? 'draft' : 'to_do',
        ...(mine ? { ratingId: mine.id } : {}),
        counterpartHasRated: counterpart !== undefined && isSubmitted(counterpart),
      },
    ]
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────────

function owe(
  direction: RatingDirection,
  raterId: PersonId,
  subjectId: PersonId,
  context: ContextRef,
  propertyId: PropertyId,
  opensAt: IsoDateTime,
): OwedRating | null {
  // A landlord doing their own repair doesn't rate themselves.
  if (raterId === subjectId) return null
  const relationship: RelationshipDef = RELATIONSHIPS[direction]
  const occasion = relationship.occasions.find((o) => o.context === context.kind)
  if (!occasion) return null
  const closesAt = addDays(opensAt, windowDaysFor(direction, context.kind))
  return {
    direction,
    raterId,
    subjectId,
    context,
    propertyId,
    seal: occasion.seal,
    criteria: criteriaFor(direction, context.kind),
    opensAt,
    closesAt,
    remindAt: reminderDates(opensAt, closesAt),
  }
}

function compact<T>(list: readonly (T | null)[]): T[] {
  return list.filter((item): item is T => item !== null)
}
