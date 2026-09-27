import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshSlate } from '../shell/harness'
import { kev, renderTrade } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
})

function postCard(title: string) {
  const card = screen.getByRole('heading', { name: title }).closest('article')
  if (!card) throw new Error(`No card for ${title}`)
  return within(card as HTMLElement)
}

describe('the job board', () => {
  it('shows open plumbing jobs with area, distance, kind of home and the client’s record', async () => {
    renderTrade('/trade/board')
    expect(await screen.findByText('3 open jobs')).toBeInTheDocument()
    const valve = postCard('Radiator valve leaking in the hall')
    expect(valve.getByText('Urgent')).toBeInTheDocument()
    expect(valve.getByText('1.5 miles away')).toBeInTheDocument()
    expect(valve.getByText('Rosemount · AB25')).toBeInTheDocument()
    expect(valve.getByText('Tenement flat')).toBeInTheDocument()
    expect(valve.getByText('Paid on time on 0 of 3 jobs')).toBeInTheDocument()
    expect(
      postCard('Kitchen sink draining slowly').getByText('Paid on time on 3 of 4 jobs'),
    ).toBeInTheDocument()
    expect(
      postCard('Bathroom basin tap loose and dripping').getByText(/Quote sent: £64.00/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Gutter overflowing above the back door')).not.toBeInTheDocument()
  })

  it('filters with segmented choices, never a dropdown', async () => {
    const user = userEvent.setup()
    renderTrade('/trade/board')
    await screen.findByText('3 open jobs')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'All trades' }))
    expect(await screen.findByText('Gutter overflowing above the back door')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '2' }))
    await waitFor(() =>
      expect(screen.queryByText('Gutter overflowing above the back door')).not.toBeInTheDocument(),
    )
  })

  it('builds a quote from saved lines, sends it, then lets the trade withdraw it', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/board/job_valve_rosemount', { slate })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Radiator valve leaking in the hall' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Paid on time on 0 of 3 jobs')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Call-out, including the first half hour/ }),
    )
    await user.click(screen.getByRole('button', { name: /^Labour/ }))
    await user.click(screen.getByRole('button', { name: /^Labour/ }))
    const lines = screen.getByRole('list', { name: 'Quote lines' })
    expect(within(lines).getAllByRole('listitem')).toHaveLength(2)
    // A £55 call-out, and labour at £42 an hour: the second tap adds half an hour.
    const dock = screen.getByRole('group', { name: 'Send the quote' })
    expect(within(dock).getByText('Total £118.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Half an hour less' }))
    expect(within(dock).getByText('Total £97.00')).toBeInTheDocument()

    await user.click(within(dock).getByRole('button', { name: 'Send quote' }))
    expect(await screen.findByText('Quote sent to Derek')).toBeInTheDocument()
    const sent = await slate.api.listQuotes(kev, 'job_valve_rosemount')
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ status: 'submitted', totalPence: 9700, vatPence: 0 })

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument()
    // Withdrawing is a quiet choice beside the quote, never the pinned main action.
    expect(screen.queryByRole('group', { name: /actions/ })).not.toBeInTheDocument()
    const yours = screen.getByRole('region', { name: 'Your quote' })
    expect(within(yours).getByText('Derek is choosing. We’ll tell you either way.')).toBeVisible()
    await user.click(within(yours).getByRole('button', { name: 'Withdraw quote' }))
    const dialog = await screen.findByRole('dialog', { name: /Withdraw your £97.00 quote/ })
    await user.click(within(dialog).getByRole('radio', { name: 'I can’t fit it in' }))
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw quote' }))
    expect(await screen.findByText('Quote withdrawn')).toBeInTheDocument()
    const after = await slate.api.listQuotes(kev, 'job_valve_rosemount')
    expect(after[0]?.status).toBe('withdrawn')
  })

  it('won’t send an empty quote', async () => {
    const user = userEvent.setup()
    renderTrade('/trade/board/job_sink_queens')
    await screen.findByRole('heading', { level: 1, name: 'Kitchen sink draining slowly' })
    await user.click(screen.getByRole('button', { name: 'Send quote' }))
    expect(await screen.findByText(/Add at least one line/)).toBeInTheDocument()
  })

  it('adds VAT when the trade is VAT registered', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    const me = await slate.api.getMe(kev)
    if (!me.tradeProfile) throw new Error('Kev has no trade profile')
    await slate.api.updateMe(kev, { tradeProfile: { ...me.tradeProfile, vatRegistered: true } })
    renderTrade('/trade/board/job_sink_queens', { slate })
    await screen.findByRole('heading', { level: 1, name: 'Kitchen sink draining slowly' })
    await user.click(
      screen.getByRole('button', { name: /Call-out, including the first half hour/ }),
    )
    const dock = screen.getByRole('group', { name: 'Send the quote' })
    expect(within(dock).getByText('Total £66.00')).toBeInTheDocument()
    expect(screen.getByText(/We add VAT at 20%/)).toBeInTheDocument()
  })
})
