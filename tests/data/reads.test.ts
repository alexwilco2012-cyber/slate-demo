// Every page a notification can open has a read that serves it, shaped for the person looking:
// job pages per side, review pages, public profiles, the job board, "while you were away", and
// the demo's clock helpers for the reveal.

import type { Viewer } from '@/data/api'
import { milesBetween } from '@/domain/places'
import { DEMO_NOW } from '@/data/seed'
import { aileen, freshSlate, graham, kev, mhairi, sarah } from './helpers'

const sandy: Viewer = { personId: 'person_sandy', role: 'trade' }
const ian: Viewer = { personId: 'person_ian', role: 'trade' }
const stuart: Viewer = { personId: 'person_stuart', role: 'tenant' }

describe('job pages, shaped for each side', () => {
  test('tenants never see prices, quotes or invoices', async () => {
    const { api } = freshSlate()
    const asTenant = await api.getJob(sarah, 'job_radiator_esslemont')
    const asLandlord = await api.getJob(graham, 'job_radiator_esslemont')
    expect(asLandlord?.completion?.finalPricePence).toBe(9600)
    expect(asLandlord?.payment?.amountPence).toBe(9600)
    expect(asTenant?.completion).toBeDefined()
    expect(asTenant?.completion?.finalPricePence).toBeUndefined()
    expect(asTenant?.payment).toBeUndefined()
    expect(asTenant?.timeline.some((e) => e.kind === 'quote_submitted')).toBe(false)
    // The landlord's choice stays visible to everyone.
    expect(asTenant?.timeline.some((e) => e.kind === 'trade_instructed')).toBe(true)
    const listed = (await api.listJobs(sarah)).find((j) => j.id === 'job_radiator_esslemont')
    expect(listed).toEqual(asTenant)
  })

  test("a trade sees their own quote on the timeline, never a rival's", async () => {
    const { api } = freshSlate()
    await api.acceptQuote(aileen, 'quote_gutter_sandy', { instruct: true })
    const asSandy = await api.getJob(sandy, 'job_gutter_jesmond')
    const quoteEvents = asSandy?.timeline.flatMap((e) =>
      e.kind === 'quote_submitted' ? [e.quoteId] : [],
    )
    expect(quoteEvents).toEqual(['quote_gutter_sandy'])
    const asLandlord = await api.getJob(graham, 'job_gutter_jesmond')
    expect(asLandlord?.timeline.filter((e) => e.kind === 'quote_submitted')).toHaveLength(2)
    // The trade who wasn't chosen has no job page, only the board.
    expect(await api.getJob(ian, 'job_gutter_jesmond')).toBeNull()
    expect(await api.getJob(stuart, 'job_gutter_jesmond')).not.toBeNull()
  })
})

describe('review pages and who may read them', () => {
  test("a landlord reads a review of them without learning who wrote it; getRating stays the author's", async () => {
    const { api } = freshSlate()
    expect(await api.getRating(graham, 'rating_union_rory_graham')).toBeNull()
    const page = await api.getReview(graham, 'rating_union_rory_graham')
    expect(page).toMatchObject({
      mine: false,
      aboutMe: true,
      can: { reply: false, dispute: false, update: false, report: true },
      replyClosesAt: null,
      review: { reviewer: { role: 'tenant', postcodeDistrict: 'AB10', year: 2024 } },
    })
    expect(page?.review.reply?.authorId).toBe('person_graham')
    expect(page?.review.dispute).toBeDefined()
    expect(JSON.stringify(page)).not.toContain('person_rory')
    // The agent reads it as Graham's review too.
    expect((await api.getReview(aileen, 'rating_union_rory_graham'))?.aboutMe).toBe(true)
  })

  test('the author sees their own rating in full, with what they can still do', async () => {
    const { api } = freshSlate()
    const page = await api.getReview(sarah, 'rating_victoria_sarah_derek')
    expect(page).toMatchObject({ mine: true, aboutMe: false, can: { update: true, report: false } })
    expect(page?.rating?.privateNote).toContain('Deposit')
  })

  test('a landlord never receives a tenant rating that is still sealed', async () => {
    const { api } = freshSlate()
    for (const id of ['rating_sockets_ewan_graham', 'rating_fonthill_niamh_graham'] as const) {
      expect(await api.getRating(graham, id)).toBeNull()
      expect(await api.getReview(graham, id)).toBeNull()
      expect(await api.getReview(aileen, id)).toBeNull()
    }
    const reviews = await api.listReviews(graham, {
      direction: 'tenant->landlord',
      subjectId: 'person_graham',
    })
    expect(reviews.map((r) => r.ratingId)).not.toContain('rating_fonthill_niamh_graham')
  })

  test("a trade never receives another trade's rating of a tenant", async () => {
    const { api } = freshSlate()
    expect(await api.getReview(mhairi, 'rating_bath_kev_sarah')).toBeNull()
    expect(await api.getRating(mhairi, 'rating_bath_kev_sarah')).toBeNull()
    const list = await api.listReviews(mhairi, {
      direction: 'trade->tenant',
      subjectId: 'person_sarah',
    })
    expect(list).toEqual([])
    // Kev can read his own.
    expect((await api.getReview(kev, 'rating_bath_kev_sarah'))?.mine).toBe(true)
  })
})

