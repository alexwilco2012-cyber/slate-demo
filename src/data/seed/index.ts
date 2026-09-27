// The fictional world the demo opens on: Aberdeen on Saturday 26 September 2026. Built fresh on
// every call and fully deterministic, so every browser tab builds exactly the same seed.

import type { Persona } from '@/data/api'
import { allOwed, settleQuietly } from '@/data/local/settle'
import { readerOf, Draft } from '@/data/local/tx'
import { eventOf } from '@/data/local/events'
import { SCHEMA_VERSION, emptyTables, indexById, type SlateData } from '@/data/local/state'
import { orThrow } from '@/data/local/rule-result'
import { removeRating, restrictRating, saveDraft, slotKey, type OwedRating } from '@/domain/rating'
import type {
  ContextRef,
  Job,
  JobEvent,
  Person,
  PersonId,
  Property,
  Rating,
  Tenancy,
} from '@/domain/types'
import { buildJob, type SeedLookup } from './build-job'
import { TENANCY_CONVERSATIONS } from './conversations'
import { DOCUMENTS } from './documents'
import { JOB_SEEDS } from './jobs'
import { NOTIFICATIONS } from './notifications'
import { AGENCIES, MEMBERSHIPS, PEOPLE, SAVED_LINE_ITEMS } from './people'
import { PROPERTIES } from './properties'
import {
  DISPUTES,
  DRAFTS,
  PASSPORT_SHARES,
  RATING_FACTS,
  REMOVALS,
  REPLIES,
  REPORTS,
  RESTRICTIONS,
  UPDATES,
  type DraftFact,
  type RatingFact,
} from './ratings'
import { TENANCIES } from './tenancies'
import { DEMO_NOW } from './time'

export { DEMO_NOW, DEMO_TODAY } from './time'
export { PLACEHOLDER_SCHEME, isPlaceholder } from './placeholders'

/** The front page's quick sign-ins. The first three are the "Try as" buttons. */
export const PERSONAS: Persona[] = [
  {
    personId: 'person_sarah',
    role: 'tenant',
    name: 'Sarah',
    blurb:
      'Rents a top-floor tenement flat in Rosemount. She reported a damp patch this morning, an electrician is due on Tuesday, and her rating of the radiator repair is sealed until everyone has rated.',
  },
  {
    personId: 'person_graham',
    role: 'landlord',
    name: 'Graham',
    blurb:
      'Six homes across Aberdeen, run with his letting agent. Two repairs to approve, quotes to compare, an alarm check that has lapsed and an EICR due soon.',
  },
  {
    personId: 'person_kev',
    role: 'trade',
    name: 'Kev',
    blurb:
      "Plumber and sole trader. On a job in Torry now and another this afternoon, with new jobs on the board, a quote waiting on a reply and an invoice Derek still hasn't paid.",
  },
  {
    personId: 'person_hannah',
    role: 'landlord',
    name: 'Hannah',
    blurb:
      "Let her Ferryhill flat when she moved in with her partner, so she's a landlord and a tenant at once. She has just told Kev to go ahead with her tenant's dripping tap, and a fence repair is booked at the house she rents.",
  },
  {
    personId: 'person_derek',
    role: 'landlord',
    name: 'Derek',
    blurb:
      'Two flats and a slow record on repairs and paying trades. See how that shows in his ratings from tenants and trades.',
  },
]

function lookupFrom(people: Person[], properties: Property[], tenancies: Tenancy[]): SeedLookup {
  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((row) => [row.id, row]))
  const personMap = byId(people)
  const propertyMap = byId(properties)
  const tenancyMap = byId(tenancies)
  return {
    person(id) {
      const person = personMap.get(id)
      if (!person) throw new Error(`Seed refers to an unknown person: ${id}`)
      return person
    },
    property(id) {
      const property = propertyMap.get(id)
      if (!property) throw new Error(`Seed refers to an unknown property: ${id}`)
      return property
    },
    tenancy(id) {
      if (id === undefined) return undefined
      const tenancy = tenancyMap.get(id)
      if (!tenancy) throw new Error(`Seed refers to an unknown tenancy: ${id}`)
      return tenancy
    },
  }
}

function contextOf(fact: RatingFact | DraftFact): ContextRef {
  return 'job' in fact.on
    ? { kind: 'job', jobId: fact.on.job }
    : { kind: 'tenancy', tenancyId: fact.on.tenancy }
}

/** A sent rating, sealed and dated to fit the window the engine says it was owed in. */
function ratingFrom(fact: RatingFact, owed: Map<string, OwedRating>): Rating {
  const context = contextOf(fact)
  const identity = {
    direction: fact.direction,
    raterId: fact.rater,
    subjectId: fact.subject,
    context,
  }
  const slot = owed.get(slotKey(identity))
  if (!slot) throw new Error(`${fact.id}: nothing like this was owed`)
  if (fact.submittedAt < slot.opensAt || fact.submittedAt >= slot.closesAt) {
    throw new Error(`${fact.id}: sent outside its window (${slot.opensAt} to ${slot.closesAt})`)
  }
  const rating: Rating = {
    id: fact.id,
    ...identity,
    propertyId: slot.propertyId,
    seal: slot.seal,
    answers: fact.answers,
    safetyFlag: false,
    state: 'sealed',
    createdAt: fact.submittedAt,
    submittedAt: fact.submittedAt,
    windowClosesAt: slot.closesAt,
    revealAt: null,
    corrections: [],
  }
  if (fact.comment) rating.comment = fact.comment
  if (fact.privateNote) rating.privateNote = fact.privateNote
  if (fact.wouldAgain) rating.wouldAgain = fact.wouldAgain
  return rating
}

