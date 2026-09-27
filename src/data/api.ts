// The one door every screen goes through to read or change data. The demo implements SlateApi
// over a local store; a Supabase implementation can replace it later without touching screens.
//
// Every method that acts for someone takes the Viewer first. The demo can show all three portals
// side by side in one page, so "who is asking" cannot be one global session. A backend
// implementation must check the viewer against the signed-in user rather than trust it.
//
// Methods resolve with the fresh record and reject with SlateError when a rule says no, so the
// rules in docs/SPEC.md are enforced here and never only in a screen.

import type { DistanceBand } from '@/domain/places'
import type {
  Agency,
  AgencyId,
  Block,
  ClientRating,
  ComplianceItem,
  ContentReport,
  ContextRef,
  CredentialRequirement,
  CriteriaAnswers,
  DisputeNote,
  DocumentId,
  DocumentRecord,
  DocumentType,
  EntityRef,
  FileRef,
  ImageRef,
  IsoDate,
  IsoDateTime,
  Job,
  JobAccess,
  JobCategory,
  JobId,
  JobStatus,
  LandlordScore,
  LineItemId,
  MembershipId,
  Message,
  Neighbourhood,
  NotificationId,
  NotificationRecord,
  PassportShare,
  PaymentTermsDays,
  Pence,
  PendingVerification,
  Person,
  PersonCard,
  PersonId,
  Photo,
  PostcodeDistrict,
  Property,
  PropertyId,
  PropertyType,
  PublicReview,
  Quote,
  QuoteId,
  QuoteLineItem,
  Rating,
  RatingDirection,
  RatingId,
  RatingUpdate,
  Reply,
  ReportClock,
  ReportId,
  ReportRoute,
  ReportStatus,
  ReportTarget,
  Role,
  Room,
  SavedLineItem,
  SensitiveTopic,
  ShareId,
  TeamMembership,
  TeamPermission,
  Tenancy,
  TenancyId,
  TenancyStatus,
  TenantPassport,
  Thread,
  ThreadId,
  TradeChoiceRoute,
  TradeProfile,
  TradeScore,
  TradeType,
  Urgency,
  VerificationClaim,
  VisitId,
  VisitPurpose,
  WouldAgain,
} from '@/domain/types'

// ─── Who is asking, and how things fail ──────────────────────────────────────────────────────

export interface Viewer {
  personId: PersonId
  /** The portal in use. */
  role: Role
  /** A letting agent working inside this landlord's account (landlord portal only). */
  actingForId?: PersonId
}

export type SlateErrorCode =
  | 'not_found'
  /** The viewer's role or relationship to the record doesn't allow it. */
  | 'forbidden'
  /** The record isn't at a stage where this can happen, e.g. approving a booked job. */
  | 'invalid_state'
  /** Input broke a rule; `fields` says which and why. */
  | 'validation'
  /** A visit with under 48 hours' notice that isn't marked as an emergency. */
  | 'notice_too_short'
  /** Gas or EICR work offered to a trade without the matching checked credential. */
  | 'credential_mismatch'
  /** A rating, reply or update after its deadline. */
  | 'window_closed'
  /** A second reply, update, dispute or rating where only one is allowed. */
  | 'already_done'
  /** A comment mentions a topic the filter blocks. */
  | 'blocked_text'
  /** A passport link or magic link that has expired or been revoked. */
  | 'link_expired'

export class SlateError extends Error {
  readonly code: SlateErrorCode
  /** Messages per input field, in plain British English, ready to show under the field. */
  readonly fields: Partial<Record<string, string>>

  constructor(code: SlateErrorCode, message: string, fields: Partial<Record<string, string>> = {}) {
    super(message)
    this.name = 'SlateError'
    this.code = code
    this.fields = fields
  }
}

// ─── Inputs ──────────────────────────────────────────────────────────────────────────────────

export interface SignUpInput {
  displayName: string
  email: string
  role: Role
  postcodeDistrict: PostcodeDistrict
  /** Slate is for people aged 18 and over; the form can't be sent without this ticked. */
  confirmsAdult: true
  /** Credentials to check. Each becomes a badge, with its check date, once checked. */
  claims: VerificationClaim[]
  tradeProfile?: TradeProfile
}

export type ProfilePatch = Partial<
  Pick<Person, 'displayName' | 'postcodeDistrict' | 'avatarSeed' | 'tradeProfile'>
