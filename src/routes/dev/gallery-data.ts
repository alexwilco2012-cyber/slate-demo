// Sample content for the dev gallery only. Every person, business and address is fictional; the
// streets and neighbourhoods are real Aberdeen ones with made-up house numbers.

import type {
  ComplianceItem,
  Job,
  PassportLine,
  PublicReview,
  ScoreSummary,
  TradeScore,
  VerificationBadge,
  VerificationClaim,
} from '@/domain/types'
import type { ThreadMessage } from '@/components/slate/message-thread'

export const NOW = '2026-09-26T15:00:00.000Z'

export const PEOPLE = {
  sarah: { name: 'Sarah Reid', seed: 'person_sarah' },
  graham: { name: 'Graham Forbes', seed: 'person_graham' },
  kev: { name: 'Kev Rattray', seed: 'person_kev' },
  aileen: { name: 'Aileen Ross', seed: 'person_aileen' },
} as const

export const HOMES = {
  rosemount: 'Flat 2, 41 Rosemount Place, AB25',
  ferryhill: '17 Fonthill Road, Ferryhill, AB11',
  oldAberdeen: '6 Orchard Street, Old Aberdeen, AB24',
} as const

export const landlordScore: ScoreSummary = {
  score: 4.34,
  reviewCount: 14,
  reviewerCount: 11,
  distribution: { 5: 6, 4: 5, 3: 2, 2: 1, 1: 0 },
  criteria: [
    { criterionId: 'fixed_quickly', mean: 4.5, count: 14 },
    { criterionId: 'kept_informed', mean: 4.2, count: 14 },
    { criterionId: 'home_as_advertised', mean: 4.6, count: 9 },
    { criterionId: 'proper_notice', mean: 4.8, count: 9 },
    { criterionId: 'fair_about_money', mean: 3.9, count: 9 },
  ],
  lastReviewAt: '2026-09-03T10:12:00.000Z',
  coverage: null,
  relativeBadge: null,
}

export const newScore: ScoreSummary = {
  score: null,
  reviewCount: 2,
  reviewerCount: 2,
  distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
  criteria: [],
  lastReviewAt: '2026-08-14T09:00:00.000Z',
  coverage: { reviewed: 2, completed: 3 },
  relativeBadge: null,
}

export const tradeScore: TradeScore = {
  overall: 4.52,
  fromLandlords: {
    score: 4.61,
    reviewCount: 8,
    reviewerCount: 4,
    distribution: { 5: 5, 4: 3, 3: 0, 2: 0, 1: 0 },
    criteria: [
      { criterionId: 'properly_fixed', mean: 4.8, count: 8 },
      { criterionId: 'price_matched_quote', mean: 4.6, count: 8 },
      { criterionId: 'on_time', mean: 4.4, count: 8 },
      { criterionId: 'kept_updated', mean: 4.5, count: 8 },
      { criterionId: 'right_paperwork', mean: 4.8, count: 8 },
    ],
    lastReviewAt: '2026-09-18T16:40:00.000Z',
    coverage: { reviewed: 8, completed: 10 },
    relativeBadge: { topPercent: 10, area: 'Aberdeen' },
  },
  fromTenants: {
    score: 4.43,
    reviewCount: 11,
    reviewerCount: 11,
    distribution: { 5: 6, 4: 4, 3: 0, 2: 1, 1: 0 },
    criteria: [
      { criterionId: 'turned_up', mean: 4.3, count: 11 },
      { criterionId: 'respectful', mean: 4.9, count: 11 },
      { criterionId: 'left_tidy', mean: 4.2, count: 11 },
      { criterionId: 'problem_fixed', mean: 4.6, count: 11 },
    ],
    lastReviewAt: '2026-09-21T11:05:00.000Z',
    coverage: { reviewed: 11, completed: 14 },
    relativeBadge: null,
  },
}

export const reviewOfLandlord: PublicReview = {
  ratingId: 'rating_g1',
  direction: 'tenant->landlord',
  subjectId: 'person_graham',
  propertyId: 'property_ferryhill',
  reviewer: { role: 'tenant', postcodeDistrict: 'AB11', year: 2025 },
  context: { kind: 'tenancy', startDate: '2023-03-01', endDate: '2025-07-31' },
  answers: {
    fixed_quickly: 5,
    kept_informed: 4,
    home_as_advertised: 4,
    proper_notice: 5,
    fair_about_money: 3,
  },
  score: 4.2,
  comment:
    'In my experience repairs were sorted fast, usually within the week. The boiler went in January and a plumber was out the next morning. Deposit return took longer than I expected.',
  revealedAt: '2025-08-29T09:00:00.000Z',
  reply: {
    id: 'reply_g1',
    ratingId: 'rating_g1',
    authorId: 'person_graham',
    body: 'Thanks for looking after the flat. The deposit wait was down to the scheme’s check-out process; I have asked them to speed it up for future tenants.',
    postedAt: '2025-09-02T18:20:00.000Z',
    state: 'published',
  },
  pendingFakeCheck: false,
  corrected: false,
}

