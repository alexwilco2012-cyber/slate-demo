import { DEMO_TODAY } from '@/data/seed'
import { addDaysToDate } from '@/data/local/dates'
import { callum, codeOf, derek, freshSlate, graham, kev, sarah } from './helpers'

const sandy = { personId: 'person_sandy', role: 'trade' } as const
const ian = { personId: 'person_ian', role: 'trade' } as const

describe('the tenant passport', () => {
  test('an all-or-nothing link that logs every view and can be revoked', async () => {
    const { api } = freshSlate()
    const share = await api.createPassportShare(sarah, 'For a flat in Ferryhill')
    const opened = await api.openPassportShare(share.token, 'person_graham')
    if (opened.status !== 'ok') throw new Error(`expected ok, got ${opened.status}`)
    expect(opened.passport.landlordCount).toBe(2)
    expect(opened.passport.reviews).toHaveLength(2)
    expect(opened.tenant).not.toHaveProperty('contact')

    const [logged] = await api.listPassportShares(sarah)
    expect(logged?.views).toEqual([
      expect.objectContaining({ viewerId: 'person_graham', viewerLabel: 'Signed-in landlord' }),
    ])
    const news = await api.listNotifications(sarah, true)
    expect(news.some((n) => n.kind === 'passport_viewed')).toBe(true)

    await api.revokePassportShare(sarah, share.id)
    expect((await api.openPassportShare(share.token)).status).toBe('revoked')
    expect((await api.openPassportShare('no-such-token')).status).toBe('not_found')
  })

  test('a link stops working after 30 days', async () => {
    const { api, demo } = freshSlate()
    const token = 'Xr4nB8vLq2MzT6wYk9Fc'
    expect((await api.openPassportShare(token)).status).toBe('ok')
    await demo.advanceClock(23)
    expect((await api.openPassportShare(token)).status).toBe('expired')
  })

  test('is never public: only the tenant sees their landlord ratings', async () => {
    const { api } = freshSlate()
    const asGraham = await api.listReviews(graham, {
      direction: 'landlord->tenant',
      subjectId: 'person_sarah',
    })
    expect(asGraham).toHaveLength(0)
    const asSarah = await api.listReviews(sarah, {
      direction: 'landlord->tenant',
      subjectId: 'person_sarah',
    })
    expect(asSarah).toHaveLength(2)
  })
})

describe('the job board', () => {
  test('the landlord picks a quote; the other trade hears they were not chosen', async () => {
    const { api } = freshSlate()
    const board = await api.listJobBoard(kev)
    const post = board.find((p) => p.jobId === 'job_gutter_jesmond')
    expect(post).toMatchObject({
      neighbourhood: 'Bridge of Don',
      postcodeDistrict: 'AB22',
      quoteCount: 2,
    })
    expect(post).not.toHaveProperty('addressLine')
    expect(await api.getJob(kev, 'job_gutter_jesmond')).toBeNull()

    const job = await api.acceptQuote(graham, 'quote_gutter_sandy')
    expect(job).toMatchObject({ tradeId: 'person_sandy', acceptedQuoteId: 'quote_gutter_sandy' })
    expect(job.timeline.at(-2)).toMatchObject({ kind: 'trade_chosen', route: 'job_board' })
    const ianQuotes = await api.listQuotes(ian, 'job_gutter_jesmond')
    expect(ianQuotes[0]?.status).toBe('declined')
    expect((await api.listNotifications(ian, true)).some((n) => n.kind === 'quote_declined')).toBe(
      true,
    )
    expect((await api.getJob(sandy, 'job_gutter_jesmond'))?.status).toBe('quoting')
    expect(await api.listJobBoard(kev)).not.toContainEqual(
      expect.objectContaining({ jobId: 'job_gutter_jesmond' }),
    )
  })
})

describe('messages', () => {
  test('carry role chips, notify the other members and respect blocks and mutes', async () => {
    const { api } = freshSlate()
    const thread = await api.getThreadFor(sarah, { kind: 'job', jobId: 'job_eicr_esslemont' })
    await api.setThreadMuted(graham, thread.id, true)
    const sent = await api.sendMessage(sarah, thread.id, { body: 'Could we make it 10am instead?' })
    expect(sent.author).toEqual({ personId: 'person_sarah', role: 'tenant' })

    const forAgent = await api.listNotifications(
      { personId: 'person_aileen', role: 'landlord', actingForId: 'person_graham' },
      true,
    )
    expect(forAgent.some((n) => n.kind === 'message' && n.ref?.id === sent.id)).toBe(true)
    const forGraham = await api.listNotifications(graham, true)
    expect(forGraham.some((n) => n.ref?.id === sent.id)).toBe(false)

    const neil = { personId: 'person_neil', role: 'trade' } as const
    const summary = (await api.listThreads(neil)).find((s) => s.thread.id === thread.id)
    expect(summary?.unreadCount).toBe(1)
    await api.setBlocked(neil, 'person_sarah', true)
    const visible = await api.listMessages(neil, thread.id)
    expect(visible.some((m) => m.id === sent.id)).toBe(false)
    expect(await codeOf(api.sendMessage(kev, thread.id, { body: 'Hello' }))).toBe('forbidden')
  })
})