>

export interface TradeSearch {
  trade?: TradeType
  district?: PostcodeDistrict
  /** Only trades whose checked credentials fit this job, e.g. Gas Safe for the right appliance. */
  forJobId?: JobId
  text?: string
}

export interface InviteAgentInput {
  agencyId: AgencyId
  email: string
  permissions: TeamPermission[]
  propertyIds: PropertyId[]
}

export interface ProposeTenancyInput {
  propertyId: PropertyId
  tenantIds: PersonId[]
  startDate: IsoDate
  rentPencePerMonth: Pence
  rentDueDay: number
  deposit?: Tenancy['deposit']
}

export interface TenancyFilter {
  propertyId?: PropertyId
  status?: TenancyStatus[]
}

export interface JobFilter {
  status?: JobStatus[]
  propertyId?: PropertyId
  tenancyId?: TenancyId
}

export interface CreateJobInput {
  propertyId: PropertyId
  room: Room
  category: JobCategory
  /** Defaults to the category and room, e.g. 'Leak or drip in the kitchen'. */
  title?: string
  description: string
  photos: ImageRef[]
  urgency: Urgency
  access: JobAccess
  /** Set when a landlord books a certificate renewal, e.g. the annual gas safety check. */
  complianceType?: DocumentType
}

export interface ApproveJobInput {
  credentialNeeded?: CredentialRequirement
  note?: string
}

export interface ChooseTradeInput {
  tradeId: PersonId
  /** Picking from the job board happens through acceptQuote instead. */
  route: Exclude<TradeChoiceRoute, 'job_board'>
}

export interface InstructTradeInput {
  /** Shown to the trade with the instruction, e.g. "The key is with the neighbour at 2/1". */
  note?: string
}

export interface AcceptQuoteOptions {
  /** Instruct the trade in the same step ("Accept and instruct"). Both steps show on the job. */
  instruct?: boolean
  /** Sent with the instruction. Only used with `instruct`. */
  note?: string
}

export interface JobBoardFilter {
  categories?: JobCategory[]
  districts?: PostcodeDistrict[]
  /**
   * Only jobs that suit these trades (TRADE_JOB_CATEGORIES). 'mine' uses the viewing trade's own
   * trades from their profile.
   */
  trades?: TradeType[] | 'mine'
  /** How far from the trade's own postcode district, measured between district centres. */
  distance?: DistanceBand
}

export interface SubmitQuoteInput {
  jobId: JobId
  /** Totals are worked out from these, never typed in. */
  lineItems: QuoteLineItem[]
  notes?: string
  earliestStart?: IsoDate
  validUntil: IsoDate
}

export type SavedLineItemInput = Omit<SavedLineItem, 'id' | 'tradeId'>

export interface BookVisitInput {
  purpose: VisitPurpose
  startsAt: IsoDateTime
  endsAt: IsoDateTime
  /** Only emergencies may be booked with less than 48 hours' notice. */
  emergency: boolean
  /** Added to the written notice posted to the tenant on the job thread. */
  note?: string
}

export interface CompleteJobInput {
  finalPricePence?: Pence
  note?: string
  photos: ImageRef[]
  /** Send the invoice at the same time, payable within this many days. */
  invoiceDueInDays?: PaymentTermsDays
}

export interface SendInvoiceInput {
  /** Defaults to the final price given when the work was marked done, or the accepted quote. */
  amountPence?: Pence
  /** 0 means payment is due on the day. */
  dueInDays: PaymentTermsDays
}

export interface SendMessageInput {
  body: string
  attachments?: ImageRef[]
}

export interface DocumentFilter {
  propertyId?: PropertyId
  tenancyId?: TenancyId
  type?: DocumentType
  /** Older versions that have been replaced are left out unless asked for. */
  includeReplaced?: boolean
}

export interface UploadDocumentInput {
  type: DocumentType
  /** Null for landlord-wide documents such as landlord registration. */
  propertyId: PropertyId | null
  tenancyId?: TenancyId
  /** Defaults to the document type's label. */
  title?: string
  file: FileRef
  reference?: string
  issuedBy?: string
  issuedAt: IsoDate
  /** Worked out from DOCUMENT_TYPE_INFO.renewalMonths when left out. */
  expiresAt?: IsoDate | null
  sharedWithTenant: boolean
  /** The document this one replaces. The old one stays on file. */
  replacesId?: DocumentId
  jobId?: JobId
}

