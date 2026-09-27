import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPublic } from './harness'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('persona picker at /start', () => {
  test('offers one person per portal, then more people, then the side-by-side demo', async () => {
    renderPublic('/start')
    expect(screen.getByRole('heading', { level: 1, name: 'Try Slate as…' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Try as Sarah/ })).toBeInTheDocument()
    const main = screen.getByRole('region', { name: 'One person for each portal' })
    expect(
      within(main)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining('Sarah'),
      expect.stringContaining('Graham'),
      expect.stringContaining('Kev'),
    ])
    const more = screen.getByRole('region', { name: 'More people to try' })
    for (const name of [/Try as Hannah/, /Try as Derek/, /Try as Aileen/]) {
      expect(within(more).getByRole('button', { name })).toBeInTheDocument()
    }
    const page = screen.getByRole('main')
    expect(within(page).getByRole('link', { name: /Open all three side by side/ })).toHaveAttribute(
      'href',
      '/demo',
    )
  })

  test('each person comes with a sentence about their situation', async () => {
    renderPublic('/start')
    const sarah = await screen.findByRole('button', { name: /Try as Sarah/ })
    expect(sarah).toHaveTextContent(/Rosemount/)
  })

  test('choosing someone signs this tab in and opens their portal', async () => {
    const user = userEvent.setup()
    const { store, location } = renderPublic('/start')
    await user.click(await screen.findByRole('button', { name: /Try as Kev/ }))
    expect(store.get()).toEqual({ personId: 'person_kev', activeRole: 'trade' })
    expect(location()).toBe('/trade')
  })

  test('after the guard sent someone here, it carries on to the page they opened', async () => {
    const user = userEvent.setup()
    const { location } = renderPublic('/start', { state: { from: '/landlord/documents' } })
    expect(await screen.findByText(/carry on to the page you opened/)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Try as Graham/ }))
    expect(location()).toBe('/landlord/documents')
  })

  test('a letting agent signs in to the landlord portal', async () => {
    const user = userEvent.setup()
    const { store, location } = renderPublic('/start')
    await user.click(await screen.findByRole('button', { name: /Try as Aileen/ }))
    expect(store.get()?.activeRole).toBe('landlord')
    expect(location()).toBe('/landlord')
  })

  test('someone already signed in can carry on or sign out', async () => {
    const user = userEvent.setup()
    const { store } = renderPublic('/start', {
      session: { personId: 'person_sarah', activeRole: 'tenant' },
    })
    expect(await screen.findByText(/You’re signed in as/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Carry on as Sarah/ })).toHaveAttribute(
      'href',
      '/tenant',
    )
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(store.get()).toBeNull()
    await waitFor(() => expect(screen.queryByText(/You’re signed in as/)).not.toBeInTheDocument())
  })
})

describe('signing in with email', () => {
  test('an account made in this browser gets a link and lands in its portal', async () => {
    const user = userEvent.setup()
    const { slate, store, location } = renderPublic('/start')
    const sent = await slate.api.signUp({
      displayName: 'Ruth Gauld',
      email: 'ruth.gauld@example.com',
      role: 'tenant',
      postcodeDistrict: 'AB24',
      confirmsAdult: true,
      claims: [],
    })
    await slate.api.completeMagicLink(sent.demoToken ?? '')

    await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sign in with email' })
    await user.type(within(dialog).getByLabelText('Email'), 'ruth.gauld@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send me a link' }))
    expect(
      await screen.findByText(/We sent a sign-in link to ruth.gauld@example.com/),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Sign me in' }))

    await waitFor(() => expect(location()).toBe('/tenant'))
    expect(store.get()?.activeRole).toBe('tenant')
  })

  test('an email with no account is told to sign up instead', async () => {
    const user = userEvent.setup()
    const { store } = renderPublic('/start')
    await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Email'), 'nobody.here@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send me a link' }))
    await user.click(await screen.findByRole('button', { name: 'Sign me in' }))
    expect(await screen.findByText(/no Slate account for that email yet/)).toBeInTheDocument()
    expect(store.get()).toBeNull()
  })

  test('a malformed email is caught before anything is sent', async () => {
    const user = userEvent.setup()
    renderPublic('/start')
    await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: 'Send me a link' }))
    expect(await within(dialog).findByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})
