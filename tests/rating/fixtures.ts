// Fictional records for the rating engine tests. Every person, business and home here is made up.

import { RELATIONSHIPS, type RatingDirection, type ScaleScore } from '@/domain/criteria'
import type {
  ContextRef,
  CriteriaAnswers,
  IsoDateTime,
  Job,
  PersonId,
  Property,
  PropertyId,
  Rating,
  RatingId,
  Tenancy,
  Visit,
} from '@/domain/types'
import { addDays } from '@/domain/rating'

/** Day 0 is Monday 2 March 2026, 9am UTC. */
export const DAY_0 = '2026-03-02T09:00:00.000Z'

export function day(n: number, hours = 0): IsoDateTime {
  return addDays(DAY_0, n + hours / 24)
}

export const PEOPLE = {
  sarah: 'person_sarah',
  amy: 'person_amy',
  graham: 'person_graham',
  fiona: 'person_fiona',
  kev: 'person_kev',
  mhairi: 'person_mhairi',
  agent: 'person_agent_iain',
} as const satisfies Record<string, PersonId>

export const HOME: PropertyId = 'property_esslemont_14'
export const OTHER_HOME: PropertyId = 'property_rosemount_3'

export const property: Pick<Property, 'id' | 'landlordId'> = {
  id: HOME,
  landlordId: PEOPLE.graham,
}

export function makeTenancy(overrides: Partial<Tenancy> = {}): Tenancy {
  const tenantIds = overrides.tenantIds ?? [PEOPLE.sarah]
  return {
    id: 'tenancy_esslemont',
    kind: 'scottish_prt',
    propertyId: HOME,
    landlordId: PEOPLE.graham,
    tenantIds,
    startDate: '2025-06-01',
    status: 'confirmed',
    confirmations: [
      { personId: PEOPLE.graham, side: 'landlord', confirmedAt: '2025-05-20T10:00:00.000Z' },
      ...tenantIds.map((personId) => ({
        personId,
        side: 'tenant' as const,
        confirmedAt: '2025-05-21T10:00:00.000Z',
      })),
    ],
    rentPencePerMonth: 85_000,
    rentDueDay: 1,
    proposedById: PEOPLE.graham,
    proposedAt: '2025-05-19T10:00:00.000Z',
    ...overrides,
  }
}

/** A tenancy that ended at day 0, which opens the end-of-tenancy ratings. */
export function endedTenancy(overrides: Partial<Tenancy> = {}): Tenancy {
  return makeTenancy({
    status: 'ended',
    endDate: '2026-03-02',
    endedAt: DAY_0,
    ...overrides,
  })
}

export function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: 'visit_leak_1',
    tradeId: PEOPLE.kev,
    purpose: 'repair',
    startsAt: day(-1),
    endsAt: day(-1, 2),
    notice: {
      givenAt: day(-4),
      givenById: PEOPLE.graham,
      messageId: 'message_notice_1',
      hoursGiven: 72,
      emergency: false,
    },
    status: 'done',
    startedAt: day(-1),
    finishedAt: day(0),
    tenantConfirmedAt: day(1),
    ...overrides,
  }
}

/**
 * Sarah's leak under the kitchen sink: Kev fixed it and marked it done on day 0, Sarah confirmed
 * his visit on day 1 and Graham confirmed the job on day 2.
 */
export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job_kitchen_leak',
    propertyId: HOME,
    tenancyId: 'tenancy_esslemont',
    reportedById: PEOPLE.sarah,
    reportedAs: 'tenant',
    title: 'Leak under the kitchen sink',
    room: 'kitchen',
    category: 'leak',
    description: 'Water pooling under the sink when the tap runs.',
    photos: [],
    urgency: 'urgent',
    access: { windows: [{ date: '2026-03-01', slot: 'morning' }], keyAllowed: true },
    status: 'confirmed',
    tradeId: PEOPLE.kev,
    visits: [makeVisit()],
    completion: { completedAt: DAY_0, photos: [] },
    landlordConfirmedAt: day(2),
    timeline: [],
    createdAt: day(-7),
    updatedAt: day(2),
    ...overrides,
  }
}

export const JOB: ContextRef = { kind: 'job', jobId: 'job_kitchen_leak' }
export const TENANCY: ContextRef = { kind: 'tenancy', tenancyId: 'tenancy_esslemont' }

/** Every question for this direction and occasion answered with the same score. */
export function answersFor(
  direction: RatingDirection,
  score: ScaleScore,
  onlyRepairQuestions = false,
): CriteriaAnswers {
  const criteria = RELATIONSHIPS[direction].criteria.filter(
    (criterion) => !onlyRepairQuestions || 'afterEachRepair' in criterion,
  )
  const answers: Partial<Record<string, ScaleScore>> = {}
  for (const criterion of criteria) {
    // Yes / Partly / No only scores 5, 3 or 1, so other scores go to the nearest of those.
    answers[criterion.id] =
      criterion.scale !== 'yesPartlyNo' ? score : score >= 4 ? 5 : score === 3 ? 3 : 1
  }
  return answers
}

let counter = 0

/**
 * A rating, revealed by default. Pass `at` to set when it was sent (and revealed); state,
 * seal and the rest can be overridden.
 */
export function makeRating(
  overrides: Partial<Rating> &
    Pick<Rating, 'direction' | 'raterId' | 'subjectId'> & { at?: IsoDateTime; score?: ScaleScore },
): Rating {
  counter += 1
  const { at = DAY_0, score = 4, ...rest } = overrides
  const id: RatingId = `rating_test_${counter}`
  const context = rest.context ?? JOB
  return {
    id,
    context,
    propertyId: HOME,
    seal: 'double_blind',
    answers: answersFor(rest.direction, score),
    safetyFlag: false,
    state: 'revealed',
    createdAt: at,
    submittedAt: at,
    windowClosesAt: addDays(at, 14),
    revealAt: at,
    revealedAt: at,
    corrections: [],
    ...rest,
  }
}
