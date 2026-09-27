import {
  actingAs,
  owedForJob,
  saveDraft,
  submitRating,
  type RatingSubmission,
  type SubmitContext,
} from '@/domain/rating'
import type { Rating } from '@/domain/types'
import {
  JOB,
  PEOPLE,
  answersFor,
  day,
  makeJob,
  makeRating,
  makeTenancy,
  property,
} from './fixtures'

const owed = owedForJob(makeJob(), property, makeTenancy())

const context = (overrides: Partial<SubmitContext> = {}): SubmitContext => ({
  raterId: PEOPLE.graham,
  owed,
  ratings: [],
  now: day(4),
  newId: 'rating_new',
  ...overrides,
})

const grahamRatesKev = (
  overrides: Partial<RatingSubmission<'landlord->trade'>> = {},
): RatingSubmission<'landlord->trade'> => ({
  direction: 'landlord->trade',
  context: JOB,
  subjectId: PEOPLE.kev,
  answers: {
    properly_fixed: 5,
    price_matched_quote: 4,
    on_time: 5,
    kept_updated: 4,
    right_paperwork: 3,
  },
  ...overrides,
})

const COMMENT_30 = 'In my experience, very tidy!!'.padEnd(30, '!')

describe('who can rate, and when', () => {
  it('only lets someone rate where a rating is owed (rule 1)', () => {
    const stranger = submitRating(grahamRatesKev(), context({ raterId: PEOPLE.fiona }))
    expect(stranger).toMatchObject({ ok: false, code: 'forbidden' })

    const wrongPerson = submitRating(grahamRatesKev({ subjectId: PEOPLE.mhairi }), context())
    expect(wrongPerson).toMatchObject({ ok: false, code: 'forbidden' })

    const unfinished = owedForJob(makeJob({ status: 'in_progress' }), property, makeTenancy())
    expect(submitRating(grahamRatesKev(), context({ owed: unfinished }))).toMatchObject({
      ok: false,
      code: 'forbidden',
    })
  })

  it("won't take a rating before its window opens", () => {
    const early = submitRating(grahamRatesKev(), context({ now: day(1) }))
    expect(early).toMatchObject({ ok: false, code: 'invalid_state' })
  })

  it('refuses a rating once the window has closed', () => {
    expect(submitRating(grahamRatesKev(), context({ now: day(15, 23) })).ok).toBe(true)
    expect(submitRating(grahamRatesKev(), context({ now: day(16) }))).toMatchObject({
      ok: false,
      code: 'window_closed',
    })
  })

  it('lets a letting agent send it as the landlord they work for', () => {
    const agent = { personId: PEOPLE.agent, role: 'landlord' as const, actingForId: PEOPLE.graham }
    const result = submitRating(grahamRatesKev(), context({ raterId: actingAs(agent) }))
    expect(result.ok && result.value.rating.raterId).toBe(PEOPLE.graham)
  })
})

