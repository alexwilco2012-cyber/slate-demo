import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { workingDaysBetween } from '@/routes/tenant/lib/format'
import { renderTenant, sarah } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('the tenant passport', () => {
  it('counts each question with no single score, and shows the views log', async () => {
    renderTenant('/tenant/passport')
    const card = await screen.findByRole('region', { name: 'Tenant passport' })
    expect(within(card).getByText('Rent on agreed date')).toBeInTheDocument()
    expect(within(card).getByText('Rent on agreed date').closest('div')).toHaveTextContent(
      'Always, from 2 of 2 landlords',
    )
    expect(within(card).getByText(/No single score/)).toBeInTheDocument()
    const links = screen.getByRole('region', { name: /Your links/ })
    expect(within(links).getByText('For the flat on Esslemont Avenue')).toBeInTheDocument()
    expect(within(links).getByText('Expired')).toBeInTheDocument()
    expect(within(links).getAllByText('Signed-in letting agent')).toHaveLength(2)
  })

  it('makes an all-or-nothing link for 30 days, then switches it off', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/passport')
    await user.type(await screen.findByLabelText(/Who’s it for/), 'For the flat on Union Grove')
    await user.click(screen.getByRole('button', { name: 'Make a share link' }))
    const links = screen.getByRole('region', { name: /Your links/ })
    const item = (await within(links).findByText('For the flat on Union Grove')).closest('li')!
    expect(within(item).getByText('Working')).toBeInTheDocument()
    expect(within(item).getByText(/works for 30 more days/)).toBeInTheDocument()
    expect(
      (within(item).getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value,
    ).toMatch(/\/passport\/[\w-]+$/)

    await user.click(within(item).getByRole('button', { name: 'Switch off this link' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Switch off this link?' })).getByRole(
        'button',
        {
          name: 'Switch it off',
        },
      ),
    )
    await waitFor(() => expect(within(item).getByText('Switched off')).toBeInTheDocument())
    const shares = await slate.api.listPassportShares(sarah)
    expect(shares.find((s) => s.label === 'For the flat on Union Grove')?.revokedAt).toBeDefined()
  })

  it('previews exactly what a landlord sees', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/passport')
    await user.click(await screen.findByRole('button', { name: 'See what a landlord sees' }))
    const dialog = await screen.findByRole('dialog', { name: 'What a landlord sees' })
    expect(within(dialog).getByText(/You can’t leave any out/)).toBeInTheDocument()
    expect(within(dialog).getAllByText(/Verified landlord/)).toHaveLength(2)
  })
})

describe('the tenancy page', () => {
  it('shows key dates, the deposit scheme and the shared certificates with their status', async () => {
    renderTenant('/tenant/tenancies')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Top Floor Right, 14 Esslemont Avenue',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('£875 a month')).toBeInTheDocument()
    expect(screen.getByText('The 1st of each month')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Certificates for your home' })
    const eicr = within(table)
      .getByText('Electrical installation condition report (EICR)')
      .closest('tr')!
    expect(within(eicr).getByText('Booked')).toBeInTheDocument()
    expect(within(eicr).getByText('18 days left')).toBeInTheDocument()
    const gas = within(table).getByText('Gas safety record').closest('tr')!
    expect(within(gas).getByText('Up to date')).toBeInTheDocument()
    expect(screen.getByText('Holds yours').closest('li')).toHaveTextContent('SafeDeposits Scotland')
  })

  it('lists past homes, and a past tenancy says it has ended', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/tenancies')
    await user.click(
      await screen.findByRole('link', { name: /First Floor Right, 88 Victoria Road/ }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'First Floor Right, 88 Victoria Road' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ended May 2025/)).toBeInTheDocument()
  })
})

describe('working days for the deposit rule', () => {
  it('counts Monday to Friday after the start date', () => {
    // Sunday 1 June 2025 to Thursday 12 June 2025: 9 working days.
    expect(workingDaysBetween('2025-06-01', '2025-06-12')).toBe(9)
    expect(workingDaysBetween('2025-06-12', '2025-06-12')).toBe(0)
    // Friday to the next Monday is one working day.
    expect(workingDaysBetween('2026-09-25', '2026-09-28')).toBe(1)
  })
})
