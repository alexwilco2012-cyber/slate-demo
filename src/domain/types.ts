// The domain model: every record the three portals share. Screens and the data layer import from
// here; nothing in this file knows about React, storage or Supabase.
//
// Conventions
// - Ids are prefixed strings (ids.ts). Dates: IsoDateTime is an instant in UTC, IsoDate a calendar
//   date. Money is whole pence.
// - Each option set is a const array (so screens can list the options in order) plus, where people
//   see it, a *_LABELS record with the British English wording.
// - Rating criteria, scales and windows are data in criteria.ts; their types are re-exported here.

import type { CriterionId, RatingDirection, ScaleScore, SealRule } from './criteria'
import type {
  AgencyId,
  BlockId,
  DisputeId,
  DocumentId,
  EventId,
  FileId,
  Id,
  IdPrefix,
  JobId,
  LineItemId,
  MembershipId,
  MessageId,
  NotificationId,
  PersonId,
  PropertyId,
  QuoteId,
  RatingId,
  ReplyId,
  ReportId,
  ShareId,
  TenancyId,
  ThreadId,
  UpdateId,
  VisitId,
} from './ids'

export type {
  CriterionDef,
  CriterionId,
  RatingDirection,
  RatingOccasion,
  RatingTrigger,
  RatingVisibility,
  RelationshipDef,
  ScaleId,
  ScaleScore,
  SealRule,
} from './criteria'
export type {
  AgencyId,
  BlockId,
  DisputeId,
  DocumentId,
  EventId,
  FileId,
  Id,
  IdPrefix,
  JobId,
  LineItemId,
  MembershipId,
  MessageId,
  NotificationId,
  PersonId,
  PropertyId,
  QuoteId,
  RatingId,
  ReplyId,
  ReportId,
  ShareId,
  TenancyId,
  ThreadId,
  UpdateId,
  VisitId,
} from './ids'

// ─── Primitives ──────────────────────────────────────────────────────────────────────────────

/** An instant, ISO 8601 in UTC, e.g. '2026-09-26T14:30:00.000Z'. */
export type IsoDateTime = string
/** A calendar date with no time or zone, e.g. '2026-09-26'. */
export type IsoDate = string
/** Money in whole pence, so totals never meet floating-point rounding. */
export type Pence = number
/** The outward part of a postcode, e.g. 'AB10'. Shown on reviews instead of names. */
export type PostcodeDistrict = string

export interface ImageRef {
  url: string
  alt: string
}

export interface Photo extends ImageRef {
  id: FileId
  addedById: PersonId
  addedAt: IsoDateTime
}

export interface FileRef {
  name: string
  url: string
  sizeBytes?: number
}

/** Fixed rules from SPEC §6 that the data layer enforces and screens explain. */
export const LETTING_RULES = {
  /** Scotland: written notice before a visit, except in an emergency. */
  visitNoticeHours: 48,
  /** Certificates show as due soon (amber) this many days before they expire. */
  documentDueSoonDays: 60,
  /** A tenant passport link works for this long after it is made. */
  passportShareDays: 30,
  minimumAge: 18,
} as const

// ─── Roles and people ────────────────────────────────────────────────────────────────────────

/** A portal. Letting agents use the landlord portal, acting inside a landlord's account. */
export const ROLES = ['tenant', 'landlord', 'trade'] as const
export type Role = (typeof ROLES)[number]
export const ROLE_LABELS = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  trade: 'Trade',
} as const satisfies Record<Role, string>

/** The role doing the rating, e.g. 'tenant' for 'tenant->landlord'. */
export type RaterRole<D extends RatingDirection> = D extends `${infer R extends Role}->${string}`
  ? R
  : never
/** The role being rated, e.g. 'landlord' for 'tenant->landlord'. */
export type SubjectRole<D extends RatingDirection> = D extends `${string}->${infer S extends Role}`
  ? S
  : never

export const TRADE_TYPES = [
  'plumber',
  'gas_engineer',
  'electrician',
  'joiner',
  'roofer',
  'cleaner',
  'locksmith',
  'handyman',
  'glazier',
  'decorator',
] as const
export type TradeType = (typeof TRADE_TYPES)[number]
export const TRADE_TYPE_LABELS = {
  plumber: 'Plumber',
  gas_engineer: 'Gas engineer',
  electrician: 'Electrician',
  joiner: 'Joiner',
  roofer: 'Slater and roofer',
  cleaner: 'Cleaner',
  locksmith: 'Locksmith',
  handyman: 'Handyman',
  glazier: 'Glazier',
  decorator: 'Painter and decorator',
} as const satisfies Record<TradeType, string>

/** Work categories a Gas Safe engineer can be registered for. Gas jobs need a matching one. */
export const GAS_APPLIANCE_CATEGORIES = [
  'boilers',
  'water_heaters',
  'cookers',
  'fires',
  'meters',
  'lpg',
] as const
export type GasApplianceCategory = (typeof GAS_APPLIANCE_CATEGORIES)[number]
export const GAS_APPLIANCE_LABELS = {
  boilers: 'Boilers and central heating',
  water_heaters: 'Water heaters',
  cookers: 'Cookers and hobs',
  fires: 'Gas fires',
  meters: 'Gas meters',
  lpg: 'LPG appliances',
} as const satisfies Record<GasApplianceCategory, string>

/** Schemes whose members may carry out an EICR. Named in text only: no scheme logos. */
export const ELECTRICAL_SCHEMES = ['SELECT', 'NICEIC', 'NAPIT'] as const
export type ElectricalScheme = (typeof ELECTRICAL_SCHEMES)[number]

