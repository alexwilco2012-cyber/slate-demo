import {
  coverageText,
  disputeLabel,
  formatScore,
  headline,
  newProfileText,
  opinionLabel,
  paidOnTimeText,
  raterRole,
  relativeBadgeText,
  reviewCountText,
  reviewerLabelText,
  roundScore,
  scoreLabel,
  subjectRole,
  tradeHeadline,
} from '@/domain/rating'

describe('score display', () => {
  it('shows S to one decimal', () => {
    expect(formatScore(4.25)).toBe('4.3')
    expect(formatScore(4.35)).toBe('4.4')
    expect(formatScore(4)).toBe('4.0')
    expect(roundScore(4.105263)).toBe(4.1)
  })

  it.each([
    [5, 'Outstanding'],
    [4.46, 'Outstanding'],
    [4.44, 'Better than expected'],
    [3.5, 'Better than expected'],
    [3.0, 'What I expected'],
    [2.49, 'What I expected'],
    [2.44, 'Below'],
    [1.5, 'Below'],
    [1.2, 'Well below'],
    [1, 'Well below'],
  ])('labels %s as "%s", matching the rounded figure', (score, label) => {
    expect(scoreLabel(score)).toBe(label)
  })

  it('pairs the number with its words, never a number alone', () => {
    expect(headline({ score: 4.105263, reviewCount: 3 })).toEqual({
      kind: 'score',
      value: '4.1',
      label: 'Better than expected',
      accessibleText: '4.1 out of 5, Better than expected',
    })
  })

  it('shows "New · N verified reviews" below the threshold', () => {
    expect(headline({ score: null, reviewCount: 2 })).toEqual({
      kind: 'new',
      text: 'New · 2 verified reviews',
    })
    expect(newProfileText(1)).toBe('New · 1 verified review')
    expect(newProfileText(0)).toBe('New · No verified reviews yet')
    expect(reviewCountText(12)).toBe('12 verified reviews')
  })
})

describe('headline lines', () => {
  it('says how many completed jobs were reviewed', () => {
    expect(coverageText({ reviewed: 7, completed: 9 })).toBe('Reviewed on 7 of 9 completed jobs')
    expect(coverageText({ reviewed: 1, completed: 1 })).toBe('Reviewed on 1 of 1 completed job')
  })

  it('says how often a landlord paid on time', () => {
    expect(paidOnTimeText({ onTime: 5, jobs: 6 })).toBe('Paid on time on 5 of 6 jobs')
    expect(paidOnTimeText({ onTime: 0, jobs: 1 })).toBe('Paid on time on 0 of 1 job')
  })

  it('writes a relative badge', () => {
    expect(relativeBadgeText({ topPercent: 10, area: 'Aberdeen' })).toBe('Top 10% in Aberdeen')
  })
})

describe('who wrote it', () => {
  it('shows a reviewer as a verified role, district and year, never a name', () => {
    expect(reviewerLabelText({ role: 'tenant', postcodeDistrict: 'AB10', year: 2025 })).toBe(
      'Verified tenant · AB10 · 2025',
    )
    expect(reviewerLabelText({ role: 'trade', postcodeDistrict: 'AB24', year: 2026 })).toBe(
      'Verified trade · AB24 · 2026',
    )
  })

  it("labels a comment as the rater's opinion and a dispute by the rated person's role", () => {
    expect(opinionLabel(raterRole('tenant->landlord'))).toBe("Tenant's opinion")
    expect(disputeLabel(subjectRole('tenant->landlord'))).toBe('Landlord disputes this')
    expect(opinionLabel(raterRole('landlord->trade'))).toBe("Landlord's opinion")
    expect(disputeLabel(subjectRole('landlord->trade'))).toBe('Trade disputes this')
  })
})

describe('trade headline', () => {
  const half = (score: number | null, reviewCount: number) => ({
    score,
    reviewCount,
    reviewerCount: reviewCount,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    criteria: [],
    lastReviewAt: null,
    coverage: null,
    relativeBadge: null,
  })

  it('shows Overall only when both halves have a score', () => {
    const both = tradeHeadline({
      overall: 4.25,
      fromLandlords: half(4.5, 4),
      fromTenants: half(4, 3),
    })
    expect(both.overall).toMatchObject({ kind: 'score', value: '4.3' })
    expect(both.note).toBeNull()
  })

  it('shows the scored half and "New" for the other, with no Overall', () => {
    const partial = tradeHeadline({
      overall: null,
      fromLandlords: half(4.5, 5),
      fromTenants: half(null, 2),
    })
    expect(partial.overall).toBeNull()
    expect(partial.fromLandlords).toMatchObject({ kind: 'score', value: '4.5' })
    expect(partial.fromTenants).toEqual({ kind: 'new', text: 'New · 2 verified reviews' })
    expect(partial.note).toBe('Overall shows once 3 different tenants have reviewed.')
  })

  it('names both sides while both are new', () => {
    const none = tradeHeadline({
      overall: null,
      fromLandlords: half(null, 0),
      fromTenants: half(null, 1),
    })
    expect(none.note).toBe(
      'Overall shows once 3 different landlords and 3 different tenants have reviewed.',
    )
  })
})