describe('public profiles', () => {
  test("a landlord's page: score, reviews and homes by area, never addresses", async () => {
    const { api } = freshSlate()
    const page = await api.getLandlordProfile(sarah, 'person_graham')
    expect(page).toMatchObject({ registrationVerified: true, clientRating: null })
    expect(page?.landlord).not.toHaveProperty('contact')
    expect(page?.homes).toHaveLength(6)
    expect(JSON.stringify(page?.homes)).not.toContain('addressLine')
    expect(page?.reviews.some((r) => r.dispute && r.reply)).toBe(true)
    expect(page?.score.reviewerCount).toBe(3)
  })

  test('trades see a landlord as a client too', async () => {
    const { api } = freshSlate()
    const page = await api.getLandlordProfile(kev, 'person_derek')
    expect(page?.clientRating?.paidOnTime).toEqual({ onTime: 0, jobs: 3 })
    expect((await api.getLandlordProfile(graham, 'person_graham'))?.clientRating).not.toBeNull()
    expect(await api.getLandlordProfile(sarah, 'person_kev')).toBeNull()
  })

  test("a trade's page: both halves and their reviews, and whether the landlord saved them", async () => {
    const { api } = freshSlate()
    const page = await api.getTradeProfile(graham, 'person_kev')
    expect(page?.saved).toBe(true)
    expect(page?.score.fromLandlords.score).not.toBeNull()
    expect(page?.score.fromTenants.score).not.toBeNull()
    expect(page?.score.overall).not.toBeNull()
    expect(page?.fromLandlords.every((r) => r.direction === 'landlord->trade')).toBe(true)
    expect(page?.fromTenants.every((r) => r.direction === 'tenant->trade')).toBe(true)
    expect((await api.getTradeProfile(sarah, 'person_kev'))?.saved).toBe(false)
    expect(await api.getTradeProfile(sarah, 'person_graham')).toBeNull()
  })

  test('a trade with one half still new shows no Overall', async () => {
    const { api } = freshSlate()
    const neil = await api.getTradeProfile(graham, 'person_neil')
    expect(neil?.score.overall).toBeNull()
  })
})

describe('the job board for a trade', () => {
  test('filters by the kind of work they do and how far away it is', async () => {
    const { api } = freshSlate()
    const all = await api.listJobBoard(kev)
    expect(all.map((p) => p.jobId)).toContain('job_gutter_jesmond')
    const mine = await api.listJobBoard(kev, { trades: 'mine' })
    expect(mine.map((p) => p.jobId).sort()).toEqual([
      'job_basin_king',
      'job_sink_queens',
      'job_valve_rosemount',
    ])
    const gutter = all.find((p) => p.jobId === 'job_gutter_jesmond')
    expect(gutter).toMatchObject({
      landlordId: 'person_graham',
      inServiceArea: false,
      milesAway: milesBetween('AB16', 'AB22'),
    })
    const near = await api.listJobBoard(kev, { distance: 'within_2_miles' })
    expect(near.every((p) => p.milesAway !== null && p.milesAway <= 2)).toBe(true)
    expect(near.some((p) => p.jobId === 'job_gutter_jesmond')).toBe(false)
    const further = await api.listJobBoard(kev, { distance: 'within_5_miles' })
    expect(further.some((p) => p.jobId === 'job_gutter_jesmond')).toBe(true)
    const roofers = await api.listJobBoard(kev, { trades: ['roofer'] })
    expect(roofers.map((p) => p.jobId)).toContain('job_gutter_jesmond')
    expect(roofers.map((p) => p.jobId)).not.toContain('job_sink_queens')
  })

  test('works out distance between district centres, to the half mile', () => {
    expect(milesBetween('AB16', 'AB16')).toBe(0)
    expect(milesBetween('AB16', 'ZZ9')).toBeNull()
    const miles = milesBetween('AB16', 'AB22') ?? 0
    expect(miles * 2).toBe(Math.round(miles * 2))
    expect(miles).toBeGreaterThan(2)
    expect(miles).toBeLessThan(5)
  })
})

