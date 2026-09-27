// The write flows the portals added on top of the foundations: team invites, cancelling a job,
// the landlord's explicit instruction, withdrawing a quote, invoices and payments, answering a
// report, and reading a conversation.

import type { Viewer } from '@/data/api'
import { addDaysToDate } from '@/data/local/dates'
import { DEMO_TODAY } from '@/data/seed'
import { aileen, codeOf, derek, freshSlate, graham, kev, sarah } from './helpers'

const hannah: Viewer = { personId: 'person_hannah', role: 'landlord' }
const aileenOwn: Viewer = { personId: 'person_aileen', role: 'landlord' }
const aileenForHannah: Viewer = { ...aileenOwn, actingForId: 'person_hannah' }
const irene: Viewer = { personId: 'person_irene', role: 'landlord' }
const sandy: Viewer = { personId: 'person_sandy', role: 'trade' }
const callum: Viewer = { personId: 'person_callum', role: 'tenant' }
const eilidh: Viewer = { personId: 'person_eilidh', role: 'tenant' }

const inviteFromHannah = (api: ReturnType<typeof freshSlate>['api']) =>
  api.inviteAgent(hannah, {
    agencyId: 'agency_leask_ogston',
    email: 'aileen.christie@example.co.uk',
    permissions: ['approve_repairs', 'message'],
    propertyIds: ['property_polmuir'],
  })

describe('team invites', () => {
  test('the agent accepts, and only then can act for the landlord', async () => {
    const { api } = freshSlate()
    const invite = await inviteFromHannah(api)
    expect(invite.status).toBe('invited')
    expect(await codeOf(api.listJobs(aileenForHannah))).toBe('forbidden')
    expect(await api.listActionsNeeded(aileenOwn)).toContainEqual({
      kind: 'answer_team_invite',
      membershipId: invite.id,
    })

    const accepted = await api.acceptTeamInvite(aileenOwn, invite.id)
    expect(accepted).toMatchObject({ status: 'active', acceptedAt: expect.any(String) })
    const jobs = await api.listJobs(aileenForHannah)
    expect(jobs.some((j) => j.id === 'job_tap_polmuir')).toBe(true)
    const news = await api.listNotifications(hannah, true)
    expect(news.find((n) => n.kind === 'team_invite')?.title).toBe(
      'Aileen Christie joined your team',
    )
    expect(await codeOf(api.acceptTeamInvite(aileenOwn, invite.id))).toBe('already_done')
  })

  test('the agent declines: taken off the homes, told to the landlord, and can be asked again', async () => {
    const { api } = freshSlate()
    const invite = await inviteFromHannah(api)
    expect(await codeOf(api.declineTeamInvite(graham, invite.id))).toBe('forbidden')
    const declined = await api.declineTeamInvite(aileenOwn, invite.id)
    expect(declined).toMatchObject({ status: 'declined', declinedAt: expect.any(String) })
    const polmuir = await api.getProperty(hannah, 'property_polmuir')
    expect(polmuir?.agentIds).not.toContain('person_aileen')
    const news = await api.listNotifications(hannah, true)
    expect(news.some((n) => n.title === 'Aileen Christie declined your invitation')).toBe(true)
    expect(await codeOf(api.acceptTeamInvite(aileenOwn, invite.id))).toBe('already_done')
    expect((await inviteFromHannah(api)).status).toBe('invited')
  })
})