/** One person's rating of another on one job or tenancy. Also identifies an existing draft. */
export interface RatingInput<D extends RatingDirection = RatingDirection> {
  direction: D
  context: ContextRef
  subjectId: PersonId
  answers: CriteriaAnswers<D>
  comment?: string
  privateNote?: string
  wouldAgain?: WouldAgain
  safetyFlag?: boolean
}

export interface ReviewQuery {
  direction: RatingDirection
  subjectId: PersonId
  /** Narrow tenant->landlord reviews to one home, for property pages. */
  propertyId?: PropertyId
}

export type LandlordScoreQuery = { landlordId: PersonId } | { propertyId: PropertyId }

export interface ReportInput {
  target: ReportTarget
  route: ReportRoute
  details: string
}

// ─── Views shaped for screens ────────────────────────────────────────────────────────────────

/** A quick sign-in on the front page, e.g. "Try as Sarah". */
export interface Persona {
  personId: PersonId
  role: Role
  name: string
  blurb: string
}

export interface MagicLinkSent {
  sentTo: string
  expiresAt: IsoDateTime
  /** Demo only: the token the on-screen "inbox" opens. A real backend emails it instead. */
  demoToken?: string
}

/** Directory results come back in a neutral order (A to Z): Slate never ranks or recommends. */
export interface TradeListing {
  trade: PersonCard
  score: TradeScore
  saved: boolean
}

export interface TeamMember {
  membership: TeamMembership
  agency: Agency
  agent: PersonCard
  landlord: PersonCard
}

/** A job as trades see it on the board: the area only, never the address, until chosen. */
export interface JobBoardPost {
  jobId: JobId
  title: string
  category: JobCategory
  room: Room
  description: string
  photos: Photo[]
  urgency: Urgency
  neighbourhood: Neighbourhood
  postcodeDistrict: PostcodeDistrict
  credentialNeeded?: CredentialRequirement
  postedAt: IsoDateTime
  closesAt?: IsoDateTime
  quoteCount: number
  /** The viewing trade's own quote, if they have sent one. */
  myQuoteId?: QuoteId
  /** The client, so a trade can look at their client rating (getClientRating) before quoting. */
  landlordId: PersonId
  /** From the trade's own district to the job's, to the nearest half mile; null if unknown. */
  milesAway: number | null
  /** The smallest distance band the job falls in. */
  distanceBand: DistanceBand
  /** The job's district is one the trade says they cover. */
  inServiceArea: boolean
}

export interface ThreadSummary {
  thread: Thread
  lastMessage: Message | null
  unreadCount: number
}

/** A rating the viewer owes, or has written, on one job or tenancy. */
export interface RatingTask {
  direction: RatingDirection
  context: ContextRef
  subjectId: PersonId
  propertyId: PropertyId
  opensAt: IsoDateTime
  closesAt: IsoDateTime
  status: 'to_do' | 'draft' | 'submitted'
  ratingId?: RatingId
  /** Drives "Leave yours to see what they said about you". Never says what they said. */
  counterpartHasRated: boolean
}

/** Something waiting on the viewer, for the "Actions needed" list on each home screen. */
export type ActionItem =
  | { kind: 'approve_job'; jobId: JobId }
  | { kind: 'choose_trade'; jobId: JobId }
  | { kind: 'compare_quotes'; jobId: JobId; quoteCount: number }
  /** Landlords: a quote is accepted but the trade hasn't been told to go ahead yet. */
  | { kind: 'instruct_trade'; jobId: JobId }
  /** Landlords: an invoice to pay. Slate never handles the money; this is a reminder. */
  | { kind: 'pay_invoice'; jobId: JobId; amountPence: Pence; dueOn: IsoDate; overdue: boolean }
  /** Letting agents: a landlord has invited them to their team. */
  | { kind: 'answer_team_invite'; membershipId: MembershipId }
  | { kind: 'send_quote'; jobId: JobId }
  | { kind: 'book_visit'; jobId: JobId }
  /** Trades: work marked done with no invoice sent yet. */
  | { kind: 'send_invoice'; jobId: JobId }
  /** Trades: an invoice past its due date that the landlord hasn't paid. */
  | { kind: 'payment_overdue'; jobId: JobId; amountPence: Pence; daysOverdue: number }
  | { kind: 'confirm_visit'; jobId: JobId; visitId: VisitId }
  | { kind: 'confirm_job'; jobId: JobId }
  | { kind: 'renew_document'; item: ComplianceItem }
  | { kind: 'confirm_tenancy'; tenancyId: TenancyId }
  | { kind: 'leave_rating'; task: RatingTask }

