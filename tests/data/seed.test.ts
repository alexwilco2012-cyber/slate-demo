import { JOB_STATUSES, NEIGHBOURHOODS, RATING_STATES, type Rating } from '@/domain/types'
import { RATING_DIRECTIONS } from '@/domain/criteria'
import { complianceCalendar } from '@/data/local/compliance'
import { addDaysToDate, hoursBetween, ukDate } from '@/data/local/dates'
import { checkText, settleRatings, shieldReleases } from '@/domain/rating'
import { clientRating, landlordRatings, landlordScore, tradeScore } from '@/data/local/scores'
import { allOwed } from '@/data/local/settle'
import { rowsOf, type SlateData } from '@/data/local/state'
import { readerOf } from '@/data/local/tx'
import { DEMO_NOW, DEMO_TODAY, PERSONAS, createSeedData } from '@/data/seed'
import { freshSlate } from './helpers'

const seed: SlateData = createSeedData()
const db = readerOf(seed)
const rows = <K extends keyof SlateData['tables']>(table: K) => rowsOf(seed.tables[table])
const everything = JSON.stringify(seed)

describe('the fictional world', () => {
  test('is the same every time it is built, so every tab agrees', () => {
    expect(createSeedData()).toEqual(seed)
    expect(DEMO_TODAY).toBe('2026-09-26')
    expect(seed.now).toBe(DEMO_NOW)
  })

  test('has the cast the spec asks for', () => {
    const people = rows('people')
    const landlords = people.filter(
      (p) => p.roles.includes('landlord') && !p.badges.some((b) => b.kind === 'agent_team'),
    )
    expect(landlords.map((p) => p.displayName).sort()).toEqual([
      'Derek Milne',
      'Graham Forbes',
      'Hannah Reid',
      'Irene Duguid',
    ])
    expect(people.filter((p) => p.roles.includes('tenant')).length).toBeGreaterThanOrEqual(16)
    const trades = people.filter((p) => p.roles.includes('trade'))
    expect(trades.length).toBeGreaterThanOrEqual(10)
    const tradeTypes = new Set(trades.flatMap((t) => t.tradeProfile?.trades ?? []))
    for (const type of [
      'plumber',
      'gas_engineer',
      'electrician',
      'joiner',
      'roofer',
      'cleaner',
      'locksmith',
      'handyman',
    ]) {
      expect(tradeTypes).toContain(type)
    }
    const neil = db.get('people', 'person_neil')
    expect(neil?.badges.some((b) => b.kind === 'electrical_scheme' && b.scheme === 'SELECT')).toBe(
      true,
    )
    for (const persona of PERSONAS)
      expect(db.get('people', persona.personId)?.roles).toContain(persona.role)
    // Graham's letting agent works inside his account.
    const membership = rows('memberships').find((m) => m.agentId === 'person_aileen')
    expect(membership).toMatchObject({ landlordId: 'person_graham', status: 'active' })
  })

  test('badges always carry the date they were checked', () => {
    for (const person of rows('people')) {
      for (const badge of person.badges) expect(badge.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test('has twelve homes across the six neighbourhoods, around the Aberdeen average rent', () => {
    const properties = rows('properties')
    expect(properties).toHaveLength(12)
    const places = new Set(properties.map((p) => p.neighbourhood))
    for (const place of [
      'Rosemount',
      'West End',
      'Ferryhill',
      'Old Aberdeen',
      'Torry',
      'Bridge of Don',
    ]) {
      expect(places).toContain(place)
    }
    for (const property of properties) {
      expect(NEIGHBOURHOODS).toContain(property.neighbourhood)
      expect(['AB10', 'AB11', 'AB15', 'AB16', 'AB22', 'AB24', 'AB25']).toContain(
        property.postcodeDistrict,
      )
      expect(property.postcode.startsWith(`${property.postcodeDistrict} `)).toBe(true)
    }
    const running = rows('tenancies').filter((t) => t.status === 'confirmed')
    const rents = running.map((t) => t.rentPencePerMonth / 100)
    const mean = rents.reduce((sum, r) => sum + r, 0) / rents.length
    expect(mean).toBeGreaterThan(780)
    expect(mean).toBeLessThan(980)
  })

  test('has repair jobs at every stage', () => {
    const jobs = rows('jobs')
    expect(jobs.length).toBeGreaterThanOrEqual(20)
    const statuses = new Set(jobs.map((j) => j.status))
    for (const status of JOB_STATUSES) expect(statuses).toContain(status)
  })
})

describe('references', () => {
  const exists = (table: keyof SlateData['tables'], id: string | undefined | null) =>
    id === undefined || id === null || seed.tables[table][id] !== undefined

  test('every record points at records that exist', () => {
    for (const p of rows('properties')) {
      expect(exists('people', p.landlordId)).toBe(true)
      for (const a of p.agentIds) expect(exists('people', a)).toBe(true)
    }
    for (const t of rows('tenancies')) {
      expect(exists('properties', t.propertyId)).toBe(true)
      expect(db.get('properties', t.propertyId)?.landlordId).toBe(t.landlordId)
      for (const id of t.tenantIds) expect(exists('people', id)).toBe(true)
      for (const c of t.confirmations) expect(exists('people', c.personId)).toBe(true)
    }
    for (const m of rows('memberships')) {
      expect(
        exists('agencies', m.agencyId) &&
          exists('people', m.agentId) &&
          exists('people', m.landlordId),
      ).toBe(true)
    }
    for (const person of rows('people'))
      for (const id of person.savedTradeIds) expect(exists('people', id)).toBe(true)
    for (const job of rows('jobs')) {
      expect(exists('properties', job.propertyId)).toBe(true)
      expect(exists('tenancies', job.tenancyId)).toBe(true)
      expect(exists('people', job.reportedById)).toBe(true)
      expect(exists('people', job.tradeId)).toBe(true)
      expect(exists('quotes', job.acceptedQuoteId)).toBe(true)
      for (const visit of job.visits) {
        expect(exists('people', visit.tradeId)).toBe(true)
        expect(exists('messages', visit.notice.messageId)).toBe(true)
      }
      for (const event of job.timeline) {
        if ('quoteId' in event) expect(exists('quotes', event.quoteId)).toBe(true)
        if ('visitId' in event) expect(job.visits.some((v) => v.id === event.visitId)).toBe(true)
        if ('tradeId' in event) expect(exists('people', event.tradeId)).toBe(true)
      }
    }
    for (const q of rows('quotes')) {
      expect(exists('jobs', q.jobId) && exists('people', q.tradeId)).toBe(true)
    }
    for (const item of rows('lineItems')) expect(exists('people', item.tradeId)).toBe(true)
    for (const thread of rows('threads')) {
      const target =
        thread.context.kind === 'job'
          ? exists('jobs', thread.context.jobId)
          : exists('tenancies', thread.context.tenancyId)
      expect(target).toBe(true)
      for (const m of thread.members) expect(exists('people', m.personId)).toBe(true)
    }
    for (const message of rows('messages')) {
      const thread = db.get('threads', message.threadId)
      expect(thread).toBeDefined()
      if (message.author) {
        expect(thread?.members.some((m) => m.personId === message.author?.personId)).toBe(true)
      }
    }
    for (const doc of rows('documents')) {
      expect(exists('people', doc.landlordId)).toBe(true)
      expect(exists('properties', doc.propertyId)).toBe(true)
      expect(exists('tenancies', doc.tenancyId)).toBe(true)
      expect(exists('jobs', doc.jobId)).toBe(true)
      expect(exists('documents', doc.replacedById)).toBe(true)
    }
    for (const r of rows('ratings')) {
      expect(exists('people', r.raterId) && exists('people', r.subjectId)).toBe(true)
      expect(exists('properties', r.propertyId)).toBe(true)
      const target =
        r.context.kind === 'job'
          ? exists('jobs', r.context.jobId)
          : exists('tenancies', r.context.tenancyId)
      expect(target).toBe(true)
    }
    for (const x of [...rows('replies'), ...rows('updates'), ...rows('disputes')]) {
      expect(exists('ratings', x.ratingId) && exists('people', x.authorId)).toBe(true)
    }
    for (const report of rows('reports')) {
      expect(exists('people', report.reporterId)).toBe(true)
      if (report.target.kind === 'rating')
        expect(exists('ratings', report.target.ratingId)).toBe(true)
    }
    for (const share of rows('shares')) {
      expect(exists('people', share.tenantId)).toBe(true)
      for (const view of share.views) expect(exists('people', view.viewerId)).toBe(true)
    }
    for (const n of rows('notifications')) {
      expect(exists('people', n.recipientId)).toBe(true)
      expect(db.get('people', n.recipientId)?.roles).toContain(n.role)
    }
  })

  test('nothing has happened after the demo’s now, except bookings and deadlines to come', () => {
    const past = [
      ...rows('jobs').flatMap((j) => [j.createdAt, j.updatedAt, ...j.timeline.map((e) => e.at)]),
      ...rows('messages').map((m) => m.sentAt),
      ...rows('ratings').flatMap((r) => [r.createdAt, r.submittedAt ?? r.createdAt]),
      ...rows('notifications').map((n) => n.createdAt),
      ...rows('quotes').map((q) => q.submittedAt),
      ...rows('people').map((p) => p.joinedAt),
    ]
    for (const at of past) expect(at <= DEMO_NOW).toBe(true)
  })
})

describe('keeping the data fictional', () => {
  test('phone numbers are only in the 07700 900xxx drama range', () => {
    for (const person of rows('people')) {
      if (person.contact.phone) expect(person.contact.phone).toMatch(/^07700 900\d{3}$/)
    }
    const mobiles = everything.match(/(?:\+44 ?7|\b07)\d{3} ?\d{3} ?\d{3}/g) ?? []
    for (const number of mobiles) expect(number).toMatch(/^07700 ?900\d{3}$/)
  })

  test('emails are only at example.com or example.co.uk', () => {
    const emails = everything.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []
    expect(emails.length).toBeGreaterThan(0)
    for (const email of emails) expect(email).toMatch(/@example\.(com|co\.uk)$/)
  })

  test('steers clear of real Aberdeen firms the names were checked against', () => {
    // Real businesses found when the cast was checked: none of these names may come back.
    const real = [
      'Duthie Plumbing',
      'Alexander Duthie',
      'Grant Glazing',
      'Robertson Gas',
      'Robertson Heating',
      'Fresh Start',
      'Birnie Plumbing',
      'Gauld',
      'Cruickshank Joinery',
    ]
    for (const name of real) expect(everything).not.toContain(name)
  })

  test("never mentions the owner's own address", () => {
    const forbidden = ['golden', 'square'].join(' ')
    expect(everything.toLowerCase()).not.toContain(forbidden)
  })

  test('public words pass the comment filter', () => {
    const publicText = [
      ...rows('ratings').flatMap((r) => (r.comment ? [r.comment] : [])),
      ...rows('replies').map((r) => r.body),
      ...rows('updates').map((u) => u.body),
    ]
    for (const text of publicText) {
      const check = checkText(text)
      expect({ text, issues: check.issues }).toEqual({ text, issues: [] })
    }
  })
})

describe('jobs tell a consistent story', () => {
  test('each status matches its visits and dates', () => {
    for (const job of rows('jobs')) {
      const active = job.visits.filter((v) => v.status === 'booked' || v.status === 'on_site')
      switch (job.status) {
        case 'reported':
          expect(job.tradeId).toBeUndefined()
          break
        case 'quoting':
          expect(job.tradeId !== undefined || job.board !== undefined).toBe(true)
          break
        case 'booked':
          expect(active.some((v) => v.status === 'booked' && v.purpose !== 'quote')).toBe(true)
          break
        case 'in_progress':
          expect(active.some((v) => v.status === 'on_site')).toBe(true)
          break
        case 'completed':
          expect(job.completion).toBeDefined()
          expect(job.landlordConfirmedAt).toBeUndefined()
          break
        case 'confirmed':
          expect(job.completion && job.landlordConfirmedAt).toBeTruthy()
          break
        default:
          expect(active).toHaveLength(0)
      }
      const times = job.timeline.map((e) => e.at)
      expect([...times].sort()).toEqual(times)
    }
  })

  test("every visit came with 48 hours' written notice, unless it was an emergency", () => {
    const visits = rows('jobs').flatMap((job) => job.visits.map((visit) => ({ job, visit })))
    expect(visits.length).toBeGreaterThan(10)
    for (const { job, visit } of visits) {
      const hours = hoursBetween(visit.notice.givenAt, visit.startsAt)
      if (visit.notice.emergency) expect(job.urgency).toBe('emergency')
      else expect(hours).toBeGreaterThanOrEqual(48)
      const notice = db.get('messages', visit.notice.messageId)
      expect(notice?.kind).toBe('notice')
      expect(notice?.sentAt).toBe(visit.notice.givenAt)
    }
    expect(visits.some(({ visit }) => visit.notice.emergency)).toBe(true)
  })

  test('a clean is announced as a clean, not a repair', () => {
    const clean = db.get('jobs', 'job_clean_fonthill')
    const notice = db.get('messages', clean?.visits[0]?.notice.messageId)
    expect(notice?.body).toContain('to do the clean')
    expect(notice?.body).not.toContain('repair')
  })

  test('messages carry the right role chip, and agents speak for their landlord', () => {
    const agentMessages = rows('messages').filter((m) => m.author?.personId === 'person_aileen')
    expect(agentMessages.length).toBeGreaterThan(0)
    for (const m of agentMessages)
      expect(m.author).toMatchObject({ role: 'landlord', actingForId: 'person_graham' })
    expect(rows('messages').filter((m) => m.author?.role === 'trade').length).toBeGreaterThan(5)
  })
})

describe('the rating history agrees with the engine', () => {
  const ratings = rows('ratings')

  test('settling it again changes nothing', () => {
    const outcome = settleRatings(allOwed(db), ratings, DEMO_NOW)
    expect(outcome.newlyRevealed).toEqual([])
    for (const rating of outcome.ratings) expect(rating).toBe(db.get('ratings', rating.id))
  })

  test('has history in all six directions', () => {
    for (const direction of RATING_DIRECTIONS) {
      expect(ratings.some((r) => r.direction === direction && r.state === 'revealed')).toBe(true)
    }
  })

  test('a job everyone else has rated stays sealed until the last person does', () => {
    const radiator = ratings.filter(
      (r) => r.context.kind === 'job' && r.context.jobId === 'job_radiator_esslemont',
    )
    expect(radiator.map((r) => r.direction).sort()).toEqual([
      'tenant->trade',
      'trade->landlord',
      'trade->tenant',
    ])
    for (const r of radiator) expect(r.state).toBe('sealed')
    // Graham's window is the last one open, so that's when it would all be revealed.
    const sarahs = radiator.find((r) => r.direction === 'tenant->trade')
    expect(ukDate(sarahs?.revealAt ?? '')).toBe(addDaysToDate(DEMO_TODAY, 7))
  })

  test('shows the retaliation shield holding, and lifting at five tenant raters', () => {
    const shielded = ratings.filter((r) => r.seal === 'retaliation_shield')
    for (const r of shielded) expect(r.state).toBe('sealed')
    const held = (landlordId: string, id: string) =>
      !landlordRatings(db, landlordId as 'person_x').some((r) => r.id === id)
    expect(held('person_graham', 'rating_sockets_ewan_graham')).toBe(true)
    expect(held('person_derek', 'rating_boiler_liam_derek')).toBe(false)
    expect(held('person_derek', 'rating_cupboard_kirsty_derek')).toBe(false)
  })

  test("releases Derek's held ratings together, in the 1 September batch", () => {
    const releases = shieldReleases(
      ratings.filter((r) => r.subjectId === 'person_derek'),
      { landlordId: 'person_derek', now: DEMO_NOW },
    )
    expect(releases.get('rating_boiler_liam_derek')).toEqual({
      route: 'batch',
      at: '2026-09-01T00:00:00.000Z',
    })
    expect(releases.get('rating_cupboard_kirsty_derek')).toEqual(
      releases.get('rating_boiler_liam_derek'),
    )
  })

  test('has a dispute, a reply, an update, a restricted review and a passport share with views', () => {
    expect(rows('disputes')).toHaveLength(2)
    expect(rows('replies')).toHaveLength(1)
    // Graham both disputes Rory's review and has replied to it.
    const disputed = new Set(rows('disputes').map((d) => d.ratingId))
    expect(disputed.has(rows('replies')[0]?.ratingId ?? 'rating_x')).toBe(true)
    expect(rows('updates')).toHaveLength(1)
    const restricted = ratings.filter((r) => r.state === 'restricted')
    expect(restricted).toHaveLength(1)
    expect(restricted[0]?.restriction?.reportId).toBe('report_sandy_cupboard')
    const live = rows('shares').filter((s) => s.expiresAt > DEMO_NOW && !s.revokedAt)
    expect(live.some((s) => s.views.length >= 3)).toBe(true)
  })

  test('the landlord with a poor record scores visibly lower, from tenants and from trades', () => {
    const score = (id: string) => landlordScore(db, { landlordId: id as 'person_x' }).score ?? 0
    const client = (id: string) => clientRating(db, id as 'person_x')
    for (const good of ['person_graham', 'person_irene']) {
      expect(score('person_derek')).toBeLessThan(score(good) - 0.75)
      expect(client('person_derek').summary.score ?? 0).toBeLessThan(
        (client(good).summary.score ?? 0) - 0.75,
      )
    }
    expect(client('person_derek').paidOnTime).toEqual({ onTime: 0, jobs: 3 })
    expect(client('person_graham').paidOnTime.onTime).toBeGreaterThan(0)
  })

  test('the first-time landlord and most trades are still "New"', () => {
    expect(landlordScore(db, { landlordId: 'person_hannah' }).score).toBeNull()
    expect(tradeScore(db, 'person_kev').overall).not.toBeNull()
    expect(tradeScore(db, 'person_neil').overall).toBeNull()
  })

  test('the tenant passport reads like the spec: Always, from 2 of 2 landlords', async () => {
    const { passportOf } = await import('@/data/local/api/passport')
    const passport = passportOf(db, 'person_sarah')
    const rent = passport.lines.find((line) => line.criterionId === 'rent_on_time')
    expect(rent).toMatchObject({ landlordCount: 2, counts: { 5: 2 } })
  })

  test('every rating was sent, or saved as a draft, inside its window', () => {
    for (const rating of ratings as Rating[]) {
      const at = rating.state === 'draft' ? rating.createdAt : rating.submittedAt
      expect(at !== undefined && at < rating.windowClosesAt).toBe(true)
    }
  })

  test('has a rating in every state, from draft to removed', () => {
    expect(new Set(ratings.map((r) => r.state))).toEqual(new Set(RATING_STATES))
  })

  test('a draft is seen only by the person writing it', async () => {
    const { api } = freshSlate()
    const kev = { personId: 'person_kev', role: 'trade' } as const
    const kirsty = { personId: 'person_kirsty', role: 'tenant' } as const
    const draft = await api.getRating(kev, 'rating_shower_kev_kirsty')
    expect(draft).toMatchObject({ state: 'draft', answers: { access_given: 5 } })
    expect(await api.getRating(kirsty, 'rating_shower_kev_kirsty')).toBeNull()
    const task = (await api.listRatingTasks(kev)).find(
      (t) => t.ratingId === 'rating_shower_kev_kirsty',
    )
    expect(task?.status).toBe('draft')
  })

  test('a review removed after an upheld report is gone from every view', async () => {
    expect(db.get('ratings', 'rating_rosemount_derek_connor')).toMatchObject({
      state: 'removed',
      removal: { reason: 'report_upheld', reportId: 'report_connor_rosemount' },
    })
    expect(db.get('reports', 'report_connor_rosemount')).toMatchObject({
      status: 'resolved',
      outcome: { action: 'removed' },
    })
    const { api } = freshSlate()
    const connor = { personId: 'person_connor', role: 'tenant' } as const
    const reviews = await api.listReviews(connor, {
      direction: 'landlord->tenant',
      subjectId: 'person_connor',
    })
    expect(reviews.some((r) => r.ratingId === 'rating_rosemount_derek_connor')).toBe(false)
    expect((await api.getMyPassport(connor)).landlordCount).toBe(0)
  })
})

describe('each persona opens on a full home screen', () => {
  test('Hannah has something live as a landlord and as a tenant', async () => {
    const { api } = freshSlate()
    const asLandlord = { personId: 'person_hannah', role: 'landlord' } as const
    const asTenant = { personId: 'person_hannah', role: 'tenant' } as const
    expect((await api.listJobs(asLandlord)).map((j) => j.status)).toContain('instructed')
    expect((await api.listActionsNeeded(asLandlord)).length).toBeGreaterThan(0)
    expect((await api.listJobs(asTenant)).map((j) => j.status)).toContain('booked')
    expect((await api.listNotifications(asTenant, true)).length).toBeGreaterThan(0)
  })

  test('Sarah, Graham, Kev and Derek each have things waiting for them', async () => {
    const { api } = freshSlate()
    for (const viewer of [
      { personId: 'person_sarah', role: 'tenant' },
      { personId: 'person_graham', role: 'landlord' },
      { personId: 'person_kev', role: 'trade' },
      { personId: 'person_derek', role: 'landlord' },
    ] as const) {
      expect((await api.listActionsNeeded(viewer)).length).toBeGreaterThanOrEqual(1)
      expect((await api.listNotifications(viewer, true)).length).toBeGreaterThan(0)
      expect((await api.getAwayFeed(viewer)).items.length).toBeGreaterThan(0)
    }
  })

  test('Sarah: a repair waiting for approval, a visit with notice, a sealed rating, a passport', async () => {
    const { api } = freshSlate()
    const sarah = { personId: 'person_sarah', role: 'tenant' } as const
    const jobs = await api.listJobs(sarah)
    expect(jobs.find((j) => j.id === 'job_ceiling_esslemont')?.status).toBe('reported')
    const eicr = jobs.find((j) => j.id === 'job_eicr_esslemont')
    const visit = eicr?.visits.find((v) => v.status === 'booked')
    expect(visit && visit.startsAt > DEMO_NOW).toBe(true)
    expect(visit?.notice.hoursGiven).toBeGreaterThanOrEqual(48)
    const mine = await api.listMyRatings(sarah)
    expect(mine.find((r) => r.id === 'rating_radiator_sarah_mhairi')?.state).toBe('sealed')
    const passport = await api.getMyPassport(sarah)
    expect(passport.landlordCount).toBe(2)
    expect(await api.listPassportShares(sarah)).not.toHaveLength(0)
    // Her rating of the landlord's handling of the radiator repair is still hers to do.
    const actions = await api.listActionsNeeded(sarah)
    expect(actions.some((a) => a.kind === 'leave_rating')).toBe(true)
  })

  test('Graham: approvals, quotes to compare, an EICR due soon and a lapsed alarm check', async () => {
    const { api } = freshSlate()
    const graham = { personId: 'person_graham', role: 'landlord' } as const
    const actions = await api.listActionsNeeded(graham)
    const kinds = actions.map((a) => a.kind)
    expect(kinds.filter((k) => k === 'approve_job')).toHaveLength(2)
    expect(actions).toContainEqual({
      kind: 'compare_quotes',
      jobId: 'job_gutter_jesmond',
      quoteCount: 2,
    })
    const renewals = actions.flatMap((a) => (a.kind === 'renew_document' ? [a.item] : []))
    expect(renewals).toContainEqual(
      expect.objectContaining({
        type: 'eicr',
        propertyId: 'property_king_street',
        status: 'DUE_SOON',
      }),
    )
    expect(renewals).toContainEqual(
      expect.objectContaining({
        type: 'smoke_heat_alarms',
        propertyId: 'property_king_street',
        status: 'EXPIRED',
      }),
    )
    expect(await api.listProperties(graham)).toHaveLength(6)
    const reviews = await api.listReviews(graham, {
      direction: 'tenant->landlord',
      subjectId: 'person_graham',
    })
    expect(reviews.some((r) => r.dispute && r.reply)).toBe(true)
  })

  test("Kev: today's jobs, new board jobs, a quote awaiting reply, a late payer", async () => {
    const { api } = freshSlate()
    const kev = { personId: 'person_kev', role: 'trade' } as const
    const today = (await api.listJobs(kev)).filter((j) =>
      j.visits.some(
        (v) =>
          ukDate(v.startsAt) === DEMO_TODAY && (v.status === 'booked' || v.status === 'on_site'),
      ),
    )
    expect(today.map((j) => j.id).sort()).toEqual(['job_taps_spital', 'job_toilet_walker'])
    const board = await api.listJobBoard(kev, { trades: 'mine' })
    expect(board.filter((p) => !p.myQuoteId).length).toBeGreaterThanOrEqual(2)
    const quoted = board.find((p) => p.myQuoteId)
    expect(quoted?.jobId).toBe('job_basin_king')
    const quotes = await api.listQuotes(kev, 'job_basin_king')
    expect(quotes[0]?.status).toBe('submitted')
    const actions = await api.listActionsNeeded(kev)
    expect(actions).toContainEqual(
      expect.objectContaining({ kind: 'payment_overdue', jobId: 'job_waste_victoria' }),
    )
    expect(actions).toContainEqual({ kind: 'book_visit', jobId: 'job_tap_polmuir' })
    const derek = await api.getClientRating(kev, 'person_derek')
    expect(derek.paidOnTime).toEqual({ onTime: 0, jobs: 3 })
  })
})

describe('documents', () => {
  test('are never filed before the person who uploaded them joined', () => {
    for (const doc of rows('documents')) {
      const uploader = db.get('people', doc.uploadedById)
      expect(uploader).toBeDefined()
      expect(doc.uploadedAt > (uploader?.joinedAt ?? '')).toBe(true)
      expect(doc.uploadedAt <= DEMO_NOW).toBe(true)
    }
  })

  test('show every compliance status across the landlords', () => {
    const statuses = new Set<string>()
    for (const landlordId of [
      'person_graham',
      'person_irene',
      'person_hannah',
      'person_derek',
    ] as const) {
      const properties = rows('properties').filter((p) => p.landlordId === landlordId)
      for (const item of complianceCalendar(db, landlordId, properties, true))
        statuses.add(item.status)
    }
    expect([...statuses].sort()).toEqual(['BOOKED', 'DUE_SOON', 'EXPIRED', 'OK', 'TO_ARRANGE'])
  })

  test('the careful landlord has no lapsed certificates; the poor one has several', () => {
    const lapsed = (landlordId: 'person_irene' | 'person_derek') =>
      complianceCalendar(
        db,
        landlordId,
        rows('properties').filter((p) => p.landlordId === landlordId),
        true,
      ).filter((item) => item.status === 'EXPIRED')
    expect(lapsed('person_irene')).toHaveLength(0)
    expect(lapsed('person_derek').length).toBeGreaterThanOrEqual(3)
  })
})
