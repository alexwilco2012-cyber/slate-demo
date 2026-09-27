import {
  dueReminders,
  isConfirmedByBoth,
  jobTenantIds,
  owedForJob,
  owedForTenancy,
  ratingTasksFor,
  reverseDirection,
  type OwedRating,
} from '@/domain/rating'
import {
  DAY_0,
  JOB,
  PEOPLE,
  TENANCY,
  day,
  endedTenancy,
  makeJob,
  makeRating,
  makeTenancy,
  makeVisit,
  property,
} from './fixtures'

const directions = (owed: readonly OwedRating[]) => owed.map((slot) => slot.direction).sort()
const find = (owed: readonly OwedRating[], direction: OwedRating['direction']) =>
  owed.find((slot) => slot.direction === direction)

describe('which ratings a job unlocks', () => {
  const tenancy = makeTenancy()

  it('unlocks nothing until the job is completed (rule 1)', () => {
    for (const status of ['reported', 'approved', 'booked', 'in_progress', 'cancelled'] as const) {
      expect(owedForJob(makeJob({ status }), property, tenancy)).toEqual([])
    }
  })

  it('opens every relationship once the work is done and confirmed', () => {
    const owed = owedForJob(makeJob(), property, tenancy)
    expect(directions(owed)).toEqual([
      'landlord->trade',
      'tenant->landlord',
      'tenant->trade',
      'trade->landlord',
      'trade->tenant',
    ])
  })

  it('opens trade->landlord at completion for 30 days, so payment can be judged', () => {
    const slot = find(owedForJob(makeJob(), property, tenancy), 'trade->landlord')
    expect(slot).toMatchObject({
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      opensAt: DAY_0,
      closesAt: day(30),
      seal: 'double_blind',
    })
  })

  it('opens landlord->trade only when the landlord confirms the job, for 14 days', () => {
    const unconfirmed = makeJob({ status: 'completed', landlordConfirmedAt: undefined })
    expect(find(owedForJob(unconfirmed, property, tenancy), 'landlord->trade')).toBeUndefined()

    const slot = find(owedForJob(makeJob(), property, tenancy), 'landlord->trade')
    expect(slot).toMatchObject({ opensAt: day(2), closesAt: day(16) })
  })

  it('opens tenant->trade when the tenant confirms the visit', () => {
    const slot = find(owedForJob(makeJob(), property, tenancy), 'tenant->trade')
    expect(slot).toMatchObject({ raterId: PEOPLE.sarah, opensAt: day(1), closesAt: day(15) })

    const notConfirmed = makeJob({ visits: [makeVisit({ tenantConfirmedAt: undefined })] })
    expect(find(owedForJob(notConfirmed, property, tenancy), 'tenant->trade')).toBeUndefined()
  })

  it('opens trade->tenant only for a visit that happened', () => {
    const slot = find(owedForJob(makeJob(), property, tenancy), 'trade->tenant')
    expect(slot).toMatchObject({ raterId: PEOPLE.kev, subjectId: PEOPLE.sarah, opensAt: DAY_0 })

    const noAccess = makeJob({
      visits: [makeVisit({ status: 'no_access', tenantConfirmedAt: undefined })],
    })
    expect(find(owedForJob(noAccess, property, tenancy), 'trade->tenant')).toBeUndefined()
  })

  it('asks the tenant only the two repair questions about their current landlord, sealed', () => {
    const slot = find(owedForJob(makeJob(), property, tenancy), 'tenant->landlord')
    expect(slot?.seal).toBe('retaliation_shield')
    expect(slot?.criteria.map((criterion) => criterion.id)).toEqual([
      'fixed_quickly',
      'kept_informed',
    ])
    expect(slot).toMatchObject({ opensAt: DAY_0, closesAt: day(14) })
  })

  it('asks no repair questions once the tenancy has ended', () => {
    const endedBefore = makeTenancy({ status: 'ended', endedAt: day(-10), endDate: '2026-02-20' })
    const owed = owedForJob(makeJob(), property, endedBefore)
    expect(find(owedForJob(makeJob(), property, endedBefore), 'tenant->landlord')).toBeUndefined()
    expect(find(owed, 'tenant->trade')).toBeDefined()
  })

  it('treats a certificate renewal as a visit, not a repair to rate the landlord on', () => {
    const gasCheck = makeJob({ complianceType: 'gas_safety', reportedAs: 'landlord' })
    const owed = owedForJob(gasCheck, property, tenancy)
    expect(find(owed, 'tenant->landlord')).toBeUndefined()
    expect(find(owed, 'trade->landlord')).toBeDefined()
  })

  it('leaves tenants out unless both sides confirmed the tenancy here', () => {
    const unconfirmed = makeTenancy({
      confirmations: [
        { personId: PEOPLE.graham, side: 'landlord', confirmedAt: '2025-05-20T10:00:00.000Z' },
      ],
    })
    const owed = owedForJob(makeJob(), property, unconfirmed)
    expect(directions(owed)).toEqual(['landlord->trade', 'trade->landlord'])
  })

  it('works for an empty home with no tenancy', () => {
    const owed = owedForJob(makeJob({ tenancyId: undefined }), property, null)
    expect(directions(owed)).toEqual(['landlord->trade', 'trade->landlord'])
  })

  it('never asks anyone to rate themselves', () => {
    const ownRepair = makeJob({ tradeId: PEOPLE.graham, visits: [] })
    const owed = owedForJob(ownRepair, property, tenancy)
    expect(owed.every((slot) => slot.raterId !== slot.subjectId)).toBe(true)
    expect(directions(owed)).toEqual(['tenant->landlord'])
  })

  it("keeps a landlord's own repair behind the shield, even with a visit", () => {
    // Graham is also a plumber. Sarah must not review her current landlord in public as a
    // trade, and he must not rate her from the trade side; her view goes in the sealed rating.
    const visit = makeVisit({ tradeId: PEOPLE.graham })
    const ownRepair = makeJob({ tradeId: PEOPLE.graham, visits: [visit] })
    expect(directions(owedForJob(ownRepair, property, tenancy))).toEqual(['tenant->landlord'])

    // The same goes for a letting agent on the home who does the work themselves.
    const agentRepair = makeJob({
      tradeId: PEOPLE.agent,
      visits: [makeVisit({ tradeId: PEOPLE.agent })],
    })
    const managed = { ...property, agentIds: [PEOPLE.agent] }
    expect(directions(owedForJob(agentRepair, managed, tenancy))).toEqual(['tenant->landlord'])
  })

  it('only opens a side of the tenant and trade pair before the other side has closed', () => {
    // Kev's window on Sarah runs from day 0 to day 14.
    const confirmedOnDay13 = makeJob({ visits: [makeVisit({ tenantConfirmedAt: day(13) })] })
    expect(find(owedForJob(confirmedOnDay13, property, tenancy), 'tenant->trade')).toMatchObject({
      opensAt: day(13),
      closesAt: day(27),
    })
    const confirmedOnDay14 = makeJob({ visits: [makeVisit({ tenantConfirmedAt: day(14) })] })
    const late = owedForJob(confirmedOnDay14, property, tenancy)
    expect(find(late, 'tenant->trade')).toBeUndefined()
    expect(find(late, 'trade->tenant')).toBeDefined()
  })

  it('lets only the co-tenant who reported the job rate the trade', () => {
    const shared = makeTenancy({ tenantIds: [PEOPLE.sarah, PEOPLE.amy] })
    expect(jobTenantIds(makeJob(), shared)).toEqual([PEOPLE.sarah])
    const landlordRaised = makeJob({ reportedById: PEOPLE.graham, reportedAs: 'landlord' })
    expect(jobTenantIds(landlordRaised, shared)).toEqual([PEOPLE.sarah, PEOPLE.amy])
  })
})