describe('reviews after the reveal', () => {
  test('the rated person replies once and can dispute; the reviewer adds one update', async () => {
    const { api, demo } = freshSlate()
    await demo.advanceClock(3) // Niamh's window closes and her review of Graham is revealed.
    const review = 'rating_fonthill_niamh_graham'
    const reply = await api.replyToReview(
      graham,
      review,
      'Thank you. It was a pleasure having you in the flat.',
    )
    expect(reply.authorId).toBe('person_graham')
    expect(await codeOf(api.replyToReview(graham, review, 'A second go.'))).toBe('already_done')
    expect(await codeOf(api.replyToReview(sarah, review, 'Not mine to answer.'))).toBe('forbidden')

    const dispute = await api.disputeReview(derek, 'rating_rosemount_connor_derek')
    expect(dispute.ratingId).toBe('rating_rosemount_connor_derek')
    const [shown] = (
      await api.listReviews(kev, { direction: 'tenant->landlord', subjectId: 'person_derek' })
    ).filter((r) => r.ratingId === 'rating_rosemount_connor_derek')
    expect(shown?.dispute).toBeDefined()

    const update = await api.addReviewUpdate(
      sarah,
      'rating_bath_sarah_kev',
      'Update: well over a year on and the bath has not leaked once since.',
    )
    expect(update.authorId).toBe('person_sarah')
  })

  test('a reply that gives a phone number is blocked', async () => {
    const { api, demo } = freshSlate()
    await demo.advanceClock(3)
    expect(
      await codeOf(
        api.replyToReview(
          graham,
          'rating_fonthill_niamh_graham',
          'Call me on 07700 900555 to talk it over.',
        ),
      ),
    ).toBe('blocked_text')
  })

  test('a reply may not name the reviewer, who is only ever "Verified tenant"', async () => {
    const { api, demo } = freshSlate()
    await demo.advanceClock(3)
    expect(
      await codeOf(
        api.replyToReview(
          graham,
          'rating_fonthill_niamh_graham',
          'Thank you, Niamh. It was a pleasure having you in the flat.',
        ),
      ),
    ).toBe('blocked_text')
  })

  test('at 36 months a review stops counting and what it said is deleted', async () => {
    const { api, demo, store } = freshSlate()
    const id = 'rating_rosemount_callum_derek' // Written on 5 March 2024.
    const before = store.getState().data.tables.ratings[id]
    expect(before?.comment).toBeDefined()

    await demo.advanceClock(170)
    const after = store.getState().data.tables.ratings[id]
    expect(after?.state).toBe('removed')
    expect(after?.removal?.reason).toBe('expired')
    expect(after?.comment).toBeUndefined()
    expect(after?.privateNote).toBeUndefined()
    expect(after?.wouldAgain).toBeUndefined()
    expect(after?.answers).toEqual({})
    const reviews = await api.listReviews(kev, {
      direction: 'tenant->landlord',
      subjectId: 'person_derek',
    })
    expect(reviews.some((r) => r.ratingId === id)).toBe(false)
  })

  test('a restricted review is hidden and does not count', async () => {
    const { api } = freshSlate()
    const reviews = await api.listReviews(graham, {
      direction: 'landlord->trade',
      subjectId: 'person_sandy',
    })
    expect(reviews).toHaveLength(0)
    expect((await api.getTradeScore(graham, 'person_sandy')).fromLandlords.reviewCount).toBe(0)
  })
})

describe('reports', () => {
  test('each route starts its clock, and the same report cannot be sent twice', async () => {
    const { api } = freshSlate()
    const target = { kind: 'rating', ratingId: 'rating_victoria_sarah_derek' } as const
    const report = await api.submitReport(derek, {
      target,
      route: 'fake',
      details: 'I do not believe this person ever rented from me.',
    })
    expect(report.clocks[0]?.step).toBe('review')
    expect(report.clocks[0]?.dueAt > report.submittedAt).toBe(true)
    const [review] = (
      await api.listReviews(kev, { direction: 'tenant->landlord', subjectId: 'person_derek' })
    ).filter((r) => r.ratingId === target.ratingId)
    expect(review?.pendingFakeCheck).toBe(true)
    expect(
      await codeOf(
        api.submitReport(derek, { target, route: 'fake', details: 'Reporting it again.' }),
      ),
    ).toBe('already_done')
  })
})

