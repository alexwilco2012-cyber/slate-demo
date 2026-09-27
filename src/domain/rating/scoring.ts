// Headline scores (SPEC §5 "Headline score"). Worked out from the ratings on every read, so a
// removal, a restriction or a review reaching 36 months changes the score the next time it is
// asked for, with nothing to recalculate by hand.
//
// - Per review, r = the mean of the criteria answered (1 to 5).
// - Recency weight w = 0.5^(age in months / 12), and 0 from 36 months, when the review is deleted.
// - S = (3·m + Σ w·r) / (3 + Σ w), where m is the platform mean for that direction. Three
//   phantom reviews at the platform mean keep a newcomer's first reviews from swinging the score.
// - No score until 3 reviews from 3 different people.
//
// Only ratings that count are used: revealed ones, plus per-repair ratings the retaliation shield
// has released into the landlord's aggregate. Sealed, restricted, removed and expired ratings
// never count. Released per-repair ratings join the score, count and question bars, but not the
// distribution bar or the date of the last review, which would let a landlord read one tenant's
// answer or tell when they gave it.

import {
  RELATIONSHIPS,
  type RatingDirection,
  type RatingHeadline,
  type ScaleScore,
} from '@/domain/criteria'
import type {
  ClientRating,
  CriterionId,
  CriterionScore,
  IsoDateTime,
  JobId,
  LandlordScore,
  PersonId,
  PropertyId,
  Rating,
  RatingId,
  ScoreSummary,
  TradeScore,
} from '@/domain/types'
import { RATING_CONFIG } from './config'
import { isExpired, reviewDate } from './retention'
import { isShielded } from './shield'
import { monthsBetween, toMs } from './time'
import { isSubmitted } from './unlock'

const SCALE_POINTS = [1, 2, 3, 4, 5] as const

/** One answer from a rating, or undefined when that question wasn't answered. */
export function answerOf(rating: Pick<Rating, 'answers'>, criterionId: string) {
  const answers: Partial<Record<string, ScaleScore>> = rating.answers
  return answers[criterionId]
}