describe('cancelling a job', () => {
  test('tells everyone, including trades who quoted from the board, and closes the board', async () => {
    const { api } = freshSlate()
    expect(await codeOf(api.cancelJob(kev, 'job_basin_king', 'Not needed'))).toBe('forbidden')
    const cancelled = await api.cancelJob(
      aileen,
      'job_basin_king',
      'Eilidh tightened it herself and it has stopped dripping.',
    )
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.timeline.at(-1)).toMatchObject({ kind: 'cancelled' })
    const [quote] = await api.listQuotes(kev, 'job_basin_king')
    expect(quote?.status).toBe('declined')
    expect((await api.listJobBoard(kev)).some((p) => p.jobId === 'job_basin_king')).toBe(false)

    const kevNews = await api.listNotifications(kev, true)
    expect(kevNews.find((n) => n.kind === 'job_cancelled')).toMatchObject({
      title: 'Cancelled, so no longer needed: Bathroom basin tap loose and dripping',
      href: '/trade/board',
    })
    const eilidhNews = await api.listNotifications(eilidh, true)
    expect(eilidhNews.find((n) => n.kind === 'job_cancelled')?.body).toContain('tightened it')
    const thread = await api.getThreadFor(eilidh, { kind: 'job', jobId: 'job_basin_king' })
    const last = (await api.listMessages(eilidh, thread.id)).at(-1)
    expect(last).toMatchObject({ kind: 'system', author: null })
    expect(last?.body).toContain('cancelled this job')

    expect(await codeOf(api.cancelJob(aileen, 'job_basin_king', 'Again'))).toBe('already_done')
  })

  test('cancels a booked visit and tells the trade and the tenant', async () => {
    const { api } = freshSlate()
    const cancelled = await api.cancelJob(
      irene,
      'job_taps_spital',
      'The new tenant has asked for new taps, so we will replace them after the move.',
    )
    expect(cancelled.visits.every((v) => v.status === 'cancelled')).toBe(true)
    for (const viewer of [kev, callum]) {
      const news = await api.listNotifications(viewer, true)
      expect(news.some((n) => n.kind === 'job_cancelled' && n.ref?.id === 'job_taps_spital')).toBe(
        true,
      )
    }
  })

  test('is refused once the work has started', async () => {
    const { api } = freshSlate()
    const beata: Viewer = { personId: 'person_beata', role: 'tenant' }
    expect(await codeOf(api.cancelJob(beata, 'job_toilet_walker', 'Changed my mind'))).toBe(
      'invalid_state',
    )
  })
})

describe('the landlord instructs the trade they chose', () => {
  test('"Accept and instruct" records both steps and sends the trade one message', async () => {
    const { api } = freshSlate()
    const job = await api.acceptQuote(aileen, 'quote_basin_kev', {
      instruct: true,
      note: 'Eilidh works from home on Mondays.',
    })
    expect(job.status).toBe('instructed')
    const kinds = job.timeline.map((e) => e.kind)
    expect(kinds.slice(-3)).toEqual(['trade_chosen', 'quote_accepted', 'trade_instructed'])
    const kevNews = await api.listNotifications(kev, true)
    const about = kevNews.filter(
      (n) => n.ref?.id === 'job_basin_king' || n.ref?.id === 'quote_basin_kev',
    )
    expect(about.map((n) => n.kind)).toEqual(['trade_instructed'])
    expect(about[0]?.body).toContain('Go ahead at £64.00.')
    expect(about[0]?.body).toContain('Eilidh works from home on Mondays.')
    const tenantNews = await api.listNotifications(eilidh, true)
    expect(tenantNews.some((n) => n.title.startsWith('Rattray Plumbing will do the work'))).toBe(
      true,
    )
    expect(await api.listActionsNeeded(kev)).toContainEqual({
      kind: 'book_visit',
      jobId: 'job_basin_king',
    })
    expect(await codeOf(api.instructTrade(aileen, 'job_basin_king'))).toBe('already_done')
  })

  test('needs an accepted quote, except in an emergency', async () => {
    const { api } = freshSlate()
    const emergency = await api.createJob(sarah, {
      propertyId: 'property_esslemont',
      room: 'bathroom',
      category: 'leak',
      description: 'Water is pouring through the bathroom ceiling light.',
      photos: [],
      urgency: 'emergency',
      access: { windows: [], keyAllowed: true },
    })
    await api.approveJob(aileen, emergency.id)
    await api.chooseTrade(aileen, emergency.id, { tradeId: 'person_kev', route: 'saved_trades' })
    const instructed = await api.instructTrade(aileen, emergency.id)
    expect(instructed.status).toBe('instructed')

    // Only the landlord's side can give the go-ahead, and not before a quote is accepted.
    expect(await codeOf(api.instructTrade(kev, 'job_gutter_jesmond'))).toBe('forbidden')
    expect(await codeOf(api.instructTrade(aileen, 'job_gutter_jesmond'))).toBe('invalid_state')
  })
})