describe('signing up', () => {
  test('a magic link creates the account, and credentials are checked a day later', async () => {
    const { api, demo } = freshSlate()
    const sent = await api.signUp({
      displayName: 'Ali Ferguson',
      email: 'ali.ferguson@example.com',
      role: 'trade',
      postcodeDistrict: 'ab24',
      confirmsAdult: true,
      claims: [
        { kind: 'id_check' },
        { kind: 'gas_safe', registrationNumber: '6043217', applianceCategories: ['boilers'] },
      ],
      tradeProfile: {
        businessName: 'Ferguson Heating',
        trades: ['gas_engineer'],
        serviceDistricts: ['AB24'],
        vatRegistered: false,
      },
    })
    expect(sent.demoToken).toBeDefined()
    const person = await api.completeMagicLink(sent.demoToken ?? '')
    expect(person).toMatchObject({ postcodeDistrict: 'AB24', roles: ['trade'], badges: [] })
    expect(await codeOf(api.completeMagicLink(sent.demoToken ?? ''))).toBe('link_expired')

    await demo.advanceClock(1)
    const me = await api.getMe({ personId: person.id, role: 'trade' })
    expect(me.badges.map((b) => b.kind).sort()).toEqual(['gas_safe', 'id_check'])
    expect(me.pendingVerifications).toHaveLength(0)
  })

  test('refuses under-18s, duplicate emails and trade credentials on the wrong account', async () => {
    const { api } = freshSlate()
    const base = {
      displayName: 'Test Person',
      email: 'someone@example.com',
      role: 'tenant' as const,
      postcodeDistrict: 'AB10',
      claims: [],
    }
    expect(await codeOf(api.signUp({ ...base, confirmsAdult: false as unknown as true }))).toBe(
      'validation',
    )
    expect(
      await codeOf(api.signUp({ ...base, confirmsAdult: true, email: 'sarah.laing@example.com' })),
    ).toBe('validation')
    expect(
      await codeOf(
        api.signUp({ ...base, confirmsAdult: true, claims: [{ kind: 'electrical_checklist' }] }),
      ),
    ).toBe('validation')
  })
})

describe('documents and the compliance calendar', () => {
  test('a renewal booked in time shows as booked; the new certificate replaces the old', async () => {
    const { api } = freshSlate()
    const calendar = await api.getComplianceCalendar(graham, 'property_esslemont')
    expect(calendar.find((i) => i.type === 'eicr')).toMatchObject({
      status: 'BOOKED',
      bookedFor: '2026-09-29',
    })

    const old = calendar.find((i) => i.type === 'eicr')?.document
    const uploaded = await api.uploadDocument(graham, {
      type: 'eicr',
      propertyId: 'property_esslemont',
      file: { name: 'EICR 2026.pdf', url: 'placeholder://document/eicr-2026' },
      issuedAt: DEMO_TODAY,
      sharedWithTenant: true,
      ...(old ? { replacesId: old.id } : {}),
    })
    expect(uploaded.expiresAt).toBe(addDaysToDate('2031-09-26', 0))
    const after = await api.getComplianceCalendar(graham, 'property_esslemont')
    expect(after.find((i) => i.type === 'eicr')).toMatchObject({ status: 'OK' })
    const visibleToSarah = await api.listDocuments(sarah, { type: 'eicr' })
    expect(visibleToSarah.map((d) => d.id)).toEqual([uploaded.id])
  })

  test('tenants see only what is shared on their current tenancy; trades see none', async () => {
    const { api } = freshSlate()
    const docs = await api.listDocuments(sarah)
    expect(docs.length).toBeGreaterThan(0)
    for (const doc of docs) {
      expect(doc.sharedWithTenant).toBe(true)
      expect(doc.propertyId).toBe('property_esslemont')
    }
    expect(docs.some((d) => d.type === 'insurance')).toBe(false)
    expect(await api.listDocuments(kev)).toEqual([])
  })
})

describe('tenancies', () => {
  test('both sides confirm before it counts', async () => {
    const { api } = freshSlate()
    const actions = await api.listActionsNeeded(callum)
    expect(actions).toContainEqual({
      kind: 'confirm_tenancy',
      tenancyId: 'tenancy_callum_fonthill',
    })
    const confirmed = await api.confirmTenancy(callum, 'tenancy_callum_fonthill')
    expect(confirmed.status).toBe('confirmed')
    expect(await codeOf(api.confirmTenancy(callum, 'tenancy_callum_fonthill'))).toBe('already_done')
  })
})
