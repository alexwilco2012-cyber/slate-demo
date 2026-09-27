// The design and accessibility review of the tenant portal: repairs in tabs, the rating call to
// action on a finished repair, links that land on a section, the job page's reading order, report
// clocks in plain sentences, and phone alerts only once the app is on the home screen.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PersonId } from '@/domain/types'
import { renderTenant } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.localStorage.clear()
})

describe('repairs', () => {
  it('splits repairs into tabs with a count on each, and a heading for each list', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/repairs')
    const open = await screen.findByRole('tab', { name: /Open\s*2/ })
    expect(open).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Open repairs' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Damp patch spreading on the bedroom ceiling' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Done/ }))
    expect(
      await screen.findByRole('link', { name: 'Bedroom radiator only warm at the bottom' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/At your previous home, 88 Victoria Road/)).toBeInTheDocument()
  })
})

describe('a finished repair', () => {
  it('offers the rating straight from the “what’s next” card', async () => {
    renderTenant('/tenant/jobs/job_radiator_esslemont')
    const title = await screen.findByText('Fixed? Tell us how it went')
    const next = title.closest('[role="status"]') as HTMLElement
    expect(within(next).getByRole('link', { name: 'Rate Graham' })).toHaveAttribute(
      'href',
      '/tenant/jobs/job_radiator_esslemont/rate/landlord',
    )
  })

  it('reads in the order it’s shown on a phone: next step, who, progress, ratings, messages', async () => {
    renderTenant('/tenant/jobs/job_radiator_esslemont')
    await screen.findByText('Fixed? Tell us how it went')
    const order = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) =>
        ['Who’s doing the work', 'Progress', 'Ratings', 'Messages', 'The problem'].includes(
          text ?? '',
        ),
      )
    expect(order).toEqual([
      'Who’s doing the work',
      'Progress',
      'Ratings',
      'Messages',
      'The problem',
    ])
  })

  it('lands on a section when the link names one', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    renderTenant('/tenant/jobs/job_eicr_esslemont#messages')
    const heading = await screen.findByRole('heading', { level: 2, name: 'Messages' })
    await waitFor(() => expect(focus.mock.contexts).toContain(heading))
    expect(heading).toHaveAttribute('tabindex', '-1')
    focus.mockRestore()
  })
})

describe('reports', () => {
  it('says what each clock means in plain sentences', async () => {
    renderTenant('/tenant/reports', { personId: 'person_connor' as PersonId })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
    expect(
      await screen.findByText('We told the person who posted it on 30 Jun 2025'),
    ).toBeInTheDocument()
  })
})

describe('phone alerts', () => {
  it('waits until the app is on the home screen, and shows how to add it', async () => {
    renderTenant('/tenant/profile')
    const phone = await screen.findByRole('switch', { name: /On this phone/ })
    expect(phone).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Get alerts on your phone')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Notification settings' })).toBeInTheDocument()
  })
})

describe('an ended tenancy', () => {
  it('doesn’t ask the tenant to chase papers for a home they’ve left', async () => {
    renderTenant('/tenant/tenancies/tenancy_niamh_fonthill', {
      personId: 'person_niamh' as PersonId,
    })
    expect(await screen.findByText('Ended August 2026')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'End of tenancy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /our review policy/ })).toBeInTheDocument()
    expect(screen.queryByText(/Ask them in your messages/)).not.toBeInTheDocument()
  })
})