/** r: the mean of the criteria answered, 1 to 5. Null when nothing was answered. */
export function reviewScore(rating: Pick<Rating, 'answers'>): number | null {
  const answers: Partial<Record<string, ScaleScore>> = rating.answers
  const values = Object.values(answers).filter((value) => value !== undefined)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** w = 0.5^(age in months / 12), falling to 0 once the review is 36 months old. */
export function recencyWeight(writtenAt: IsoDateTime, now: IsoDateTime): number {
  const age = Math.max(0, monthsBetween(writtenAt, now))
  if (age >= RATING_CONFIG.retentionMonths) return 0
  return 0.5 ** (age / RATING_CONFIG.recencyHalfLifeMonths)
}

export interface WeightedScore {
  readonly score: number
  readonly weight: number
}

/** S = (3·m + Σ w·r) / (3 + Σ w). With no reviews it is m. */
export function bayesianScore(reviews: readonly WeightedScore[], platformMean: number): number {
  const prior = RATING_CONFIG.priorWeight
  const totalWeight = reviews.reduce((sum, review) => sum + review.weight, 0)
  const weighted = reviews.reduce((sum, review) => sum + review.weight * review.score, 0)
  return (prior * platformMean + weighted) / (prior + totalWeight)
}

export interface CountOptions {
  readonly now: IsoDateTime
  /** Per-repair ratings the retaliation shield has released (see releasedShieldIds). */
  readonly releasedShielded?: ReadonlySet<RatingId>
}

/** Whether a rating counts towards scores right now. */
export function countsInScore(rating: Rating, { now, releasedShielded }: CountOptions): boolean {
  if (!isSubmitted(rating) || isExpired(rating, now)) return false
  if (isShielded(rating)) {
    return rating.state === 'sealed' && (releasedShielded?.has(rating.id) ?? false)
  }
  return rating.state === 'revealed'
}

/** 3 reviews from 3 different people (SPEC §5 rule 10). One person rating twice counts once. */
export function meetsScoreThreshold(ratings: readonly Pick<Rating, 'raterId'>[]): boolean {
  const raters = new Set(ratings.map((rating) => rating.raterId))
  return (
    ratings.length >= RATING_CONFIG.minReviewsForScore &&
    raters.size >= RATING_CONFIG.minDistinctRatersForScore
  )
}

/**
 * m for one direction: the mean of the reviews written in the last 12 months, or the starting
 * 4.0 until there are 20 of them (see RATING_CONFIG). Only revealed reviews are used, so a sealed
 * rating never leaks through the platform mean.
 */
export function platformMean(
  ratings: readonly Rating[],
  direction: RatingDirection,
  now: IsoDateTime,
): number {
  const recent = ratings
    .filter(
      (rating) =>
        rating.direction === direction &&
        !isShielded(rating) &&
        countsInScore(rating, { now }) &&
        monthsBetween(reviewDate(rating), now) < RATING_CONFIG.platformMeanWindowMonths,
    )
    .map(reviewScore)
    .filter((score) => score !== null)
  if (recent.length < RATING_CONFIG.platformMeanMinReviews) {
    return RATING_CONFIG.startingPlatformMean
  }
  return recent.reduce((sum, score) => sum + score, 0) / recent.length
}

export interface CompletedJob {
  readonly jobId: JobId
  readonly completedAt: IsoDateTime
}

/** Comparable others for a relative badge, e.g. every plumber in Aberdeen. */
export interface PeerGroup {
  readonly area: string
  /** The others' scores, not including the one being badged. Null scores are ignored. */
  readonly scores: readonly (number | null)[]
}

export interface SummaryInput {
  readonly direction: RatingDirection
  readonly subjectId: PersonId
  /** Any ratings: those in another direction, about someone else or not counting are skipped. */
  readonly ratings: readonly Rating[]
  readonly now: IsoDateTime
  /** m for this direction, from platformMean. */
  readonly platformMean: number
  /** Only reviews about this home, for property pages. */
  readonly propertyId?: PropertyId
  readonly releasedShielded?: ReadonlySet<RatingId>
  /** Completed jobs, for "Reviewed on X of Y completed jobs". Leave out where it doesn't apply. */
  readonly completedJobs?: readonly CompletedJob[]
  readonly peers?: PeerGroup
}

/** The ratings a summary is built from, oldest first. */
export function countedRatings(input: Omit<SummaryInput, 'platformMean' | 'peers'>): Rating[] {
  const options = { now: input.now, releasedShielded: input.releasedShielded }
  return input.ratings
    .filter(
      (rating) =>
        rating.direction === input.direction &&
        rating.subjectId === input.subjectId &&
        (input.propertyId === undefined || rating.propertyId === input.propertyId) &&
        countsInScore(rating, options),
    )
    .sort((a, b) => toMs(reviewDate(a)) - toMs(reviewDate(b)))
}

/**
 * Whether the SPEC gives this direction a headline score. Tenants never get one: landlords'
 * ratings of a tenant are a passport of counts, and trades' ratings of a tenant have no headline,
 * so nothing can sort, filter or reject tenants by a number (SPEC §5 rule 11).
 */
export function hasHeadlineScore(direction: RatingDirection): boolean {
  const headline: RatingHeadline = RELATIONSHIPS[direction].headline
  return headline !== 'tenant_passport' && headline !== 'none'
}

/** Throws for a direction about tenants, which never has a score (hasHeadlineScore). */
export function scoreSummary(input: SummaryInput): ScoreSummary {
  if (!hasHeadlineScore(input.direction)) {
    throw new RangeError(`Ratings of tenants never become a score (${input.direction}).`)
  }
  const counted = countedRatings(input)
  const scored = weightedScores(counted, input.now)
  const score = meetsScoreThreshold(counted) ? bayesianScore(scored, input.platformMean) : null
  const shown = counted.filter((rating) => !isShielded(rating))
  return {
    score,
    reviewCount: counted.length,
    reviewerCount: new Set(counted.map((rating) => rating.raterId)).size,
    distribution: distribution(shown),
    criteria: criterionScores(input.direction, counted),
    lastReviewAt: lastReviewAt(shown),
    coverage: input.completedJobs ? coverage(input.completedJobs, counted, input.now) : null,
    relativeBadge: input.peers ? relativeBadge(score, input.peers) : null,
  }
}

function weightedScores(ratings: readonly Rating[], now: IsoDateTime): WeightedScore[] {
  return ratings.flatMap((rating) => {
    const score = reviewScore(rating)
    return score === null ? [] : [{ score, weight: recencyWeight(reviewDate(rating), now) }]
  })
}

/** Reviews by their score rounded to the nearest point (halves round up), for the 5-level bar. */
export function distribution(ratings: readonly Rating[]): Record<ScaleScore, number> {
  const counts: Record<ScaleScore, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const rating of ratings) {
    const score = reviewScore(rating)
    if (score === null) continue
    counts[SCALE_POINTS[Math.min(4, Math.max(0, Math.round(score) - 1))]] += 1
  }
  return counts
}