describe('which ratings a tenancy unlocks', () => {
  it('unlocks nothing while the tenancy is live', () => {
    expect(owedForTenancy(makeTenancy())).toEqual([])
  })

  it('opens both directions for 28 days when it ends, double-blind, with all five questions', () => {
    const owed = owedForTenancy(endedTenancy())
    expect(directions(owed)).toEqual(['landlord->tenant', 'tenant->landlord'])
    for (const slot of owed) {
      expect(slot).toMatchObject({ opensAt: DAY_0, closesAt: day(28), seal: 'double_blind' })
      expect(slot.criteria).toHaveLength(5)
      expect(slot.context).toEqual(TENANCY)
    }
  })

  it('gives each co-tenant their own rating both ways', () => {
    const owed = owedForTenancy(endedTenancy({ tenantIds: [PEOPLE.sarah, PEOPLE.amy] }))
    expect(owed).toHaveLength(4)
    expect(
      owed.filter((slot) => slot.direction === 'landlord->tenant').map((s) => s.subjectId),
    ).toEqual([PEOPLE.sarah, PEOPLE.amy])
  })

  it('unlocks nothing for a tenancy that only one side confirmed (rule 1)', () => {
    const oneSided = endedTenancy({
      confirmations: [
        { personId: PEOPLE.graham, side: 'landlord', confirmedAt: '2025-05-20T10:00:00.000Z' },
      ],
    })
    expect(isConfirmedByBoth(oneSided)).toBe(false)
    expect(owedForTenancy(oneSided)).toEqual([])
  })

  it('needs every joint tenant to confirm', () => {
    const tenancy = makeTenancy({
      tenantIds: [PEOPLE.sarah, PEOPLE.amy],
      confirmations: [
        { personId: PEOPLE.graham, side: 'landlord', confirmedAt: '2025-05-20T10:00:00.000Z' },
        { personId: PEOPLE.sarah, side: 'tenant', confirmedAt: '2025-05-21T10:00:00.000Z' },
      ],
    })
    expect(isConfirmedByBoth(tenancy)).toBe(false)
  })
})

