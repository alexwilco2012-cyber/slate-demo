import {
  correctComment,
  hasPendingFakeCheck,
  liftRestriction,
  removeRating,
  restrictRating,
} from '@/domain/rating'
import type { ContentReport, Rating } from '@/domain/types'
import { PEOPLE, day, makeRating } from './fixtures'

const review: Rating = makeRating({
  direction: 'tenant->trade',
  raterId: PEOPLE.sarah,
  subjectId: PEOPLE.kev,
  comment: 'In my experience he was quick, tidy and explained the fix clearly.',
  at: day(0),
})

describe('removal: remove, never edit', () => {
  it('takes a review down and keeps what it said for the record', () => {
    const result = removeRating(review, {
      at: day(5),
      reason: 'report_upheld',
      reportId: 'report_1',
    })
    expect(result.ok && result.value).toEqual({
      ...review,
      state: 'removed',
      removal: { at: day(5), reason: 'report_upheld', reportId: 'report_1' },
    })
  })

  it('can remove a restricted review, clearing the restriction', () => {
    const restricted = restrictRating(review, { reportId: 'report_1', at: day(3) })
    if (!restricted.ok) throw new Error(restricted.message)
    const removed = removeRating(restricted.value, { at: day(5), reason: 'report_upheld' })
    expect(removed.ok && removed.value.restriction).toBeUndefined()
  })

  it("won't remove twice, or remove a draft", () => {
    const removed = removeRating(review, { at: day(5), reason: 'moderation' })
    if (!removed.ok) throw new Error(removed.message)
    expect(removeRating(removed.value, { at: day(6), reason: 'moderation' })).toMatchObject({
      code: 'already_done',
    })
    expect(
      removeRating({ ...review, state: 'draft' }, { at: day(6), reason: 'moderation' }),
    ).toMatchObject({ code: 'invalid_state' })
  })
})

describe('restriction while a report is handled', () => {
  it('hides a published review and puts it back if the report is not upheld', () => {
    const restricted = restrictRating(review, { reportId: 'report_2', at: day(3) })
    expect(restricted.ok && restricted.value).toMatchObject({
      state: 'restricted',
      restriction: { reportId: 'report_2', since: day(3) },
    })
    if (!restricted.ok) return
    const lifted = liftRestriction(restricted.value)
    expect(lifted.ok && lifted.value).toEqual(review)
  })

  it('only restricts a published review', () => {
    expect(
      restrictRating({ ...review, state: 'sealed' }, { reportId: 'report_2', at: day(3) }),
    ).toMatchObject({ code: 'invalid_state' })
    expect(liftRestriction(review)).toMatchObject({ code: 'invalid_state' })
  })
})

describe('corrections: obscenity or typos only', () => {
  it('changes the comment alone and records why', () => {
    const fixed = 'In my experience he was quick, tidy and explained the fix clearly!'
    const result = correctComment(review, { at: day(4), reason: 'typo', comment: fixed })
    if (!result.ok) throw new Error(result.message)
    expect(result.value.comment).toBe(fixed)
    expect(result.value.answers).toEqual(review.answers)
    expect(result.value.submittedAt).toBe(review.submittedAt)
    expect(result.value.corrections).toEqual([{ at: day(4), reason: 'typo' }])
  })

  it('masks obscenity letter for letter, and changes nothing else', () => {
    const sweary = { ...review, comment: 'In my experience the damn boiler was sorted in an hour.' }
    const masked = 'In my experience the d*** boiler was sorted in an hour.'
    const result = correctComment(sweary, { at: day(4), reason: 'obscenity', comment: masked })
    expect(result).toMatchObject({ ok: true, value: { comment: masked } })

    for (const comment of [
      'In my experience the boiler was sorted in an hour.',
      'In my experience the dang boiler was sorted in an hour.',
      'In my experience the d*** boiler was sorted in a day.',
    ]) {
      expect(correctComment(sweary, { at: day(4), reason: 'obscenity', comment })).toMatchObject({
        ok: false,
        code: 'validation',
      })
    }
  })

  it('fixes typos, but never rewrites what the reviewer said', () => {
    const typos = {
      ...review,
      comment: 'In my experiance he was quick, tidy and explained teh fix.',
    }
    const fixed = 'In my experience he was quick, tidy and explained the fix.'
    expect(correctComment(typos, { at: day(4), reason: 'typo', comment: fixed }).ok).toBe(true)

    for (const comment of [
      'In my experience he was not quick, tidy and explained the fix.',
      'In my experience he was slow, tidy and explained the fix.',
      'In my experience he was quick, messy and explained nothing.',
    ]) {
      expect(correctComment(typos, { at: day(4), reason: 'typo', comment })).toMatchObject({
        ok: false,
        code: 'validation',
      })
    }
  })

  it('needs a comment to correct, still within the comment limits', () => {
    const { comment: _none, ...withoutComment } = review
    expect(
      correctComment(withoutComment, { at: day(4), reason: 'typo', comment: 'x'.repeat(40) }),
    ).toMatchObject({ code: 'invalid_state' })
    expect(
      correctComment(review, { at: day(4), reason: 'obscenity', comment: 'Fine.' }),
    ).toMatchObject({ code: 'validation' })
  })
})

describe('the "pending" label', () => {
  const report = (
    overrides: Partial<ContentReport>,
  ): Pick<ContentReport, 'target' | 'route' | 'status'> => ({
    target: { kind: 'rating', ratingId: review.id },
    route: 'fake',
    status: 'received',
    ...overrides,
  })

  it('shows only while a suspected-fake report is open', () => {
    expect(hasPendingFakeCheck(review.id, [report({})])).toBe(true)
    expect(hasPendingFakeCheck(review.id, [report({ status: 'in_review' })])).toBe(true)
    expect(hasPendingFakeCheck(review.id, [report({ status: 'resolved' })])).toBe(false)
  })

  it('never shows for other kinds of report, or reports about something else', () => {
    expect(hasPendingFakeCheck(review.id, [report({ route: 'defamation' })])).toBe(false)
    expect(hasPendingFakeCheck(review.id, [report({ route: 'data_protection' })])).toBe(false)
    expect(
      hasPendingFakeCheck(review.id, [
        report({ target: { kind: 'rating', ratingId: 'rating_other' } }),
      ]),
    ).toBe(false)
  })
})
