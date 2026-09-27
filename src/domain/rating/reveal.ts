// Double-blind reveal (SPEC §5 rule 2). Everything owed on one job or tenancy stays sealed until
// every party has sent theirs or their window has closed. Then it is revealed together, at that
// moment, and never changes again. Trade->landlord also waits until the landlord's rating of that
// trade is locked, so the landlord can't read it before rating them.
// A tenant and a trade who rate each other (isMutualPair) are held together from the moment the
// first of them can rate, even while the other's window hasn't opened yet: a trade's rating of a
// tenant is never shown before that tenant has had their own chance to rate the trade.
// Retaliation-shield ratings are never revealed one by one and hold nothing up (see shield.ts).

import { RELATIONSHIPS, type RatingDirection, type RelationshipDef } from '@/domain/criteria'
import type { ContextRef, IsoDateTime, PersonId, Rating, RatingId } from '@/domain/types'
import { fromMs, toMs } from './time'
import {
  contextKey,
  isMutualPair,
  isSubmitted,
  reverseDirection,
  slotKey,
  type OwedRating,
} from './unlock'

export type RevealState =
  | { readonly status: 'revealed'; readonly at: IsoDateTime }
  | {
      readonly status: 'sealed'
      /**
       * The latest it will be revealed, unless another rating opens on the same job first.
       * Null while it waits on something with no date: the shield, or a landlord who hasn't
       * confirmed the job yet (trade->landlord).
       */
      readonly revealAt: IsoDateTime | null
      readonly waitingFor: 'others' | 'counterpart' | 'shield'
    }

/** A double-blind rating owed on the context, reduced to what the reveal depends on. */
interface Slot {
  readonly direction: RatingDirection
  readonly raterId: PersonId
  readonly subjectId: PersonId
  readonly opensAt: number
  readonly closesAt: number
  /** When it could no longer change: when it was sent, or when its window closed. */
  readonly lockedAt: number
}

/** Null for drafts and removed ratings, which have nothing to reveal. */
export function revealStateOf(
  rating: Rating,
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
): RevealState | null {
  if (rating.state === 'draft' || rating.state === 'removed') return null
  if (rating.state !== 'sealed') {
    return { status: 'revealed', at: rating.revealedAt ?? rating.submittedAt ?? rating.createdAt }
  }
  return sealedState(rating, contextSlots(rating.context, owed, ratings), toMs(now))
}

export interface SettleOutcome {
  /** The same ratings in the same order; only sealed ones change, and only by being revealed. */
  readonly ratings: Rating[]
  /** Revealed by this call. Tell each rated person now (SPEC §6: notified at the reveal). */
  readonly newlyRevealed: RatingId[]
}

/**
 * Brings every sealed rating up to date: reveals those whose moment has come and refreshes the
 * expected reveal date on the rest. Ratings already revealed, restricted or removed are returned
 * untouched, so running it again changes nothing. Handles any number of jobs and tenancies.
 */
export function settleRatings(
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
): SettleOutcome {
  const nowMs = toMs(now)
  const slotCache = new Map<string, Slot[]>()
  const slotsOf = (context: ContextRef): Slot[] => {
    const key = contextKey(context)
    const cached = slotCache.get(key)
    if (cached) return cached
    const slots = contextSlots(context, owed, ratings)
    slotCache.set(key, slots)
    return slots
  }

  const newlyRevealed: RatingId[] = []
  const next = ratings.map((rating): Rating => {
    if (rating.state !== 'sealed') return rating
    const state = sealedState(rating, slotsOf(rating.context), nowMs)
    if (state.status === 'revealed') {
      newlyRevealed.push(rating.id)
      return { ...rating, state: 'revealed', revealedAt: state.at, revealAt: state.at }
    }
    return rating.revealAt === state.revealAt ? rating : { ...rating, revealAt: state.revealAt }
  })
  return { ratings: next, newlyRevealed }
}

/**
 * When everything owed on this job or tenancy was locked (sent, or its window closed), or null
 * while any window is still open. A tenancy's end-of-tenancy reveal happens at this moment.
 */
export function contextSettledAt(
  context: ContextRef,
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
  now: IsoDateTime,
): IsoDateTime | null {
  const slots = contextSlots(context, owed, ratings)
  if (slots.length === 0) return null
  const settledAt = Math.max(...slots.map((slot) => slot.lockedAt))
  return settledAt <= toMs(now) ? fromMs(settledAt) : null
}