export interface TextIssue {
  topic: SensitiveTopic
  /** 'block' stops submission; 'flag' lets it through for moderation to see. */
  action: 'block' | 'flag'
  /** Character range in the checked text, for highlighting. */
  start: number
  end: number
}

export interface TextCheck {
  blocked: boolean
  issues: TextIssue[]
}

export type SharedPassport =
  | { status: 'ok'; tenant: PersonCard; passport: TenantPassport; expiresAt: IsoDateTime }
  | { status: 'expired' | 'revoked' | 'not_found' }

/** A review page (/{role}/reviews/:ratingId), for whoever may see it. */
export interface ReviewDetail {
  review: PublicReview
  /** The viewer wrote it. */
  mine: boolean
  /** The viewer is the person it's about (a landlord's agent counts as the landlord). */
  aboutMe: boolean
  /** The viewer's own rating, with the private note and would-again answer. Only when mine. */
  rating?: Rating
  /** What the viewer can do here now. Reporting is open to anyone who didn't write it. */
  can: { reply: boolean; dispute: boolean; update: boolean; report: boolean }
  /** The last moment for the one public reply, while the rated person may still reply. */
  replyClosesAt: IsoDateTime | null
}

/** One of a landlord's homes on their public profile: the area, never the address. */
export interface PublicHome {
  propertyId: PropertyId
  neighbourhood: Neighbourhood
  postcodeDistrict: PostcodeDistrict
  type: PropertyType
  bedrooms: number
  /** Reviews of the landlord from tenants of this home, with its property sub-score. */
  score: LandlordScore
}

/** A landlord's public page. */
export interface PublicLandlordProfile {
  landlord: PersonCard
  score: LandlordScore
  /** Revealed tenant reviews, newest first. Per-repair ratings never appear one by one. */
  reviews: PublicReview[]
  homes: PublicHome[]
  /** A checked Scottish landlord registration number. */
  registrationVerified: boolean
  /** "Client rating from trades": only for trades, and for the landlord themselves. */
  clientRating: ClientRating | null
}

/** A trade's public page. */
export interface PublicTradeProfile {
  trade: PersonCard
  score: TradeScore
  /** Revealed reviews, newest first, one list per half of the Overall. */
  fromLandlords: PublicReview[]
  fromTenants: PublicReview[]
  /** Landlords: whether this trade is in their saved trades. */
  saved: boolean
}

/** A report about something the viewer posted. It never says who made the report. */
export interface ReportAboutMe {
  id: ReportId
  target: ReportTarget
  route: ReportRoute
  submittedAt: IsoDateTime
  status: ReportStatus
  clocks: ReportClock[]
  /** What the complaint says. Shared only for defamation, so the poster can answer it. */
  details?: string
  posterResponse?: ContentReport['posterResponse']
  outcome?: ContentReport['outcome']
  /** The one response can still be sent: the report is open and nothing has been sent yet. */
  canRespond: boolean
}

export const AWAY_CATEGORIES = [
  'repairs',
  'quotes',
  'visits',
  'payments',
  'messages',
  'ratings',
  'documents',
  'tenancies',
  'team',
  'reports',
  'passport',
  'account',
] as const
export type AwayCategory = (typeof AWAY_CATEGORIES)[number]

/** One line of "while you were away". Messages on one conversation are rolled into one line. */
export interface AwayItem {
  key: string
  category: AwayCategory
  title: string
  body?: string
  href: string
  /** The latest thing in this line. */
  at: IsoDateTime
  count: number
  unread: boolean
}

/** What happened in this portal since the viewer last looked at its home screen. */
export interface AwayFeed {
  since: IsoDateTime
  /** e.g. "Since Thursday: 2 repair updates, 1 quote update and 3 messages." Null if nothing. */
  summary: string | null
  /** Newest first. */
  items: AwayItem[]
}

