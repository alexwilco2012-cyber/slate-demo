import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshSlate } from '../shell/harness'
import { kev, photoFile, renderTrade } from './harness'

// jsdom can't decode images, so the shrinking step hands back a ready-made small photo.
vi.mock('@/routes/trade/lib/photos', async (original) => ({
  ...(await original<typeof import('@/routes/trade/lib/photos')>()),
  shrinkPhoto: vi.fn(async () => 'data:image/jpeg;base64,/9j/4AAQ'),
}))

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function dock() {
  return within(screen.getByRole('group', { name: 'Job actions' }))
}

describe('a job, with its chat on the same screen', () => {
  it('shows the address, access notes, the written notice and the conversation together', async () => {
    renderTrade('/trade/jobs/job_taps_spital')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Bath taps dripping/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('First Floor Left, 63 Spital')).toBeInTheDocument()
    expect(screen.getByText(/I'm packing to move out/)).toBeInTheDocument()
    expect(screen.getByText(/Written notice sent Wed 23 Sept/)).toBeInTheDocument()
    const chat = screen.getByRole('region', { name: 'Messages' })
    expect(await within(chat).findByText("Saturday's great, see you then.")).toBeInTheDocument()
    expect(within(chat).getByRole('button', { name: 'Mute' })).toBeInTheDocument()
  })

  it('sends “On my way” in one tap, then marks the trade on site', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_taps_spital', { slate })
    await screen.findByRole('heading', { level: 1, name: /Bath taps dripping/ })
    await user.click(dock().getByRole('button', { name: 'On my way' }))
    const sheet = await screen.findByRole('dialog', { name: 'On my way' })
    await user.click(within(sheet).getByRole('button', { name: 'About 20 minutes' }))
    const chat = screen.getByRole('region', { name: 'Messages' })
    expect(
      await within(chat).findByText('On my way, there in about 20 minutes.'),
    ).toBeInTheDocument()

    await user.click(await dock().findByRole('button', { name: 'I’ve arrived' }))
    await waitFor(async () => {
      const job = await slate.api.getJob(kev, 'job_taps_spital')
      expect(job?.status).toBe('in_progress')
    })
    expect(await dock().findByRole('button', { name: 'Mark the work done' })).toBeInTheDocument()
  })

  it('marks the work done with before and after photos and sends the invoice', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_toilet_walker', { slate })
    await screen.findByRole('heading', { level: 1, name: 'Toilet keeps running after flushing' })
    await user.click(dock().getByRole('button', { name: 'Mark the work done' }))
    const sheet = await screen.findByRole('dialog', { name: 'Mark the work done' })

    await user.click(within(sheet).getByRole('button', { name: 'Mark as done' }))
    expect(await within(sheet).findByText(/Add at least one after photo/)).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('camera-before'), { target: { files: [photoFile()] } })
    fireEvent.change(screen.getByTestId('camera-after'), { target: { files: [photoFile()] } })
    expect(await within(sheet).findByAltText('After photo')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Final price')).toHaveValue('94.00')
    await user.click(within(sheet).getByRole('radio', { name: '7 days' }))
    await user.click(within(sheet).getByRole('button', { name: 'Mark as done' }))

    await waitFor(async () => {
      const job = await slate.api.getJob(kev, 'job_toilet_walker')
      expect(job?.status).toBe('completed')
      expect(job?.completion?.photos.map((photo) => photo.alt)).toEqual([
        'Before: Toilet keeps running after flushing',
        'After: Toilet keeps running after flushing',
      ])
      expect(job?.payment).toMatchObject({ amountPence: 9400, dueOn: '2026-10-03' })
    })
    expect(await screen.findByRole('heading', { name: 'Waiting for payment' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Work done' })).toBeInTheDocument()
  })

  it('shows every photo in a visible upload queue as it goes up', async () => {
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_toilet_walker', { slate })
    await screen.findByRole('heading', { level: 1, name: 'Toilet keeps running after flushing' })
    const [input] = screen.getAllByTestId('camera-input')
    fireEvent.change(input!, { target: { files: [photoFile('a.jpg'), photoFile('b.jpg')] } })
    expect(await screen.findAllByText(/Photo \d: /)).not.toHaveLength(0)
    await waitFor(async () => {
      const job = await slate.api.getJob(kev, 'job_toilet_walker')
      expect(job?.photos).toHaveLength(3)
    })
    expect(await screen.findByText('Photo 1: Added')).toBeInTheDocument()
  })

  it('books a visit only with 48 hours’ notice, from the tenant’s times', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_tap_polmuir?book=1', { slate })
    const sheet = await screen.findByRole('dialog', { name: 'Book a visit' })
    expect(within(sheet).getByRole('radio', { name: /Today/ })).toHaveAttribute('data-disabled')
    expect(within(sheet).getByRole('radio', { name: /Tomorrow/ })).toHaveAttribute('data-disabled')
    await user.click(within(sheet).getByRole('radio', { name: /Tue 29 Sept/ }))
    await user.click(within(sheet).getByRole('radio', { name: /^9am/ }))
    expect(
      within(sheet).getByText(/That gives Oliver 2 days and 23 hours of notice/),
    ).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Book visit' }))
    await waitFor(async () => {
      const job = await slate.api.getJob(kev, 'job_tap_polmuir')
      expect(job?.status).toBe('booked')
      expect(job?.visits[0]?.startsAt).toBe('2026-09-29T08:00:00.000Z')
    })
    expect(await screen.findAllByText('Visit booked')).not.toHaveLength(0)
    expect(await screen.findByRole('button', { name: 'Rearrange the visit' })).toBeInTheDocument()
  })

  it('lets the trade say the money arrived for a late invoice', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_waste_victoria', { slate })
    expect(await screen.findByRole('heading', { name: 'Payment 16 days late' })).toBeInTheDocument()
    expect(screen.getAllByText('Paid on time on 0 of 3 jobs').length).toBeGreaterThan(0)
    await user.click(dock().getByRole('button', { name: 'The money’s arrived' }))
    const dialog = await screen.findByRole('dialog', { name: /Has £92.50 arrived/ })
    await user.click(within(dialog).getByRole('button', { name: 'Yes, it’s arrived' }))
    expect(await screen.findByRole('heading', { name: 'Paid' })).toBeInTheDocument()
  })

  it('keeps one main action in the dock and the others in the Next card', async () => {
    renderTrade('/trade/jobs/job_taps_spital')
    await screen.findByRole('heading', { level: 1, name: /Bath taps dripping/ })
    expect(dock().getAllByRole('button')).toHaveLength(1)
    expect(dock().getByRole('button', { name: 'On my way' })).toBeInTheDocument()
    const next = screen.getByRole('heading', { level: 2, name: /^Today, 1:30/ }).closest('div')
      ?.parentElement as HTMLElement
    expect(within(next).getByRole('button', { name: 'I’ve arrived' })).toBeInTheDocument()
    expect(within(next).getByRole('button', { name: 'Couldn’t get in' })).toBeInTheDocument()
  })

  it('doesn’t push an invoice for work finished long ago', async () => {
    renderTrade('/trade/jobs/job_sink_esslemont')
    expect(
      await screen.findByRole('heading', { name: 'No invoice sent', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/You finished this on 21 Nov 2024/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Job actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send an invoice' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Getting in' })).not.toBeInTheDocument()
  })

  it('sends people to the board for a job they aren’t on, and says so for anything else', async () => {
    renderTrade('/trade/jobs/job_valve_rosemount')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Radiator valve leaking in the hall' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/trade/board/job_valve_rosemount')
  })
})
