import type { ContextRef, Job } from '@/domain/types'
import { addDaysToDate, hoursBetween, ukDate, ukDateTime } from '@/data/local/dates'
import { STORAGE_KEY, memoryStorage } from '@/data/local'
import { DEMO_NOW, DEMO_TODAY } from '@/data/seed'
import { aileen, codeOf, derek, freshSlate, graham, kev, liam, mhairi, sarah } from './helpers'

const inDays = (days: number, time = '09:00') => ukDateTime(addDaysToDate(DEMO_TODAY, days), time)

describe('a leak, from report to reveal', () => {
  test('every party plays their part and the ratings are revealed together', async () => {
    const { api, demo } = freshSlate()

    // Sarah reports it.
    const reported = await api.createJob(sarah, {
      propertyId: 'property_esslemont',
      room: 'kitchen',
      category: 'leak',
      description: 'Water is dripping from the pipe under the kitchen sink into the cupboard.',
      photos: [{ url: 'placeholder://photo/new-leak', alt: 'Wet cupboard floor under a sink' }],
      urgency: 'urgent',
      access: {
        windows: [{ date: addDaysToDate(DEMO_TODAY, 3), slot: 'morning' }],
        keyAllowed: true,
      },
    })
    expect(reported.status).toBe('reported')
    expect(reported.title).toBe('Leak or drip in the kitchen')
    expect(reported.tenancyId).toBe('tenancy_sarah_esslemont')
    const jobId = reported.id

    // It appears for Graham, and for his agent, as something to approve.
    const grahamActions = await api.listActionsNeeded(graham)
    expect(grahamActions).toContainEqual({ kind: 'approve_job', jobId })
    const grahamNews = await api.listNotifications(aileen, true)
    expect(grahamNews.some((n) => n.kind === 'job_reported' && n.ref?.id === jobId)).toBe(true)

    // The agent approves and chooses Kev from Graham's saved trades.
    expect((await api.approveJob(aileen, jobId)).status).toBe('approved')
    const chosen = await api.chooseTrade(aileen, jobId, {
      tradeId: 'person_kev',
      route: 'saved_trades',
    })
    expect(chosen).toMatchObject({ status: 'quoting', tradeId: 'person_kev' })
    expect(await api.listActionsNeeded(kev)).toContainEqual({ kind: 'send_quote', jobId })

    // Kev quotes; totals are worked out, never typed in. He isn't VAT registered.
    const quote = await api.submitQuote(kev, {
      jobId,
      lineItems: [
        {
          description: 'Call-out, including the first half hour',
          kind: 'callout',
          quantity: 1,
          unitPence: 5500,
        },
        {
          description: 'Sink waste trap and fittings',
          kind: 'materials',
          quantity: 1,
          unitPence: 1200,
        },
      ],
      validUntil: addDaysToDate(DEMO_TODAY, 14),
    })
    expect(quote).toMatchObject({ subtotalPence: 6700, vatPence: 0, totalPence: 6700 })

    // Graham accepts it, then instructs Kev: nothing can be booked until he does.
    const accepted = await api.acceptQuote(graham, quote.id)
    expect(accepted).toMatchObject({ acceptedQuoteId: quote.id, status: 'quoting' })
    expect(await api.listActionsNeeded(graham)).toContainEqual({ kind: 'instruct_trade', jobId })
    expect(
      await codeOf(
        api.bookVisit(kev, jobId, {
          purpose: 'repair',
          startsAt: inDays(3, '09:00'),
          endsAt: inDays(3, '10:30'),
          emergency: false,
        }),
      ),
    ).toBe('invalid_state')
    const instructed = await api.instructTrade(graham, jobId, {
      note: 'The stopcock is in the hall.',
    })
    expect(instructed.status).toBe('instructed')
    expect(instructed.timeline.at(-1)).toMatchObject({
      kind: 'trade_instructed',
      tradeId: 'person_kev',
      quoteId: quote.id,
      actorId: 'person_graham',
    })
    expect(await api.listActionsNeeded(kev)).toContainEqual({ kind: 'book_visit', jobId })

    // Less than 48 hours' notice is refused; four days is fine and posts the written notice.
    expect(
      await codeOf(
        api.bookVisit(kev, jobId, {
          purpose: 'repair',
          startsAt: inDays(1, '10:00'),
          endsAt: inDays(1, '11:00'),
          emergency: false,
        }),
      ),
    ).toBe('notice_too_short')
    const booked = await api.bookVisit(kev, jobId, {
      purpose: 'repair',
      startsAt: inDays(3, '09:00'),
      endsAt: inDays(3, '10:30'),
      emergency: false,
    })
    expect(booked.status).toBe('booked')
    const visit = booked.visits[0]!
    expect(visit.notice.hoursGiven).toBeGreaterThanOrEqual(48)
    const thread = await api.getThreadFor(sarah, { kind: 'job', jobId })
    const notice = (await api.listMessages(sarah, thread.id)).find(
      (m) => m.id === visit.notice.messageId,
    )
    expect(notice).toMatchObject({
      kind: 'notice',
      author: { personId: 'person_kev', role: 'trade' },
    })
    expect(notice?.body).toContain('Tuesday 29 September between 9am and 10:30am')
    expect(
      (await api.listNotifications(sarah, true)).some(
        (n) => n.kind === 'visit_booked' && n.ref?.id === jobId,
      ),
    ).toBe(true)

    // The day comes: Kev arrives, fixes it and marks it done.
    await demo.advanceClock(3)
    expect((await api.startVisit(kev, jobId, visit.id)).status).toBe('in_progress')
    const done = await api.markComplete(kev, jobId, {
      finalPricePence: 6700,
      note: 'New trap seal fitted. Dry after testing.',
      photos: [],
    })
    expect(done.status).toBe('completed')

    // Sarah confirms the visit; Graham confirms the job.
    await api.confirmVisit(sarah, jobId, visit.id)
    expect((await api.confirmJob(graham, jobId)).status).toBe('confirmed')

    // Everyone now owes a rating on this job.
    const onJob = <T extends { context: ContextRef }>(tasks: T[]) =>
      tasks.filter((t) => t.context.kind === 'job' && t.context.jobId === jobId)
    expect(
      onJob(await api.listRatingTasks(sarah))
        .map((t) => t.direction)
        .sort(),
    ).toEqual(['tenant->landlord', 'tenant->trade'])
    expect(onJob(await api.listRatingTasks(kev))).toHaveLength(2)
    expect(onJob(await api.listRatingTasks(aileen))).toHaveLength(1)

    const context = { kind: 'job', jobId } as const
    const kevOnSarah = await api.submitRating(kev, {
      direction: 'trade->tenant',
      context,
      subjectId: 'person_sarah',
      answers: { access_given: 5, felt_safe: 5, clear_information: 4 },
    })
    expect(kevOnSarah.state).toBe('sealed')
    // "Leave yours to see what they said about you."
    const sarahTasks = onJob(await api.listRatingTasks(sarah))
    expect(sarahTasks.find((t) => t.direction === 'tenant->trade')?.counterpartHasRated).toBe(true)

    await api.submitRating(sarah, {
      direction: 'tenant->trade',
      context,
      subjectId: 'person_kev',
      answers: { turned_up: 5, respectful: 5, left_tidy: 4, problem_fixed: 5 },
      comment: 'Arrived on time, explained what had failed and left the cupboard dry and tidy.',
      wouldAgain: 'yes',
    })
    const shielded = await api.submitRating(sarah, {
      direction: 'tenant->landlord',
      context,
      subjectId: 'person_graham',
      answers: { fixed_quickly: 5, kept_informed: 4 },
    })
    expect(shielded.seal).toBe('retaliation_shield')
    const kevOnGraham = await api.submitRating(kev, {
      direction: 'trade->landlord',
      context,
      subjectId: 'person_graham',
      answers: { clear_description: 5, paid_on_time: 5, arranged_access: 5, fair_to_deal_with: 5 },
    })
    expect(kevOnGraham.state).toBe('sealed')

    // Still sealed: the landlord hasn't rated Kev yet, so nobody sees anything.
    const beforeReveal = await api.listReviews(mhairi, {
      direction: 'tenant->trade',
      subjectId: 'person_kev',
    })
    expect(
      beforeReveal.some((r) => r.context.kind === 'job' && r.context.title === done.title),
    ).toBe(false)

    // The last one in reveals everything owed on the job, at the same moment.
    const agentOnKev = await api.submitRating(aileen, {
      direction: 'landlord->trade',
      context,
      subjectId: 'person_kev',
      answers: {
        properly_fixed: 5,
        price_matched_quote: 5,
        on_time: 5,
        kept_updated: 4,
        right_paperwork: 4,
      },
    })
    expect(agentOnKev.state).toBe('revealed')
    const revealed = await Promise.all(
      [kevOnSarah.id, kevOnGraham.id, agentOnKev.id].map((id) => api.getRating(kev, id)),
    )
    const mine = revealed.filter((r) => r !== null)
    expect(new Set(mine.map((r) => r.revealedAt)).size).toBe(1)

    const job = (await api.getJob(graham, jobId)) as Job
    expect(job.timeline.map((e) => e.kind)).toEqual(
      expect.arrayContaining(['ratings_opened', 'ratings_revealed']),
    )
    const tenantReviews = await api.listReviews(mhairi, {
      direction: 'tenant->trade',
      subjectId: 'person_kev',
    })
    const review = tenantReviews.find(
      (r) => r.context.kind === 'job' && r.context.title === done.title,
    )
    expect(review).toMatchObject({
      reviewer: { role: 'tenant', postcodeDistrict: 'AB25', year: 2026 },
    })
    expect(review).not.toHaveProperty('raterId')

    // Trade->landlord is for trades and the landlord only; the shield rating never shows alone.
    const clientReviews = await api.listReviews(mhairi, {
      direction: 'trade->landlord',
      subjectId: 'person_graham',
    })
    expect(clientReviews.some((r) => r.ratingId === kevOnGraham.id)).toBe(true)
    const asTenant = await api.listReviews(sarah, {
      direction: 'trade->landlord',
      subjectId: 'person_graham',
    })
    expect(asTenant).toHaveLength(0)
    const landlordReviews = await api.listReviews(mhairi, {
      direction: 'tenant->landlord',
      subjectId: 'person_graham',
    })
    expect(landlordReviews.some((r) => r.ratingId === shielded.id)).toBe(false)
    expect((await api.getRating(sarah, shielded.id))?.state).toBe('sealed')
    expect(await api.getRating(graham, shielded.id)).toBeNull()

    // Rated people are told at the reveal; ratings never change afterwards.
    const kevNews = await api.listNotifications(kev, true)
    expect(kevNews.some((n) => n.kind === 'ratings_revealed' && n.ref?.id === agentOnKev.id)).toBe(
      true,
    )
    expect(
      await codeOf(
        api.submitRating(sarah, {
          direction: 'tenant->trade',
          context,
          subjectId: 'person_kev',
          answers: { turned_up: 1, respectful: 1, left_tidy: 1, problem_fixed: 1 },
        }),
      ),
    ).toBe('already_done')
    expect(await api.getAccessGiven(graham, jobId)).toBe(true)
  })
})