/** Fired after any write, from this tab or another, so open screens can refresh. */
export type DataChange = EntityRef & { op: 'created' | 'updated' | 'deleted' }

export type Unsubscribe = () => void

// ─── The interface ───────────────────────────────────────────────────────────────────────────

export interface SlateApi {
  // Sign-in and sign-up. A simulated magic link in the demo; there is never a password field.

  listPersonas(): Promise<Persona[]>
  signInAsPersona(personId: PersonId): Promise<Person>
  requestMagicLink(email: string): Promise<MagicLinkSent>
  /** Rejects with link_expired. */
  completeMagicLink(token: string): Promise<Person>
  /** Sends a magic link to confirm the email; the account exists once completeMagicLink runs. */
  signUp(input: SignUpInput): Promise<MagicLinkSent>
  signOut(): Promise<void>

  // People, credentials and teams

  /** The viewer's own full record, including contact details. */
  getMe(viewer: Viewer): Promise<Person>
  updateMe(viewer: Viewer, patch: ProfilePatch): Promise<Person>
  /** e.g. a landlord who also rents. The new portal appears in the role switcher. */
  addRole(viewer: Viewer, role: Role): Promise<Person>
  requestVerification(viewer: Viewer, claim: VerificationClaim): Promise<PendingVerification>
  getPerson(viewer: Viewer, personId: PersonId): Promise<PersonCard | null>
  getPeople(viewer: Viewer, personIds: PersonId[]): Promise<PersonCard[]>

  searchTrades(viewer: Viewer, search: TradeSearch): Promise<TradeListing[]>
  listSavedTrades(viewer: Viewer): Promise<TradeListing[]>
  setTradeSaved(viewer: Viewer, tradeId: PersonId, saved: boolean): Promise<void>

  /** Trades: reusable lines for quick quotes. */
  listSavedLineItems(viewer: Viewer): Promise<SavedLineItem[]>
  saveLineItem(viewer: Viewer, item: SavedLineItemInput): Promise<SavedLineItem>
  deleteSavedLineItem(viewer: Viewer, itemId: LineItemId): Promise<void>

  /** Landlords see their agents; agents see the landlords they work for, invites included. */
  listTeam(viewer: Viewer): Promise<TeamMember[]>
  inviteAgent(viewer: Viewer, input: InviteAgentInput): Promise<TeamMembership>
  /** The invited agent says yes. They can act for the landlord from now on. Tells the landlord. */
  acceptTeamInvite(viewer: Viewer, membershipId: MembershipId): Promise<TeamMembership>
  /** The invited agent says no. They're taken off the homes. Tells the landlord. */
  declineTeamInvite(viewer: Viewer, membershipId: MembershipId): Promise<TeamMembership>
  endTeamMembership(viewer: Viewer, membershipId: MembershipId): Promise<TeamMembership>

  /** A landlord's public page: score, reviews and homes (area only). Null if not a landlord. */
  getLandlordProfile(viewer: Viewer, landlordId: PersonId): Promise<PublicLandlordProfile | null>
  /** A trade's public page: both halves of the score and their reviews. Null if not a trade. */
  getTradeProfile(viewer: Viewer, tradeId: PersonId): Promise<PublicTradeProfile | null>

  // Properties and tenancies

  /** Landlords: their own (or, for agents, the landlord's). Tenants: where they live or lived. */
  listProperties(viewer: Viewer): Promise<Property[]>
  getProperty(viewer: Viewer, propertyId: PropertyId): Promise<Property | null>
  listTenancies(viewer: Viewer, filter?: TenancyFilter): Promise<Tenancy[]>
  getTenancy(viewer: Viewer, tenancyId: TenancyId): Promise<Tenancy | null>
  proposeTenancy(viewer: Viewer, input: ProposeTenancyInput): Promise<Tenancy>
  /** Each side confirms; status becomes confirmed once the landlord and every tenant have. */
  confirmTenancy(viewer: Viewer, tenancyId: TenancyId): Promise<Tenancy>
  /** Opens the 28-day end-of-tenancy rating window for both sides. */
  endTenancy(viewer: Viewer, tenancyId: TenancyId, endDate: IsoDate): Promise<Tenancy>

  // Repair jobs, from report to confirmation

