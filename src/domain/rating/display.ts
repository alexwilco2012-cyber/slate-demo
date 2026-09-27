// The words and numbers screens show for ratings, so every portal says them the same way.
// A score is always shown to one decimal with its verbal label, never as stars (SPEC §5 rule 5).

import { RELATIONSHIPS, SCALES, type CriterionDef } from '@/domain/criteria'
import {
  ROLE_LABELS,
  type PassportLine,
  type ReviewerLabel,
  type Role,
  type ScoreSummary,
  type TradeScore,
} from '@/domain/types'
import { RATING_CONFIG } from './config'

/** S rounded to one decimal, as shown. */
export function roundScore(score: number): number {
  return Math.round((score + Number.EPSILON) * 10) / 10
}

/** "4.3". */
export function formatScore(score: number): string {
  return roundScore(score).toFixed(1)
}

/** The judgement-scale words for a score, chosen from the rounded figure so both agree. */
export function scoreLabel(score: number): string {
  const shown = roundScore(score)
  const band =
    RATING_CONFIG.labelBands.find((candidate) => shown >= candidate.from) ??
    RATING_CONFIG.labelBands[RATING_CONFIG.labelBands.length - 1]
  const point = SCALES.judgement.find((candidate) => candidate.score === band.scalePoint)
  return point?.label ?? ''
}

export type HeadlineDisplay =
  | {
      readonly kind: 'score'
      /** "4.3" */
      readonly value: string
      /** "Better than expected" */
      readonly label: string
      /** "4.3 out of 5, Better than expected", for screen readers. */
      readonly accessibleText: string
    }
  | {
      readonly kind: 'new'
      /** "New · 2 verified reviews" */
      readonly text: string
    }

/** The headline: a score with its label, or "New · N verified reviews" below the threshold. */
export function headline(summary: Pick<ScoreSummary, 'score' | 'reviewCount'>): HeadlineDisplay {
  if (summary.score === null) return { kind: 'new', text: newProfileText(summary.reviewCount) }
  const value = formatScore(summary.score)
  const label = scoreLabel(summary.score)
  return { kind: 'score', value, label, accessibleText: `${value} out of 5, ${label}` }
}

export interface TradeHeadline {
  /** Only once both halves have their own score; null until then. */
  readonly overall: HeadlineDisplay | null
  readonly fromLandlords: HeadlineDisplay
  readonly fromTenants: HeadlineDisplay
  /** Why there's no Overall yet, e.g. "Overall shows once 3 different tenants have reviewed." */
  readonly note: string | null
}

/**
 * A trade's headline: an Overall only when landlords and tenants have each reached 3 reviews
 * from 3 different people. Until then, each half shows its score or "New", and there is no
 * Overall number, so one side's view never stands in for both.
 */
export function tradeHeadline(score: TradeScore): TradeHeadline {
  const fromLandlords = headline(score.fromLandlords)
  const fromTenants = headline(score.fromTenants)
  if (score.overall !== null) {
    return {
      overall: headline({ score: score.overall, reviewCount: 0 }),
      fromLandlords,
      fromTenants,
      note: null,
    }
  }
  const n = RATING_CONFIG.minDistinctRatersForScore
  const waiting = [
    ...(score.fromLandlords.score === null ? [`${n} different landlords`] : []),
    ...(score.fromTenants.score === null ? [`${n} different tenants`] : []),
  ]
  return {
    overall: null,
    fromLandlords,
    fromTenants,
    note: `Overall shows once ${waiting.join(' and ')} have reviewed.`,
  }
}

export function newProfileText(reviewCount: number): string {
  if (reviewCount === 0) return 'New · No verified reviews yet'
  return `New · ${reviewCount} verified ${reviewCount === 1 ? 'review' : 'reviews'}`
}

export function reviewCountText(reviewCount: number): string {
  return `${reviewCount} verified ${reviewCount === 1 ? 'review' : 'reviews'}`
}

/** "Reviewed on 7 of 9 completed jobs". */
export function coverageText(coverage: { reviewed: number; completed: number }): string {
  return `Reviewed on ${coverage.reviewed} of ${coverage.completed} completed ${plural(coverage.completed, 'job')}`
}

/** "Paid on time on 5 of 6 jobs". */
export function paidOnTimeText(paid: { onTime: number; jobs: number }): string {
  return `Paid on time on ${paid.onTime} of ${paid.jobs} ${plural(paid.jobs, 'job')}`
}

/** "Top 10% in Aberdeen". */
export function relativeBadgeText(badge: { topPercent: number; area: string }): string {
  return `Top ${badge.topPercent}% in ${badge.area}`
}

/** "Verified tenant · AB10 · 2025". Reviewers are never shown by name (SPEC §5 rule 9). */
export function reviewerLabelText(label: ReviewerLabel): string {
  return `Verified ${label.role} · ${label.postcodeDistrict} · ${label.year}`
}

/** "Tenant's opinion", above a public comment. */
export function opinionLabel(raterRole: Role): string {
  return `${ROLE_LABELS[raterRole]}'s opinion`
}

/** "Landlord disputes this", on a review the rated person disputes. */
export function disputeLabel(subjectRole: Role): string {
  return `${ROLE_LABELS[subjectRole]} disputes this`
}

export interface PassportAnswer {
  /** "Always" */
  readonly label: string
  readonly count: number
  /** How many landlords answered this question. */
  readonly of: number
}

/** A passport line's answers, most favourable first, leaving out answers nobody gave. */
export function passportAnswers(line: PassportLine): PassportAnswer[] {
  const criterion: CriterionDef | undefined = RELATIONSHIPS['landlord->tenant'].criteria.find(
    (candidate) => candidate.id === line.criterionId,
  )
  if (!criterion) return []
  return [...SCALES[criterion.scale]]
    .sort((a, b) => b.score - a.score)
    .filter((point) => line.counts[point.score] > 0)
    .map((point) => ({
      label: point.label,
      count: line.counts[point.score],
      of: line.landlordCount,
    }))
}

/**
 * "Rent on agreed date: Always, from 2 of 2 landlords". Mixed answers are listed most
 * favourable first: "…: Always, from 1 of 2 landlords · Mostly, from 1 of 2 landlords".
 * Never averaged into a single number.
 */
export function passportLineText(line: PassportLine): string {
  const criterion = RELATIONSHIPS['landlord->tenant'].criteria.find(
    (candidate) => candidate.id === line.criterionId,
  )
  const name = criterion?.short ?? line.criterionId
  const answers = passportAnswers(line)
  if (answers.length === 0) return `${name}: no answers yet`
  const parts = answers.map(
    (answer) =>
      `${answer.label}, from ${answer.count} of ${answer.of} ${plural(answer.of, 'landlord')}`,
  )
  return `${name}: ${parts.join(' · ')}`
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`
}