describe('rules the store enforces', () => {
  test('a gas job only goes to a Gas Safe engineer with the right category', async () => {
    const { api } = freshSlate()
    const job = await api.createJob(aileen, {
      propertyId: 'property_jesmond',
      room: 'whole_home',
      category: 'safety_check',
      description: 'Annual gas safety check for the boiler and the hob.',
      photos: [],
      urgency: 'routine',
      access: { windows: [], keyAllowed: true },
      complianceType: 'gas_safety',
    })
    expect(job.status).toBe('approved')
    expect(
      await codeOf(
        api.chooseTrade(aileen, job.id, { tradeId: 'person_kev', route: 'saved_trades' }),
      ),
    ).toBe('credential_mismatch')
    const chosen = await api.chooseTrade(aileen, job.id, {
      tradeId: 'person_mhairi',
      route: 'saved_trades',
    })
    expect(chosen.tradeId).toBe('person_mhairi')
  })

  test('comments that name health or give a phone number are blocked', async () => {
    const { api } = freshSlate()
    const check = await api.checkText('Lovely job. Call me on 07700 900123 if you need anything.')
    expect(check.blocked).toBe(true)
    expect(check.issues.map((i) => i.topic)).toContain('phone_number')
    expect(
      (await api.checkText('Fixed the black mould and the child lock on the window.')).blocked,
    ).toBe(false)
  })

  test('only the people involved can act, and agents only within their permissions', async () => {
    const { api } = freshSlate()
    expect(await codeOf(api.approveJob(sarah, 'job_fan_union'))).toBe('forbidden')
    expect(await codeOf(api.approveJob(derek, 'job_fan_union'))).toBe('forbidden')
    expect(await codeOf(api.getMe({ personId: 'person_sarah', role: 'landlord' }))).toBe(
      'forbidden',
    )
    expect(await api.getJob(liam, 'job_fan_union')).toBeNull()
    expect(await api.listQuotes(sarah, 'job_gutter_jesmond')).toEqual([])
    expect(await api.listQuotes(graham, 'job_gutter_jesmond')).toHaveLength(2)
  })

  test('a rating window closes, and the other side is revealed anyway', async () => {
    const { api, demo } = freshSlate()
    const niamhOnGraham = 'rating_fonthill_niamh_graham'
    expect(await api.getRating(graham, niamhOnGraham)).toBeNull()
    await demo.advanceClock(3)
    expect(
      await codeOf(
        api.submitRating(graham, {
          direction: 'landlord->tenant',
          context: { kind: 'tenancy', tenancyId: 'tenancy_niamh_fonthill' },
          subjectId: 'person_niamh',
          answers: {
            rent_on_time: 5,
            looked_after_home: 5,
            easy_to_reach: 5,
            allowed_access: 5,
            left_as_expected: 5,
          },
        }),
      ),
    ).toBe('window_closed')
    expect(await api.getRating(graham, niamhOnGraham)).toBeNull()
    const review = await api.getReview(graham, niamhOnGraham)
    expect(review).toMatchObject({ aboutMe: true, mine: false, can: { reply: true } })
    expect(review?.review.reviewer.role).toBe('tenant')
  })

  test('the radiator job stays sealed until Graham rates, then Mhairi gets her third reviewer', async () => {
    const { api } = freshSlate()
    expect((await api.getTradeScore(graham, 'person_mhairi')).fromLandlords.score).toBeNull()
    expect((await api.getRating(sarah, 'rating_radiator_sarah_mhairi'))?.state).toBe('sealed')
    await api.submitRating(graham, {
      direction: 'landlord->trade',
      context: { kind: 'job', jobId: 'job_radiator_esslemont' },
      subjectId: 'person_mhairi',
      answers: {
        properly_fixed: 5,
        price_matched_quote: 5,
        on_time: 5,
        kept_updated: 5,
        right_paperwork: 5,
      },
    })
    const score = await api.getTradeScore(graham, 'person_mhairi')
    expect(score.fromLandlords.reviewerCount).toBe(3)
    expect(score.fromLandlords.score).not.toBeNull()
    // Sarah's rating and Mhairi's rating of her are revealed at the same moment.
    const sarahs = await api.getRating(sarah, 'rating_radiator_sarah_mhairi')
    expect(sarahs?.state).toBe('revealed')
    const aboutSarah = await api.listReviews(sarah, {
      direction: 'trade->tenant',
      subjectId: 'person_sarah',
    })
    const mhairis = aboutSarah.find((r) => r.ratingId === 'rating_radiator_mhairi_sarah')
    expect(mhairis?.revealedAt).toBe(sarahs?.revealedAt)
  })

  test('a tenancy ending in the future ends by itself when the day has passed', async () => {
    const { api, demo } = freshSlate()
    const callumSpital = await api.getTenancy(
      { personId: 'person_irene', role: 'landlord' },
      'tenancy_callum_spital',
    )
    expect(callumSpital?.status).toBe('confirmed')
    await demo.advanceClock(5)
    const after = await api.getTenancy(
      { personId: 'person_irene', role: 'landlord' },
      'tenancy_callum_spital',
    )
    expect(after?.status).toBe('ended')
    const tasks = await api.listRatingTasks({ personId: 'person_callum', role: 'tenant' })
    expect(tasks.some((t) => t.context.kind === 'tenancy' && t.status === 'to_do')).toBe(true)
  })
})