  /**
   * Tenants: their reports. Landlords: jobs on their homes. Trades: jobs they're instructed on.
   * Each side sees what's theirs to see: tenants never see prices or invoices, and a trade never
   * sees other trades' quotes on the timeline.
   */
  listJobs(viewer: Viewer, filter?: JobFilter): Promise<Job[]>
  /** The job page for any side, shaped as listJobs describes. Null if it isn't theirs. */
  getJob(viewer: Viewer, jobId: JobId): Promise<Job | null>
  /** A tenant reporting a problem, or a landlord raising a job themselves. */
  createJob(viewer: Viewer, input: CreateJobInput): Promise<Job>
  addJobPhotos(viewer: Viewer, jobId: JobId, photos: ImageRef[]): Promise<Job>
  approveJob(viewer: Viewer, jobId: JobId, input?: ApproveJobInput): Promise<Job>
  declineJob(viewer: Viewer, jobId: JobId, reason: string): Promise<Job>
  /**
   * The tenant who reported it, or the landlord, calls the job off before the work starts, with a
   * reason. Any booked visit is cancelled, open quotes are closed, the reason goes on the job
   * thread, and everyone involved is told, including trades who quoted.
   */
  cancelJob(viewer: Viewer, jobId: JobId, reason: string): Promise<Job>
  /**
   * The landlord or their agent chooses a trade from their saved trades or the directory, to
   * quote (then instructTrade gives the go-ahead). Only they can: Slate never assigns, matches or
   * dispatches. Rejects with credential_mismatch for gas or EICR work without the right badge.
   */
  chooseTrade(viewer: Viewer, jobId: JobId, input: ChooseTradeInput): Promise<Job>
  /**
   * The landlord's explicit go-ahead to the trade they chose, once a quote is accepted (or, in an
   * emergency, without one). The job moves to 'instructed' and only then can the work be booked,
   * so the timeline always shows the landlord chose. Tells the trade and the tenant.
   */
  instructTrade(viewer: Viewer, jobId: JobId, input?: InstructTradeInput): Promise<Job>
  postToJobBoard(viewer: Viewer, jobId: JobId, closesAt?: IsoDateTime): Promise<Job>
  /**
   * Open jobs on the board a trade may quote for, newest first. Filter by the trade's kind of
   * work and how far away the job is; nothing is ranked or recommended.
   */
  listJobBoard(viewer: Viewer, filter?: JobBoardFilter): Promise<JobBoardPost[]>
  getJobBoardPost(viewer: Viewer, jobId: JobId): Promise<JobBoardPost | null>

  submitQuote(viewer: Viewer, input: SubmitQuoteInput): Promise<Quote>
  /** A trade takes back a quote still waiting for an answer. The landlord is told. */
  withdrawQuote(viewer: Viewer, quoteId: QuoteId, reason?: string): Promise<Quote>
  /** Landlords see every quote on the job; a trade sees only their own. */
  listQuotes(viewer: Viewer, jobId: JobId): Promise<Quote[]>
  /**
   * Chooses that trade and marks the other quotes on the job as not chosen. The trade is then
   * instructed with instructTrade, or in the same step with `{ instruct: true }`.
   */
  acceptQuote(viewer: Viewer, quoteId: QuoteId, options?: AcceptQuoteOptions): Promise<Job>
  declineQuote(viewer: Viewer, quoteId: QuoteId): Promise<Quote>

  /**
   * Books a visit and posts the written notice to the tenant on the job thread, recording it on
   * the visit. Rejects with notice_too_short under 48 hours unless it's an emergency.
   */
  bookVisit(viewer: Viewer, jobId: JobId, input: BookVisitInput): Promise<Job>
  cancelVisit(viewer: Viewer, jobId: JobId, visitId: VisitId, reason: string): Promise<Job>
  /** The trade arrives: the job moves to in progress. */
  startVisit(viewer: Viewer, jobId: JobId, visitId: VisitId): Promise<Job>
  recordNoAccess(viewer: Viewer, jobId: JobId, visitId: VisitId, note?: string): Promise<Job>
  /** The trade marks the work done. Opens trade->landlord and the tenant's per-repair rating. */
  markComplete(viewer: Viewer, jobId: JobId, input: CompleteJobInput): Promise<Job>
  /** The tenant confirms the visit happened. Opens tenant->trade. */
  confirmVisit(viewer: Viewer, jobId: JobId, visitId: VisitId): Promise<Job>
  /** The landlord confirms the job is complete. Opens landlord->trade. */
  confirmJob(viewer: Viewer, jobId: JobId): Promise<Job>
  /** The trade sends their invoice for finished work. Slate never takes or holds the money. */
  sendInvoice(viewer: Viewer, jobId: JobId, input: SendInvoiceInput): Promise<Job>
  /** The landlord says they've paid, or the trade says the money arrived. Tells the other side. */
  recordPayment(viewer: Viewer, jobId: JobId): Promise<Job>

