// The numbers behind the rating rules in SPEC §5 and §6. The engine reads every threshold from
// here, so they can be tuned in one place. tests/rating/config.test.ts checks they still agree
// with RATING_RULES and the windows in criteria.ts, which screens read.

import { LETTING_RULES } from '@/domain/types'

export const RATING_CONFIG = {
  /** How long each rating window stays open, in days. */
  windowDays: {
    /** Repair jobs: landlord->trade, tenant->trade, trade->tenant and the per-repair rating. */
    job: 14,
    /** End of tenancy, both ways. */
    tenancy: 28,
    /** Trade->landlord runs longer, so the trade can judge whether they were paid. */
    tradeRatesLandlord: 30,
  },
  /** Days after a window opens when everyone still owing a rating gets the same reminder. */
  reminderDays: [3, 10],
  /** No score until this many reviews from this many different people. */
  minReviewsForScore: 3,
  minDistinctRatersForScore: 3,
  /** The retaliation shield lifts once a landlord has this many different tenant raters. */
  shieldReleaseTenantRaters: 5,
  /**
   * Once the shield has lifted, held ratings join the landlord's score only in batches: at the
   * start of this day of each month, and only when at least this many different tenants' ratings
   * are waiting, so nobody can work out one tenant's answers by comparing the score before and
   * after. A tenant's own ratings are also released when their tenancy's end-of-tenancy ratings
   * are revealed.
   */
  shieldBatch: { dayOfMonth: 1, minTenants: 2 },
  /** Reviews stop counting, and are deleted, this many months after they were written. */
  retentionMonths: 36,
  /** Recency weight w = 0.5^(age in months / half-life). */
  recencyHalfLifeMonths: 12,
  /** S = (priorWeight·m + Σw·r) / (priorWeight + Σw). */
  priorWeight: 3,
  /** m, the platform mean for a direction, starts here. */
  startingPlatformMean: 4,
  /** m is the mean of the reviews written in this many months up to now. */
  platformMeanWindowMonths: 12,
  /**
   * m stays at the starting value until the window holds this many reviews in that direction,
   * so a handful of early reviews can't pull every new profile up or down.
   */
  platformMeanMinReviews: 20,
  /**
   * Verbal labels for a headline score, checked against the score rounded to one decimal so the
   * words always agree with the number shown. Each band runs half a point either side of a point
   * on the judgement scale, whose wording in criteria.ts becomes the label.
   */
  labelBands: [
    { from: 4.5, scalePoint: 5 },
    { from: 3.5, scalePoint: 4 },
    { from: 2.5, scalePoint: 3 },
    { from: 1.5, scalePoint: 2 },
    { from: 1, scalePoint: 1 },
  ],
  /** The optional public comment on a rating. */
  comment: { minLength: 30, maxLength: 1000 },
  /** SPEC sets no limit on the private note; this keeps it to the size of a comment. */
  privateNoteMaxLength: 1000,
  /** The rated person's one public reply. */
  reply: { maxLength: 500, withinDays: 30 },
  /** The reviewer's one dated update. SPEC gives no limits, so it follows the comment rules. */
  update: { minLength: 30, maxLength: 1000 },
  /**
   * Moderation may only mask obscenity or fix typos (SPEC §6). Masking swaps letters for these
   * characters. A typo fix changes a word of up to 4 letters by 1 edit, a longer word by 2, and
   * no more than 2 words or a tenth of them, whichever is more.
   */
  correction: {
    maskCharacters: ['*'],
    typo: {
      shortWordMaxLength: 4,
      maxEditsPerShortWord: 1,
      maxEditsPerWord: 2,
      minWordsChangeable: 2,
      maxShareOfWordsChanged: 0.1,
    },
  },
  /** "Top 10% in Aberdeen" needs this many other peers, and only these bands are ever shown. */
  relativeBadge: { minPeers: 20, bandsPercent: [5, 10, 25] },
  passportShareDays: LETTING_RULES.passportShareDays,
  /** "Paid on time on X of Y jobs" counts a job as on time only when the answer is Always (5). */
  paidOnTimeMinScore: 5,
  /** The landlord's yes/no view of "Access given": Partly (3) counts as yes, No (1) as no. */
  accessGivenMinScore: 3,
} as const