describe('saving and resetting', () => {
  test('changes are saved under slate-demo-v1 and a new instance picks them up', async () => {
    const storage = memoryStorage()
    const first = freshSlate({ storage })
    await first.api.sendMessage(sarah, 'thread_radiator_esslemont', {
      body: 'Still toasty, thanks again!',
    })
    expect(Object.keys(storage.dump())).toContain(STORAGE_KEY)

    const second = freshSlate({ storage })
    const messages = await second.api.listMessages(sarah, 'thread_radiator_esslemont')
    expect(messages.at(-1)?.body).toBe('Still toasty, thanks again!')
    expect(second.store.getState().revision).toBe(first.store.getState().revision)
  })

  test('reset puts everything back to the seed', async () => {
    const { api, demo } = freshSlate()
    await api.approveJob(graham, 'job_fan_union')
    await demo.advanceClock(2)
    await demo.reset()
    expect((await api.getJob(graham, 'job_fan_union'))?.status).toBe('reported')
    expect(demo.now()).toBe(DEMO_NOW)
  })

  test('the demo clock moves on a little with each change, and jumps with advanceClock', async () => {
    let real = 0
    const { api, demo } = freshSlate({ realNow: () => real })
    real += 90_000
    await api.markThreadRead(sarah, 'thread_radiator_esslemont')
    expect(hoursBetween(DEMO_NOW, demo.now())).toBeCloseTo(90 / 3600)
    real += 3 * 86_400_000
    await api.markNotificationsRead(sarah, 'all')
    // Capped at five minutes, so a demo left open for days keeps its story.
    expect(hoursBetween(DEMO_NOW, demo.now())).toBeCloseTo((90 + 300) / 3600)
    await demo.advanceClock(1)
    expect(ukDate(demo.now())).toBe(addDaysToDate(DEMO_TODAY, 1))
  })

  test('returned records are copies: changing one does not change the store', async () => {
    const { api } = freshSlate()
    const job = await api.getJob(graham, 'job_fan_union')
    if (!job) throw new Error('missing job')
    job.status = 'cancelled'
    expect((await api.getJob(graham, 'job_fan_union'))?.status).toBe('reported')
  })
})
