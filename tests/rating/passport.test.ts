import {
  isShareActive,
  passportLineText,
  passportRatings,
  passportShareExpiresAt,
  passportSummary,
  shareStatus,
} from '@/domain/rating'
import type { PassportShare, PersonId, Rating } from '@/domain/types'
import { PEOPLE, day, makeRating } from './fixtures'

const NOW = day(30)

function fromLandlord(raterId: PersonId, answers: Rating['answers'], at = day(0)): Rating {
  return makeRating({
    direction: 'landlord->tenant',
    raterId,
    subjectId: PEOPLE.sarah,
    context: { kind: 'tenancy', tenancyId: `tenancy_${raterId}_${at}` },
    answers,
    at,
  })
}

const allAlways = {
  rent_on_time: 5,
  looked_after_home: 4,
  easy_to_reach: 4,
  allowed_access: 5,
  left_as_expected: 4,
} as const

describe('tenant passport', () => {
  it('counts answers per question by landlord, with no single number', () => {
    const summary = passportSummary(
      PEOPLE.sarah,
      [
        fromLandlord(PEOPLE.graham, allAlways),
        fromLandlord(PEOPLE.fiona, { ...allAlways, rent_on_time: 4 }),
      ],
      NOW,
    )
    expect(summary.landlordCount).toBe(2)
    const rent = summary.lines.find((line) => line.criterionId === 'rent_on_time')
    expect(rent).toEqual({
      criterionId: 'rent_on_time',
      counts: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
      landlordCount: 2,
    })
    expect(Object.keys(summary)).not.toContain('score')
    expect(summary.lines.map((line) => line.criterionId)).toEqual([
      'rent_on_time',
      'looked_after_home',
      'easy_to_reach',
      'allowed_access',
      'left_as_expected',
    ])
  })

  it('reads as plain words, e.g. "Rent on agreed date: Always, from 2 of 2 landlords"', () => {
    const both = passportSummary(
      PEOPLE.sarah,
      [fromLandlord(PEOPLE.graham, allAlways), fromLandlord(PEOPLE.fiona, allAlways)],
      NOW,
    )
    const rent = both.lines.find((line) => line.criterionId === 'rent_on_time')!
    expect(passportLineText(rent)).toBe('Rent on agreed date: Always, from 2 of 2 landlords')

    const mixed = passportSummary(
      PEOPLE.sarah,
      [
        fromLandlord(PEOPLE.graham, allAlways),
        fromLandlord(PEOPLE.fiona, { ...allAlways, rent_on_time: 4 }),
      ],
      NOW,
    )
    const mixedRent = mixed.lines.find((line) => line.criterionId === 'rent_on_time')!
    expect(passportLineText(mixedRent)).toBe(
      'Rent on agreed date: Always, from 1 of 2 landlords · Mostly, from 1 of 2 landlords',
    )

    const empty = passportSummary(PEOPLE.sarah, [], NOW).lines[0]!
    expect(passportLineText(empty)).toBe('Rent on agreed date: no answers yet')
  })

  it("uses each landlord's latest rating, so renting twice from one landlord counts once", () => {
    const older = fromLandlord(PEOPLE.graham, { ...allAlways, rent_on_time: 2 }, day(-400))
    const newer = fromLandlord(PEOPLE.graham, allAlways, day(0))
    const summary = passportSummary(PEOPLE.sarah, [older, newer], NOW)
    expect(summary.landlordCount).toBe(1)
    expect(summary.lines[0]?.counts[5]).toBe(1)
    expect(summary.lines[0]?.counts[2]).toBe(0)
  })

  it('shows every revealed review, newest first, leaving out sealed, removed and expired ones', () => {
    const revealed = fromLandlord(PEOPLE.graham, allAlways, day(-10))
    const newest = fromLandlord(PEOPLE.fiona, allAlways, day(-2))
    const sealed = { ...fromLandlord('person_landlord_moira', allAlways), state: 'sealed' as const }
    const removed = {
      ...fromLandlord('person_landlord_euan', allAlways),
      state: 'removed' as const,
    }
    const expired = fromLandlord('person_landlord_ailsa', allAlways, day(-1200))
    const shown = passportRatings([revealed, sealed, removed, expired, newest], PEOPLE.sarah, NOW)
    expect(shown.map((rating) => rating.id)).toEqual([newest.id, revealed.id])
  })
})

describe('passport share links', () => {
  const share: PassportShare = {
    id: 'share_union_grove',
    tenantId: PEOPLE.sarah,
    token: 'tok_example',
    label: 'For the flat on Union Grove',
    createdAt: day(0),
    expiresAt: passportShareExpiresAt(day(0)),
    views: [],
  }

  it('works for 30 days from when it was made', () => {
    expect(share.expiresAt).toBe(day(30))
    expect(shareStatus(share, day(29, 23))).toBe('ok')
    expect(shareStatus(share, day(30))).toBe('expired')
  })

  it('never outlives 30 days, whatever expiry was stored', () => {
    const tooLong = { ...share, expiresAt: day(90) }
    expect(shareStatus(tooLong, day(31))).toBe('expired')
  })

  it('stops working once revoked', () => {
    const revoked = { ...share, revokedAt: day(5) }
    expect(shareStatus(revoked, day(4))).toBe('ok')
    expect(shareStatus(revoked, day(5))).toBe('revoked')
    expect(isShareActive(revoked, day(6))).toBe(false)
  })

  it('reports a missing link as not found', () => {
    expect(shareStatus(null, day(1))).toBe('not_found')
  })
})
