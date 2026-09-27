import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderTenant, sarah } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('rating the landlord’s handling of a repair', () => {
  it('explains the seal, asks the two repair questions and seals the answer', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/jobs/job_radiator_esslemont/rate/landlord')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How did Graham handle the repair?' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Graham will never see this rating on its own/)).toBeInTheDocument()
    expect(
      screen.getByText(/until your tenancy ends or 5 different tenants have rated Graham/),
    ).toBeInTheDocument()
    // Only the two per-repair criteria, and no public comment for a sealed rating.
    expect(
      screen.getAllByRole('radiogroup', {
        name: /Fixed problems quickly|Easy to reach, kept me informed/,
      }),
    ).toHaveLength(2)
    expect(screen.queryByLabelText(/Your opinion/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /our review policy/ })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )

    await user.click(screen.getByRole('button', { name: /Check and send/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A few answers need a look')
    expect(screen.getAllByText('Choose an answer.')).toHaveLength(2)

    const quick = screen.getByRole('radiogroup', { name: 'Fixed problems quickly' })
    await user.click(within(quick).getByRole('radio', { name: /Better than expected/ }))
    const informed = screen.getByRole('radiogroup', { name: 'Easy to reach, kept me informed' })
    await user.click(within(informed).getByRole('radio', { name: /Outstanding/ }))
    await user.click(screen.getByRole('radio', { name: 'Yes' }))
    await user.click(screen.getByRole('button', { name: /Check and send/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Send your rating?' })
    await user.click(within(dialog).getByRole('button', { name: /Send and seal/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sent and sealed' }),
    ).toBeInTheDocument()

    const mine = await slate.api.listMyRatings(sarah)
    const rating = mine.find((r) => r.direction === 'tenant->landlord' && r.context.kind === 'job')!
    expect(rating).toMatchObject({
      state: 'sealed',
      seal: 'retaliation_shield',
      answers: { fixed_quickly: 4, kept_informed: 5 },
      wouldAgain: 'yes',
    })
  })

  it('saves a draft to finish later', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/jobs/job_radiator_esslemont/rate/landlord')
    const quick = await screen.findByRole('radiogroup', { name: 'Fixed problems quickly' })
    await user.click(within(quick).getByRole('radio', { name: /What I expected/ }))
    await user.click(screen.getByRole('button', { name: /Save and finish later/ }))
    await waitFor(async () => {
      const mine = await slate.api.listMyRatings(sarah)
      expect(mine.find((r) => r.state === 'draft')?.answers).toEqual({ fixed_quickly: 3 })
    })
  })
})

describe('the ratings page', () => {
  it('shows sealed ratings with their reveal date, and explains who sees ratings about you', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/ratings')
    await user.click(await screen.findByRole('tab', { name: /Sent/ }))
    expect(screen.getByText(/Your rating of Mhairi/)).toBeInTheDocument()
    expect(screen.getByText(/Revealed by 3 Oct 2026 at the latest/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /About you/ }))
    expect(screen.getByText(/These make up your tenant passport/)).toBeInTheDocument()
    expect(
      screen.getByText(/From them, your landlord only sees whether you gave access/),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Report' }).length).toBeGreaterThan(0)
  })

  it('opens the report sheet with the four routes', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/ratings')
    await user.click(await screen.findByRole('tab', { name: /About you/ }))
    await user.click(screen.getAllByRole('button', { name: 'Report' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    for (const route of [/untrue and damages/, /illegal/, /fake review/, /personal data/]) {
      expect(within(dialog).getByRole('radio', { name: route })).toBeInTheDocument()
    }
    await user.click(within(dialog).getByRole('radio', { name: /personal data/ }))
    await user.type(
      within(dialog).getByLabelText('What’s wrong?'),
      'It mentions the day I moved out, which is mine to share.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(
      await within(dialog).findByText(/acknowledge your request within 30 days/),
    ).toBeInTheDocument()
  })
})

describe('a review of the tenant', () => {
  it('lets them add “Tenant disputes this”', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/reviews/rating_victoria_derek_sarah')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A review of you' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Part of your tenant passport')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Add “Tenant disputes this”/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a dispute note?' })
    await user.click(within(dialog).getByRole('button', { name: 'Add the note' }))
    expect(await screen.findByText('Tenant disputes this')).toBeInTheDocument()
    const detail = await slate.api.getReview(sarah, 'rating_victoria_derek_sarah')
    expect(detail?.review.dispute).toBeDefined()
  })
})
