import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PersonId } from '@/domain/types'
import { freshSlate } from '../shell/harness'
import { AILEEN, DEREK, GRAHAM, graham, renderLandlord } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function nextStep() {
  return screen.getByRole('region', { name: 'Next step' })
}

async function findNextStep(title: string | RegExp) {
  await waitFor(() =>
    expect(within(nextStep()).getByRole('heading', { name: title })).toBeVisible(),
  )
  return nextStep()
}

describe('approving or declining a reported repair', () => {
  it('approves with a note, then asks how to find a trade', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/jobs/job_ceiling_esslemont')
    const step = await findNextStep('Approve this repair?')
    await user.click(within(step).getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve the repair' })
    await user.type(
      within(dialog).getByRole('textbox', { name: /A note for Sarah/ }),
      'A roofer will be in touch this week.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Approve repair' }))

    await findNextStep('Choose how to find a trade')
    expect(nextStep()).toHaveTextContent('never picks or assigns a trade')
    const job = await slate.api.getJob(graham, 'job_ceiling_esslemont')
    expect(job?.status).toBe('approved')
  })

  it('needs a reason to decline, and the tenant sees it', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/jobs/job_ceiling_esslemont')
    const step = await findNextStep('Approve this repair?')
    await user.click(within(step).getByRole('button', { name: 'Decline' }))
    const dialog = await screen.findByRole('dialog', { name: 'Decline the repair' })
    await user.click(within(dialog).getByRole('button', { name: 'Decline repair' }))
    expect(within(dialog).getByText('Give Sarah a reason, in a sentence.')).toBeInTheDocument()

    await user.type(
      within(dialog).getByRole('textbox', { name: /Reason/ }),
      'The factor is fixing the whole roof next week.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Decline repair' }))
    await findNextStep('Declined')
    expect(nextStep()).toHaveTextContent('The factor is fixing the whole roof next week.')
    expect((await slate.api.getJob(graham, 'job_ceiling_esslemont'))?.status).toBe('declined')
  })
})