/** A credential someone says they hold. It becomes a badge only once checked. */
export type VerificationClaim =
  | { kind: 'id_check' }
  | { kind: 'landlord_registration'; registrationNumber: string; council: string }
  | { kind: 'gas_safe'; registrationNumber: string; applianceCategories: GasApplianceCategory[] }
  | { kind: 'electrical_scheme'; scheme: ElectricalScheme; membershipNumber: string }
  /** An electrician outside the schemes who has evidenced the competence checklist. */
  | { kind: 'electrical_checklist' }
  /** Works as a letting agent inside a landlord's account. */
  | { kind: 'agent_team'; agencyId: AgencyId }
export type BadgeKind = VerificationClaim['kind']

/** A checked credential. Badges always carry the date they were checked (SPEC §6). */
export type VerificationBadge = VerificationClaim & { checkedAt: IsoDate; expiresAt?: IsoDate }

export interface PendingVerification {
  claim: VerificationClaim
  submittedAt: IsoDateTime
}

export const BADGE_LABELS = {
  id_check: 'ID checked',
  landlord_registration: 'Registration verified',
  gas_safe: 'Gas Safe registered',
  electrical_scheme: 'Electrical scheme member',
  electrical_checklist: 'Electrical competence evidenced',
  agent_team: 'Letting agent',
} as const satisfies Record<BadgeKind, string>

/** What a trade shows publicly. Their saved quote lines are private (SavedLineItem). */
export interface TradeProfile {
  businessName: string
  trades: TradeType[]
  serviceDistricts: PostcodeDistrict[]
  about?: string
  vatRegistered: boolean
}

/** What anyone signed in may see about a person. Never includes contact details. */
export interface PersonCard {
  id: PersonId
  displayName: string
  /** At least one. A landlord who also rents holds both and switches portals. */
  roles: Role[]
  /** Seeds the generated avatar, so no real photo is ever needed. */
  avatarSeed: string
  postcodeDistrict: PostcodeDistrict
  badges: VerificationBadge[]
  tradeProfile?: TradeProfile
  joinedAt: IsoDateTime
}

/** The full record, seen only by the person themselves (and the data layer). */
export interface Person extends PersonCard {
  contact: { email: string; phone?: string }
  /** Minimum age 18 (SPEC §6). We record the confirmation, never a date of birth. */
  adultConfirmedAt: IsoDateTime
  pendingVerifications: PendingVerification[]
  /** Landlords: their own list of trades to instruct. */
  savedTradeIds: PersonId[]
  /**
   * When they last looked at each portal's home screen, for "while you were away". Left out
   * until they first do.
   */
  lastSeen?: Partial<Record<Role, IsoDateTime>>
}

// ─── Letting agents ──────────────────────────────────────────────────────────────────────────

export interface Agency {
  id: AgencyId
  name: string
  /** Scottish letting agent registration number. */
  registrationNumber: string
  postcodeDistrict: PostcodeDistrict
}

export const TEAM_PERMISSIONS = [
  'approve_repairs',
  'instruct_trades',
  'accept_quotes',
  'manage_documents',
  'manage_tenancies',
  'message',
] as const
export type TeamPermission = (typeof TEAM_PERMISSIONS)[number]

/**
 * An agent working inside a landlord's account. Which properties: Property.agentIds.
 * - invited: waiting for the agent to accept or decline. They can't act for the landlord yet.
 * - active: accepted; they act within their permissions.
 * - declined: the agent said no. The landlord can invite them again.
 * - ended: either side stopped it.
 */
export type TeamMembershipStatus = 'invited' | 'active' | 'declined' | 'ended'

export interface TeamMembership {
  id: MembershipId
  agencyId: AgencyId
  agentId: PersonId
  landlordId: PersonId
  permissions: TeamPermission[]
  status: TeamMembershipStatus
  invitedAt: IsoDateTime
  acceptedAt?: IsoDateTime
  declinedAt?: IsoDateTime
  endedAt?: IsoDateTime
}

// ─── Properties and tenancies ────────────────────────────────────────────────────────────────

export const NEIGHBOURHOODS = [
  'Rosemount',
  'West End',
  'Ferryhill',
  'Old Aberdeen',
  'Torry',
  'Bridge of Don',
  'Mastrick',
  'Kittybrewster',
] as const
export type Neighbourhood = (typeof NEIGHBOURHOODS)[number]

export const PROPERTY_TYPES = [
  'tenement_flat',
  'flat',
  'maisonette',
  'terraced_house',
  'semi_detached_house',
  'detached_house',
  'cottage',
] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]
export const PROPERTY_TYPE_LABELS = {
  tenement_flat: 'Tenement flat',
  flat: 'Flat',
  maisonette: 'Maisonette',
  terraced_house: 'Terraced house',
  semi_detached_house: 'Semi-detached house',
  detached_house: 'Detached house',
  cottage: 'Cottage',
} as const satisfies Record<PropertyType, string>

export const EPC_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type EpcBand = (typeof EPC_BANDS)[number]

/** The three approved tenancy deposit schemes in Scotland. Slate never holds deposits itself. */
export const DEPOSIT_SCHEMES = [
  'safedeposits_scotland',
  'letting_protection_scotland',
  'mydeposits_scotland',
] as const
export type DepositScheme = (typeof DEPOSIT_SCHEMES)[number]
export const DEPOSIT_SCHEME_LABELS = {
  safedeposits_scotland: 'SafeDeposits Scotland',
  letting_protection_scotland: 'Letting Protection Service Scotland',
  mydeposits_scotland: 'mydeposits Scotland',
} as const satisfies Record<DepositScheme, string>

