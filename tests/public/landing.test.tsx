import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BRAND } from '@/config/brand'
import { renderPublic } from './harness'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('front page', () => {
  test('leads with the promise and two ways in', () => {
    renderPublic('/')
    expect(screen.getByRole('heading', { level: 1, name: BRAND.tagline })).toBeInTheDocument()
    const hero = screen.getByRole('region', { name: BRAND.tagline })
    expect(within(hero).getByRole('link', { name: /Try the demo/ })).toHaveAttribute(
      'href',
      '/start',
    )
    expect(within(hero).getByRole('link', { name: /Sign up free/ })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  test('persona shortcuts sign a tab straight into each portal', () => {
    renderPublic('/')
    const hero = screen.getByRole('region', { name: BRAND.tagline })
    const sarah = within(hero).getByRole('link', { name: /Try as Sarah/ })
    expect(sarah.getAttribute('href')).toMatch(/^\/tenant\?as=person_sarah&role=tenant/)
    expect(
      within(hero)
        .getByRole('link', { name: /Try as Graham/ })
        .getAttribute('href'),
    ).toMatch(/^\/landlord\?as=person_graham/)
    expect(
      within(hero)
        .getByRole('link', { name: /Try as Kev/ })
        .getAttribute('href'),
    ).toMatch(/^\/trade\?as=person_kev/)
  })

  test('the product picture is described for screen readers', () => {
    renderPublic('/')
    expect(screen.getByRole('img', { name: /paid on time on 9 of 9 jobs/ })).toBeInTheDocument()
  })

  test('three doors lead to a section for each party', () => {
    renderPublic('/')
    const doors = screen.getByRole('region', { name: 'Three doors, one record' })
    for (const [name, id] of [
      [/I rent/, 'for-tenants'],
      [/I let/, 'for-landlords'],
      [/I’m a trade/, 'for-trades'],
    ] as const) {
      expect(within(doors).getByRole('link', { name })).toHaveAttribute('href', `/#${id}`)
      expect(document.getElementById(id)).toBeInTheDocument()
    }
  })

  test('explains how ratings stay fair, with the review policy a click away', () => {
    renderPublic('/')
    const fair = screen.getByRole('region', { name: /Ratings that come from real work/ })
    expect(
      within(fair).getByRole('heading', { name: 'Trades finally rate their customers.' }),
    ).toBeInTheDocument()
    for (const principle of [
      'Verified, or not at all',
      'Revealed together',
      'Tenants protected',
      'The tenant passport',
    ]) {
      expect(within(fair).getByRole('heading', { name: principle })).toBeInTheDocument()
    }
    expect(within(fair).getByRole('link', { name: /Read the review policy/ })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
  })

  test('the sample client rating links the policy and can be reported', async () => {
    const user = userEvent.setup()
    renderPublic('/')
    const fair = screen.getByRole('region', { name: /Ratings that come from real work/ })
    expect(within(fair).getByRole('link', { name: 'Review policy' })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
    await user.click(within(fair).getByRole('button', { name: 'Report' }))
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    expect(within(dialog).getAllByRole('link', { name: /within/ })).toHaveLength(4)
  })

  test('shows the Scottish rules it is built around', () => {
    renderPublic('/')
    const scotland = screen.getByRole('region', { name: 'Built for how letting works here' })
    for (const rule of [
      'Private residential tenancies',
      'Landlord registration',
      'The Repairing Standard',
      '48 hours’ notice',
    ]) {
      expect(within(scotland).getByRole('heading', { name: rule })).toBeInTheDocument()
    }
  })

  test('pricing is free during launch, with later prices marked as intended', () => {
    renderPublic('/')
    const pricing = screen.getByRole('region', { name: 'Free during launch' })
    expect(within(pricing).getAllByText('£0')).toHaveLength(3)
    expect(within(pricing).getByText('Then from £4 per home a month')).toBeInTheDocument()
    expect(within(pricing).getByText(/Nobody is charged during launch/)).toBeInTheDocument()
    expect(within(pricing).getByRole('link', { name: 'Sign up as a landlord' })).toHaveAttribute(
      'href',
      '/signup/landlord',
    )
  })

  test('the footer says it is a demo and links every policy', () => {
    renderPublic('/')
    const footer = screen.getByRole('contentinfo')
    expect(
      within(footer).getByText('This is a demo with fictional people and places.'),
    ).toBeInTheDocument()
    for (const [name, href] of [
      ['Review policy', '/policies/reviews'],
      ['Reporting a review', '/policies/reporting'],
      ['Privacy', '/policies/privacy'],
    ] as const) {
      expect(within(footer).getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  test('an unknown public address gets the friendly 404', async () => {
    renderPublic('/no-such-page')
    expect(
      await screen.findByRole('heading', { name: 'We can’t find that page' }),
    ).toBeInTheDocument()
  })
})

test('a tenant’s passport link opens in the landlord portal', async () => {
  const { location } = renderPublic('/passport/pass_abc123')
  await waitFor(() => expect(location()).toBe('/landlord/passports/pass_abc123'))
})
