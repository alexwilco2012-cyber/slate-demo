// Sample records for the public site's product pictures. They match the demo's seed story (Sarah's
// flat in Rosemount, Graham's homes, Kev the plumber, today being Saturday 26 September 2026), but
// are fixed here so the front page looks the same however far someone has played the demo.
// Every person, business and address is fictional; the neighbourhoods are real Aberdeen ones.

import type {
  JobEvent,
  JobStatus,
  PassportLine,
  PublicReview,
  ScoreSummary,
  TradeScore,
} from '@/domain/types'
import type { ComplianceCalendarRowProps } from '@/components/slate/compliance-calendar'

export const SAMPLE_TODAY = '2026-09-26'

export const PEOPLE = {
  sarah: { name: 'Sarah Laing', seed: 'person_sarah' },
  graham: { name: 'Graham Forbes', seed: 'person_graham' },
  kev: { name: 'Kev Rattray', seed: 'person_kev' },
  aileen: { name: 'Aileen Christie', seed: 'person_aileen' },
} as const

const event = (id: string, at: string, kind: JobEvent['kind'], extra = {}): JobEvent =>
  ({ id: `event_${id}`, at, actorId: null, kind, ...extra }) as JobEvent

/** Sarah's radiator valve: reported on Monday, Kev due at half one today. */
export const TENANT_JOB: {
  title: string
  home: string
  status: JobStatus
  timeline: JobEvent[]
  visitAt: string
} = {
  title: 'Radiator valve leaking in the hall',
  home: 'Flat 3, 41 Rosemount Place',
  status: 'booked',
  timeline: [
    event('s1', '2026-09-21T07:52:00.000Z', 'reported'),
    event('s2', '2026-09-21T09:15:00.000Z', 'approved'),
    event('s3', '2026-09-22T08:05:00.000Z', 'trade_instructed', { tradeId: 'person_kev' }),
    event('s4', '2026-09-22T08:20:00.000Z', 'visit_booked', { visitId: 'visit_s1' }),
  ],
  visitAt: '2026-09-26T12:30:00.000Z',
}

/** What trades have said about Graham as a client. */
export const CLIENT_RATING: {
  summary: ScoreSummary
  paidOnTime: { onTime: number; jobs: number }
} = {
  summary: {
    score: 4.72,
    reviewCount: 9,
    reviewerCount: 6,
    distribution: { 5: 7, 4: 2, 3: 0, 2: 0, 1: 0 },
    criteria: [
      { criterionId: 'clear_description', mean: 4.6, count: 9 },
      { criterionId: 'paid_on_time', mean: 5, count: 9 },
      { criterionId: 'arranged_access', mean: 4.6, count: 9 },
      { criterionId: 'fair_to_deal_with', mean: 4.7, count: 9 },
    ],
    lastReviewAt: '2026-09-18T15:10:00.000Z',
    coverage: { reviewed: 9, completed: 11 },
    relativeBadge: null,
  },
  paidOnTime: { onTime: 9, jobs: 9 },
}

export interface SampleAction {
  kind: 'approve' | 'quotes' | 'expired'
  title: string
  detail: string
}

/** The top of Graham's home screen this morning. */
export const LANDLORD_ACTIONS: SampleAction[] = [
  {
    kind: 'approve',
    title: 'Approve a repair',
    detail: 'Damp patch on the bedroom ceiling · Rosemount',
  },
  { kind: 'quotes', title: 'Compare 3 quotes', detail: 'Gutter overflowing at the front · Torry' },
  { kind: 'expired', title: 'Smoke and heat alarms', detail: 'King Street · expired 17 Sept' },
]

/** One home's certificates, for the landlord section. */
export const COMPLIANCE_ROWS: ComplianceCalendarRowProps['item'][] = [
  {
    type: 'gas_safety',
    status: 'OK',
    daysLeft: 212,
    document: { expiresAt: '2027-04-26' },
  },
  { type: 'eicr', status: 'DUE_SOON', daysLeft: 44, document: { expiresAt: '2026-11-09' } },
  {
    type: 'smoke_heat_alarms',
    status: 'EXPIRED',
    daysLeft: -9,
    document: { expiresAt: '2026-09-17' },
  },
]