export const reviewOfTrade: PublicReview = {
  ratingId: 'rating_k7',
  direction: 'landlord->trade',
  subjectId: 'person_kev',
  propertyId: 'property_rosemount',
  reviewer: { role: 'landlord', postcodeDistrict: 'AB25', year: 2026 },
  context: {
    kind: 'job',
    title: 'Leak under the kitchen sink',
    category: 'leak',
    completedAt: '2026-09-08T14:30:00.000Z',
  },
  answers: {
    properly_fixed: 3,
    price_matched_quote: 2,
    on_time: 4,
    kept_updated: 4,
    right_paperwork: 3,
  },
  score: 3.2,
  comment:
    'In my experience the leak was fixed, but the final bill was £60 over the quote with no warning before the extra part was fitted.',
  revealedAt: '2026-09-22T09:00:00.000Z',
  update: {
    id: 'update_k7',
    ratingId: 'rating_k7',
    authorId: 'person_graham',
    body: 'Kev has since explained the extra part was needed to meet regulations. Fair enough, but I would still have liked a call first.',
    postedAt: '2026-09-25T08:15:00.000Z',
    state: 'published',
  },
  dispute: {
    id: 'dispute_k7',
    ratingId: 'rating_k7',
    authorId: 'person_kev',
    createdAt: '2026-09-23T19:02:00.000Z',
  },
  pendingFakeCheck: false,
  corrected: false,
}

export const pendingReview: PublicReview = {
  ratingId: 'rating_p3',
  direction: 'tenant->trade',
  subjectId: 'person_kev',
  propertyId: 'property_oldaberdeen',
  reviewer: { role: 'tenant', postcodeDistrict: 'AB24', year: 2026 },
  context: {
    kind: 'job',
    title: 'Shower not draining',
    category: 'drains',
    completedAt: '2026-09-11T12:00:00.000Z',
  },
  answers: { turned_up: 1, respectful: 2, left_tidy: 1, problem_fixed: 1 },
  score: 1.25,
  comment:
    'In my experience this was the worst service I have had. Nobody turned up at the time agreed and the drain is still blocked.',
  revealedAt: '2026-09-25T09:00:00.000Z',
  pendingFakeCheck: true,
  corrected: false,
}

export const passportLines: PassportLine[] = [
  { criterionId: 'rent_on_time', counts: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 }, landlordCount: 2 },
  { criterionId: 'looked_after_home', counts: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 }, landlordCount: 2 },
  { criterionId: 'easy_to_reach', counts: { 5: 0, 4: 2, 3: 0, 2: 0, 1: 0 }, landlordCount: 2 },
  { criterionId: 'allowed_access', counts: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 }, landlordCount: 2 },
  { criterionId: 'left_as_expected', counts: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 }, landlordCount: 1 },
]

export const gasSafe: VerificationBadge = {
  kind: 'gas_safe',
  registrationNumber: '604417',
  applianceCategories: ['boilers', 'water_heaters', 'cookers'],
  checkedAt: '2026-03-12',
  expiresAt: '2027-03-11',
}

export const landlordRegistration: VerificationBadge = {
  kind: 'landlord_registration',
  registrationNumber: '284113/100/19571',
  council: 'Aberdeen City Council',
  checkedAt: '2026-01-20',
}

export const idCheck: VerificationBadge = { kind: 'id_check', checkedAt: '2026-02-02' }

export const pendingScheme: VerificationClaim = {
  kind: 'electrical_scheme',
  scheme: 'NICEIC',
  membershipNumber: 'D190442',
}

export const leakJob: Pick<Job, 'status' | 'timeline'> = {
  status: 'booked',
  timeline: [
    { id: 'event_1', kind: 'reported', at: '2026-09-21T08:12:00.000Z', actorId: 'person_sarah' },
    { id: 'event_2', kind: 'approved', at: '2026-09-21T12:40:00.000Z', actorId: 'person_graham' },
    {
      id: 'event_3',
      kind: 'trade_chosen',
      at: '2026-09-21T12:45:00.000Z',
      actorId: 'person_graham',
      tradeId: 'person_kev',
      route: 'saved_trades',
    },
    {
      id: 'event_4',
      kind: 'visit_booked',
      at: '2026-09-22T17:05:00.000Z',
      actorId: 'person_kev',
      visitId: 'visit_1',
    },
  ],
}