  // Messages

  listThreads(viewer: Viewer): Promise<ThreadSummary[]>
  getThread(viewer: Viewer, threadId: ThreadId): Promise<Thread | null>
  /** The thread for a job or tenancy, created the first time it's asked for. */
  getThreadFor(viewer: Viewer, context: ContextRef): Promise<Thread>
  /** Oldest first. Messages from people the viewer has blocked are left out. */
  listMessages(viewer: Viewer, threadId: ThreadId): Promise<Message[]>
  sendMessage(viewer: Viewer, threadId: ThreadId, input: SendMessageInput): Promise<Message>
  /** Marks everything in it as read, and its message notifications with it. */
  markThreadRead(viewer: Viewer, threadId: ThreadId): Promise<void>
  setThreadMuted(viewer: Viewer, threadId: ThreadId, muted: boolean): Promise<void>
  listBlocks(viewer: Viewer): Promise<Block[]>
  setBlocked(viewer: Viewer, personId: PersonId, blocked: boolean): Promise<void>

  // Documents and the compliance calendar

  /** Tenants see only documents shared with them on their current tenancy. */
  listDocuments(viewer: Viewer, filter?: DocumentFilter): Promise<DocumentRecord[]>
  getDocument(viewer: Viewer, documentId: DocumentId): Promise<DocumentRecord | null>
  uploadDocument(viewer: Viewer, input: UploadDocumentInput): Promise<DocumentRecord>
  setDocumentShared(
    viewer: Viewer,
    documentId: DocumentId,
    sharedWithTenant: boolean,
  ): Promise<DocumentRecord>
  /** Every required and recommended item per home, most urgent first. */
  getComplianceCalendar(viewer: Viewer, propertyId?: PropertyId): Promise<ComplianceItem[]>

  // Ratings

  listRatingTasks(viewer: Viewer): Promise<RatingTask[]>
  /** Ratings the viewer has written, including sealed ones, with private fields. */
  listMyRatings(viewer: Viewer): Promise<Rating[]>
  /**
   * One of the viewer's own ratings, drafts and sealed ones included. Null for anyone else's:
   * other people's reviews come through getReview and listReviews, which never say who wrote them.
   */
  getRating(viewer: Viewer, ratingId: RatingId): Promise<Rating | null>
  /**
   * A review page: the revealed review as the viewer may see it, and what they can do there
   * (reply, dispute, add an update, report). Null if they may not see it.
   */
  getReview(viewer: Viewer, ratingId: RatingId): Promise<ReviewDetail | null>
  saveRatingDraft<D extends RatingDirection>(
    viewer: Viewer,
    input: RatingInput<D>,
  ): Promise<Rating<D>>
  /**
   * Seals the rating; it can't be changed afterwards. Rejects with validation if a criterion is
   * missing, blocked_text for a blocked topic, window_closed after the deadline.
   */
  submitRating<D extends RatingDirection>(viewer: Viewer, input: RatingInput<D>): Promise<Rating<D>>
  /** Runs the comment filter as the person types. */
  checkText(text: string): Promise<TextCheck>

  /**
   * Revealed reviews the viewer may see under that relationship's visibility rules. Ratings held
   * by the retaliation shield never appear one by one; they only count inside scores.
   */
  listReviews(viewer: Viewer, query: ReviewQuery): Promise<PublicReview[]>
  getLandlordScore(viewer: Viewer, query: LandlordScoreQuery): Promise<LandlordScore>
  getTradeScore(viewer: Viewer, tradeId: PersonId): Promise<TradeScore>
  /** Trades, and the landlord themselves, only. */
  getClientRating(viewer: Viewer, landlordId: PersonId): Promise<ClientRating>
  /**
   * Landlords only: the one trade->tenant answer they may see, access given yes or no.
   * Null until that rating is revealed.
   */
  getAccessGiven(viewer: Viewer, jobId: JobId): Promise<boolean | null>

