import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graham, renderTenant, sarah } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.sessionStorage.clear()
})

function location() {
  return screen.getByTestId('location').textContent
}

describe('reporting a problem', () => {
  it('asks one question per screen, then sends the report to the landlord', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/report')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Where’s the problem?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()

    // Nothing chosen: a clear message, and no moving on.
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose where the problem is.')

    await user.click(screen.getByRole('radio', { name: 'Kitchen' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'What’s wrong?' }),
    ).toBeInTheDocument()
    expect(location()).toBe('/tenant/report?step=problem')

    await user.click(screen.getByRole('radio', { name: /Leak or drip/ }))
    await user.type(
      screen.getByLabelText('Tell us more'),
      'Dripping under the sink since last night.',
    )
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Add a photo or two' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue without photos' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'How urgent is it?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Urgent/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'When can someone get in?' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/48 hours’ written notice/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose at least one time')
    await user.click(
      screen.getByRole('button', { name: 'Sunday 27 September, morning (8am to 12pm)' }),
    )
    await user.click(screen.getByRole('switch', { name: /They can use a key/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Check your answers' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Leak or drip')).toBeInTheDocument()
    expect(screen.getByText('Sunday 27 September: morning')).toBeInTheDocument()
    expect(
      screen.getByText(/Graham Forbes and Aileen Christie, their letting agent/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Send to Graham/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sent to Graham' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/never chooses for them/)).toBeInTheDocument()

    const jobs = await slate.api.listJobs(sarah)
    const job = jobs.find((j) => j.title === 'Leak or drip in the kitchen')!
    expect(job).toMatchObject({
      status: 'reported',
      urgency: 'urgent',
      category: 'leak',
      room: 'kitchen',
    })
    expect(job.access).toMatchObject({
      keyAllowed: true,
      windows: [{ date: '2026-09-27', slot: 'morning' }],
    })
    expect(location()).toBe(`/tenant/report/sent/${job.id}`)
    // The landlord sees it waiting for approval straight away.
    const actions = await slate.api.listActionsNeeded(graham)
    expect(actions).toContainEqual({ kind: 'approve_job', jobId: job.id })
    // The draft is gone once sent.
    expect(window.sessionStorage.getItem('slate-report-draft:person_sarah') ?? '').not.toContain(
      'Dripping',
    )
  })

  it('shows gas emergency advice as soon as a gas problem is chosen', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/report')
    await user.click(await screen.findByRole('radio', { name: 'Kitchen' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('radio', { name: /Gas cooker, fire or gas smell/ }))
    const warning = await screen.findByRole('note')
    expect(within(warning).getByText('Can you smell gas?')).toBeInTheDocument()
    expect(within(warning).getByRole('link', { name: /Call 0800 111 999/ })).toHaveAttribute(
      'href',
      'tel:0800111999',
    )
  })

  it('explains emergencies plainly, with what to do first', async () => {
    const user = userEvent.setup()
    window.sessionStorage.setItem(
      'slate-report-draft:person_sarah',
      JSON.stringify({
        room: 'bathroom',
        problemId: 'leak',
        description: 'Water coming through the ceiling fast.',
        photos: [],
        windows: [],
        keyAllowed: false,
        notes: '',
      }),
    )
    renderTenant('/tenant/report?step=urgency')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How urgent is it?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Danger to people or the home right now.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Emergency/ }))
    const advice = await screen.findByRole('region', { name: 'Stay safe first' })
    expect(within(advice).getByText(/Emergencies don’t need 48 hours’ notice/)).toBeInTheDocument()
    // An emergency needs no access times.
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: /Continue/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Check your answers' }),
    ).toBeInTheDocument()
  })

  it('won’t let a link skip past an unanswered question', async () => {
    renderTenant('/tenant/report?step=check')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Where’s the problem?' }),
    ).toBeInTheDocument()
  })

  it('adds a sample photo through the visible upload queue', async () => {
    const user = userEvent.setup()
    window.sessionStorage.setItem(
      'slate-report-draft:person_sarah',
      JSON.stringify({
        room: 'bathroom',
        problemId: 'leak',
        description: 'A slow drip behind the toilet.',
        photos: [],
        windows: [],
        keyAllowed: false,
        notes: '',
      }),
    )
    renderTenant('/tenant/report?step=photos')
    await user.click(await screen.findByRole('button', { name: /Add a sample photo/ }))
    expect(
      await screen.findByRole('progressbar', { name: /Uploading Sample photo/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument(), { timeout: 4000 })
    expect(screen.getByText('1 of 10 photos')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled())
  })
})
