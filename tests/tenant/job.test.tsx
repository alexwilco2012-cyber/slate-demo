import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LocalSlate } from '@/data'
import type { PersonId } from '@/domain/types'
import { freshSlate } from '../shell/harness'
import { graham, renderTenant, sarah } from './harness'

const kev = { personId: 'person_kev' as PersonId, role: 'trade' } as const

beforeEach(() => {
  window.scrollTo = vi.fn()
})

/** An emergency leak Kev has been to and marked done, waiting for Sarah to confirm. */
async function finishedVisit(slate: LocalSlate) {
  const { api, demo } = slate
  const job = await api.createJob(sarah, {
    propertyId: 'property_esslemont',
    room: 'kitchen',
    category: 'leak',
    description: 'Water pouring from the pipe under the sink.',
    photos: [],
    urgency: 'emergency',
    access: { windows: [], keyAllowed: true },
  })
  await api.approveJob(graham, job.id)
  await api.chooseTrade(graham, job.id, { tradeId: 'person_kev', route: 'directory' })
  await api.instructTrade(graham, job.id)
  const start = Date.parse(demo.now()) + 60 * 60 * 1000
  const booked = await api.bookVisit(kev, job.id, {
    purpose: 'repair',
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 2 * 60 * 60 * 1000).toISOString(),
    emergency: true,
  })
  await api.startVisit(kev, job.id, booked.visits[0]!.id)
  await api.markComplete(kev, job.id, { photos: [] })
  return job.id
}

describe('a repair’s page', () => {
  it('shows who’s coming, their checked badges and the written notice', async () => {
    renderTenant('/tenant/jobs/job_eicr_esslemont')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Electrical safety inspection (EICR)' }),
    ).toBeInTheDocument()
    const coming = screen.getByRole('region', { name: 'Who’s coming' })
    expect(within(coming).getByText('Neil Buchan')).toBeInTheDocument()
    expect(within(coming).getByText('SELECT member')).toBeInTheDocument()
    expect(within(coming).getByText(/Checked 12 Jan 2026/)).toBeInTheDocument()
    expect(within(coming).getByText(/4 days ahead/)).toBeInTheDocument()
    expect(within(coming).getByText(/The landlord always picks the trade/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Job progress' })).toBeInTheDocument()
  })

  it('has the conversation on the same screen, and sends a message straight away', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/jobs/job_eicr_esslemont')
    const log = await screen.findByRole('log', {
      name: /Messages about Electrical safety inspection/,
    })
    expect(within(log).getByText('Written notice of a visit')).toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: /^Message/ }),
      'The buzzer is broken, just knock.',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await within(log).findByText('The buzzer is broken, just knock.')).toBeInTheDocument()
    const messages = await slate.api.listMessages(sarah, 'thread_eicr_esslemont')
    expect(messages.at(-1)).toMatchObject({
      body: 'The buzzer is broken, just knock.',
      author: { personId: 'person_sarah', role: 'tenant' },
    })
  })

  it('lets the tenant confirm the visit happened, which opens their rating of the trade', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    const jobId = await finishedVisit(slate)
    renderTenant(`/tenant/jobs/${jobId}`, { slate })
    expect(
      await screen.findByRole('heading', { name: 'Did Kev’s visit happen?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, it happened' }))
    const ratings = await screen.findByRole('region', { name: 'Ratings' })
    await waitFor(() => expect(within(ratings).getByText('Rate Kev’s visit')).toBeInTheDocument())
    expect(
      within(ratings).getByRole('link', { name: 'How reviews work: our review policy' }),
    ).toHaveAttribute('href', '/policies/reviews')
    const job = await slate.api.getJob(sarah, jobId)
    expect(job?.visits[0]?.tenantConfirmedAt).toBeDefined()
  })

  it('lets the person who reported it cancel it, with a reason', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/jobs/job_ceiling_esslemont')
    await user.click(await screen.findByRole('button', { name: 'Cancel this repair' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this repair?' })
    await user.type(
      within(dialog).getByLabelText('Why are you cancelling?'),
      'It dried out and has not come back.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel the repair' }))
    await waitFor(async () =>
      expect((await slate.api.getJob(sarah, 'job_ceiling_esslemont'))?.status).toBe('cancelled'),
    )
    expect(await screen.findByText('This repair was cancelled')).toBeInTheDocument()
  })

  it('shows a friendly page for a repair that isn’t yours', async () => {
    renderTenant('/tenant/jobs/job_does_not_exist')
    expect(
      await screen.findByRole('heading', { name: 'We can’t find that page' }),
    ).toBeInTheDocument()
  })
})

describe('the reveal', () => {
  it('shows what the trade said once the double-blind ratings are revealed, privately', async () => {
    const slate = freshSlate()
    await slate.demo.advanceToNextReveal({ kind: 'job', jobId: 'job_radiator_esslemont' })
    renderTenant('/tenant/jobs/job_radiator_esslemont', { slate })
    expect(await screen.findByText('What Mhairi said about you')).toBeInTheDocument()
    expect(await screen.findByText('Newly revealed')).toBeInTheDocument()
    expect(
      screen.getByText('Only you see this. Your landlord only sees whether you gave access.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Your review of Mhairi is published/)).toBeInTheDocument()
  })
})
