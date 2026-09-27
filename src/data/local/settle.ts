// What happens by itself as time passes or records change: tenancies reach their end date,
// rating windows open, day 3 and day 10 reminders go out, ratings are revealed or expire, pending
// credentials are checked, certificates start to lapse and unpaid invoices fall overdue. Runs at
// the end of every change and every clock jump, inside the same draft, so it all lands in one
// commit.

import { BADGE_LABELS, type ContextRef, type PersonId, type Rating } from '@/domain/types'
import { isRequired, complianceCalendar } from './compliance'
import { landlordSide } from './access'
import {
  addDaysToDate,
  formatDay,
  formatDeadline,
  hoursBetween,
  startOfUkDay,
  ukDate,
} from './dates'
import { formatPence } from './money'
import { appendEvent } from './events'
import { hrefs } from './hrefs'
import { firstName, notify } from './notify'
import {
  contextKey,
  dueReminders,
  isSubmitted,
  owedForJob,
  owedForTenancy,
  purgeExpired,
  ratingForSlot,
  ratingsToPurge,
  raterRole,
  reverseDirection,
  settleRatings,
  slotKey,
  subjectRole,
  type OwedRating,
} from '@/domain/rating'
import { readerOf, type Draft, type Reader } from './tx'

/** Pending credentials are checked a day after they are sent, in the demo. */
const VERIFICATION_CHECK_HOURS = 24

export function allOwed(db: Reader): OwedRating[] {
  const owed: OwedRating[] = []
  for (const job of db.rows('jobs')) {
    const property = db.get('properties', job.propertyId)
    if (!property) continue
    owed.push(...owedForJob(job, property, db.get('tenancies', job.tenancyId) ?? null))
  }
  for (const tenancy of db.rows('tenancies')) owed.push(...owedForTenancy(tenancy))
  return owed
}

function openAt(owed: readonly OwedRating[], now: string): Map<string, OwedRating> {
  return new Map(owed.filter((slot) => slot.opensAt <= now).map((slot) => [slotKey(slot), slot]))
}

export function settle(tx: Draft): void {
  const before = readerOf(tx.base)
  endDueTenancies(tx)
  checkVerifications(tx)

  const owedBefore = openAt(allOwed(before), before.now)
  const owed = allOwed(tx)
  announceOpenedRatings(tx, owed, owedBefore)
  sendReminders(tx, owed, before.now)
  expireRatings(tx)
  revealRatings(tx, owed)
  if (ukDate(before.now) !== ukDate(tx.now)) {
    announceDocuments(tx, before)
    announceOverduePayments(tx, before)
  }
}

/** The day after an invoice's due date, both sides hear it hasn't been marked paid. */
function announceOverduePayments(tx: Draft, before: Reader): void {
  const was = ukDate(before.now)
  const today = ukDate(tx.now)
  for (const job of tx.rows('jobs')) {
    const payment = job.payment
    if (!payment || payment.paidAt) continue
    // Overdue from the day after it was due; tell once, on the day it tips over.
    if (!(payment.dueOn < today) || payment.dueOn < was) continue
    const property = tx.get('properties', job.propertyId)
    const trade = tx.get('people', job.tradeId)
    const amount = formatPence(payment.amountPence)
    const due = formatDay(startOfUkDay(payment.dueOn))
    if (trade) {
      notify(tx, {
        to: [trade.id],
        role: 'trade',
        kind: 'payment',
        title: `Payment overdue: ${job.title}`,
        body: `${firstName(tx, property?.landlordId)} hasn't marked ${amount} as paid. It was due on ${due}.`,
        href: hrefs.job('trade', job.id),
        ref: { entity: 'job', id: job.id },
      })
    }
    notify(tx, {
      to: property ? landlordSide(tx, property) : [],
      role: 'landlord',
      kind: 'payment',
      title: `Invoice overdue: ${job.title}`,
      body: `${amount} to ${trade?.tradeProfile?.businessName ?? 'the trade'} was due on ${due}. Mark it paid once you've paid.`,
      href: hrefs.job('landlord', job.id),
      ref: { entity: 'job', id: job.id },
    })
  }
}

/**
 * The seed's rating states, worked out by the same engine the live store uses: revealed where
 * the moment has come, sealed with a reveal date otherwise. Sends no notifications.
 */
