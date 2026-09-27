import { screen, within } from '@testing-library/react'
import { renderTrade } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('the trade home screen', () => {
  it('greets Kev and lists today’s visits in time order, with access notes and directions', async () => {
    renderTrade('/trade')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Morning, Kev' }),
    ).toBeInTheDocument()
    const visits = screen.getByRole('list', { name: 'Today’s visits in time order' })
    const cards = within(visits).getAllByRole('listitem')
    expect(
      within(cards[0]!).getByRole('heading', { name: 'Toilet keeps running after flushing' }),
    ).toBeInTheDocument()
    expect(within(cards[0]!).getByText('On site now')).toBeInTheDocument()
    expect(
      within(cards[1]!).getByRole('heading', { name: /Bath taps dripping/ }),
    ).toBeInTheDocument()
    expect(within(cards[1]!).getByText(/I'm packing to move out/)).toBeInTheDocument()
    const directions = within(cards[1]!).getByRole('link', { name: /Directions/ })
    expect(directions).toHaveAttribute('href', expect.stringContaining('63%20Spital'))
    expect(within(cards[1]!).getByRole('link', { name: /Message/ })).toHaveAttribute(
      'href',
      '/trade/jobs/job_taps_spital#chat',
    )
  })

  it('shows the job to book, and the landlord who pays late with his record', async () => {
    renderTrade('/trade')
    const needs = await screen.findByRole('region', { name: /Needs you/ })
    expect(
      within(needs).getByText("Book a visit: Kitchen tap won't stop dripping"),
    ).toBeInTheDocument()
    expect(within(needs).getByText('Derek hasn’t paid')).toBeInTheDocument()
    expect(within(needs).getByText('£92.50')).toBeInTheDocument()
    const owed = screen.getByRole('region', { name: /Money owed to you/ })
    expect(within(owed).getByText('16 days late')).toBeInTheDocument()
    expect(within(owed).getByText('Paid on time on 0 of 3 jobs')).toBeInTheDocument()
    expect(within(owed).getByRole('link', { name: /Kitchen sink waste leaking/ })).toHaveAttribute(
      'href',
      '/trade/jobs/job_waste_victoria',
    )
  })

  it('shows new jobs on the board and quotes waiting for a reply', async () => {
    renderTrade('/trade')
    const board = await screen.findByRole('region', { name: /New on the board/ })
    expect(within(board).getByText('Radiator valve leaking in the hall')).toBeInTheDocument()
    const waiting = screen.getByRole('region', { name: /Quotes waiting/ })
    expect(within(waiting).getByText('Bathroom basin tap loose and dripping')).toBeInTheDocument()
    expect(within(waiting).getByText('£64.00')).toBeInTheDocument()
  })

  it('opens in light mode unless the trade has chosen dark', async () => {
    renderTrade('/trade')
    await screen.findByRole('heading', { level: 1, name: 'Morning, Kev' })
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
