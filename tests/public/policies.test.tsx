import { screen, waitFor, within } from '@testing-library/react'
import { BRAND } from '@/config/brand'
import { REPORT_ROUTE_INFO, REPORT_ROUTES } from '@/domain/types'
import { clockText, REPORT_ROUTE_COPY } from '@/routes/policies/report-routes'
import { renderPublic } from './harness'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('review policy', () => {
  test('links the other policies and every section, with landmarks that have their own names', async () => {
    renderPublic('/policies/reviews')
    const pages = await screen.findByRole('navigation', { name: 'Policy pages' })
    expect(within(pages).getByRole('link', { name: 'Review policy' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(pages).getByRole('link', { name: 'Reporting' })).toHaveAttribute(
      'href',
      '/policies/reporting',
    )
    // One list folded away for phones and one beside the text on wide screens.
    for (const onThisPage of screen.getAllByRole('navigation', { name: 'On this page' })) {
      expect(within(onThisPage).getByRole('link', { name: 'Fake reviews' })).toHaveAttribute(
        'href',
        '/policies/reviews#fake-reviews',
      )
    }
    const names = screen.getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label'))
    expect(names.filter((name) => name === 'Policies')).toHaveLength(1)
  })

  test('covers everything the spec asks for, each with its own anchor', async () => {
    renderPublic('/policies/reviews')
    expect(await screen.findByRole('heading', { level: 1, name: 'Review policy' })).toBeVisible()
    for (const [id, title] of [
      ['who-can-review', 'Who can review'],
      ['double-blind', 'Revealed together'],
      ['tenants-protected', 'How tenants are protected'],
      ['filters', 'What we filter'],
      ['replies', 'Replies and updates'],
      ['disputes', 'Reporting a review'],
      ['removal', 'When reviews are removed'],
      ['expiry', 'How long reviews last'],
      ['fake-reviews', 'Fake reviews'],
    ] as const) {
      const section = document.getElementById(id)
      expect(section).not.toBeNull()
      expect(within(section!).getByRole('heading', { level: 2, name: title })).toBeVisible()
    }
  })

  test('quotes the rules from the rating config', async () => {
    renderPublic('/policies/reviews')
    const expiry = await waitFor(() => document.getElementById('expiry')!)
    expect(expiry).toHaveTextContent('36 months')
    expect(document.getElementById('double-blind')).toHaveTextContent('Repairs: 14 days.')
    expect(document.getElementById('double-blind')).toHaveTextContent('End of a tenancy: 28 days.')
    expect(document.getElementById('replies')).toHaveTextContent('up to 500 characters')
    expect(document.getElementById('filters')).toHaveTextContent('immigration status')
    expect(document.getElementById('filters')).toHaveTextContent('other people’s names')
    expect(document.getElementById('scores')).toHaveTextContent(
      'once each half has its own score, from 3 different landlords and 3 different tenants',
    )
    expect(document.getElementById('removal')).toHaveTextContent(
      `Nobody at ${BRAND.name} approves or rejects a review`,
    )
  })

  test('lists who rates whom in a plain table', async () => {
    renderPublic('/policies/reviews')
    const table = await screen.findByRole('table', { name: /Who rates whom/ })
    expect(within(table).getAllByRole('row')).toHaveLength(7)
    expect(within(table).getByText('Trade rates landlord')).toBeInTheDocument()
  })
})

describe('reporting policy', () => {
  test('explains the four routes, each with its clock and where the clock comes from', async () => {
    renderPublic('/policies/reporting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Reporting' })).toBeVisible()
    for (const copy of REPORT_ROUTE_COPY) {
      const section = document.getElementById(copy.anchor)
      expect(section).not.toBeNull()
      expect(section).toHaveTextContent(copy.label)
      expect(section).toHaveTextContent(copy.clock)
      expect(section).toHaveTextContent(copy.basis)
    }
  })

  test('the clocks match the report rules', () => {
    expect(REPORT_ROUTE_COPY.map((copy) => copy.route)).toEqual([...REPORT_ROUTES])
    expect(clockText(REPORT_ROUTE_INFO.defamation.clock)).toBe(
      'We tell the person who posted it within 48 working hours.',
    )
    expect(clockText(REPORT_ROUTE_INFO.illegal.clock)).toBe('We review it within 24 hours.')
    expect(clockText(REPORT_ROUTE_INFO.fake.clock)).toBe('We review it within 5 working days.')
    expect(clockText(REPORT_ROUTE_INFO.data_protection.clock)).toBe(
      'We acknowledge your request within 30 days.',
    )
    expect(REPORT_ROUTE_COPY.find((copy) => copy.route === 'defamation')?.clockSource).toBe(
      'Set in law',
    )
    expect(REPORT_ROUTE_COPY.find((copy) => copy.route === 'fake')?.clockSource).toBe(
      'Our own target',
    )
  })
})

describe('privacy', () => {
  test('says the demo keeps everything in the browser', async () => {
    renderPublic('/policies/privacy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'It stays in your browser' })).toBeVisible()
    expect(screen.getByText(/This demo has no server/)).toBeVisible()
  })
})

test('/policies opens the review policy, and an unknown policy is a 404', async () => {
  const first = renderPublic('/policies')
  await waitFor(() => expect(first.location()).toBe('/policies/reviews'))
  first.unmount()
  renderPublic('/policies/cookies')
  expect(await screen.findByRole('heading', { name: 'We can’t find that page' })).toBeVisible()
})