/** The plain mean of each question's answers, in the order the questions are asked. */
export function criterionScores(
  direction: RatingDirection,
  ratings: readonly Rating[],
): CriterionScore[] {
  const criteria: readonly { readonly id: CriterionId }[] = RELATIONSHIPS[direction].criteria
  return criteria.map((criterion) => {
    const answers = ratings
      .map((rating) => answerOf(rating, criterion.id))
      .filter((answer) => answer !== undefined)
    const mean =
      answers.length === 0 ? null : answers.reduce((sum, a) => sum + a, 0) / answers.length
    return { criterionId: criterion.id, mean, count: answers.length }
  })
}

function lastReviewAt(ratings: readonly Rating[]): IsoDateTime | null {
  let latest: IsoDateTime | null = null
  for (const rating of ratings) {
    const at = rating.revealedAt ?? reviewDate(rating)
    if (latest === null || toMs(at) > toMs(latest)) latest = at
  }
  return latest
}

/**
 * "Reviewed on X of Y completed jobs": Y is the jobs completed in the last 36 months (older
 * reviews are deleted, so older jobs would only drag the figure down), X how many of them have
 * at least one review that counts.
 */
export function coverage(
  completedJobs: readonly CompletedJob[],
  counted: readonly Rating[],
  now: IsoDateTime,
): { reviewed: number; completed: number } {
  const recent = new Map<JobId, CompletedJob>()
  for (const job of completedJobs) {
    if (monthsBetween(job.completedAt, now) < RATING_CONFIG.retentionMonths) {
      recent.set(job.jobId, job)
    }
  }
  const reviewedJobs = new Set(
    counted.flatMap((rating) => (rating.context.kind === 'job' ? [rating.context.jobId] : [])),
  )
  const reviewed = [...recent.keys()].filter((jobId) => reviewedJobs.has(jobId)).length
  return { reviewed, completed: recent.size }
}

/**
 * "Top 10% in Aberdeen". Only with 20 or more scored peers, and only in the 5%, 10% and 25%
 * bands. Ties share the better place.
 */
export function relativeBadge(
  score: number | null,
  peers: PeerGroup,
): { topPercent: number; area: string } | null {
  if (score === null) return null
  const others = peers.scores.filter((other) => other !== null)
  if (others.length < RATING_CONFIG.relativeBadge.minPeers) return null
  const place = others.filter((other) => other > score).length + 1
  const topShare = (place / (others.length + 1)) * 100
  const band = RATING_CONFIG.relativeBadge.bandsPercent.find((percent) => topShare <= percent)
  return band === undefined ? null : { topPercent: band, area: peers.area }
}

// ─── Scores for each profile ─────────────────────────────────────────────────────────────────

const PROPERTY_SUB_SCORE_ID =
  RELATIONSHIPS['tenant->landlord'].criteria.find((c) => 'propertySubScore' in c)?.id ??
  'home_as_advertised'

export type LandlordScoreInput = Omit<SummaryInput, 'direction' | 'subjectId'> & {
  readonly landlordId: PersonId
}

/**
 * A landlord's score from tenants, for the landlord page or (with propertyId) one home's page.
 * The property sub-score uses "Home matched the advert and was safe at move-in" alone, with
 * the same weighting, prior and 3-reviewer rule as the headline.
 */
