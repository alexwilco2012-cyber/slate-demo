import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AILEEN, GRAHAM, renderLandlord } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

function section(name: string) {
  return screen.getByRole('region', { name })
}

describe('the landlord’s home', () => {
  it('leads with what needs them, most pressing first, above the portfolio', async () => {
    renderLandlord('/landlord')
    expect(await screen.findByRole('heading', { level: 1, name: /Graham$/ })).toBeInTheDocument()
    const actions = await screen.findByRole('heading', { level: 2, name: /Actions needed/ })
    const homes = screen.getByRole('heading', { level: 2, name: /Your homes/ })
    // "Actions needed" comes before the portfolio in reading order.
    expect(actions.compareDocumentPosition(homes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const queue = section('Actions needed')
    const rows = await within(queue).findAllByRole('listitem')
    // The expired alarm certificate is the most pressing thing.
    expect(rows[0]).toHaveTextContent('Smoke and heat alarms expired')
    expect(rows[0]).toHaveTextContent('118 King Street, Old Aberdeen')
    expect(within(rows[0]!).getByRole('link', { name: /Renew/ })).toHaveAttribute(
      'href',
      '/landlord/homes/property_king_street/documents',
    )
    expect(
      within(queue).getByText('Damp patch spreading on the bedroom ceiling'),
    ).toBeInTheDocument()
    expect(within(queue).getByText('Compare 2 quotes')).toBeInTheDocument()
  })

  it('shows five things at first and the rest on request, including ratings owed', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord')
    const more = await screen.findByRole('button', { name: /Show 7 more/ })
    const queue = section('Actions needed')
    expect(within(queue).getAllByRole('listitem')).toHaveLength(5)
    await user.click(more)
    await waitFor(() => expect(within(queue).getAllByRole('listitem')).toHaveLength(12))
    expect(within(queue).getByText('Rate Mhairi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('lists every home with its tenants, rent, certificates and open repairs', async () => {
    renderLandlord('/landlord')
    const homes = await screen.findByRole('heading', { level: 2, name: /Your homes/ })
    const list = await within(homes.closest('section')!).findAllByRole('article')
    expect(list).toHaveLength(6)
    const king = list.find((card) => card.textContent?.includes('118 King Street'))!
    await waitFor(() => expect(king).toHaveTextContent('Eilidh'))
    expect(king).toHaveTextContent('£760 a month')
    expect(king).toHaveTextContent(/Certificates:?\s*1 expired/)
    expect(king).toHaveTextContent('1 open repair')
    // The home that's between tenancies says who is moving in.
    const fonthill = list.find((card) => card.textContent?.includes('9 Fonthill Road'))!
    expect(fonthill).toHaveTextContent(/Moving in\s*Callum, 3 Oct/)
  })

  it('shows what tenants and trades say, with the client rating the landlord can see', async () => {
    renderLandlord('/landlord')
    expect(
      await screen.findByRole('heading', { name: 'What tenants say about you' }),
    ).toBeInTheDocument()
    const trades = screen.getByRole('heading', { name: 'What trades say about you' })
    const card = trades.closest('div')!.parentElement!
    expect(within(card).getByText(/Paid on time on 3 of 4 jobs/)).toBeInTheDocument()
    expect(within(card).getByText(/Only trades and you can see this/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /How reviews work/ })[0]).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
    expect(screen.getByText('Registration verified')).toBeInTheDocument()
  })

  it('works the same for a letting agent inside the landlord’s account', async () => {
    renderLandlord('/landlord', { personId: AILEEN, actingForLandlordId: GRAHAM })
    expect(await screen.findByRole('heading', { level: 1, name: /Aileen$/ })).toBeInTheDocument()
    expect((await screen.findAllByText(/Graham Forbes/)).length).toBeGreaterThan(0)
    expect(
      await screen.findByText('Damp patch spreading on the bedroom ceiling', undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument()
  })
})
