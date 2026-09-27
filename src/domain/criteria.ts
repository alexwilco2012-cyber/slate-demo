// The six rating relationships from SPEC §5, as data. Rating forms, score bars and passport lines
// are all built from this table, so the wording, scales and windows live in one place.
// This module imports nothing from the rest of the domain, so types.ts can derive from it.

/** Who rates whom, always written `rater->subject`. */
export const RATING_DIRECTIONS = [
  'tenant->landlord',
  'landlord->tenant',
  'landlord->trade',
  'trade->landlord',
  'tenant->trade',
  'trade->tenant',
] as const
export type RatingDirection = (typeof RATING_DIRECTIONS)[number]

/** Every answer is stored as a score from 1 to 5, whatever words the scale shows. */
export type ScaleScore = 1 | 2 | 3 | 4 | 5

export type ScaleId = 'judgement' | 'frequency' | 'yesPartlyNo'

export interface ScalePoint {
  readonly score: ScaleScore
  readonly label: string
}

/** Plain-words scales, never stars (SPEC §5 rule 5). Points are listed in the order shown. */
export const SCALES = {
  judgement: [
    { score: 1, label: 'Well below' },
    { score: 2, label: 'Below' },
    { score: 3, label: 'What I expected' },
    { score: 4, label: 'Better than expected' },
    { score: 5, label: 'Outstanding' },
  ],
  frequency: [
    { score: 1, label: 'Never' },
    { score: 2, label: 'Rarely' },
    { score: 3, label: 'Sometimes' },
    { score: 4, label: 'Mostly' },
    { score: 5, label: 'Always' },
  ],
  // Scored 5/3/1 so a Yes/Partly/No answer sits in the same 1-5 mean as the other scales.
  yesPartlyNo: [
    { score: 5, label: 'Yes' },
    { score: 3, label: 'Partly' },
    { score: 1, label: 'No' },
  ],
} as const satisfies Record<ScaleId, readonly ScalePoint[]>

export interface CriterionDef {
  readonly id: string
  /** The wording shown when rating, as agreed in the SPEC table. */
  readonly label: string
  /** Shorter wording for score bars and passport lines. */
  readonly short: string
  readonly scale: ScaleId
  /** Tenant->landlord only: also asked after each repair, sealed by the retaliation shield. */
  readonly afterEachRepair?: boolean
  /** Tenant->landlord only: feeds the property sub-score shown on property pages. */
  readonly propertySubScore?: boolean
  /** Trade->tenant only: the one answer the landlord may see, reduced to yes or no. */
  readonly landlordSeesAsYesNo?: boolean
}

/**
 * How a sealed rating is released.
 * - double_blind: everything owed on the job or tenancy is revealed together once every party
 *   has submitted or the window closes (SPEC §5 rule 2).
 * - retaliation_shield: a tenant's per-repair rating of their current landlord is only ever
 *   released inside an aggregate, at tenancy end or once the landlord has 5+ distinct tenant
 *   raters (SPEC §5 rule 4). It is never shown on its own.
 */
export type SealRule = 'double_blind' | 'retaliation_shield'

/** The event that opens a rating window. */
export type RatingTrigger =
  'tenancy_ended' | 'job_completed' | 'job_confirmed' | 'visit_confirmed' | 'visit_happened'

/** One moment at which a rating becomes owed. Most relationships have exactly one. */
export interface RatingOccasion {
  readonly context: 'job' | 'tenancy'
  readonly opensOn: RatingTrigger
  readonly windowDays: number
  readonly seal: SealRule
  /** Ask only the criteria marked `afterEachRepair`. */
  readonly repairCriteriaOnly?: boolean
}

export type RatingVisibility =
  /** Anyone signed in, on profile and property pages. */
  | 'public'
  /** Never public. The tenant sees everything and may share an all-or-nothing link. */
  | 'tenant_passport'
  /** Trades see it on the landlord's client profile; the landlord sees their own. */
  | 'trades_only'
  /** Only the person rated. Safety flags still go to moderation. */
  | 'subject_only'

export type RatingHeadline =
  /** Score, property sub-score and "Registration verified" badge. */
  | 'landlord_score'
  /** No single number: counts per criterion, e.g. "Rent on agreed date: Always, from 2 of 2 landlords". */
  | 'tenant_passport'
  /** The "From landlords" half of a trade's Overall. */
  | 'trade_from_landlords'
  /** "Client rating from trades" plus "Paid on time on X of Y jobs". */
  | 'client_rating'
  /** The "From tenants" half of a trade's Overall. */
  | 'trade_from_tenants'
  | 'none'

