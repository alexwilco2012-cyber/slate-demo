import { addBusinessDays, addBusinessHours, isBusinessDay, reportClock } from '@/domain/rating'

describe('report clocks', () => {
  it('gives defamation 48 working hours to notify the poster', () => {
    // Monday 2 March 2026, 10:00 UK time (GMT).
    expect(reportClock('defamation', '2026-03-02T10:00:00.000Z')).toEqual({
      step: 'notify_poster',
      dueAt: '2026-03-04T10:00:00.000Z',
    })
  })

  it('skips the weekend', () => {
    // Friday 6 March, 10:00: 14 hours on Friday, then 34 from Monday.
    expect(addBusinessHours('2026-03-06T10:00:00.000Z', 48)).toBe('2026-03-10T10:00:00.000Z')
  })

  it('counts UK days, so the weekend starts at UK midnight in summer', () => {
    // Friday 5 June, 11:00 BST. Friday ends at 23:00 UTC; Monday starts at 23:00 UTC Sunday.
    expect(addBusinessHours('2026-06-05T10:00:00.000Z', 48)).toBe('2026-06-09T10:00:00.000Z')
    expect(isBusinessDay(Date.parse('2026-06-05T23:30:00.000Z'))).toBe(false)
    expect(isBusinessDay(Date.parse('2026-06-07T23:30:00.000Z'))).toBe(true)
  })

  it('skips bank holidays it is told about', () => {
    // Friday 22 May, then the Monday 25 May bank holiday.
    const options = { bankHolidays: ['2026-05-25'] }
    expect(addBusinessHours('2026-05-22T09:00:00.000Z', 48, options)).toBe(
      '2026-05-27T09:00:00.000Z',
    )
  })

  it('knows the bank holidays itself, including Christmas Day and Good Friday', () => {
    // Thursday 24 December 2026, 10:00: 14 hours, then Christmas Day, the weekend and the
    // Boxing Day holiday on Monday 28 December, so the other 34 hours run from Tuesday.
    expect(reportClock('defamation', '2026-12-24T10:00:00.000Z')).toEqual({
      step: 'notify_poster',
      dueAt: '2026-12-30T10:00:00.000Z',
    })
    // Thursday 2 April 2026, 10:00 BST: Good Friday and Easter Monday don't count.
    expect(addBusinessHours('2026-04-02T09:00:00.000Z', 48)).toBe('2026-04-08T09:00:00.000Z')
    expect(isBusinessDay(Date.parse('2026-04-03T12:00:00.000Z'))).toBe(false)
    // Passing a list replaces the built-in one.
    expect(isBusinessDay(Date.parse('2026-04-03T12:00:00.000Z'), { bankHolidays: [] })).toBe(true)
  })

  it('gives illegal content 24 hours and suspected fakes 5 working days', () => {
    expect(reportClock('illegal', '2026-03-06T10:00:00.000Z')).toEqual({
      step: 'review',
      dueAt: '2026-03-07T10:00:00.000Z',
    })
    expect(reportClock('fake', '2026-03-06T10:00:00.000Z')).toEqual({
      step: 'review',
      dueAt: '2026-03-13T10:00:00.000Z',
    })
    expect(addBusinessDays('2026-03-07T10:00:00.000Z', 1)).toBe('2026-03-09T10:00:00.000Z')
  })

  it('gives data protection requests 30 days to acknowledge', () => {
    expect(reportClock('data_protection', '2026-03-02T10:00:00.000Z')).toEqual({
      step: 'acknowledge',
      dueAt: '2026-04-01T10:00:00.000Z',
    })
  })
})