describe('while you were away', () => {
  test('sums up what happened since the portal was last seen, then clears', async () => {
    const { api } = freshSlate()
    const feed = await api.getAwayFeed(sarah)
    expect(feed.summary).toBe('Since Wednesday: 1 visit update and 1 message.')
    expect(feed.items.map((i) => i.category)).toEqual(['messages', 'visits'])
    await api.markAwaySeen(sarah)
    const after = await api.getAwayFeed(sarah)
    expect(after).toMatchObject({ summary: null, items: [] })
    expect(after.since > DEMO_NOW).toBe(true)
  })

  test('rolls several messages on one conversation into one line', async () => {
    const { api } = freshSlate()
    await api.markAwaySeen(graham)
    const thread = await api.getThreadFor(sarah, { kind: 'job', jobId: 'job_ceiling_esslemont' })
    await api.sendMessage(sarah, thread.id, { body: 'It has spread a bit since this morning.' })
    await api.sendMessage(sarah, thread.id, { body: 'Photo attached of the corner.' })
    const feed = await api.getAwayFeed(graham)
    expect(feed.items).toHaveLength(1)
    expect(feed.items[0]).toMatchObject({
      category: 'messages',
      count: 2,
      title: '2 new messages: Damp patch spreading on the bedroom ceiling',
      unread: true,
    })
    expect(feed.summary).toMatch(/: 2 messages\.$/)
  })

  test('Graham, Kev and Derek each come back to something', async () => {
    const { api } = freshSlate()
    const derek: Viewer = { personId: 'person_derek', role: 'landlord' }
    for (const viewer of [graham, kev, derek]) {
      const feed = await api.getAwayFeed(viewer)
      expect(feed.summary).toMatch(/^Since /)
    }
  })
})

describe('demo clock helpers', () => {
  test('reveals a sealed double-blind pair on cue', async () => {
    const { api, demo } = freshSlate()
    const next = await demo.nextReveal()
    expect(next?.context).toEqual({ kind: 'tenancy', tenancyId: 'tenancy_niamh_fonthill' })
    const jump = await demo.advanceToNextReveal()
    expect(jump?.ratingIds).toContain('rating_fonthill_niamh_graham')
    expect(demo.now()).toBe(next?.at)
    expect((await api.getReview(graham, 'rating_fonthill_niamh_graham'))?.aboutMe).toBe(true)
  })

  test('can aim at one job, revealing everything on it together', async () => {
    const { api, demo } = freshSlate()
    const radiator = { kind: 'job', jobId: 'job_radiator_esslemont' } as const
    const jump = await demo.advanceToNextReveal(radiator)
    // One clock for everyone: anything else due on the way is revealed too (Niamh's, Monday).
    expect(jump?.ratingIds).toEqual(
      expect.arrayContaining([
        'rating_radiator_mhairi_graham',
        'rating_radiator_mhairi_sarah',
        'rating_radiator_sarah_mhairi',
      ]),
    )
    expect((await api.getRating(sarah, 'rating_radiator_sarah_mhairi'))?.state).toBe('revealed')
    expect(await demo.nextReveal(radiator)).toBeNull()
  })

  test("jumps to the 1st of the month, when the shield releases a batch into Graham's score", async () => {
    const { api, demo } = freshSlate()
    // Sarah rates Graham's handling of the radiator repair: sealed, never shown on its own.
    await api.submitRating(sarah, {
      direction: 'tenant->landlord',
      context: { kind: 'job', jobId: 'job_radiator_esslemont' },
      subjectId: 'person_graham',
      answers: { fixed_quickly: 5, kept_informed: 4 },
    })
    // Niamh's end-of-tenancy rating is revealed on Monday night, giving Graham five tenant raters.
    await demo.advanceToNextReveal()
    const before = await api.getLandlordScore(graham, { landlordId: 'person_graham' })
    const jump = await demo.advanceToShieldRelease()
    expect(jump.to).toBe('2026-10-01T00:00:00.000Z')
    expect(jump.ratingIds.sort()).toEqual(
      ['rating_sockets_ewan_graham', expect.stringMatching(/^rating_/)].sort(),
    )
    const after = await api.getLandlordScore(graham, { landlordId: 'person_graham' })
    expect(after.reviewCount).toBe(before.reviewCount + 2)
  })
})
