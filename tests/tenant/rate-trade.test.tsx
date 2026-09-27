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

/** A leak Kev has fixed, with Sarah's confirmation that the visit happened. */
async function confirmedVisit(slate: LocalSlate) {
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
  const visitId = booked.visits[0]!.id
  await api.startVisit(kev, job.id, visitId)
  await api.markComplete(kev, job.id, { photos: [] })
  await api.confirmVisit(sarah, job.id, visitId)
  return job.id
}

describe('rating the trade after a visit', () => {
  it(
    'asks the four tenant questions, explains the double-blind and seals the answer',
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup()
      const slate = freshSlate()
      const jobId = await confirmedVisit(slate)
      renderTenant(`/tenant/jobs/${jobId}/rate/trade`, { slate })

      expect(await screen.findByRole('heading', { level: 1, name: /Kev/ })).toBeInTheDocument()
      expect(screen.getByText('Sealed until you’ve both rated')).toBeInTheDocument()
      expect(
        screen.getByText(/won’t see your answers until they’ve rated you too/),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /our review policy/ })).toHaveAttribute(
        'href',
        '/policies/reviews',
      )

      for (const name of [
        'Turned up when agreed',
        'Polite and respectful in my home',
        'Left it clean and tidy',
      ]) {
        const group = screen.getByRole('radiogroup', { name })
        await user.click(within(group).getByRole('radio', { name: /Outstanding/ }))
      }
      const fixed = screen.getByRole('radiogroup', { name: 'Is the problem fixed?' })
      await user.click(within(fixed).getByRole('radio', { name: /Partly/ }))

      // The live check stops things reviews mustn't mention before anything is sent.
      const opinion = screen.getByLabelText(/Your opinion/)
      await user.click(opinion)
      await user.paste('In my experience he was great, call him on 07700 900123 any time.')
      expect(await screen.findByText(/Reviews can’t mention/)).toBeInTheDocument()
      await user.clear(opinion)
      await user.paste('In my experience he was quick, tidy and explained what he found.')
      await waitFor(() =>
        expect(screen.queryByText(/Reviews can’t mention/)).not.toBeInTheDocument(),
      )

      await user.click(screen.getByRole('button', { name: /Check and send/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Send your rating?' })
      await user.click(within(dialog).getByRole('button', { name: /Send and seal/ }))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Sent and sealed' }),
      ).toBeInTheDocument()

      const mine = await slate.api.listMyRatings(sarah)
      const rating = mine.find((r) => r.direction === 'tenant->trade' && r.state !== 'draft')!
      expect(rating).toMatchObject({
        state: 'sealed',
        seal: 'double_blind',
        answers: { turned_up: 5, respectful: 5, left_tidy: 5 },
        comment: 'In my experience he was quick, tidy and explained what he found.',
      })
    },
  )
})

describe('replying to a review of the tenant', () => {
  it('posts one public reply under a trade’s review, which stays private to the tenant', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    await slate.demo.advanceToNextReveal({ kind: 'job', jobId: 'job_radiator_esslemont' })
    const about = await slate.api.listReviews(sarah, {
      direction: 'trade->tenant',
      subjectId: sarah.personId,
    })
    const review = about.find(
      (r) =>
        r.context.kind === 'job' && r.context.title === 'Bedroom radiator only warm at the bottom',
    )!
    renderTenant(`/tenant/reviews/${review.ratingId}`, { slate })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'A review of you' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Only you see this')).toBeInTheDocument()
    const form = screen.getByRole('region', { name: 'Reply to this review' })
    await user.click(within(form).getByRole('textbox'))
    await user.paste('Thanks for fixing it so quickly, the radiator has been fine since.')
    await user.click(within(form).getByRole('button', { name: 'Post reply' }))

    await waitFor(async () => {
      const detail = await slate.api.getReview(sarah, review.ratingId)
      expect(detail?.review.reply?.body).toBe(
        'Thanks for fixing it so quickly, the radiator has been fine since.',
      )
    })
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Reply to this review' }),
      ).not.toBeInTheDocument(),
    )
  })
})
