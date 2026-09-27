// Accessibility and wording fixes from the design review: heading order, where focus goes after
// a step, the progress list, and the counts agreeing with each other.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PersonId } from '@/domain/types'
import { freshSlate } from '../shell/harness'
import { graham, mockScreenWidth, renderLandlord } from './harness'

const originalMatchMedia = window.matchMedia

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

const HANNAH = 'person_hannah' as PersonId

function headingLevels() {
  return screen
    .getAllByRole('heading')
    .map((heading) => Number(heading.tagName.slice(1)))
    .filter((level) => !Number.isNaN(level))
}

/** No heading skips a level on the way down (h1 then h3 with no h2, say). */
function expectNoSkippedLevels() {
  const levels = headingLevels()
  expect(levels[0]).toBe(1)
  levels.forEach((level, index) => {
    if (index > 0) expect(level - levels[index - 1]!).toBeLessThanOrEqual(1)
  })
}

describe('heading order', () => {
  it('puts a repair’s parts under its title on its own page', async () => {
    renderLandlord('/landlord/jobs/job_gutter_jesmond')
    await screen.findByRole('heading', { level: 2, name: 'Compare 2 quotes' })
    expect(screen.getByRole('heading', { level: 2, name: 'What was reported' })).toBeVisible()
    expect(await screen.findByRole('heading', { level: 3, name: 'Kinnear Slaters' })).toBeVisible()
    expectNoSkippedLevels()
  })

  it('moves the same parts down a level inside the drawer', async () => {
    mockScreenWidth(true)
    renderLandlord('/landlord/repairs?job=job_gutter_jesmond')
    const drawer = await screen.findByRole('dialog')
    await within(drawer).findByRole('heading', { level: 3, name: 'Compare 2 quotes' })
    expect(
      await within(drawer).findByRole('heading', { level: 4, name: 'Kinnear Slaters' }),
    ).toBeVisible()
  })

  it('keeps the trades list, a review and a missing repair in order', async () => {
    const { unmount } = renderLandlord('/landlord/trades')
    await screen.findByRole('heading', { level: 2, name: 'Rattray Plumbing' })
    expectNoSkippedLevels()
    unmount()

    const review = renderLandlord('/landlord/reviews/rating_clean_joanna_graham')
    await screen.findByRole('heading', { level: 1, name: 'A review about you' })
    expect(screen.getByRole('heading', { level: 2, name: 'The review' })).toBeInTheDocument()
    expectNoSkippedLevels()
    review.unmount()

    renderLandlord('/landlord/jobs/job_nothing_here')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We couldn’t find that repair' }),
    ).toBeInTheDocument()
  })

  it('keeps the Messages heading when a conversation fills the screen', async () => {
    renderLandlord('/landlord/messages/thread_ceiling_esslemont')
    await screen.findByRole('heading', { level: 2, name: /Damp patch spreading/ })
    expect(screen.getByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument()
  })
})

describe('after a step on a repair', () => {
  it('moves focus to the new next step rather than the top of the page', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/jobs/job_fan_union')
    const approve = await screen.findByRole('button', { name: 'Approve' })
    await user.click(approve)
    const dialog = await screen.findByRole('dialog', { name: 'Approve the repair' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve repair' }))
    const next = await screen.findByRole('heading', { name: 'Choose how to find a trade' })
    await waitFor(() => expect(next).toHaveFocus())
  })
})

describe('the progress list', () => {
  it('says what is happening now, and keeps steps still to come quiet', async () => {
    renderLandlord('/landlord/jobs/job_gutter_jesmond')
    const progress = (await screen.findAllByRole('list', { name: 'Repair progress' }))[0]!
    const now = within(progress)
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step')!
    expect(now).toHaveTextContent('Choosing a trade')
    expect(now).toHaveTextContent('Now')
    expect(progress).toHaveTextContent('Approved')
    // Steps still to come carry their state for screen readers only.
    expect(within(progress).queryByText('Next')).toBeNull()
    expect(within(progress).getAllByText(': Still to come')[0]).toHaveClass('sr-only')
  })
})

describe('counts and wording that agree', () => {
  it('counts the same repairs in the navigation and under Needs you', async () => {
    renderLandlord('/landlord/repairs')
    const list = await screen.findByRole('list', { name: 'Repairs' })
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(5))
    const nav = screen.getAllByRole('link', { name: /^Repairs/ })[0]!
    await waitFor(() => expect(nav).toHaveTextContent('5'))
    expect(screen.getByRole('radio', { name: /Needs you \(5\)/ })).toBeChecked()
  })

  it('shows on a home’s repairs what each one is waiting for', async () => {
    renderLandlord('/landlord/homes/property_jesmond')
    const repairs = await screen.findByRole('region', { name: /Repairs/ })
    await waitFor(() =>
      expect(
        within(repairs).getByRole('link', { name: /Gutter overflowing above the back door/ }),
      ).toHaveTextContent('Compare 2 quotes'),
    )
  })

  it('counts only the certificates a home must have on its card, as Actions needed does', async () => {
    renderLandlord('/landlord', { personId: HANNAH })
    const homes = await screen.findByRole('heading', { level: 2, name: /Your homes/ })
    const [card] = await within(homes.closest('section')!).findAllByRole('article')
    await waitFor(() => expect(card).toHaveTextContent(/Certificates:?\s*2 not on file/))
    const actions = screen.getByRole('region', { name: /Actions needed/ })
    await waitFor(() => expect(within(actions).getAllByText(/to arrange$/)).toHaveLength(2))
  })

  it('names the quote by its price and business, not an awkward possessive', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    renderLandlord('/landlord/jobs/job_gutter_jesmond', { slate })
    const quotes = await screen.findByRole('list', { name: 'Quotes' })
    await user.click(within(quotes).getByRole('button', { name: 'Accept Sandy’s quote' }))
    expect(
      await screen.findByRole('dialog', {
        name: 'Accept the quote from Morrison Property Repairs?',
      }),
    ).toBeInTheDocument()
    expect((await slate.api.getJob(graham, 'job_gutter_jesmond'))?.status).toBe('quoting')
  })
})