export function landlordScore(input: LandlordScoreInput): LandlordScore {
  const summaryInput: SummaryInput = {
    ...input,
    direction: 'tenant->landlord',
    subjectId: input.landlordId,
  }
  const counted = countedRatings(summaryInput)
  const answered = counted.flatMap((rating) => {
    const answer = answerOf(rating, PROPERTY_SUB_SCORE_ID)
    if (answer === undefined) return []
    return [
      { rating, weighted: { score: answer, weight: recencyWeight(reviewDate(rating), input.now) } },
    ]
  })
  const propertySubScore = meetsScoreThreshold(answered.map((entry) => entry.rating))
    ? bayesianScore(
        answered.map((entry) => entry.weighted),
        input.platformMean,
      )
    : null
  return { ...scoreSummary(summaryInput), propertySubScore }
}

export interface TradeScoreInput {
  readonly tradeId: PersonId
  readonly ratings: readonly Rating[]
  readonly now: IsoDateTime
  /** m for landlord->trade and for tenant->trade. */
  readonly platformMeans: { readonly fromLandlords: number; readonly fromTenants: number }
  readonly completedJobs?: readonly CompletedJob[]
  readonly peers?: { readonly fromLandlords?: PeerGroup; readonly fromTenants?: PeerGroup }
}

/**
 * A trade's Overall is the mean of the "From landlords" and "From tenants" halves, and screens
 * always show both. It exists only once both halves have their own score (3 reviews from 3
 * different people each). Until then there is no Overall: screens show whichever half has a
 * score and "New" for the other, so one side's view never stands in for both.
 */
export function tradeScore(input: TradeScoreInput): TradeScore {
  const half = (direction: RatingDirection, platformMean: number, peers?: PeerGroup) =>
    scoreSummary({
      direction,
      subjectId: input.tradeId,
      ratings: input.ratings,
      now: input.now,
      platformMean,
      ...(input.completedJobs ? { completedJobs: input.completedJobs } : {}),
      ...(peers ? { peers } : {}),
    })
  const fromLandlords = half(
    'landlord->trade',
    input.platformMeans.fromLandlords,
    input.peers?.fromLandlords,
  )
  const fromTenants = half(
    'tenant->trade',
    input.platformMeans.fromTenants,
    input.peers?.fromTenants,
  )
  const overall =
    fromLandlords.score === null || fromTenants.score === null
      ? null
      : (fromLandlords.score + fromTenants.score) / 2
  return { overall, fromLandlords, fromTenants }
}

export type ClientRatingInput = Omit<SummaryInput, 'direction' | 'subjectId' | 'propertyId'> & {
  readonly landlordId: PersonId
}

/** Trades only (and the landlord themselves): how a landlord is as a client. */
export function clientRating(input: ClientRatingInput): ClientRating {
  const summaryInput: SummaryInput = {
    ...input,
    direction: 'trade->landlord',
    subjectId: input.landlordId,
  }
  return {
    summary: scoreSummary(summaryInput),
    paidOnTime: paidOnTime(countedRatings(summaryInput)),
  }
}

const PAID_ON_TIME_ID: CriterionId<'trade->landlord'> = 'paid_on_time'

/**
 * "Paid on time on X of Y jobs": Y is the jobs with a counted trade rating that answered the
 * question, X those answered Always. Each job counts once.
 */
export function paidOnTime(counted: readonly Rating[]): { onTime: number; jobs: number } {
  const byJob = new Map<JobId, ScaleScore>()
  for (const rating of counted) {
    if (rating.direction !== 'trade->landlord' || rating.context.kind !== 'job') continue
    const answer = answerOf(rating, PAID_ON_TIME_ID)
    if (answer === undefined) continue
    // Should a job ever carry two answers, the less favourable one stands.
    const previous = byJob.get(rating.context.jobId)
    byJob.set(rating.context.jobId, previous !== undefined && previous < answer ? previous : answer)
  }
  const answers = [...byJob.values()]
  return {
    onTime: answers.filter((answer) => answer >= RATING_CONFIG.paidOnTimeMinScore).length,
    jobs: answers.length,
  }
}