export const doneJob: Pick<Job, 'status' | 'timeline'> = {
  status: 'confirmed',
  timeline: [
    { id: 'event_a', kind: 'reported', at: '2026-08-30T19:02:00.000Z', actorId: 'person_sarah' },
    { id: 'event_b', kind: 'approved', at: '2026-08-31T08:30:00.000Z', actorId: 'person_graham' },
    {
      id: 'event_c',
      kind: 'visit_booked',
      at: '2026-08-31T10:00:00.000Z',
      actorId: 'person_kev',
      visitId: 'visit_2',
    },
    {
      id: 'event_d',
      kind: 'visit_started',
      at: '2026-09-03T08:05:00.000Z',
      actorId: 'person_kev',
      visitId: 'visit_2',
    },
    { id: 'event_e', kind: 'completed', at: '2026-09-03T11:40:00.000Z', actorId: 'person_kev' },
    {
      id: 'event_f',
      kind: 'ratings_revealed',
      at: '2026-09-17T09:00:00.000Z',
      actorId: null,
    },
  ],
}

export const declinedJob: Pick<Job, 'status' | 'timeline'> = {
  status: 'declined',
  timeline: [
    { id: 'event_x', kind: 'reported', at: '2026-09-10T09:00:00.000Z', actorId: 'person_sarah' },
    {
      id: 'event_y',
      kind: 'declined',
      at: '2026-09-11T10:00:00.000Z',
      actorId: 'person_graham',
      reason: 'Covered by the building factor',
    },
  ],
}

export const messages: ThreadMessage[] = [
  {
    id: 'm1',
    kind: 'text',
    body: 'Hi Graham, there’s water pooling under the kitchen sink again. I’ve put a basin under it and turned the stopcock down a bit.',
    sentAt: '2026-09-21T08:14:00.000Z',
    author: { name: PEOPLE.sarah.name, role: 'tenant', avatarSeed: PEOPLE.sarah.seed },
    attachments: [],
  },
  {
    id: 'm2',
    kind: 'system',
    body: 'Graham approved the repair and chose Kev Rattray from saved trades',
    sentAt: '2026-09-21T12:45:00.000Z',
  },
  {
    id: 'm3',
    kind: 'text',
    body: 'Thanks Sarah. Kev will be in touch to arrange a time. He has fixed the washing machine valve here before.',
    sentAt: '2026-09-21T12:47:00.000Z',
    author: { name: PEOPLE.graham.name, role: 'landlord', avatarSeed: PEOPLE.graham.seed },
  },
  {
    id: 'm4',
    kind: 'notice',
    body: 'Kev Rattray (plumber) will visit Flat 2, 41 Rosemount Place on Monday 28 September between 9am and 11am to repair the leak under the kitchen sink.',
    sentAt: '2026-09-22T17:05:00.000Z',
    author: { name: PEOPLE.graham.name, role: 'landlord', avatarSeed: PEOPLE.graham.seed },
  },
  {
    id: 'm5',
    kind: 'text',
    body: 'I’ve ordered a new trap and seal so I can fix it in one visit. Monday morning suits me.',
    sentAt: '2026-09-24T16:20:00.000Z',
    author: { name: PEOPLE.kev.name, role: 'trade', avatarSeed: PEOPLE.kev.seed },
  },
  {
    id: 'm6',
    kind: 'text',
    body: 'Great, thanks. I’ll be in until 11, and the door code is on the job page.',
    sentAt: '2026-09-24T16:32:00.000Z',
    author: { name: PEOPLE.sarah.name, role: 'tenant', avatarSeed: PEOPLE.sarah.seed },
    own: true,
  },
  {
    id: 'm7',
    kind: 'text',
    body: 'Aileen from the letting agent, for Graham: Kev, if Sarah is out the spare key is at our office on Union Street.',
    sentAt: '2026-09-26T10:02:00.000Z',
    author: {
      name: PEOPLE.aileen.name,
      role: 'landlord',
      avatarSeed: PEOPLE.aileen.seed,
      roleLabel: 'Agent for Graham',
    },
  },
]

export const compliance: (Pick<ComplianceItem, 'type' | 'status' | 'daysLeft' | 'bookedFor'> & {
  document?: { expiresAt: string | null }
  home: string
})[] = [
  {
    type: 'gas_safety',
    status: 'EXPIRED',
    daysLeft: -4,
    document: { expiresAt: '2026-09-22' },
    home: '6 Orchard Street',
  },
  {
    type: 'eicr',
    status: 'DUE_SOON',
    daysLeft: 38,
    document: { expiresAt: '2026-11-03' },
    home: '17 Fonthill Road',
  },
  {
    type: 'smoke_heat_alarms',
    status: 'BOOKED',
    daysLeft: 12,
    bookedFor: '2026-10-02',
    document: { expiresAt: '2026-10-08' },
    home: 'Flat 2, 41 Rosemount Place',
  },
  {
    type: 'landlord_registration',
    status: 'OK',
    daysLeft: 482,
    document: { expiresAt: '2028-01-20' },
    home: 'All homes',
  },
  { type: 'legionella', status: 'TO_ARRANGE', daysLeft: null, home: '6 Orchard Street' },
]