/** A job on the board, as Kev sees it before quoting. */
export const BOARD_POST = {
  title: 'Toilet keeps running after flushing',
  area: 'AB10 · Ferryhill',
  distance: 'About 2 miles away',
  posted: 'Posted this morning',
  quotes: '2 quotes so far',
  closes: 'Closes Tue 29 Sept',
}

/** Sarah's passport lines: what two landlords said, counted per question. */
export const PASSPORT_LINES: PassportLine[] = [
  {
    criterionId: 'rent_on_time',
    counts: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
    landlordCount: 2,
  },
  {
    criterionId: 'looked_after_home',
    counts: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
    landlordCount: 2,
  },
  {
    criterionId: 'left_as_expected',
    counts: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
    landlordCount: 2,
  },
]

/** A revealed review of Graham from a past tenant, with his reply. */
export const REVIEW_OF_LANDLORD: PublicReview = {
  ratingId: 'rating_sample_graham',
  direction: 'tenant->landlord',
  subjectId: 'person_graham',
  propertyId: 'property_sample_rosemount',
  reviewer: { role: 'tenant', postcodeDistrict: 'AB25', year: 2025 },
  context: { kind: 'tenancy', startDate: '2023-06-01', endDate: '2025-07-31' },
  answers: {
    fixed_quickly: 5,
    kept_informed: 4,
    home_as_advertised: 4,
    proper_notice: 5,
    fair_about_money: 4,
  },
  score: 4.4,
  comment:
    'In my experience repairs were sorted quickly. When the boiler failed in January a plumber came the next morning, and visits were always arranged with plenty of notice.',
  revealedAt: '2025-08-29T09:00:00.000Z',
  reply: {
    id: 'reply_sample_graham',
    ratingId: 'rating_sample_graham',
    authorId: 'person_graham',
    body: 'Thank you for looking after the flat so well. Good luck in the new place.',
    postedAt: '2025-09-02T18:20:00.000Z',
    state: 'published',
  },
  pendingFakeCheck: false,
  corrected: false,
}

/** Kev's score: both halves, and the Overall between them. */
export const TRADE_SCORE: TradeScore = {
  overall: 4.56,
  fromLandlords: {
    score: 4.62,
    reviewCount: 12,
    reviewerCount: 5,
    distribution: { 5: 8, 4: 4, 3: 0, 2: 0, 1: 0 },
    criteria: [
      { criterionId: 'properly_fixed', mean: 4.8, count: 12 },
      { criterionId: 'price_matched_quote', mean: 4.6, count: 12 },
      { criterionId: 'on_time', mean: 4.4, count: 12 },
      { criterionId: 'kept_updated', mean: 4.5, count: 12 },
      { criterionId: 'right_paperwork', mean: 4.8, count: 12 },
    ],
    lastReviewAt: '2026-09-18T16:40:00.000Z',
    coverage: { reviewed: 12, completed: 15 },
    relativeBadge: null,
  },
  fromTenants: {
    score: 4.49,
    reviewCount: 10,
    reviewerCount: 10,
    distribution: { 5: 6, 4: 3, 3: 1, 2: 0, 1: 0 },
    criteria: [
      { criterionId: 'turned_up', mean: 4.3, count: 10 },
      { criterionId: 'respectful', mean: 4.9, count: 10 },
      { criterionId: 'left_tidy', mean: 4.3, count: 10 },
      { criterionId: 'problem_fixed', mean: 4.6, count: 10 },
    ],
    lastReviewAt: '2026-09-21T11:05:00.000Z',
    coverage: { reviewed: 10, completed: 15 },
    relativeBadge: null,
  },
}
