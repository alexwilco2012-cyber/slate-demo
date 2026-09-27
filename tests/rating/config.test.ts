import { RATING_DIRECTIONS, RATING_RULES, RELATIONSHIPS } from '@/domain/criteria'
import { RATING_CONFIG, windowDaysFor } from '@/domain/rating'
import { LETTING_RULES } from '@/domain/types'

describe('rating config', () => {
  it('holds the agreed numbers from SPEC §5', () => {
    expect(RATING_CONFIG.windowDays).toEqual({ job: 14, tenancy: 28, tradeRatesLandlord: 30 })
    expect(RATING_CONFIG.reminderDays).toEqual([3, 10])
    expect(RATING_CONFIG.minReviewsForScore).toBe(3)
    expect(RATING_CONFIG.minDistinctRatersForScore).toBe(3)
    expect(RATING_CONFIG.shieldReleaseTenantRaters).toBe(5)
    expect(RATING_CONFIG.retentionMonths).toBe(36)
    expect(RATING_CONFIG.recencyHalfLifeMonths).toBe(12)
    expect(RATING_CONFIG.priorWeight).toBe(3)
    expect(RATING_CONFIG.startingPlatformMean).toBe(4)
    expect(RATING_CONFIG.platformMeanWindowMonths).toBe(12)
    expect(RATING_CONFIG.reply).toEqual({ maxLength: 500, withinDays: 30 })
    expect(RATING_CONFIG.comment).toEqual({ minLength: 30, maxLength: 1000 })
    expect(RATING_CONFIG.relativeBadge.minPeers).toBe(20)
    expect(RATING_CONFIG.passportShareDays).toBe(30)
  })

  it('agrees with RATING_RULES, which screens read', () => {
    expect(RATING_CONFIG.reminderDays).toEqual(RATING_RULES.reminderDays)
    expect(RATING_CONFIG.comment.minLength).toBe(RATING_RULES.commentLength.min)
    expect(RATING_CONFIG.comment.maxLength).toBe(RATING_RULES.commentLength.max)
    expect(RATING_CONFIG.reply).toEqual(RATING_RULES.reply)
    expect(RATING_CONFIG.minDistinctRatersForScore).toBe(RATING_RULES.minReviewersForScore)
    expect(RATING_CONFIG.shieldReleaseTenantRaters).toBe(RATING_RULES.shieldReleaseTenantRaters)
    expect(RATING_CONFIG.retentionMonths).toBe(RATING_RULES.retentionMonths)
    expect(RATING_CONFIG.recencyHalfLifeMonths).toBe(RATING_RULES.recencyHalfLifeMonths)
    expect(RATING_CONFIG.priorWeight).toBe(RATING_RULES.priorWeight)
    expect(RATING_CONFIG.startingPlatformMean).toBe(RATING_RULES.startingPlatformMean)
    expect(RATING_CONFIG.platformMeanWindowMonths).toBe(RATING_RULES.platformMeanWindowMonths)
    expect(RATING_CONFIG.relativeBadge.minPeers).toBe(RATING_RULES.relativeBadgeMinPeers)
    expect(RATING_CONFIG.passportShareDays).toBe(LETTING_RULES.passportShareDays)
  })

  it.each(RATING_DIRECTIONS)('uses the same windows as criteria.ts for %s', (direction) => {
    for (const occasion of RELATIONSHIPS[direction].occasions) {
      expect(windowDaysFor(direction, occasion.context)).toBe(occasion.windowDays)
    }
  })

  it('labels every point of the judgement scale exactly once', () => {
    const points = RATING_CONFIG.labelBands.map((band) => band.scalePoint)
    expect([...points].sort()).toEqual([1, 2, 3, 4, 5])
  })
})
