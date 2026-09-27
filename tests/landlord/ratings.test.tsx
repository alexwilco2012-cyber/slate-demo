import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RATING_RULES } from '@/domain/criteria'
import type { RatingId } from '@/domain/types'
import { graham, renderLandlord } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const CLEAN_REVIEW = 'rating_clean_joanna_graham' as RatingId

describe('reviews about the landlord', () => {
  it('shows both scores, every review with a Report button and the review policy', async () => {
    renderLandlord('/landlord/ratings')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'What tenants say about you' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'What trades say about you' }),
    ).toBeInTheDocument()
    const tenants = screen.getByRole('region', { name: 'Reviews from tenants' })
    const trades = screen.getByRole('region', { name: 'Reviews from trades' })
    expect(within(tenants).getAllByRole('button', { name: 'Report' })).toHaveLength(3)
    expect(within(trades).getAllByRole('button', { name: 'Report' })).toHaveLength(4)
    const policies = within(tenants).getAllByRole('link', { name: /How reviews work/ })
    expect(policies).toHaveLength(3)
    expect(policies[0]).toHaveAttribute('href', '/policies/reviews')
    // The dispute note and the one reply show under the review they belong to.
    expect(within(tenants).getByText(/disputes this/)).toBeInTheDocument()
    expect(within(tenants).getByText(/Reply from the landlord/)).toBeInTheDocument()
  })

  it('opens the four report routes from any review', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/ratings')
    const trades = await screen.findByRole('region', { name: 'Reviews from trades' })
    await user.click(within(trades).getAllByRole('button', { name: 'Report' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    const routes = within(dialog).getAllByRole('radio')
    expect(routes).toHaveLength(4)
    expect(within(dialog).getByRole('radio', { name: /untrue and damages/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /illegal/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /fake review/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /personal data/ })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(within(dialog).getByText('Choose why you are reporting this.')).toBeInTheDocument()
  })

  it('checks a reply as it’s typed, like reviews, and holds back a phone number', async () => {
    const user = userEvent.setup()
    renderLandlord(`/landlord/reviews/${CLEAN_REVIEW}`)
    const section = await screen.findByRole('region', { name: 'Reply publicly' })
    await user.type(
      within(section).getByRole('textbox', { name: /Your reply/ }),
      'Thank you. For anything else, ring me on 07700 900123.',
    )
    await waitFor(
      () => expect(within(section).getByRole('button', { name: 'Post reply' })).toBeDisabled(),
      { timeout: 3000 },
    )
    expect(section).toHaveTextContent(/phone/i)
  })

  it('posts the one public reply, up to 500 characters, within 30 days', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord(`/landlord/reviews/${CLEAN_REVIEW}`)
    const section = await screen.findByRole('region', { name: 'Reply publicly' })
    expect(section).toHaveTextContent(`Up to ${RATING_RULES.reply.maxLength} characters`)
    const box = within(section).getByRole('textbox', { name: /Your reply/ })
    expect(box).toHaveAttribute('maxLength', String(RATING_RULES.reply.maxLength))
    await user.type(box, 'Thank you. The flat was ready for the new tenant a day early.')
    await user.click(within(section).getByRole('button', { name: 'Post reply' }))
    expect(
      await screen.findByText('You’ve replied. Each review gets one reply, which can’t be edited.'),
    ).toBeInTheDocument()
    const detail = await slate.api.getReview(graham, CLEAN_REVIEW)
    expect(detail?.review.reply?.body).toMatch(/ready for the new tenant/)
    expect(detail?.can.reply).toBe(false)
  })

  it('marks a review as disputed after checking, and says what readers will see', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord(`/landlord/reviews/${CLEAN_REVIEW}`)
    const section = await screen.findByRole('region', { name: 'Disagree with it?' })
    await user.click(within(section).getByRole('button', { name: 'Mark as disputed' }))
    const dialog = await screen.findByRole('dialog', { name: 'Mark this review as disputed?' })
    expect(dialog).toHaveTextContent('“Landlord disputes this” appears on the review')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as disputed' }))
    await waitFor(async () =>
      expect((await slate.api.getReview(graham, CLEAN_REVIEW))?.review.dispute).toBeTruthy(),
    )
  })
})

describe('ratings the landlord owes', () => {
  it('lists them with their deadline and the nudge, never a reward', async () => {
    renderLandlord('/landlord/ratings?tab=owed')
    const owed = await screen.findByRole('region', { name: /Yours to leave/ })
    const mhairi = await within(owed).findByRole('link', { name: 'Rate Mhairi' })
    expect(mhairi).toHaveAttribute(
      'href',
      '/landlord/ratings/rate/job/job_radiator_esslemont/person_mhairi',
    )
    expect(mhairi.closest('li')).toHaveTextContent(
      'Mhairi has rated you. Leave yours to see what they said.',
    )
  })

  it('rates a trade on plain-words scales and reveals both ratings together', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord(
      '/landlord/ratings/rate/job/job_radiator_esslemont/person_mhairi',
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How was Denburn Gas & Heating?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send rating' }))
    expect((await screen.findAllByText('Choose an answer.')).length).toBeGreaterThan(0)

    for (const group of screen.getAllByRole('radiogroup')) {
      const outstanding = within(group).queryByRole('radio', { name: /Outstanding|Always/ })
      if (outstanding) await user.click(outstanding)
    }
    await user.click(screen.getByRole('button', { name: 'Send rating' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revealed together' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See what Mhairi said' })).toHaveAttribute(
      'href',
      '/landlord/ratings',
    )
    const tasks = await slate.api.listRatingTasks(graham)
    expect(
      tasks.find((t) => t.subjectId === 'person_mhairi' && t.context.kind === 'job')?.status,
    ).toBe('submitted')
  })
})

describe('tenant passports shared with the landlord', () => {
  it('explains the rules, including why tenants are never sorted by rating', async () => {
    renderLandlord('/landlord/passports')
    expect(await screen.findByText('All or nothing')).toBeInTheDocument()
    expect(screen.getByText('No score, no ranking')).toBeInTheDocument()
    expect(
      screen.getByText(/never sorts, filters or turns anyone down by their ratings/),
    ).toBeInTheDocument()
    // Nothing on the page sorts or filters tenants.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('opens a shared passport: everything past landlords said, with its expiry and no single score', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/passports')
    await user.type(
      await screen.findByRole('textbox', { name: /Link or code/ }),
      'https://example.com/slate-demo/passport/Xr4nB8vLq2MzT6wYk9Fc',
    )
    await user.click(screen.getByRole('button', { name: 'Open passport' }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/landlord/passports/Xr4nB8vLq2MzT6wYk9Fc',
    )
    expect(await screen.findByText(/Callum/, { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByText(/Link works until/)).toBeInTheDocument()
    // Counts per question, never one number, not even for each landlord's review.
    expect(screen.getByRole('region', { name: 'Tenant passport' })).toHaveTextContent(
      /from \d of \d landlords?/,
    )
  })

  it('says plainly when a link has run out', async () => {
    renderLandlord('/landlord/passports/p8Kq2vRm7TzW4hXeN3sD')
    expect(
      await screen.findByRole('heading', { name: /expired|no longer works/i }),
    ).toBeInTheDocument()
  })
})