describe('what a rating must contain', () => {
  it('needs every question answered', () => {
    const result = submitRating(grahamRatesKev({ answers: { properly_fixed: 5 } }), context())
    expect(result).toMatchObject({ ok: false, code: 'validation' })
    expect(!result.ok && result.fields).toEqual({
      'answers.price_matched_quote': 'Choose an answer.',
      'answers.on_time': 'Choose an answer.',
      'answers.kept_updated': 'Choose an answer.',
      'answers.right_paperwork': 'Choose an answer.',
    })
  })

  it('only accepts points on the scale: Yes / Partly / No is 5, 3 or 1', () => {
    const result = submitRating(
      {
        direction: 'tenant->trade',
        context: JOB,
        subjectId: PEOPLE.kev,
        answers: { turned_up: 5, respectful: 5, left_tidy: 4, problem_fixed: 4 },
      },
      context({ raterId: PEOPLE.sarah }),
    )
    expect(!result.ok && result.fields).toEqual({
      'answers.problem_fixed': 'Choose one of the answers shown.',
    })
  })

  it('asks only the two repair questions about a current landlord', () => {
    const repair = (answers: Rating['answers']) =>
      submitRating(
        { direction: 'tenant->landlord', context: JOB, subjectId: PEOPLE.graham, answers },
        context({ raterId: PEOPLE.sarah }),
      )
    expect(repair({ fixed_quickly: 4, kept_informed: 3 }).ok).toBe(true)
    const extra = repair({ fixed_quickly: 4, kept_informed: 3, home_as_advertised: 2 })
    expect(!extra.ok && extra.fields).toEqual({
      'answers.home_as_advertised': "This question isn't asked this time.",
    })
  })

  it('rejects answers to questions from another relationship', () => {
    const answers = { ...grahamRatesKev().answers, paid_on_time: 5 as const }
    const result = submitRating(grahamRatesKev({ answers }), context())
    expect(!result.ok && result.fields).toEqual({
      'answers.paid_on_time': "This question isn't part of this rating.",
    })
  })

  it('takes an optional comment of 30 to 1,000 characters', () => {
    expect(submitRating(grahamRatesKev({ comment: COMMENT_30 }), context()).ok).toBe(true)
    expect(submitRating(grahamRatesKev({ comment: 'a'.repeat(1000) }), context()).ok).toBe(true)
    const short = submitRating(grahamRatesKev({ comment: COMMENT_30.slice(1) }), context())
    expect(!short.ok && short.fields.comment).toBe(
      'Write at least 30 characters, or leave this empty. You have 29.',
    )
    const long = submitRating(grahamRatesKev({ comment: 'a'.repeat(1001) }), context())
    expect(!long.ok && long.fields.comment).toBe(
      'Keep this to 1,000 characters or fewer. You have 1,001.',
    )
  })

  it('counts an emoji as one character', () => {
    const withEmoji = `${'a'.repeat(29)}👍`
    expect(submitRating(grahamRatesKev({ comment: withEmoji }), context()).ok).toBe(true)
  })

  it('stores no comment when it is left blank', () => {
    const result = submitRating(grahamRatesKev({ comment: '   ' }), context())
    expect(result.ok && 'comment' in result.value.rating).toBe(false)
  })

  it('blocks a comment that mentions a filtered topic, saying why', () => {
    const result = submitRating(
      grahamRatesKev({ comment: 'Great job. Call him on 07700 900123 if you need a plumber.' }),
      context(),
    )
    expect(result).toMatchObject({ ok: false, code: 'blocked_text' })
    expect(!result.ok && result.fields.comment).toBe(
      "Take out the phone number. Reviews can't include contact details.",
    )
  })

  it('reports every problem with the form at once', () => {
    const result = submitRating(grahamRatesKev({ answers: {}, comment: 'Too short.' }), context())
    expect(result).toMatchObject({ ok: false, code: 'validation' })
    expect(Object.keys(!result.ok ? result.fields : {})).toHaveLength(6)
  })

  it('keeps the private note to 1,000 characters', () => {
    const result = submitRating(grahamRatesKev({ privateNote: 'x'.repeat(1001) }), context())
    expect(!result.ok && result.fields.privateNote).toBe(
      'Keep this to 1,000 characters or fewer. You have 1,001.',
    )
  })

  it('names the person being rated without it counting as a third party', () => {
    const result = submitRating(
      grahamRatesKev({ comment: 'Kev turned up on time and explained everything clearly.' }),
      context({ filter: { allowedNames: ['Kev Mitchell'] } }),
    )
    expect(result.ok && result.value.moderation).toBeNull()
  })
})