export function settleQuietly(tx: Draft): void {
  const outcome = settleRatings(allOwed(tx), tx.rows('ratings'), tx.now)
  for (const rating of outcome.ratings) {
    if (rating !== tx.get('ratings', rating.id)) tx.put('ratings', rating)
  }
}

function endDueTenancies(tx: Draft): void {
  const today = ukDate(tx.now)
  for (const tenancy of tx.rows('tenancies')) {
    if (tenancy.status !== 'confirmed' || !tenancy.endDate || tenancy.endDate >= today) continue
    tx.put('tenancies', {
      ...tenancy,
      status: 'ended',
      endedAt: startOfUkDay(addDaysToDate(tenancy.endDate, 1)),
    })
  }
}

/** Finishes one person's pending checks now, whenever they were sent (demo only). */
export function completeChecksNow(tx: Draft, personId: PersonId): void {
  checkVerifications(tx, personId)
}

function checkVerifications(tx: Draft, finishFor?: PersonId): void {
  for (const person of tx.rows('people')) {
    const due = person.pendingVerifications.filter(
      (p) =>
        person.id === finishFor || hoursBetween(p.submittedAt, tx.now) >= VERIFICATION_CHECK_HOURS,
    )
    if (due.length === 0) continue
    const checkedAt = ukDate(tx.now)
    tx.put('people', {
      ...person,
      badges: [
        ...person.badges.filter((b) => !due.some((p) => p.claim.kind === b.kind)),
        ...due.map((p) => ({ ...p.claim, checkedAt })),
      ],
      pendingVerifications: person.pendingVerifications.filter((p) => !due.includes(p)),
    })
    for (const pending of due) {
      const role = person.roles[0] ?? 'tenant'
      notify(tx, {
        to: [person.id],
        role,
        kind: 'verification_checked',
        title: `Checked: ${BADGE_LABELS[pending.claim.kind]}`,
        body: `The badge now shows on your profile, with today's date as the date it was checked.`,
        href: hrefs.profile(role),
        ref: { entity: 'person', id: person.id },
      })
    }
  }
}

function contextLabel(tx: Draft, context: ContextRef): string {
  if (context.kind === 'job') return tx.get('jobs', context.jobId)?.title ?? 'a repair'
  const tenancy = tx.get('tenancies', context.tenancyId)
  const property = tx.get('properties', tenancy?.propertyId)
  return property ? `the tenancy at ${property.addressLine}` : 'a tenancy'
}

/** The rater, plus agents working on the home when the rater is its landlord. */
function raterRecipients(tx: Draft, slot: OwedRating) {
  const property = tx.get('properties', slot.propertyId)
  return raterRole(slot.direction) === 'landlord' && property
    ? landlordSide(tx, property)
    : [slot.raterId]
}

function subjectRecipients(tx: Draft, rating: Rating) {
  const property = tx.get('properties', rating.propertyId)
  return subjectRole(rating.direction) === 'landlord' && property
    ? landlordSide(tx, property)
    : [rating.subjectId]
}

function openingNote(slot: OwedRating): string {
  if (slot.seal === 'retaliation_shield') {
    return 'Your answers are sealed. Your landlord never sees them on their own; they only count inside their overall score.'
  }
  return `It stays hidden until everyone has rated, or the window closes ${formatDeadline(slot.closesAt)}. Then all the ratings are revealed together.`
}

function announceOpenedRatings(
  tx: Draft,
  owed: readonly OwedRating[],
  openedBefore: Map<string, OwedRating>,
): void {
  const newlyOpen = [...openAt(owed, tx.now).values()].filter(
    (slot) => !openedBefore.has(slotKey(slot)),
  )
  const openedJobs = new Map<string, OwedRating[]>()
  for (const slot of newlyOpen) {
    const role = raterRole(slot.direction)
    notify(tx, {
      to: raterRecipients(tx, slot),
      role,
      kind: 'rating_open',
      title: `Rate ${firstName(tx, slot.subjectId)}: ${contextLabel(tx, slot.context)}`,
      body: openingNote(slot),
      href: hrefs.ratings(role),
    })
    if (slot.context.kind === 'job') {
      openedJobs.set(slot.context.jobId, [...(openedJobs.get(slot.context.jobId) ?? []), slot])
    }
  }
  for (const [jobId, slots] of openedJobs) {
    const job = tx.get('jobs', jobId)
    if (!job || job.timeline.some((e) => e.kind === 'ratings_opened')) continue
    const closesAt =
      slots
        .map((s) => s.closesAt)
        .sort()
        .at(-1) ?? tx.now
    appendEvent(tx, job, { kind: 'ratings_opened', closesAt })
  }
}

