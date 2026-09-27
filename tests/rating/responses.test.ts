import { checkDispute, checkReply, checkUpdate, replyClosesAt } from '@/domain/rating'
import type { Rating } from '@/domain/types'
import { PEOPLE, day, makeRating } from './fixtures'

const review: Rating = makeRating({
  direction: 'landlord->trade',
  raterId: PEOPLE.graham,
  subjectId: PEOPLE.kev,
  at: day(0),
})
const REPLY = 'Thanks for the feedback. The part was on back order, which caused the delay.'
const UPDATE = 'Six months on, the tap is still perfect. Would recommend without hesitation.'

describe("the rated person's one public reply", () => {
  const base = { rating: review, authorId: PEOPLE.kev, body: REPLY, now: day(5), existing: [] }

  it('is open to the person rated, within 30 days of the reveal', () => {
    expect(replyClosesAt(review)).toBe(day(30))
    expect(checkReply(base)).toMatchObject({ ok: true, value: { text: REPLY } })
    expect(checkReply({ ...base, now: day(29, 23) }).ok).toBe(true)
    expect(checkReply({ ...base, now: day(30) })).toMatchObject({
      ok: false,
      code: 'window_closed',
    })
  })

  it('is only for the person rated', () => {
    expect(checkReply({ ...base, authorId: PEOPLE.graham })).toMatchObject({
      ok: false,
      code: 'forbidden',
    })
  })

  it('is allowed once', () => {
    const existing = [{ ratingId: review.id, state: 'published' as const }]
    expect(checkReply({ ...base, existing })).toMatchObject({ ok: false, code: 'already_done' })
    const removed = [{ ratingId: review.id, state: 'removed' as const }]
    expect(checkReply({ ...base, existing: removed }).ok).toBe(true)
  })

  it('holds up to 500 characters', () => {
    expect(checkReply({ ...base, body: 'a'.repeat(500) }).ok).toBe(true)
    expect(checkReply({ ...base, body: 'a'.repeat(501) })).toMatchObject({
      ok: false,
      code: 'validation',
      fields: { body: 'Keep this to 500 characters or fewer. You have 501.' },
    })
    expect(checkReply({ ...base, body: '   ' })).toMatchObject({ ok: false, code: 'validation' })
  })

  it('goes through the same filter as reviews', () => {
    const result = checkReply({ ...base, body: 'Ring me on 07700 900321 and we can sort it.' })
    expect(result).toMatchObject({ ok: false, code: 'blocked_text' })
  })

  it('never names the reviewer, who only ever shows as a verified role (rule 9)', () => {
    const named = { ...base, reviewerName: 'Graham Reid' }
    for (const body of [
      'Graham, you know the part was on back order, so the delay was not down to me.',
      'Thanks Mr REID. The part was on back order, which caused the delay.',
    ]) {
      expect(checkReply({ ...named, body })).toMatchObject({
        ok: false,
        code: 'blocked_text',
        fields: { body: expect.stringContaining('Take out the name.') },
      })
    }
    // Even if the caller also lets the name through for other reasons.
    const allowed = { ...named, filter: { allowedNames: ['Graham'] } }
    expect(checkReply({ ...allowed, body: 'Graham is wrong about the delay, sadly.' }).ok).toBe(
      false,
    )
    expect(checkReply({ ...named, body: REPLY }).ok).toBe(true)
  })

  it('only sits on a review that is showing', () => {
    for (const state of ['sealed', 'restricted', 'removed'] as const) {
      expect(checkReply({ ...base, rating: { ...review, state } })).toMatchObject({
        ok: false,
        code: 'invalid_state',
      })
    }
  })

  it("can't be added to a per-repair rating, which is never shown on its own", () => {
    const shielded = { ...review, seal: 'retaliation_shield' as const }
    expect(checkReply({ ...base, rating: shielded })).toMatchObject({
      ok: false,
      code: 'invalid_state',
    })
  })
})

describe("the reviewer's one dated update", () => {
  const base = { rating: review, authorId: PEOPLE.graham, body: UPDATE, existing: [] }

  it('is for the reviewer only, and allowed once', () => {
    expect(checkUpdate(base).ok).toBe(true)
    expect(checkUpdate({ ...base, authorId: PEOPLE.kev })).toMatchObject({ code: 'forbidden' })
    const existing = [{ ratingId: review.id, state: 'published' as const }]
    expect(checkUpdate({ ...base, existing })).toMatchObject({ code: 'already_done' })
  })

  it('follows the comment rules: 30 to 1,000 characters', () => {
    expect(checkUpdate({ ...base, body: 'Still good.' })).toMatchObject({ code: 'validation' })
    expect(checkUpdate({ ...base, body: 'a'.repeat(1001) })).toMatchObject({ code: 'validation' })
  })
})

describe('"[Role] disputes this"', () => {
  const base = { rating: review, authorId: PEOPLE.kev, existing: [] }

  it('is for the person rated, once', () => {
    expect(checkDispute(base).ok).toBe(true)
    expect(checkDispute({ ...base, authorId: PEOPLE.graham })).toMatchObject({ code: 'forbidden' })
    const existing = [{ ratingId: review.id }]
    expect(checkDispute({ ...base, existing })).toMatchObject({ code: 'already_done' })
  })

  it('only sits on a review that is showing', () => {
    expect(checkDispute({ ...base, rating: { ...review, state: 'sealed' } })).toMatchObject({
      code: 'invalid_state',
    })
  })
})