describe('choosing a trade', () => {
  it('lets the landlord pick from the directory, A to Z, and never picks for them', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    await slate.api.approveJob(graham, 'job_ceiling_esslemont')
    renderLandlord('/landlord/jobs/job_ceiling_esslemont', { slate })
    const step = await findNextStep('Choose how to find a trade')
    await user.click(within(step).getByRole('button', { name: /Browse the directory/ }))

    const picker = await screen.findByRole('dialog', { name: 'Choose a trade' })
    expect(picker).toHaveTextContent('doesn’t rank or recommend trades. You choose.')
    await user.click(within(picker).getByRole('tab', { name: /Directory/ }))
    const cards = await within(picker).findAllByRole('button', { name: /^Ask .* to quote$/ })
    expect(cards.length).toBeGreaterThan(1)
    // Each trade shows both halves of their reviews and how many jobs were reviewed.
    expect(within(picker).getAllByText('From landlords').length).toBeGreaterThan(1)
    expect(
      within(picker).getAllByText(/Reviewed on \d+ of \d+ completed jobs?/).length,
    ).toBeGreaterThan(1)

    await user.type(within(picker).getByRole('searchbox', { name: 'Search by name' }), 'Kinnear')
    const ask = await within(picker).findByRole('button', { name: 'Ask Ian to quote' })
    await user.click(ask)

    await findNextStep('Waiting for Ian’s quote')
    const job = await slate.api.getJob(graham, 'job_ceiling_esslemont')
    expect(job?.tradeId).toBe('person_ian')
  })

  it('posts to the job board for quotes, showing the area but never the address', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    await slate.api.approveJob(graham, 'job_ceiling_esslemont')
    renderLandlord('/landlord/jobs/job_ceiling_esslemont', { slate })
    const step = await findNextStep('Choose how to find a trade')
    await user.click(within(step).getByRole('button', { name: /Post to the job board/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Post to the job board' })
    expect(dialog).toHaveTextContent('Never the address')
    await user.click(within(dialog).getByRole('radio', { name: '5 days' }))
    await user.click(within(dialog).getByRole('button', { name: 'Post for quotes' }))
    await findNextStep('Out for quotes')
    expect((await slate.api.getJob(graham, 'job_ceiling_esslemont'))?.status).toBe('quoting')
  })
})

describe('quotes, the go-ahead and the visit', () => {
  it('shows quotes side by side as plain tables, then records the explicit go-ahead', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/jobs/job_gutter_jesmond')
    await findNextStep('Compare 2 quotes')
    const quotes = await screen.findByRole('list', { name: 'Quotes' })
    const cards = within(quotes).getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('£276.00')
    expect(cards[1]).toHaveTextContent('£85.00')
    expect(
      within(cards[0]!).getByRole('table', { name: 'What the quote covers' }),
    ).toBeInTheDocument()

    await user.click(within(quotes).getByRole('button', { name: 'Accept Sandy’s quote' }))
    const dialog = await screen.findByRole('dialog', {
      name: /Accept the quote from Morrison Property Repairs/,
    })
    expect(dialog).toHaveTextContent('The other quote will be marked not chosen')
    // Accept now and give the go-ahead as its own step.
    await user.click(within(dialog).getByRole('checkbox', { name: /Give Sandy the go-ahead now/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Accept quote' }))

    const instruct = await findNextStep('Give Sandy the go-ahead')
    expect(instruct).toHaveTextContent(
      'You accepted the £85.00 quote from Morrison Property Repairs',
    )
    await user.click(
      within(instruct).getByRole('button', { name: 'Instruct Morrison Property Repairs' }),
    )

    await findNextStep('Sandy will book a visit')
    const job = await slate.api.getJob(graham, 'job_gutter_jesmond')
    expect(job?.status).toBe('instructed')
    expect(job?.timeline.map((e) => e.kind)).toEqual(
      expect.arrayContaining(['quote_accepted', 'trade_instructed']),
    )
    // The page lays progress out twice, for narrow and wide screens; CSS shows one of them.
    const progress = screen.getAllByRole('list', { name: 'Repair progress' })[0]!
    expect(within(progress).getByText('Go-ahead given').closest('li')).toHaveTextContent('Done')
  })

  it('enforces 48 hours’ written notice when the landlord books the visit', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    const quotes = await slate.api.listQuotes(graham, 'job_gutter_jesmond')
    const sandy = quotes.find((q) => q.tradeId === ('person_sandy' as PersonId))!
    await slate.api.acceptQuote(graham, sandy.id, { instruct: true })
    renderLandlord('/landlord/jobs/job_gutter_jesmond', { slate })

    const step = await findNextStep('Sandy will book a visit')
    expect(step).toHaveTextContent('at least 48 hours’ written notice')
    await user.click(within(step).getByRole('button', { name: 'Book the visit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Book the visit' })

    // Tomorrow is too soon: the rule is explained and booking is held back.
    const tomorrow = new Date(Date.parse(slate.demo.now()) + 24 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: tomorrow } })
    fireEvent.change(within(dialog).getByLabelText('From'), { target: { value: '10:00' } })
    fireEvent.change(within(dialog).getByLabelText('Until'), { target: { value: '12:00' } })
    const status = within(dialog).getByRole('status')
    expect(status).toHaveTextContent(
      'In Scotland tenants must get at least 48 hours’ written notice of a visit',
    )
    expect(within(dialog).getByRole('button', { name: 'Book and send notice' })).toBeDisabled()

    const later = new Date(Date.parse(slate.demo.now()) + 4 * 24 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: later } })
    expect(within(dialog).getByRole('status')).toHaveTextContent('That meets the 48-hour rule')
    await user.click(within(dialog).getByRole('button', { name: 'Book and send notice' }))

    await findNextStep('Visit booked')
    const job = await slate.api.getJob(graham, 'job_gutter_jesmond')
    expect(job?.status).toBe('booked')
    expect(job?.visits.at(-1)?.notice.hoursGiven).toBeGreaterThanOrEqual(48)
  })
})

describe('after the work', () => {
  it('asks the landlord to confirm the work and check the price against the quote', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/jobs/job_shower_rosemount', { personId: DEREK })
    const step = await findNextStep(/Is the work done/)
    expect(step).toHaveTextContent(/£/)
    expect(within(step).getByRole('table', { name: 'Price against the quote' })).toBeInTheDocument()
    await user.click(within(step).getByRole('button', { name: 'Confirm it’s done' }))
    await waitFor(async () =>
      expect(
        (await slate.api.getJob({ personId: DEREK, role: 'landlord' }, 'job_shower_rosemount'))
          ?.status,
      ).toBe('confirmed'),
    )
    await findNextStep(/Rate /)
  })

  it('shows the tenant’s view of a repair only as sealed, never one tenant’s rating', async () => {
    renderLandlord('/landlord/jobs/job_radiator_esslemont')
    const sealed = await screen.findByRole('region', { name: 'What Sarah thinks of this repair' })
    expect(sealed).toHaveTextContent('you never see one tenant’s rating on its own')
    expect(within(sealed).queryByText(/out of 5/)).not.toBeInTheDocument()
    const step = await findNextStep('Rate Mhairi')
    expect(within(step).getByRole('link', { name: 'Rate Mhairi' })).toHaveAttribute(
      'href',
      '/landlord/ratings/rate/job/job_radiator_esslemont/person_mhairi',
    )
  })

  it('lets a letting agent take the steps the landlord allowed', async () => {
    renderLandlord('/landlord/jobs/job_ceiling_esslemont', {
      personId: AILEEN,
      actingForLandlordId: GRAHAM,
    })
    const step = await findNextStep('Approve this repair?')
    expect(within(step).getByRole('button', { name: 'Approve' })).toBeEnabled()
  })
})