function sealedState(rating: Rating, slots: readonly Slot[], nowMs: number): RevealState {
  if (rating.seal === 'retaliation_shield') {
    return { status: 'sealed', revealAt: null, waitingFor: 'shield' }
  }
  const relationship: RelationshipDef = RELATIONSHIPS[rating.direction]
  const waitsFor = relationship.showAfterLocked
  const counterpart = waitsFor
    ? slots.find(
        (slot) =>
          slot.direction === waitsFor &&
          slot.raterId === rating.subjectId &&
          slot.subjectId === rating.raterId,
      )
    : undefined
  // Trade->landlord before the landlord can even rate the trade: no date to give yet.
  if (waitsFor && !counterpart) {
    return { status: 'sealed', revealAt: null, waitingFor: 'counterpart' }
  }

  const sentAt = toMs(rating.submittedAt ?? rating.createdAt)
  const earliest = Math.max(sentAt, counterpart?.lockedAt ?? sentAt)
  // The context can only become settled at the moment something locks.
  const moments = [...new Set([earliest, ...slots.map((slot) => slot.lockedAt)])]
    .filter((at) => at >= earliest && at <= nowMs)
    .sort((a, b) => a - b)
  const revealedAt = moments.find((at) => isSettled(slots, at))
  if (revealedAt !== undefined) return { status: 'revealed', at: fromMs(revealedAt) }

  const projected = Math.max(earliest, ...slots.map((slot) => slot.lockedAt))
  const counterpartOpen = counterpart !== undefined && counterpart.lockedAt > nowMs
  return {
    status: 'sealed',
    revealAt: fromMs(projected),
    waitingFor: counterpartOpen ? 'counterpart' : 'others',
  }
}

/** Every double-blind rating open by `at` has been sent or has run out of time. */
function isSettled(slots: readonly Slot[], at: number): boolean {
  return slots.every((slot) => slot.opensAt > at || slot.lockedAt <= at)
}

/** The double-blind slots on one job or tenancy, with mutual pairs held together. */
function contextSlots(
  context: ContextRef,
  owed: readonly OwedRating[],
  ratings: readonly Rating[],
): Slot[] {
  const key = contextKey(context)
  const slots = slotsFor(
    owed.filter((slot) => contextKey(slot.context) === key),
    ratings.filter((rating) => contextKey(rating.context) === key),
  )
  return linkPairs(slots, context.kind)
}

function slotsFor(owed: readonly OwedRating[], ratings: readonly Rating[]): Slot[] {
  const sentAt = new Map<string, number>()
  for (const rating of ratings) {
    if (rating.seal !== 'double_blind' || !isSubmitted(rating)) continue
    const key = slotKey(rating)
    const at = toMs(rating.submittedAt ?? rating.createdAt)
    sentAt.set(key, Math.min(at, sentAt.get(key) ?? at))
  }

  const slots = new Map<string, Slot>()
  for (const slot of owed) {
    if (slot.seal !== 'double_blind') continue
    const key = slotKey(slot)
    const closesAt = toMs(slot.closesAt)
    const sent = sentAt.get(key)
    slots.set(key, {
      direction: slot.direction,
      raterId: slot.raterId,
      subjectId: slot.subjectId,
      opensAt: toMs(slot.opensAt),
      closesAt,
      lockedAt: sent === undefined ? closesAt : Math.min(sent, closesAt),
    })
  }
  // A sent rating with no matching owed slot still takes part, on its own window.
  for (const rating of ratings) {
    const key = slotKey(rating)
    const sent = sentAt.get(key)
    if (slots.has(key) || sent === undefined) continue
    const closesAt = toMs(rating.windowClosesAt)
    slots.set(key, {
      direction: rating.direction,
      raterId: rating.raterId,
      subjectId: rating.subjectId,
      opensAt: toMs(rating.createdAt),
      closesAt,
      lockedAt: Math.min(sent, closesAt),
    })
  }
  return [...slots.values()]
}

const pairKey = (slot: Pick<Slot, 'direction' | 'raterId' | 'subjectId'>) =>
  [slot.direction, slot.raterId, slot.subjectId].join('|')

/**
 * Each side of a mutual pair counts as open from when the first side opens, so neither is
 * revealed before the other has been sent or run out of time. A side that isn't owed yet (the
 * tenant hasn't confirmed the visit) stands in as open until the other side's window closes;
 * owedForJob never opens it after that.
 */
function linkPairs(slots: readonly Slot[], kind: ContextRef['kind']): Slot[] {
  const byPair = new Map(slots.map((slot) => [pairKey(slot), slot]))
  return slots.flatMap((slot): Slot[] => {
    if (!isMutualPair(slot.direction, kind)) return [slot]
    const reverse = {
      direction: reverseDirection(slot.direction),
      raterId: slot.subjectId,
      subjectId: slot.raterId,
    }
    const other = byPair.get(pairKey(reverse))
    if (other) return [{ ...slot, opensAt: Math.min(slot.opensAt, other.opensAt) }]
    const standIn: Slot = {
      ...reverse,
      opensAt: slot.opensAt,
      closesAt: slot.closesAt,
      lockedAt: slot.closesAt,
    }
    return [slot, standIn]
  })
}