/** Which set of letting rules applies. Scotland only for now; England and Wales come later. */
export type Jurisdiction = 'scotland'

export interface Property {
  id: PropertyId
  /** e.g. 'Flat 2/1, 14 Esslemont Avenue'. Real street names, made-up house numbers. */
  addressLine: string
  neighbourhood: Neighbourhood
  city: string
  postcode: string
  postcodeDistrict: PostcodeDistrict
  jurisdiction: Jurisdiction
  bedrooms: number
  type: PropertyType
  epcBand: EpcBand
  /** The scheme this landlord lodges deposits with here; each tenancy records its own. */
  depositScheme: DepositScheme
  /** Decides whether a gas safety record and CO alarms are required. */
  hasGasSupply: boolean
  landlordId: PersonId
  /** Letting agents assigned to this property (each needs an active TeamMembership). */
  agentIds: PersonId[]
  photo?: ImageRef
  createdAt: IsoDateTime
}

export type TenancyStatus = 'proposed' | 'confirmed' | 'ended'

export interface TenancyConfirmation {
  personId: PersonId
  side: 'landlord' | 'tenant'
  confirmedAt: IsoDateTime
}

/**
 * A Scottish private residential tenancy (PRT). PRTs are open-ended, so endDate is set only once
 * notice is given. Ratings unlock only for a tenancy confirmed here by both sides (SPEC §5 rule 1).
 */
export interface Tenancy {
  id: TenancyId
  kind: 'scottish_prt'
  propertyId: PropertyId
  landlordId: PersonId
  /** Joint tenants are all listed. */
  tenantIds: PersonId[]
  startDate: IsoDate
  endDate?: IsoDate
  status: TenancyStatus
  /** Confirmed once the landlord (or their agent) and every tenant have confirmed. */
  confirmations: TenancyConfirmation[]
  rentPencePerMonth: Pence
  /** Day of the month rent is due: the "agreed date" landlords rate against. */
  rentDueDay: number
  deposit?: { amountPence: Pence; scheme: DepositScheme; lodgedOn: IsoDate }
  proposedById: PersonId
  proposedAt: IsoDateTime
  endedAt?: IsoDateTime
}

// ─── Repair jobs ─────────────────────────────────────────────────────────────────────────────

export const ROOMS = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'hall',
  'common_close',
  'outside',
  'whole_home',
  'other',
] as const
export type Room = (typeof ROOMS)[number]
export const ROOM_LABELS = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living_room: 'Living room',
  hall: 'Hall',
  common_close: 'Shared close or stair',
  outside: 'Outside',
  whole_home: 'Whole home',
  other: 'Somewhere else',
} as const satisfies Record<Room, string>

export const JOB_CATEGORIES = [
  'leak',
  'heating',
  'electrics',
  'gas_appliance',
  'drains',
  'damp',
  'doors_windows_locks',
  'roof_outside',
  'appliance',
  'pests',
  'cleaning',
  'safety_check',
  'other',
] as const
export type JobCategory = (typeof JOB_CATEGORIES)[number]
export const JOB_CATEGORY_LABELS = {
  leak: 'Leak or drip',
  heating: 'Heating or hot water',
  electrics: 'Electrics or lighting',
  gas_appliance: 'Gas cooker or fire',
  drains: 'Blocked sink, toilet or drain',
  damp: 'Damp or mould',
  doors_windows_locks: 'Doors, windows or locks',
  roof_outside: 'Roof, gutters or outside',
  appliance: 'Appliance',
  pests: 'Pests',
  cleaning: 'Cleaning',
  safety_check: 'Safety check or certificate',
  other: 'Something else',
} as const satisfies Record<JobCategory, string>

/**
 * The kinds of job each trade usually takes on, so a trade can narrow the job board to work they
 * do. It only filters what a trade chooses to look at; it never matches or assigns anyone.
 */
export const TRADE_JOB_CATEGORIES = {
  plumber: ['leak', 'heating', 'drains', 'appliance'],
  gas_engineer: ['heating', 'gas_appliance', 'safety_check'],
  electrician: ['electrics', 'appliance', 'safety_check'],
  joiner: ['doors_windows_locks', 'other'],
  roofer: ['roof_outside', 'damp', 'leak'],
  cleaner: ['cleaning'],
  locksmith: ['doors_windows_locks'],
  handyman: ['doors_windows_locks', 'appliance', 'pests', 'other'],
  glazier: ['doors_windows_locks'],
  decorator: ['damp', 'other'],
} as const satisfies Record<TradeType, readonly JobCategory[]>

export const URGENCIES = ['emergency', 'urgent', 'routine'] as const
export type Urgency = (typeof URGENCIES)[number]
export const URGENCY_LABELS = {
  emergency: 'Emergency',
  urgent: 'Urgent',
  routine: 'Routine',
} as const satisfies Record<Urgency, string>

/**
 * The happy path, in order. A job can also end as declined or cancelled.
 * 'instructed' is the landlord's explicit go-ahead to the trade they chose, after accepting the
 * quote (or, in an emergency, without one). Only then can the work be booked, so the timeline
 * always shows that the landlord chose (SPEC §4 legal rule).
 */