describe('withdrawing a quote', () => {
  test('tells the landlord, shows on the timeline, and lets the trade quote again', async () => {
    const { api } = freshSlate()
    expect(await codeOf(api.withdrawQuote(sandy, 'quote_basin_kev'))).toBe('forbidden')
    const withdrawn = await api.withdrawQuote(
      kev,
      'quote_basin_kev',
      'I can’t get to it this week after all.',
    )
    expect(withdrawn.status).toBe('withdrawn')
    const news = await api.listNotifications(graham, true)
    expect(news.find((n) => n.kind === 'quote_withdrawn')).toMatchObject({
      title: 'Rattray Plumbing withdrew their quote: Bathroom basin tap loose and dripping',
      body: 'I can’t get to it this week after all.',
    })
    const job = await api.getJob(graham, 'job_basin_king')
    expect(job?.timeline.at(-1)).toMatchObject({ kind: 'quote_withdrawn' })
    expect(
      (await api.listActionsNeeded(graham)).some(
        (a) => a.kind === 'compare_quotes' && a.jobId === 'job_basin_king',
      ),
    ).toBe(false)
    expect(await codeOf(api.withdrawQuote(kev, 'quote_basin_kev'))).toBe('already_done')
    const again = await api.submitQuote(kev, {
      jobId: 'job_basin_king',
      lineItems: [{ description: 'Fixing kit', kind: 'materials', quantity: 1, unitPence: 900 }],
      validUntil: addDaysToDate(DEMO_TODAY, 14),
    })
    expect(again.status).toBe('submitted')
  })
})

describe('invoices and payments', () => {
  test('the trade invoices with the work, the landlord pays, and each side hears', async () => {
    const { api } = freshSlate()
    const beata: Viewer = { personId: 'person_beata', role: 'tenant' }
    const done = await api.markComplete(kev, 'job_toilet_walker', {
      finalPricePence: 9400,
      photos: [],
      invoiceDueInDays: 14,
    })
    expect(done.payment).toMatchObject({
      amountPence: 9400,
      dueOn: addDaysToDate(DEMO_TODAY, 14),
    })
    expect(done.timeline.at(-1)).toMatchObject({ kind: 'invoice_sent', amountPence: 9400 })
    expect(await api.listActionsNeeded(irene)).toContainEqual({
      kind: 'pay_invoice',
      jobId: 'job_toilet_walker',
      amountPence: 9400,
      dueOn: addDaysToDate(DEMO_TODAY, 14),
      overdue: false,
    })
    // Money is between the landlord and the trade: the tenant never sees it.
    const asTenant = await api.getJob(beata, 'job_toilet_walker')
    expect(asTenant?.payment).toBeUndefined()
    expect(asTenant?.completion?.finalPricePence).toBeUndefined()
    expect(asTenant?.timeline.some((e) => e.kind === 'invoice_sent')).toBe(false)
    expect(await codeOf(api.recordPayment(beata, 'job_toilet_walker'))).toBe('forbidden')

    const paid = await api.recordPayment(irene, 'job_toilet_walker')
    expect(paid.payment).toMatchObject({ paidRecordedBy: 'landlord', paidAt: expect.any(String) })
    const kevNews = await api.listNotifications(kev, true)
    expect(kevNews.some((n) => n.kind === 'payment' && n.title.startsWith('Irene says'))).toBe(true)
    expect(await codeOf(api.recordPayment(kev, 'job_toilet_walker'))).toBe('already_done')
  })

  test("a late payer: overdue for the trade until it's paid", async () => {
    const { api } = freshSlate()
    const overdue = (await api.listActionsNeeded(kev)).find(
      (a) => a.kind === 'payment_overdue' && a.jobId === 'job_waste_victoria',
    )
    expect(overdue).toEqual({
      kind: 'payment_overdue',
      jobId: 'job_waste_victoria',
      amountPence: 9250,
      daysOverdue: 16,
    })
    expect(
      (await api.listActionsNeeded(derek)).find((a) => a.kind === 'pay_invoice' && a.overdue),
    ).toMatchObject({ jobId: 'job_waste_victoria' })
    await api.recordPayment(kev, 'job_waste_victoria')
    expect((await api.listActionsNeeded(kev)).some((a) => a.kind === 'payment_overdue')).toBe(false)
  })

  test('both sides are told the day an invoice falls overdue', async () => {
    const { api, demo } = freshSlate()
    await demo.advanceClock(5)
    const kevNews = await api.listNotifications(kev, true)
    expect(
      kevNews.find((n) => n.title === 'Payment overdue: Shower mixer dripping constantly'),
    ).toMatchObject({ kind: 'payment', body: expect.stringContaining('£156.00') })
    const derekNews = await api.listNotifications(derek, true)
    expect(
      derekNews.some((n) => n.title === 'Invoice overdue: Shower mixer dripping constantly'),
    ).toBe(true)
  })

  test('an invoice is sent once, after the work is done', async () => {
    const { api } = freshSlate()
    expect(await codeOf(api.sendInvoice(kev, 'job_shower_rosemount', { dueInDays: 7 }))).toBe(
      'already_done',
    )
    expect(await codeOf(api.sendInvoice(kev, 'job_taps_spital', { dueInDays: 7 }))).toBe(
      'invalid_state',
    )
  })
})

