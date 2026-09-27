import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PersonId } from '@/domain/types'
import { kev, renderTrade } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function credentials() {
  return screen.getByRole('region', { name: /Checked credentials/ })
}

describe('the trade profile', () => {
  it('shows a Gas Safe badge with its appliance categories and the date it was checked', async () => {
    renderTrade('/trade/profile', { personId: 'person_mhairi' as PersonId })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mhairi Robertson' }),
    ).toBeInTheDocument()
    const badges = credentials()
    expect(within(badges).getByText('Gas Safe registered')).toBeInTheDocument()
    expect(within(badges).getByText(/Boilers and central heating/)).toBeInTheDocument()
    expect(within(badges).getByText('Checked 9 Mar 2026')).toBeInTheDocument()
  })

  it('shows an electrical scheme membership, never a scheme logo', async () => {
    renderTrade('/trade/profile', { personId: 'person_neil' as PersonId })
    await screen.findByRole('heading', { level: 1, name: 'Neil Buchan' })
    const badges = credentials()
    expect(within(badges).getByText('SELECT member')).toBeInTheDocument()
    expect(within(badges).getByText('Checked 12 Jan 2026')).toBeInTheDocument()
    expect(within(badges).queryByRole('img', { name: /logo/i })).not.toBeInTheDocument()
  })

  it('says New until three different people have reviewed, with both halves shown', async () => {
    renderTrade('/trade/profile', { personId: 'person_mhairi' as PersonId })
    await screen.findByRole('heading', { level: 1, name: 'Mhairi Robertson' })
    expect(screen.getAllByText(/New · 2 verified reviews/).length).toBeGreaterThanOrEqual(2)
  })

  it('dates older client ratings with their year, newest first', async () => {
    renderTrade('/trade/profile')
    const given = await screen.findByRole('region', { name: /Your client ratings of landlords/ })
    const items = within(given).getAllByRole('link')
    expect(items[0]).toHaveTextContent('Hannah Reid')
    expect(within(given).getByText(/18 Feb 2025/)).toBeInTheDocument()
  })

  it('offers a dispute, not a reply, once the 30-day reply window has passed', async () => {
    renderTrade('/trade/profile')
    const reviews = await screen.findByRole('region', { name: /Reviews of you/ })
    expect(within(reviews).getAllByRole('link', { name: 'Dispute' }).length).toBeGreaterThan(0)
    expect(within(reviews).queryByRole('link', { name: 'Reply or dispute' })).toBeNull()
  })

  it('switches VAT on for quotes from the profile', async () => {
    const user = userEvent.setup()
    const { slate } = renderTrade('/trade/profile')
    const vat = await screen.findByRole('switch', { name: /VAT registered/ })
    await user.click(vat)
    await waitFor(async () => {
      const me = await slate.api.getMe(kev)
      expect(me.tradeProfile?.vatRegistered).toBe(true)
    })
  })
})

describe('quotes and invoices', () => {
  it('leaves out a group with nothing in it', async () => {
    renderTrade('/trade/quotes')
    await screen.findByRole('table', { name: 'Waiting for an answer' })
    expect(screen.queryByRole('heading', { name: /Didn’t go ahead/ })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('table', { name: 'Accepted' })).getByText(/18 Nov 2024/),
    ).toBeInTheDocument()
  })
})
