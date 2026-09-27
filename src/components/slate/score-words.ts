import { RELATIONSHIPS, SCALES, type ScaleId } from '@/domain/criteria'
import type { CriterionId, RatingDirection, ScaleScore } from '@/domain/types'

/**
 * The verbal label beside a headline score. Scores are means of 1-5 answers, so they are read on
 * the judgement scale: 4.6 is "Outstanding", 3.8 "Better than expected".
 */
export function scoreWords(score: number) {
  const rounded = Math.round(score * 10) / 10
  if (rounded >= 4.5) return 'Outstanding'
  if (rounded >= 3.5) return 'Better than expected'
  if (rounded >= 2.5) return 'What I expected'
  if (rounded >= 1.5) return 'Below'
  return 'Well below'
}

/** The five judgement words from best to worst, for distribution rows. */
export const DISTRIBUTION_LEVELS: readonly { score: ScaleScore; label: string }[] = [
  ...SCALES.judgement,
].reverse()

export function criterionDef(direction: RatingDirection, criterionId: CriterionId) {
  return RELATIONSHIPS[direction].criteria.find((criterion) => criterion.id === criterionId)
}

/** The words someone chose for one answer, e.g. "Mostly" or "Partly". */
export function answerWords(scale: ScaleId, score: ScaleScore) {
  const points: readonly { score: ScaleScore; label: string }[] = SCALES[scale]
  return points.find((point) => point.score === score)?.label ?? String(score)
}

/**
 * Words for a criterion's mean on its own scale: "Mostly" for a frequency question, "Yes" for
 * "Is the problem fixed?", the judgement words otherwise.
 */
export function meanWords(scale: ScaleId, mean: number) {
  if (scale === 'judgement') return scoreWords(mean)
  const points: readonly { score: ScaleScore; label: string }[] = SCALES[scale]
  let nearest = points[0]!
  for (const point of points) {
    if (Math.abs(point.score - mean) < Math.abs(nearest.score - mean)) nearest = point
  }
  return nearest.label
}