export const JOB_PIPELINE = [
  'reported',
  'approved',
  'quoting',
  'instructed',
  'booked',
  'in_progress',
  'completed',
  'confirmed',
] as const
export const JOB_STATUSES = [...JOB_PIPELINE, 'declined', 'cancelled'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]
export const JOB_STATUS_LABELS = {
  reported: 'Reported',
  approved: 'Approved',
  quoting: 'Getting quotes',
  instructed: 'Trade instructed',
  booked: 'Visit booked',
  in_progress: 'In progress',
  completed: 'Work done',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
} as const satisfies Record<JobStatus, string>

export const ACCESS_SLOTS = ['morning', 'afternoon', 'evening', 'all_day'] as const
export type AccessSlot = (typeof ACCESS_SLOTS)[number]
export const ACCESS_SLOT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  all_day: 'Any time',
} as const satisfies Record<AccessSlot, string>

export interface AccessWindow {
  date: IsoDate
  slot: AccessSlot
}

/** When and how the trade can get in, as the tenant set it when reporting. */
export interface JobAccess {
  windows: AccessWindow[]
  /** The tenant is happy for a key to be used if they are out. */
  keyAllowed: boolean
  notes?: string
}

/** Checked credentials a trade must hold before they can be instructed (SPEC §6). */
export type CredentialRequirement =
  | { kind: 'gas_safe'; applianceCategory: GasApplianceCategory }
  /** EICR work: a SELECT, NICEIC or NAPIT member, or a checklist-evidenced electrician. */
  | { kind: 'electrical_certification' }

/**
 * How the landlord found the trade they instructed. Slate never assigns, matches or dispatches:
 * the landlord (or their agent) always makes the choice (SPEC §4 legal rule).
 */
export type TradeChoiceRoute = 'saved_trades' | 'directory' | 'job_board'

/** The written notice sent to the tenant before a visit. */
export interface NoticeRecord {
  givenAt: IsoDateTime
  givenById: PersonId
  /** The notice message on the job thread, which is the written record. */
  messageId: MessageId
  /** Hours between the notice and the start of the visit. */
  hoursGiven: number
  /** Emergencies are exempt from the 48-hour rule. */
  emergency: boolean
}

export type VisitPurpose = 'quote' | 'repair' | 'safety_check'
export type VisitStatus = 'booked' | 'on_site' | 'done' | 'no_access' | 'cancelled'

export interface Visit {
  id: VisitId
  tradeId: PersonId
  purpose: VisitPurpose
  startsAt: IsoDateTime
  endsAt: IsoDateTime
  notice: NoticeRecord
  status: VisitStatus
  startedAt?: IsoDateTime
  finishedAt?: IsoDateTime
  /** The tenant confirmed the visit happened, which opens their rating of the trade. */
  tenantConfirmedAt?: IsoDateTime
}

export interface JobCompletion {
  completedAt: IsoDateTime
  /** What the trade says the work cost, for landlords to compare with the quote. */
  finalPricePence?: Pence
  note?: string
  photos: Photo[]
}

/**
 * The trade's bill for the work and whether it has been paid. Slate never takes, holds or moves
 * the money: this only records what both sides say, so a trade can see who pays late and judge
 * "Paid on time" fairly when they rate the landlord.
 */
export interface JobPayment {
  amountPence: Pence
  invoicedAt: IsoDateTime
  /** The date the trade asked to be paid by, from their payment terms. */
  dueOn: IsoDate
  paidAt?: IsoDateTime
  /** Who said it was paid: the landlord ("I've paid") or the trade ("Payment received"). */
  paidRecordedBy?: 'landlord' | 'trade'
}

/** The payment days a trade can choose when invoicing, e.g. 14 for "within 14 days". */
export const PAYMENT_TERMS_DAYS = [0, 7, 14, 30] as const
export type PaymentTermsDays = (typeof PAYMENT_TERMS_DAYS)[number]

interface JobEventBase {
  id: EventId
  at: IsoDateTime
  /** Null for things the system did, such as opening a rating window. */
  actorId: PersonId | null
}

/** One step on the job timeline. Events are only ever appended. */
export type JobEvent = JobEventBase &
  (
    | { kind: 'reported' }
    | { kind: 'approved'; note?: string }
    | { kind: 'declined'; reason: string }
    | { kind: 'posted_to_board' }
    | { kind: 'trade_chosen'; tradeId: PersonId; route: TradeChoiceRoute }
    | { kind: 'quote_submitted'; quoteId: QuoteId }
    | { kind: 'quote_withdrawn'; quoteId: QuoteId }
    | { kind: 'quote_accepted'; quoteId: QuoteId }
    /** The landlord's go-ahead to the trade they chose. Always by the landlord or their agent. */
    | { kind: 'trade_instructed'; tradeId: PersonId; quoteId?: QuoteId; note?: string }
    | { kind: 'visit_booked'; visitId: VisitId }
    | { kind: 'visit_cancelled'; visitId: VisitId; reason: string }
    | { kind: 'visit_started'; visitId: VisitId }
    | { kind: 'no_access'; visitId: VisitId; note?: string }
    | { kind: 'visit_confirmed'; visitId: VisitId }
    | { kind: 'completed' }
    | { kind: 'confirmed' }
    | { kind: 'cancelled'; reason: string }
    | { kind: 'invoice_sent'; amountPence: Pence; dueOn: IsoDate }
    | { kind: 'payment_recorded'; by: 'landlord' | 'trade' }
    | { kind: 'photos_added'; count: number }
    | { kind: 'ratings_opened'; closesAt: IsoDateTime }
    | { kind: 'ratings_revealed' }
  )