export interface RelationshipDef {
  readonly title: string
  readonly criteria: readonly CriterionDef[]
  readonly occasions: readonly RatingOccasion[]
  readonly visibility: RatingVisibility
  readonly headline: RatingHeadline
  /** Private question, never shown or scored (SPEC §5 rule 6). */
  readonly wouldAgainQuestion: string
  /** Stay hidden until the rating in this other direction on the same job is locked. */
  readonly showAfterLocked?: RatingDirection
}

export const RELATIONSHIPS = {
  'tenant->landlord': {
    title: 'Tenant rates landlord',
    criteria: [
      {
        id: 'fixed_quickly',
        label: 'Fixed problems quickly',
        short: 'Fixes problems quickly',
        scale: 'judgement',
        afterEachRepair: true,
      },
      {
        id: 'kept_informed',
        label: 'Easy to reach, kept me informed',
        short: 'Easy to reach',
        scale: 'judgement',
        afterEachRepair: true,
      },
      {
        id: 'home_as_advertised',
        label: 'Home matched the advert and was safe at move-in',
        short: 'Home as advertised',
        scale: 'judgement',
        propertySubScore: true,
      },
      {
        id: 'proper_notice',
        label: 'Gave proper notice before visits',
        short: 'Notice before visits',
        scale: 'frequency',
      },
      {
        id: 'fair_about_money',
        label: 'Fair about money',
        short: 'Fair about money',
        scale: 'judgement',
      },
    ],
    occasions: [
      { context: 'tenancy', opensOn: 'tenancy_ended', windowDays: 28, seal: 'double_blind' },
      {
        context: 'job',
        opensOn: 'job_completed',
        windowDays: 14,
        seal: 'retaliation_shield',
        repairCriteriaOnly: true,
      },
    ],
    visibility: 'public',
    headline: 'landlord_score',
    wouldAgainQuestion: 'Would you rent from them again?',
  },
  'landlord->tenant': {
    title: 'Landlord rates tenant',
    criteria: [
      {
        id: 'rent_on_time',
        label: 'Paid rent on the agreed date',
        short: 'Rent on agreed date',
        scale: 'frequency',
      },
      {
        id: 'looked_after_home',
        label: 'Looked after the home',
        short: 'Looked after the home',
        scale: 'judgement',
      },
      { id: 'easy_to_reach', label: 'Easy to reach', short: 'Easy to reach', scale: 'judgement' },
      {
        id: 'allowed_access',
        label: 'Allowed access with proper notice',
        short: 'Allowed access',
        scale: 'frequency',
      },
      {
        id: 'left_as_expected',
        label: 'Left the home as expected',
        short: 'Left the home as expected',
        scale: 'judgement',
      },
    ],
    occasions: [
      { context: 'tenancy', opensOn: 'tenancy_ended', windowDays: 28, seal: 'double_blind' },
    ],
    visibility: 'tenant_passport',
    headline: 'tenant_passport',
    wouldAgainQuestion: 'Would you rent to them again?',
  },
  'landlord->trade': {
    title: 'Landlord rates trade',
    criteria: [
      {
        id: 'properly_fixed',
        label: 'Problem properly fixed',
        short: 'Properly fixed',
        scale: 'judgement',
      },
      {
        id: 'price_matched_quote',
        label: 'Final price matched the quote',
        short: 'Price matched quote',
        scale: 'judgement',
      },
      {
        id: 'on_time',
        label: 'Turned up and finished when agreed',
        short: 'On time',
        scale: 'judgement',
      },
      {
        id: 'kept_updated',
        label: 'Kept me updated',
        short: 'Kept me updated',
        scale: 'judgement',
      },
      { id: 'right_paperwork', label: 'Right paperwork', short: 'Paperwork', scale: 'judgement' },
    ],
    occasions: [{ context: 'job', opensOn: 'job_confirmed', windowDays: 14, seal: 'double_blind' }],
    visibility: 'public',
    headline: 'trade_from_landlords',
    wouldAgainQuestion: 'Would you work with them again?',
  },
  'trade->landlord': {
    title: 'Trade rates landlord',
    criteria: [
      {
        id: 'clear_description',
        label: 'Clear job description',
        short: 'Clear job description',
        scale: 'judgement',
      },
      { id: 'paid_on_time', label: 'Paid on time', short: 'Paid on time', scale: 'frequency' },
      {
        id: 'arranged_access',
        label: 'Arranged access and told the tenant',
        short: 'Arranged access',
        scale: 'judgement',
      },
      {
        id: 'fair_to_deal_with',
        label: 'Fair and easy to deal with',
        short: 'Fair and easy to deal with',
        scale: 'judgement',
      },
    ],
    // 30 days so the trade can judge whether they were paid.
    occasions: [{ context: 'job', opensOn: 'job_completed', windowDays: 30, seal: 'double_blind' }],
    visibility: 'trades_only',
    headline: 'client_rating',
    wouldAgainQuestion: 'Would you work with them again?',
    showAfterLocked: 'landlord->trade',
  },
  'tenant->trade': {
    title: 'Tenant rates trade',
    criteria: [
      { id: 'turned_up', label: 'Turned up when agreed', short: 'On time', scale: 'judgement' },
      {
        id: 'respectful',
        label: 'Polite and respectful in my home',
        short: 'Polite and respectful',
        scale: 'judgement',
      },
      {
        id: 'left_tidy',
        label: 'Left it clean and tidy',
        short: 'Left it tidy',
        scale: 'judgement',
      },
      {
        id: 'problem_fixed',
        label: 'Is the problem fixed?',
        short: 'Problem fixed',
        scale: 'yesPartlyNo',
      },
    ],
    occasions: [
      { context: 'job', opensOn: 'visit_confirmed', windowDays: 14, seal: 'double_blind' },
    ],
    visibility: 'public',
    headline: 'trade_from_tenants',
    wouldAgainQuestion: 'Would you work with them again?',
  },
  'trade->tenant': {
    title: 'Trade rates tenant',
    criteria: [
      {
        id: 'access_given',
        label: 'Access given as arranged',
        short: 'Access given',
        scale: 'yesPartlyNo',
        landlordSeesAsYesNo: true,
      },
      {
        id: 'felt_safe',
        label: 'I felt safe and was treated with respect',
        short: 'Felt safe and respected',
        scale: 'yesPartlyNo',
      },
      {
        id: 'clear_information',
        label: 'Gave clear information about the problem',
        short: 'Clear information',
        scale: 'judgement',
      },
    ],
    occasions: [
      { context: 'job', opensOn: 'visit_happened', windowDays: 14, seal: 'double_blind' },
    ],
    visibility: 'subject_only',
    headline: 'none',
    wouldAgainQuestion: 'Would you work with them again?',
  },
} as const satisfies Record<RatingDirection, RelationshipDef>

