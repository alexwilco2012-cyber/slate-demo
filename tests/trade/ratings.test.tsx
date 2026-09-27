import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshSlate } from '../shell/harness'
import { kev, renderTrade } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

async function answer(user: ReturnType<typeof userEvent.setup>, question: string, words: string) {
  const group = screen.getByRole('radiogroup', { name: question })
  await user.click(within(group).getByRole('radio', { name: new RegExp(words) }))
}

describe('rating the landlord', () => {
  it('says who will see it before anything else', async () => {
    renderTrade('/trade/jobs/job_waste_victoria/rate/landlord')
    expect(await screen.findByRole('heading', { level: 1, name: 'Rate Derek' })).toBeInTheDocument()
    const who = screen.getByRole('region', { name: 'Who sees this' })
    expect(
      within(who).getByText(/Other trades see it on Derek’s client profile/),
    ).toBeInTheDocument()
    expect(within(who).getByRole('link', { name: 'Review policy' })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
  })

  it('reveals both ratings together when the landlord has already rated', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_waste_victoria/rate/landlord', { slate })
    await screen.findByRole('heading', { level: 1, name: 'Rate Derek' })

    await user.click(screen.getByRole('button', { name: 'Send rating' }))
    expect(await screen.findAllByText('Rating not sent')).not.toHaveLength(0)
    expect(screen.getAllByText('Choose an answer.').length).toBeGreaterThan(0)

    await answer(user, 'Clear job description', 'What I expected')
    await answer(user, 'Paid on time', 'Never')
    await answer(user, 'Arranged access and told the tenant', 'Below')
    await answer(user, 'Fair and easy to deal with', 'Below')
    await user.click(screen.getByRole('button', { name: 'Send rating' }))

    expect(await screen.findByRole('heading', { name: 'Both ratings are in' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'What Derek said about you' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument()
    const mine = await slate.api.listMyRatings(kev)
    expect(
      mine.find(
        (rating) =>
          rating.direction === 'trade->landlord' &&
          rating.subjectId === 'person_derek' &&
          rating.context.kind === 'job' &&
          rating.context.jobId === 'job_waste_victoria',
      )?.state,
    ).toBe('revealed')
  })

  it('keeps a draft private until it is sent', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderTrade('/trade/jobs/job_shower_rosemount/rate/landlord', { slate })
    await screen.findByRole('heading', { level: 1, name: 'Rate Derek' })
    await answer(user, 'Clear job description', 'Better than expected')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Draft saved')).toBeInTheDocument()
    await waitFor(async () => {
      const tasks = await slate.api.listRatingTasks(kev)
      const task = tasks.find(
        (candidate) =>
          candidate.direction === 'trade->landlord' &&
          candidate.context.kind === 'job' &&
          candidate.context.jobId === 'job_shower_rosemount',
      )
      expect(task?.status).toBe('draft')
    })
  })
})

describe('rating the tenant', () => {
  it('explains it is private to the tenant, and the landlord only sees access', async () => {
    renderTrade('/trade/jobs/job_shower_rosemount/rate/tenant')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rate Kirsty' }),
    ).toBeInTheDocument()
    const who = screen.getByRole('region', { name: 'Who sees this' })
    expect(within(who).getByText('Only Kirsty sees it.')).toBeInTheDocument()
    expect(
      within(who).getByText(/landlord only sees whether you got in as arranged/),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /I felt unsafe/ })).toBeInTheDocument()
  })
})

describe('reviews of the trade', () => {
  it('shows both halves of the Overall and every review with the policy link and Report', async () => {
    renderTrade('/trade/profile')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kev Rattray' }),
    ).toBeInTheDocument()
    expect(screen.getByText('From landlords')).toBeInTheDocument()
    expect(screen.getByText('From tenants')).toBeInTheDocument()
    const reviews = screen.getByRole('region', { name: /Reviews of you/ })
    expect(within(reviews).getAllByRole('link', { name: 'Review policy' }).length).toBeGreaterThan(
      0,
    )
    expect(within(reviews).getAllByRole('button', { name: 'Report' }).length).toBeGreaterThan(0)
    const given = screen.getByRole('region', { name: /Your client ratings of landlords/ })
    expect(within(given).getByText('Derek Milne')).toBeInTheDocument()
  })

  it('opens the four report routes from a review', async () => {
    const user = userEvent.setup()
    renderTrade('/trade/profile')
    const reviews = await screen.findByRole('region', { name: /Reviews of you/ })
    await user.click(within(reviews).getAllByRole('button', { name: 'Report' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(4)
    expect(within(dialog).getByText('I think this is a fake review')).toBeInTheDocument()
  })

  it('lets the trade dispute a review of them from its page', async () => {
    const user = userEvent.setup()
    renderTrade('/trade/reviews/rating_bath_derek_kev')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A review of you' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add a dispute note' }))
    const dialog = await screen.findByRole('dialog', { name: /Add “Trade disputes this”/ })
    await user.click(within(dialog).getByRole('button', { name: 'Add the note' }))
    expect(await screen.findByText('Trade disputes this')).toBeInTheDocument()
  })
})