describe('reminders', () => {
  const owed = owedForJob(makeJob(), property, makeTenancy())

  it('reminds every party on day 3 and day 10 of their window, the same for everyone', () => {
    for (const slot of owed) {
      expect(slot.remindAt).toEqual([
        new Date(Date.parse(slot.opensAt) + 3 * 86_400_000).toISOString(),
        new Date(Date.parse(slot.opensAt) + 10 * 86_400_000).toISOString(),
      ])
    }
  })

  it('skips people who have already sent their rating', () => {
    const sent = makeRating({
      direction: 'trade->landlord',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      state: 'sealed',
      at: day(1),
    })
    const due = dueReminders(owed, [sent], DAY_0, day(3, 12))
    const reminded = due.map((reminder) => reminder.slot.direction).sort()
    expect(reminded).toEqual(['tenant->landlord', 'trade->tenant'])
    expect(due.every((reminder) => reminder.at === day(3))).toBe(true)
  })

  it('still reminds someone whose rating is only a draft', () => {
    const draft = makeRating({
      direction: 'trade->landlord',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      state: 'draft',
      submittedAt: undefined,
    })
    const due = dueReminders(owed, [draft], DAY_0, day(3, 12))
    expect(due.some((reminder) => reminder.slot.direction === 'trade->landlord')).toBe(true)
  })
})

describe('rating tasks', () => {
  const owed = owedForJob(makeJob(), property, makeTenancy())

  it('shows what each person owes and whether the other side has rated, never what they said', () => {
    const fromKev = makeRating({
      direction: 'trade->landlord',
      raterId: PEOPLE.kev,
      subjectId: PEOPLE.graham,
      state: 'sealed',
      at: day(3),
    })
    const tasks = ratingTasksFor(PEOPLE.graham, owed, [fromKev], day(4))
    expect(tasks).toEqual([
      expect.objectContaining({
        direction: 'landlord->trade',
        subjectId: PEOPLE.kev,
        status: 'to_do',
        counterpartHasRated: true,
      }),
    ])
    expect(Object.keys(tasks[0] ?? {})).not.toContain('answers')
  })

  it('drops a task whose window closed without a rating, but keeps sent ones', () => {
    const fromSarah = makeRating({
      direction: 'tenant->trade',
      raterId: PEOPLE.sarah,
      subjectId: PEOPLE.kev,
      state: 'sealed',
      at: day(2),
    })
    const tasks = ratingTasksFor(PEOPLE.sarah, owed, [fromSarah], day(20))
    expect(tasks).toEqual([
      expect.objectContaining({ direction: 'tenant->trade', status: 'submitted' }),
    ])
  })

  it('pairs each direction with its reverse', () => {
    expect(reverseDirection('trade->landlord')).toBe('landlord->trade')
    expect(reverseDirection('tenant->trade')).toBe('trade->tenant')
    expect(reverseDirection('landlord->tenant')).toBe('tenant->landlord')
  })

  it('refers to the job context', () => {
    expect(owed.every((slot) => slot.context.kind === JOB.kind)).toBe(true)
  })
})