/** A rating started and saved but not sent, made by the engine as if saved at that moment. */
function draftFrom(fact: DraftFact, owed: OwedRating[]): Rating {
  return orThrow(
    saveDraft(
      {
        direction: fact.direction,
        context: contextOf(fact),
        subjectId: fact.subject,
        answers: fact.answers,
      },
      { raterId: fact.rater, owed, ratings: [], now: fact.savedAt, newId: fact.id },
    ),
  )
}

/** Adds "ratings opened" and "ratings revealed" to each job's timeline, at the right moments. */
function withRatingEvents(job: Job, owed: OwedRating[], ratings: Rating[]): Job {
  const slug = job.id.slice('job_'.length)
  const mine = owed.filter((s) => s.context.kind === 'job' && s.context.jobId === job.id)
  const extra: JobEvent[] = []
  const opened = mine.filter((s) => s.opensAt <= DEMO_NOW)
  const firstOpen = opened.map((s) => s.opensAt).sort()[0]
  if (firstOpen) {
    const closesAt =
      opened
        .map((s) => s.closesAt)
        .sort()
        .at(-1) ?? firstOpen
    extra.push({
      ...eventOf({ kind: 'ratings_opened', closesAt }, firstOpen, null),
      id: `event_${slug}_ratings_opened`,
    })
  }
  const revealedAt = ratings
    .filter((r) => r.context.kind === 'job' && r.context.jobId === job.id && r.revealedAt)
    .map((r) => r.revealedAt ?? '')
    .sort()[0]
  if (revealedAt) {
    extra.push({
      ...eventOf({ kind: 'ratings_revealed' }, revealedAt, null),
      id: `event_${slug}_ratings_revealed`,
    })
  }
  if (extra.length === 0) return job
  const timeline = [...job.timeline, ...extra].sort((a, b) => a.at.localeCompare(b.at))
  return { ...job, timeline, updatedAt: timeline.at(-1)?.at ?? job.updatedAt }
}

export function createSeedData(): SlateData {
  const lookup = lookupFrom(PEOPLE, PROPERTIES, TENANCIES)
  const built = JOB_SEEDS.map((seed) => buildJob(seed, lookup))

  const base: SlateData = {
    schema: SCHEMA_VERSION,
    now: DEMO_NOW,
    magicLinks: {},
    tables: {
      ...emptyTables(),
      people: indexById(PEOPLE),
      agencies: indexById(AGENCIES),
      memberships: indexById(MEMBERSHIPS),
      properties: indexById(PROPERTIES),
      tenancies: indexById(TENANCIES),
      jobs: indexById(built.map((b) => b.job)),
      quotes: indexById(built.flatMap((b) => b.quotes)),
      lineItems: indexById(SAVED_LINE_ITEMS),
      threads: indexById([
        ...built.map((b) => b.thread),
        ...TENANCY_CONVERSATIONS.map((c) => c.thread),
      ]),
      messages: indexById([
        ...built.flatMap((b) => b.messages),
        ...TENANCY_CONVERSATIONS.flatMap((c) => c.messages),
      ]),
      documents: indexById(DOCUMENTS),
      replies: indexById(REPLIES),
      updates: indexById(UPDATES),
      disputes: indexById(DISPUTES),
      reports: indexById(REPORTS),
      shares: indexById(PASSPORT_SHARES),
      notifications: indexById(NOTIFICATIONS),
    },
  }

  const owed = allOwed(readerOf(base))
  const owedByKey = new Map(owed.map((slot) => [slotKey(slot), slot]))
  const withRatings: SlateData = {
    ...base,
    tables: {
      ...base.tables,
      ratings: indexById([
        ...RATING_FACTS.map((f) => ratingFrom(f, owedByKey)),
        ...DRAFTS.map((f) => draftFrom(f, owed)),
      ]),
    },
  }

  // Let the engine decide what has been revealed by now, exactly as the live store would.
  const tx = new Draft(withRatings, DEMO_NOW)
  settleQuietly(tx)
  for (const { ratingId, reportId, since } of RESTRICTIONS) {
    const rating = tx.get('ratings', ratingId)
    if (!rating) throw new Error(`Restriction for an unknown rating: ${ratingId}`)
    tx.put('ratings', orThrow(restrictRating(rating, { reportId, at: since })))
  }
  for (const { ratingId, reportId, at } of REMOVALS) {
    const rating = tx.get('ratings', ratingId)
    if (!rating) throw new Error(`Removal of an unknown rating: ${ratingId}`)
    tx.put('ratings', orThrow(removeRating(rating, { at, reason: 'report_upheld', reportId })))
  }
  const ratings = tx.rows('ratings')
  for (const job of tx.rows('jobs')) {
    const next = withRatingEvents(job, owed, ratings)
    if (next !== job) tx.put('jobs', next)
  }
  return tx.snapshot()
}

/** Ids of the personas, for tests and the demo's quick sign-in. */
export const PERSONA_IDS = {
  sarah: 'person_sarah',
  graham: 'person_graham',
  kev: 'person_kev',
  aileen: 'person_aileen',
  hannah: 'person_hannah',
  derek: 'person_derek',
} as const satisfies Record<string, PersonId>