/** Criterion ids for one direction, or for all of them when no direction is given. */
export type CriterionId<D extends RatingDirection = RatingDirection> =
  (typeof RELATIONSHIPS)[D]['criteria'][number]['id']

/** The questions owed on one occasion: tenant->landlord after a repair asks only the first two. */
export function criteriaFor(
  direction: RatingDirection,
  context: RatingOccasion['context'],
): readonly CriterionDef[] {
  const relationship: RelationshipDef = RELATIONSHIPS[direction]
  const occasion = relationship.occasions.find((o) => o.context === context)
  if (!occasion) return []
  return occasion.repairCriteriaOnly
    ? relationship.criteria.filter((c) => c.afterEachRepair)
    : relationship.criteria
}

/** The numbers behind SPEC §5, kept together so they can be tuned without hunting. */
export const RATING_RULES = {
  /** Days after a window opens when every party still owing a rating is reminded, equally. */
  reminderDays: [3, 10],
  commentLength: { min: 30, max: 1000 },
  /** One public reply per review, from the person rated. */
  reply: { maxLength: 500, withinDays: 30 },
  /** Below this many different reviewers, show "New · N verified reviews" instead of a score. */
  minReviewersForScore: 3,
  /** The retaliation shield lifts once a landlord has this many distinct tenant raters. */
  shieldReleaseTenantRaters: 5,
  /**
   * After that, held ratings are released on this day of each month, several at a time: only
   * when at least this many different tenants' ratings are waiting.
   */
  shieldReleaseDayOfMonth: 1,
  shieldBatchMinTenants: 2,
  /** Reviews stop counting and are deleted after this long. */
  retentionMonths: 36,
  /** Recency weight w = 0.5^(age in months / half-life). */
  recencyHalfLifeMonths: 12,
  /** S = (priorWeight·m + Σw·r) / (priorWeight + Σw). */
  priorWeight: 3,
  /** Platform mean m for a direction before there is 12 months of data. */
  startingPlatformMean: 4,
  platformMeanWindowMonths: 12,
  /** Relative badges such as "Top 10% in Aberdeen" need at least this many peers. */
  relativeBadgeMinPeers: 20,
} as const