export type JobEventKind = JobEvent['kind']

export interface Job {
  id: JobId
  propertyId: PropertyId
  tenancyId?: TenancyId
  reportedById: PersonId
  reportedAs: Role
  /** Short name for lists, e.g. 'Leak under the kitchen sink'. */
  title: string
  room: Room
  category: JobCategory
  description: string
  photos: Photo[]
  urgency: Urgency
  access: JobAccess
  status: JobStatus
  credentialNeeded?: CredentialRequirement
  /** Set when the job renews a certificate, so the compliance calendar can show it as booked. */
  complianceType?: DocumentType
  /** The trade the landlord instructed. Only ever set by the landlord or their agent. */
  tradeId?: PersonId
  board?: { postedAt: IsoDateTime; closesAt?: IsoDateTime }
  acceptedQuoteId?: QuoteId
  visits: Visit[]
  completion?: JobCompletion
  /** The trade's invoice for the work, once they have sent it. */
  payment?: JobPayment
  /** The landlord confirmed the work is done, which opens their rating of the trade. */
  landlordConfirmedAt?: IsoDateTime
  timeline: JobEvent[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

// ─── Quotes ──────────────────────────────────────────────────────────────────────────────────

export const LINE_ITEM_KINDS = ['labour', 'materials', 'callout', 'other'] as const
export type LineItemKind = (typeof LINE_ITEM_KINDS)[number]

export interface QuoteLineItem {
  description: string
  kind: LineItemKind
  quantity: number
  unitPence: Pence
}

export const QUOTE_STATUSES = ['submitted', 'accepted', 'declined', 'withdrawn', 'expired'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export const QUOTE_STATUS_LABELS = {
  submitted: 'Sent',
  accepted: 'Accepted',
  declined: 'Not chosen',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
} as const satisfies Record<QuoteStatus, string>

export interface Quote {
  id: QuoteId
  jobId: JobId
  tradeId: PersonId
  lineItems: QuoteLineItem[]
  /** Totals are worked out by the data layer from the line items, never typed in. */
  subtotalPence: Pence
  vatPence: Pence
  totalPence: Pence
  notes?: string
  earliestStart?: IsoDate
  validUntil: IsoDate
  status: QuoteStatus
  submittedAt: IsoDateTime
  decidedAt?: IsoDateTime
}

/** A trade's reusable quote line, for quick quotes. Private to that trade. */
export interface SavedLineItem {
  id: LineItemId
  tradeId: PersonId
  description: string
  kind: LineItemKind
  unit: 'each' | 'hour' | 'metre'
  unitPence: Pence
}

// ─── Messages ────────────────────────────────────────────────────────────────────────────────

/** The job or tenancy a conversation or rating belongs to. */
export type ContextRef = { kind: 'job'; jobId: JobId } | { kind: 'tenancy'; tenancyId: TenancyId }

export interface ThreadMember {
  personId: PersonId
  role: Role
  /** Set when a letting agent takes part on a landlord's behalf. */
  actingForId?: PersonId
  joinedAt: IsoDateTime
  lastReadAt?: IsoDateTime
  mutedAt?: IsoDateTime
}

export interface Thread {
  id: ThreadId
  context: ContextRef
  title: string
  members: ThreadMember[]
  createdAt: IsoDateTime
  lastMessageAt?: IsoDateTime
}

/** What the role chip on a message shows. Role is never shown by colour alone. */
export interface MessageAuthor {
  personId: PersonId
  role: Role
  /** A letting agent writing for a landlord: the chip reads e.g. "Agent for Graham". */
  actingForId?: PersonId
}

export interface Message {
  id: MessageId
  threadId: ThreadId
  /** Null for system lines such as "Visit booked for Tue 6 Oct, 9am". */
  author: MessageAuthor | null
  /** 'notice' is the written 48-hour notice of a visit. */
  kind: 'text' | 'notice' | 'system'
  body: string
  attachments: Photo[]
  sentAt: IsoDateTime
}

/** Hides a person's messages from the blocker everywhere. Records stay for moderation. */
export interface Block {
  id: BlockId
  blockerId: PersonId
  blockedId: PersonId
  createdAt: IsoDateTime
}

// ─── Documents and compliance ────────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES = [
  'tenancy_agreement',
  'gas_safety',
  'eicr',
  'epc',
  'inventory',
  'smoke_heat_alarms',
  'co_alarms',
  'legionella',
  'landlord_registration',
  'pat',
  'insurance',
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export interface DocumentTypeInfo {
  label: string
  /** How often it must be renewed, or null if it doesn't expire. */
  renewalMonths: number | null
  /** What it belongs to: one home, one tenancy, or the landlord across all their homes. */
  scope: 'property' | 'tenancy' | 'landlord'
  /** 'if_gas' applies only where the property has a gas supply. */
  required: 'yes' | 'if_gas' | 'recommended'
}

// Gas (12 months), EICR (5 years) and landlord registration (3 years) are the SPEC's intervals.
// The alarm, CO and legionella intervals are the reminder cadence we suggest, not statutory terms.
// CO alarms are treated as gas-only because gas is the only fuel-burning appliance we model.
export const DOCUMENT_TYPE_INFO = {
  tenancy_agreement: {
    label: 'Tenancy agreement',
    renewalMonths: null,
    scope: 'tenancy',
    required: 'yes',
  },
  gas_safety: {
    label: 'Gas safety record',
    renewalMonths: 12,
    scope: 'property',
    required: 'if_gas',
  },
  eicr: {
    label: 'Electrical installation condition report (EICR)',
    renewalMonths: 60,
    scope: 'property',
    required: 'yes',
  },
  epc: {
    label: 'Energy performance certificate (EPC)',
    renewalMonths: 120,
    scope: 'property',
    required: 'yes',
  },
  inventory: { label: 'Inventory', renewalMonths: null, scope: 'tenancy', required: 'recommended' },
  smoke_heat_alarms: {
    label: 'Smoke and heat alarms',
    renewalMonths: 12,
    scope: 'property',
    required: 'yes',
  },
  co_alarms: {
    label: 'Carbon monoxide alarms',
    renewalMonths: 12,
    scope: 'property',
    required: 'if_gas',
  },
  legionella: {
    label: 'Legionella risk assessment',
    renewalMonths: 24,
    scope: 'property',
    required: 'yes',
  },
  landlord_registration: {
    label: 'Landlord registration',
    renewalMonths: 36,
    scope: 'landlord',
    required: 'yes',
  },
  pat: {
    label: 'Portable appliance test (PAT)',
    renewalMonths: 60,
    scope: 'property',
    required: 'yes',
  },
  insurance: {
    label: 'Landlord insurance',
    renewalMonths: 12,
    scope: 'property',
    required: 'recommended',
  },
} as const satisfies Record<DocumentType, DocumentTypeInfo>

/**
 * Compliance calendar status, worked out from dates and bookings rather than stored.
 * - EXPIRED: past its expiry date. Wins over BOOKED, because a lapse must never be hidden.
 * - BOOKED: a renewal job is booked before it runs out.
 * - DUE_SOON: expires within LETTING_RULES.documentDueSoonDays (60) and nothing is booked.
 * - OK: valid for longer than that, or never expires.
 * - TO_ARRANGE: required here but nothing is on file.
 */
export const DOCUMENT_STATUSES = ['EXPIRED', 'DUE_SOON', 'BOOKED', 'OK', 'TO_ARRANGE'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]
export const DOCUMENT_STATUS_LABELS = {
  EXPIRED: 'Expired',
  DUE_SOON: 'Due soon',
  BOOKED: 'Booked',
  OK: 'Up to date',
  TO_ARRANGE: 'To arrange',
} as const satisfies Record<DocumentStatus, string>

/** Named DocumentRecord so it never shadows the browser's own Document type. */
export interface DocumentRecord {
  id: DocumentId
  type: DocumentType
  landlordId: PersonId
  /** Null for landlord-wide documents such as landlord registration. */
  propertyId: PropertyId | null
  tenancyId?: TenancyId
  title: string
  file: FileRef
  /** Certificate, registration or policy number. */
  reference?: string
  /** The business named on the certificate. */
  issuedBy?: string
  issuedAt: IsoDate
  expiresAt: IsoDate | null
  /** The job that produced it, e.g. the annual gas safety check. */
  jobId?: JobId
  sharedWithTenant: boolean
  uploadedById: PersonId
  uploadedAt: IsoDateTime
  /** Set when a newer version replaces this one. The old one stays on file. */
  replacedById?: DocumentId
}

/** One row of the landlord's compliance calendar. */
export interface ComplianceItem {
  type: DocumentType
  propertyId: PropertyId | null
  status: DocumentStatus
  /** The current document, if there is one. */
  document?: DocumentRecord
  /** The booked renewal job, if there is one. */
  renewalJobId?: JobId
  bookedFor?: IsoDate
  /** Days until expiry; negative once expired; null if it never expires or isn't on file. */
  daysLeft: number | null
}

// ─── Ratings ─────────────────────────────────────────────────────────────────────────────────

/**
 * - draft: started, not submitted. Seen only by the rater.
 * - sealed: submitted and hidden under its SealRule. Cannot be changed.
 * - revealed: published. Never edited again, except by moderation for obscenity or typos.
 * - restricted: hidden for now while a report is handled, e.g. a defamation notice.
 * - removed: taken down. Scores are recalculated without it.
 */
export const RATING_STATES = ['draft', 'sealed', 'revealed', 'restricted', 'removed'] as const
export type RatingState = (typeof RATING_STATES)[number]

/** The private "would you … again?" answer. Never shown to anyone or scored. */
export type WouldAgain = 'yes' | 'no' | 'not_sure'

export type CriteriaAnswers<D extends RatingDirection = RatingDirection> = Partial<
  Record<CriterionId<D>, ScaleScore>
>

/** A rating as stored. Pass a direction for precise criterion ids, e.g. Rating<'tenant->trade'>. */
export interface Rating<D extends RatingDirection = RatingDirection> {
  id: RatingId
  direction: D
  raterId: PersonId
  subjectId: PersonId
  context: ContextRef
  propertyId: PropertyId
  seal: SealRule
  answers: CriteriaAnswers<D>
  /** Optional, 30 to 1,000 characters, shown as "[Role]'s opinion". */
  comment?: string
  /** Seen only by the rater and moderation. */
  privateNote?: string
  wouldAgain?: WouldAgain
  /** Sends the rating to moderation. It does not change the score. */
  safetyFlag: boolean
  state: RatingState
  createdAt: IsoDateTime
  submittedAt?: IsoDateTime
  /** Last moment to submit. */
  windowClosesAt: IsoDateTime
  /**
   * When it will be revealed if not earlier. Null while it waits on something other than a date:
   * the retaliation shield, or (trade->landlord) the landlord's rating of the trade being locked.
   */
  revealAt: IsoDateTime | null
  revealedAt?: IsoDateTime
  restriction?: { reportId: ReportId; since: IsoDateTime }
  removal?: {
    at: IsoDateTime
    reason: 'report_upheld' | 'expired' | 'moderation'
    reportId?: ReportId
  }
  /** Moderation fixes for obscenity or typos, the only edits ever allowed. */
  corrections: { at: IsoDateTime; reason: 'obscenity' | 'typo' }[]
}

/** The rated person's one public reply (500 characters, within 30 days). */
export interface Reply {
  id: ReplyId
  ratingId: RatingId
  authorId: PersonId
  body: string
  postedAt: IsoDateTime
  state: 'published' | 'removed'
}

/** The reviewer's one dated update. The original rating itself never changes. */
export interface RatingUpdate {
  id: UpdateId
  ratingId: RatingId
  authorId: PersonId
  body: string
  postedAt: IsoDateTime
  state: 'published' | 'removed'
}

/** Shown on the review as "[Role] disputes this". */
export interface DisputeNote {
  id: DisputeId
  ratingId: RatingId
  authorId: PersonId
  createdAt: IsoDateTime
}

/**
 * Topics the comment filter blocks or flags (SPEC §5 rule 7), plus sexual orientation, age and
 * pregnancy, which are protected characteristics under the Equality Act 2010.
 */
export const SENSITIVE_TOPICS = [
  'children',
  'benefits',
  'health',
  'disability',
  'ethnicity',
  'religion',
  'sexual_orientation',
  'age',
  'pregnancy',
  'immigration_status',
  'criminal_allegation',
  'third_party_name',
  'phone_number',
  'email_address',
  'postal_address',
] as const
export type SensitiveTopic = (typeof SENSITIVE_TOPICS)[number]
export const SENSITIVE_TOPIC_LABELS = {
  children: 'children',
  benefits: 'benefits',
  health: 'health',
  disability: 'disability',
  ethnicity: 'ethnicity',
  religion: 'religion',
  sexual_orientation: 'sexual orientation',
  age: 'age',
  pregnancy: 'pregnancy and maternity',
  immigration_status: 'immigration status',
  criminal_allegation: 'accusations of crime',
  third_party_name: "other people's names",
  phone_number: 'phone numbers',
  email_address: 'email addresses',
  postal_address: 'addresses',
} as const satisfies Record<SensitiveTopic, string>

// ─── Reports ─────────────────────────────────────────────────────────────────────────────────

export const REPORT_ROUTES = ['defamation', 'illegal', 'fake', 'data_protection'] as const
export type ReportRoute = (typeof REPORT_ROUTES)[number]

export type ReportStep = 'notify_poster' | 'review' | 'acknowledge'

/** A deadline a report route runs against. */
export interface ClockRule {
  step: ReportStep
  amount: number
  unit: 'hours' | 'working_hours' | 'days' | 'working_days'
  /** 'house_target' is our own service promise, not a legal deadline. */
  source: 'law' | 'house_target'
}

export interface ReportRouteInfo {
  label: string
  basis: string
  clock: ClockRule
}

export const REPORT_ROUTE_INFO = {
  defamation: {
    label: "It's untrue and damages someone's reputation",
    basis: 'Defamation (Operators of Websites) Regulations 2013, England and Wales',
    clock: { step: 'notify_poster', amount: 48, unit: 'working_hours', source: 'law' },
  },
  illegal: {
    label: "It's illegal",
    basis: 'Online Safety Act 2023',
    clock: { step: 'review', amount: 24, unit: 'hours', source: 'house_target' },
  },
  fake: {
    // While this report is open the review carries a "pending" label. No other route does.
    label: 'I think this is a fake review',
    basis: 'CMA rules on fake reviews',
    clock: { step: 'review', amount: 5, unit: 'working_days', source: 'house_target' },
  },
  data_protection: {
    label: "It's about my personal data",
    basis: 'UK GDPR',
    clock: { step: 'acknowledge', amount: 30, unit: 'days', source: 'law' },
  },
} as const satisfies Record<ReportRoute, ReportRouteInfo>

export type ReportTarget =
  | { kind: 'rating'; ratingId: RatingId }
  | { kind: 'reply'; replyId: ReplyId }
  | { kind: 'update'; updateId: UpdateId }
  | { kind: 'message'; messageId: MessageId }
  | { kind: 'person'; personId: PersonId }

export interface ReportClock {
  step: ReportStep
  dueAt: IsoDateTime
  metAt?: IsoDateTime
}

export type ReportStatus = 'received' | 'in_review' | 'resolved'

/** Named ContentReport so it never shadows the browser's Reporting API type. */
export interface ContentReport {
  id: ReportId
  reporterId: PersonId
  target: ReportTarget
  route: ReportRoute
  details: string
  submittedAt: IsoDateTime
  status: ReportStatus
  clocks: ReportClock[]
  /** What the person who posted it said back, e.g. within the defamation process. */
  posterResponse?: { body: string; at: IsoDateTime }
  outcome?: {
    decidedAt: IsoDateTime
    action: 'removed' | 'restricted' | 'kept' | 'answered'
    note: string
  }
}

// ─── Tenant passport ─────────────────────────────────────────────────────────────────────────

/**
 * A link a tenant makes to show their landlord ratings when applying. All or nothing: there is
 * deliberately no way to pick which reviews to include. Every view is logged for the tenant.
 */
export interface PassportShare {
  id: ShareId
  tenantId: PersonId
  /** Unguessable; the link is /passport/<token>. */
  token: string
  /** The tenant's own reminder, e.g. 'For the flat on Union Grove'. */
  label?: string
  createdAt: IsoDateTime
  expiresAt: IsoDateTime
  revokedAt?: IsoDateTime
  views: PassportView[]
}

export interface PassportView {
  viewedAt: IsoDateTime
  /** Set when the viewer was signed in. */
  viewerId?: PersonId
  /** What the tenant sees in the log, e.g. 'Signed-in landlord' or 'Someone with the link'. */
  viewerLabel: string
}

// ─── Notifications and references ────────────────────────────────────────────────────────────

/** The records that screens open and that change events refer to. */
export type EntityKind = Exclude<IdPrefix, 'visit' | 'event' | 'file'>
export type EntityRef = { [K in EntityKind]: { entity: K; id: Id<K> } }[EntityKind]

export type NotificationKind =
  | 'job_reported'
  | 'job_approved'
  | 'job_declined'
  | 'job_cancelled'
  | 'trade_instructed'
  | 'quote_received'
  | 'quote_accepted'
  | 'quote_declined'
  | 'quote_withdrawn'
  | 'visit_booked'
  | 'visit_cancelled'
  | 'job_completed'
  | 'job_confirmed'
  /** An invoice sent, falling overdue or recorded as paid. */
  | 'payment'
  | 'message'
  | 'tenancy_to_confirm'
  | 'tenancy_confirmed'
  | 'rating_open'
  | 'rating_reminder'
  | 'ratings_revealed'
  | 'review_reply'
  | 'review_update'
  | 'review_disputed'
  | 'report_update'
  | 'document_due_soon'
  | 'document_expired'
  | 'passport_viewed'
  | 'verification_checked'
  /** An invitation to a landlord's team, and the agent's answer to it. */
  | 'team_invite'

/** Named NotificationRecord so it never shadows the browser's Notification API. */
export interface NotificationRecord {
  id: NotificationId
  recipientId: PersonId
  /** The portal it belongs to, for people who hold more than one role. */
  role: Role
  kind: NotificationKind
  title: string
  body?: string
  /** In-app path to open, relative to the router basename. */
  href: string
  ref?: EntityRef
  createdAt: IsoDateTime
  readAt?: IsoDateTime
}

// ─── Derived views (worked out by the data layer, never stored) ──────────────────────────────

/** How a reviewer appears: "Verified tenant · AB10 · 2025". Never a name. */
export interface ReviewerLabel {
  role: Role
  postcodeDistrict: PostcodeDistrict
  year: number
}

/** What a review was about, without ids that could identify the reviewer. */
export type ReviewContext =
  | { kind: 'job'; title: string; category: JobCategory; completedAt: IsoDateTime }
  | { kind: 'tenancy'; startDate: IsoDate; endDate: IsoDate | null }

/** A revealed rating as others see it. Private note, would-again and rater id are left out. */
export interface PublicReview {
  ratingId: RatingId
  direction: RatingDirection
  subjectId: PersonId
  propertyId: PropertyId
  reviewer: ReviewerLabel
  context: ReviewContext
  answers: CriteriaAnswers
  /** Mean of the criteria answered, 1 to 5. */
  score: number
  comment?: string
  revealedAt: IsoDateTime
  reply?: Reply
  update?: RatingUpdate
  dispute?: DisputeNote
  /** A suspected-fake report is open, so it shows a "pending" label. */
  pendingFakeCheck: boolean
  corrected: boolean
}

export interface CriterionScore {
  criterionId: CriterionId
  /** Null when nobody has answered it yet. */
  mean: number | null
  count: number
}

/** Everything a headline score shows (SPEC §5 "Headline score"). */
export interface ScoreSummary {
  /** S to full precision (round for display). Null until 3 different people have reviewed. */
  score: number | null
  reviewCount: number
  reviewerCount: number
  /** Reviews by rounded score, for the 5-level bar. */
  distribution: Record<ScaleScore, number>
  criteria: CriterionScore[]
  lastReviewAt: IsoDateTime | null
  /** "Reviewed on X of Y completed jobs"; null where it doesn't apply. */
  coverage: { reviewed: number; completed: number } | null
  /** e.g. "Top 10% in Aberdeen". Only with 20+ peers. */
  relativeBadge: { topPercent: number; area: string } | null
}

export interface LandlordScore extends ScoreSummary {
  /** From "Home matched the advert and was safe at move-in". */
  propertySubScore: number | null
}

/** A trade's Overall is the mean of both halves and is always shown with them. */
export interface TradeScore {
  overall: number | null
  fromLandlords: ScoreSummary
  fromTenants: ScoreSummary
}

/** Trades only: how a landlord is as a client. */
export interface ClientRating {
  summary: ScoreSummary
  /** "Paid on time on X of Y jobs". */
  paidOnTime: { onTime: number; jobs: number }
}

/** One line of the passport, e.g. "Rent on agreed date: Always, from 2 of 2 landlords". */
export interface PassportLine {
  criterionId: CriterionId<'landlord->tenant'>
  /** How many landlords gave each answer. */
  counts: Record<ScaleScore, number>
  landlordCount: number
}

/** The tenant passport: no single number, never public. */
export interface TenantPassport {
  tenantId: PersonId
  landlordCount: number
  lines: PassportLine[]
  reviews: PublicReview[]
}
