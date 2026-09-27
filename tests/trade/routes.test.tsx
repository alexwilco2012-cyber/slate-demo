import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshSlate } from '../shell/harness'
import { kev, renderTrade } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('trade portal routes', () => {
  it('opens a job conversation on its job, with the chat on the same screen', async () => {
    renderTrade('/trade/messages/thread_tap_polmuir')
    expect(
      await screen.findByRole('heading', { level: 1, name: "Kitchen tap won't stop dripping" }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/trade/jobs/job_tap_polmuir#chat')
    expect(screen.getByRole('region', { name: 'Messages' })).toBeInTheDocument()
  })

  it('serves every page the trade’s notifications link to', async () => {
    const slate = freshSlate()
    const hrefs = new Set((await slate.api.listNotifications(kev)).map((n) => n.href))
    expect(hrefs.size).toBeGreaterThan(0)
    for (const href of hrefs) {
      const { unmount } = renderTrade(href, { slate })
      expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.queryByText('We can’t find that page')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('lists conversations with unread ones marked in words', async () => {
    renderTrade('/trade/messages')
    const unread = await screen.findByText('unread')
    expect(unread.closest('a')).toHaveAttribute('href', '/trade/messages/thread_tap_polmuir')
  })

  it('keeps quotes and invoices in plain tables, late ones first', async () => {
    const user = userEvent.setup()
    renderTrade('/trade/quotes')
    const waiting = await screen.findByRole('table', { name: 'Waiting for an answer' })
    expect(within(waiting).getByText('Bathroom basin tap loose and dripping')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Invoices' }))
    const invoices = await screen.findByRole('table', { name: /Invoices, late ones first/ })
    const rows = within(invoices).getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('16 days late')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Paid on time on 0 of 3 jobs')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Due in 4 days')).toBeInTheDocument()
  })

  it('has a friendly page for anything else', async () => {
    renderTrade('/trade/nowhere')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We can’t find that page' }),
    ).toBeInTheDocument()
  })
})