describe('answering a report about something you wrote', () => {
  test('the poster sees the complaint, never who made it, and can respond once', async () => {
    const { api } = freshSlate()
    const [report] = await api.listReportsAboutMe(derek)
    expect(report).toMatchObject({
      id: 'report_sandy_cupboard',
      route: 'defamation',
      canRespond: true,
      details: expect.stringContaining('overcharged'),
    })
    expect(report).not.toHaveProperty('reporterId')
    expect(await codeOf(api.respondToReport(sandy, 'report_sandy_cupboard', 'Not mine'))).toBe(
      'forbidden',
    )
    const answered = await api.respondToReport(
      derek,
      'report_sandy_cupboard',
      'The door was still squint when I checked it the week after.',
    )
    expect(answered.posterResponse?.body).toContain('squint')
    expect(answered.canRespond).toBe(false)
    expect(
      await codeOf(api.respondToReport(derek, 'report_sandy_cupboard', 'And another thing.')),
    ).toBe('already_done')
    const sandyNews = await api.listNotifications(sandy, true)
    expect(sandyNews.some((n) => n.title === 'The person who posted it has responded')).toBe(true)
  })

  test('a defamation report tells the poster straight away', async () => {
    const { api } = freshSlate()
    await api.submitReport(derek, {
      target: { kind: 'rating', ratingId: 'rating_victoria_sarah_derek' },
      route: 'defamation',
      details: 'The damp was treated twice and the tenant was told both times.',
    })
    const news = await api.listNotifications(sarah, true)
    expect(news.some((n) => n.title === 'Something you wrote has been reported')).toBe(true)
    const [aboutSarah] = await api.listReportsAboutMe(sarah)
    expect(aboutSarah?.clocks[0]?.metAt).toBeDefined()
  })
})

describe('reading a conversation', () => {
  test('clears its unread count and its message notifications', async () => {
    const { api } = freshSlate()
    const unread = (await api.listThreads(sarah)).find(
      (t) => t.thread.id === 'thread_ceiling_esslemont',
    )
    expect(unread?.unreadCount).toBe(1)
    await api.markThreadRead(sarah, 'thread_ceiling_esslemont')
    const read = (await api.listThreads(sarah)).find(
      (t) => t.thread.id === 'thread_ceiling_esslemont',
    )
    expect(read?.unreadCount).toBe(0)
    const news = await api.listNotifications(sarah, true)
    expect(news.some((n) => n.kind === 'message')).toBe(false)
  })
})