describe('sending a rating', () => {
  it('seals it with everything the reveal needs', () => {
    const result = submitRating(
      grahamRatesKev({
        comment: '  In my experience a careful, tidy job at a fair price.  ',
        privateNote: 'Would use again for the bathroom.',
        wouldAgain: 'yes',
      }),
      context(),
    )
    if (!result.ok) throw new Error(result.message)
    expect(result.value.rating).toMatchObject({
      id: 'rating_new',
      direction: 'landlord->trade',
      raterId: PEOPLE.graham,
      subjectId: PEOPLE.kev,
      propertyId: property.id,
      seal: 'double_blind',
      state: 'sealed',
      comment: 'In my experience a careful, tidy job at a fair price.',
      privateNote: 'Would use again for the bathroom.',
      wouldAgain: 'yes',
      safetyFlag: false,
      createdAt: day(4),
      submittedAt: day(4),
      windowClosesAt: day(16),
      revealAt: day(30),
      corrections: [],
    })
    expect(result.value.newlyRevealed).toEqual([])
    expect(result.value.moderation).toBeNull()
  })

  it('sends a safety concern to moderation, and publishes all the same', () => {
    const result = submitRating(grahamRatesKev({ safetyFlag: true }), context())
    expect(result.ok && result.value.moderation).toEqual({ safetyConcern: true, flaggedTopics: [] })
    expect(result.ok && result.value.rating.state).toBe('sealed')
  })

  it('lets flagged words through and marks them for moderation', () => {
    const result = submitRating(
      grahamRatesKev({ comment: 'He was unwell but still came out and fixed it properly.' }),
      context(),
    )
    expect(result.ok && result.value.moderation).toEqual({
      safetyConcern: false,
      flaggedTopics: ['health'],
    })
  })

  it("can't be sent twice or changed afterwards (rule 2)", () => {
    const first = submitRating(grahamRatesKev(), context())
    if (!first.ok) throw new Error(first.message)
    const again = submitRating(
      grahamRatesKev({ answers: answersFor('landlord->trade', 1) }),
      context({ ratings: first.value.ratings, newId: 'rating_second' }),
    )
    expect(again).toMatchObject({ ok: false, code: 'already_done' })
  })

  it('turns a saved draft into the sent rating, keeping its id and start date', () => {
    const draft = saveDraft(grahamRatesKev({ answers: { properly_fixed: 5 } }), {
      ...context({ now: day(3) }),
      newId: 'rating_draft',
    })
    if (!draft.ok) throw new Error(draft.message)
    const sent = submitRating(grahamRatesKev(), context({ ratings: [draft.value] }))
    if (!sent.ok) throw new Error(sent.message)
    expect(sent.value.rating).toMatchObject({
      id: 'rating_draft',
      createdAt: day(3),
      state: 'sealed',
    })
    expect(sent.value.ratings).toHaveLength(1)
  })

  it('reveals everything on the job when the last rating owed arrives', () => {
    const emptyHome = owedForJob(makeJob({ tenancyId: undefined }), property, null)
    const fromKev = makeRating({
      direction: 'trade->landlord',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      state: 'sealed',
      revealedAt: undefined,
      revealAt: null,
      at: day(3),
    })
    const result = submitRating(grahamRatesKev(), context({ owed: emptyHome, ratings: [fromKev] }))
    if (!result.ok) throw new Error(result.message)
    expect(result.value.rating).toMatchObject({ state: 'revealed', revealedAt: day(4) })
    expect(result.value.newlyRevealed.sort()).toEqual([fromKev.id, 'rating_new'].sort())
    expect(result.value.ratings.every((rating) => rating.state === 'revealed')).toBe(true)
  })
})

describe('drafts', () => {
  it('keeps unfinished answers without asking for the rest', () => {
    const draft = saveDraft(
      grahamRatesKev({ answers: { on_time: 2 }, comment: 'Half wr' }),
      context(),
    )
    expect(draft.ok && draft.value).toMatchObject({
      state: 'draft',
      answers: { on_time: 2 },
      comment: 'Half wr',
      revealAt: null,
    })
    expect(draft.ok && draft.value.submittedAt).toBeUndefined()
  })

  it('still checks answers are on the scale and the comment fits', () => {
    const tooLong = saveDraft(grahamRatesKev({ comment: 'a'.repeat(1001) }), context())
    expect(tooLong).toMatchObject({ ok: false, code: 'validation' })
  })

  it('cannot be saved once the window has closed', () => {
    expect(saveDraft(grahamRatesKev(), context({ now: day(20) }))).toMatchObject({
      ok: false,
      code: 'window_closed',
    })
  })
})
