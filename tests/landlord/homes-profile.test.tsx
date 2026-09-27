import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graham, renderLandlord } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  delete document.body.dataset.textSize
  localStorage.clear()
})

describe('a home’s page', () => {
  it('has the details, EPC, deposit scheme, tenancy, certificates, repairs and tenants’ view', async () => {
    renderLandlord('/landlord/homes/property_esslemont')
    expect(
      await screen.findByRole('heading', { level: 1, name: '14 Esslemont Avenue' }),
    ).toBeInTheDocument()
    const facts = screen.getByRole('region', { name: 'The home' })
    expect(within(facts).getByText('Deposits held by')).toBeInTheDocument()
    expect(within(facts).getByRole('list', { name: /EPC band [A-G]/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tenancy' })).toHaveTextContent('Living here now')
    expect(screen.getByRole('region', { name: 'Tenancy' })).toHaveTextContent('Sarah')
    expect(screen.getByRole('region', { name: 'Certificates and documents' })).toBeInTheDocument()
    const repairs = screen.getByRole('region', { name: /Repairs/ })
    expect(
      await within(repairs).findByText('Damp patch spreading on the bedroom ceiling'),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tenants’ view of this home' })).toBeInTheDocument()
  })

  it('says so plainly when a home isn’t in this account', async () => {
    renderLandlord('/landlord/homes/property_victoria_road')
    expect(
      await screen.findByRole('heading', { name: 'We couldn’t find that home' }),
    ).toBeInTheDocument()
  })

  it('shows the portfolio at a glance', async () => {
    renderLandlord('/landlord/homes')
    const glance = await screen.findByRole('list', { name: 'At a glance' })
    expect(glance).toHaveTextContent('£5,030')
    expect(await screen.findAllByRole('article')).toHaveLength(6)
  })
})

describe('the landlord’s profile', () => {
  it('shows the landlord registration number as a checked badge with its date', async () => {
    renderLandlord('/landlord/profile')
    const credentials = await screen.findByRole('region', { name: 'Checked credentials' })
    expect(within(credentials).getByText('Registration verified')).toBeInTheDocument()
    expect(credentials).toHaveTextContent('514782/100/26031')
    expect(credentials).toHaveTextContent('Checked 2 Jul 2025')
  })

  it('offers comfortable text, remembered on this device', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/profile')
    const size = await screen.findByRole('region', { name: 'Text size' })
    expect(document.body.dataset.textSize).toBeUndefined()
    await user.click(within(size).getByRole('radio', { name: 'Comfortable' }))
    expect(document.body.dataset.textSize).toBe('comfortable')
    expect(localStorage.getItem('slate-text-size')).toBe('comfortable')
    await user.click(within(size).getByRole('radio', { name: 'Standard' }))
    expect(document.body.dataset.textSize).toBeUndefined()
  })

  it('saves a change of name', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/profile')
    const name = await screen.findByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(name).toHaveValue('Graham Forbes'))
    await user.clear(name)
    await user.type(name, 'Graham J Forbes')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(async () =>
      expect((await slate.api.getMe(graham)).displayName).toBe('Graham J Forbes'),
    )
  })
})

describe('messages', () => {
  it('lists conversations and sends a message with the landlord’s role chip', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/messages/thread_ceiling_esslemont')
    const log = await screen.findByRole('log', { name: /Messages: Damp patch/ })
    expect(within(log).getAllByText('Tenant').length).toBeGreaterThan(0)
    await user.type(
      screen.getByRole('textbox', { name: /Message about Damp patch/ }),
      'A roofer is coming on Tuesday.',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await within(log).findByText('A roofer is coming on Tuesday.')).toBeInTheDocument()
    const messages = await slate.api.listMessages(graham, 'thread_ceiling_esslemont')
    expect(messages.at(-1)?.body).toBe('A roofer is coming on Tuesday.')
  })

  it('lets the landlord report someone else’s message', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/messages/thread_ceiling_esslemont')
    const log = await screen.findByRole('log', { name: /Messages: Damp patch/ })
    await user.click(within(log).getAllByRole('button', { name: /Report message from/ })[0]!)
    expect(await screen.findByRole('dialog', { name: 'Report this message' })).toBeInTheDocument()
  })
})