  /** The rated person's one public reply: 500 characters, within 30 days of the reveal. */
  replyToReview(viewer: Viewer, ratingId: RatingId, body: string): Promise<Reply>
  /** The reviewer's one dated update. The rating itself never changes. */
  addReviewUpdate(viewer: Viewer, ratingId: RatingId, body: string): Promise<RatingUpdate>
  /** Adds the visible "[Role] disputes this" note. */
  disputeReview(viewer: Viewer, ratingId: RatingId): Promise<DisputeNote>

  // Tenant passport

  getMyPassport(viewer: Viewer): Promise<TenantPassport>
  /** A 30-day, all-or-nothing link. */
  createPassportShare(viewer: Viewer, label?: string): Promise<PassportShare>
  listPassportShares(viewer: Viewer): Promise<PassportShare[]>
  revokePassportShare(viewer: Viewer, shareId: ShareId): Promise<PassportShare>
  /** Opening a link needs no account. Every open is logged on the share for the tenant. */
  openPassportShare(token: string, viewerId?: PersonId): Promise<SharedPassport>

  // Reports: the button on every review, reply, update, message and profile

  /** Starts the route's clock, e.g. 48 working hours to notify the poster for defamation. */
  submitReport(viewer: Viewer, input: ReportInput): Promise<ContentReport>
  listMyReports(viewer: Viewer): Promise<ContentReport[]>
  /** Reports about the viewer's own reviews, replies, updates and messages. Never says by whom. */
  listReportsAboutMe(viewer: Viewer): Promise<ReportAboutMe[]>
  /** The poster's one response to a report about something they wrote (up to 1,000 characters). */
  respondToReport(viewer: Viewer, reportId: ReportId, body: string): Promise<ReportAboutMe>

  // Home screens and notifications

  /** What's waiting on the viewer in this portal, most pressing first. */
  listActionsNeeded(viewer: Viewer): Promise<ActionItem[]>
  listNotifications(viewer: Viewer, unreadOnly?: boolean): Promise<NotificationRecord[]>
  markNotificationsRead(viewer: Viewer, ids: NotificationId[] | 'all'): Promise<void>
  /**
   * "While you were away": what happened in this portal since the viewer last looked at its home
   * screen (markAwaySeen), or since `since`. The first time, the last week.
   */
  getAwayFeed(viewer: Viewer, since?: IsoDateTime): Promise<AwayFeed>
  /**
   * Remembers that the viewer has now seen this portal's home screen. It empties the feed, so a
   * screen reads the feed first and keeps it, then marks it seen (on leaving, say).
   */
  markAwaySeen(viewer: Viewer): Promise<void>

  // Live updates across portals and browser tabs

  subscribe(listener: (change: DataChange) => void): Unsubscribe
}

/** A jump of the demo clock and the ratings it revealed or released. */
export interface ClockJump {
  from: IsoDateTime
  to: IsoDateTime
  /** Double-blind ratings revealed, or shielded ones released into a landlord's score. */
  ratingIds: RatingId[]
}

/** Demo-only controls. Kept out of SlateApi because a real backend has no fake clock. */
export interface DemoControls {
  /** Put every record back to the seed data. */
  reset(): Promise<void>
  /** The demo's "now". Rating windows and certificate dates are measured from it. */
  now(): IsoDateTime
  /** Move the clock on so windows close and reveals happen on cue, e.g. 14 days. */
  advanceClock(days: number): Promise<void>
  /**
   * When sealed double-blind ratings will next be revealed (all on one job or tenancy, or on
   * `context`), without moving the clock. Null if nothing sealed has a date yet.
   */
  nextReveal(context?: ContextRef): Promise<{ at: IsoDateTime; context: ContextRef } | null>
  /** Moves the clock to that moment, so the sealed pair is revealed together, on cue. */
  advanceToNextReveal(context?: ContextRef): Promise<ClockJump | null>
  /** Moves the clock to the next 1st of the month, when the retaliation shield releases a batch. */
  advanceToShieldRelease(): Promise<ClockJump>
  /**
   * Finishes one person's pending credential checks now, as if their day of checking had passed.
   * The sign-up welcome screen calls it once its sped-up checks have played out, so the badges it
   * shows as checked are checked in the portal too.
   */
  completeChecks(personId: PersonId): Promise<void>
}