function sendReminders(tx: Draft, owed: readonly OwedRating[], since: string): void {
  const ratings = tx.rows('ratings')
  for (const { slot } of dueReminders(owed, ratings, since, tx.now)) {
    const counterpart = ratingForSlot(
      {
        direction: reverseDirection(slot.direction),
        raterId: slot.subjectId,
        subjectId: slot.raterId,
        context: slot.context,
      },
      ratings,
    )
    const theyRated = counterpart !== undefined && isSubmitted(counterpart)
    const role = raterRole(slot.direction)
    notify(tx, {
      to: raterRecipients(tx, slot),
      role,
      kind: 'rating_reminder',
      title: `Your rating of ${firstName(tx, slot.subjectId)} closes ${formatDeadline(slot.closesAt)}`,
      body: theyRated
        ? 'They have left theirs. Leave yours to see what they said about you.'
        : 'Everyone involved gets the same reminder, on the same days.',
      href: hrefs.ratings(role),
    })
  }
}

/** At 36 months a review stops counting and what it said is deleted, not just hidden. */
function expireRatings(tx: Draft): void {
  for (const id of ratingsToPurge(tx.rows('ratings'), tx.now)) {
    const rating = tx.get('ratings', id)
    if (rating) tx.put('ratings', purgeExpired(rating, tx.now))
  }
}

function revealRatings(tx: Draft, owed: readonly OwedRating[]): void {
  const outcome = settleRatings(owed, tx.rows('ratings'), tx.now)
  for (const rating of outcome.ratings) {
    if (rating !== tx.get('ratings', rating.id)) tx.put('ratings', rating)
  }
  const revealedJobs = new Set<string>()
  for (const id of outcome.newlyRevealed) {
    const rating = tx.get('ratings', id)
    if (!rating) continue
    const role = subjectRole(rating.direction)
    notify(tx, {
      to: subjectRecipients(tx, rating),
      role,
      kind: 'ratings_revealed',
      title: `New rating from a ${raterRole(rating.direction)}: ${contextLabel(tx, rating.context)}`,
      body: 'Every rating on this was revealed together. You can reply once, within 30 days.',
      href: hrefs.review(role, rating.id),
      ref: { entity: 'rating', id: rating.id },
    })
    if (rating.context.kind === 'job') revealedJobs.add(contextKey(rating.context))
  }
  for (const jobId of revealedJobs) {
    const job = tx.get('jobs', jobId)
    if (job && !job.timeline.some((e) => e.kind === 'ratings_revealed')) {
      appendEvent(tx, job, { kind: 'ratings_revealed' })
    }
  }
}

function announceDocuments(tx: Draft, before: Reader): void {
  for (const landlord of tx.rows('people').filter((p) => p.roles.includes('landlord'))) {
    const properties = tx.rows('properties').filter((p) => p.landlordId === landlord.id)
    if (properties.length === 0) continue
    const was = complianceCalendar(before, landlord.id, properties, true)
    const now = complianceCalendar(tx, landlord.id, properties, true)
    for (const item of now) {
      if (!isRequired(item) || (item.status !== 'DUE_SOON' && item.status !== 'EXPIRED')) continue
      const previous = was.find((w) => w.type === item.type && w.propertyId === item.propertyId)
      if (previous?.status === item.status) continue
      const property = tx.get('properties', item.propertyId ?? undefined)
      const where = property ? ` at ${property.addressLine}` : ''
      const label = item.document?.title ?? 'A certificate'
      notify(tx, {
        to: property ? landlordSide(tx, property) : [landlord.id],
        role: 'landlord',
        kind: item.status === 'EXPIRED' ? 'document_expired' : 'document_due_soon',
        title:
          item.status === 'EXPIRED'
            ? `Expired: ${label}${where}`
            : `Due in ${item.daysLeft} days: ${label}${where}`,
        href: hrefs.documents(item.propertyId ?? undefined),
      })
    }
  }
}
