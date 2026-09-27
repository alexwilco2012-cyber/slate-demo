import { screen, within } from '@testing-library/react'
import { renderTenant } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('the tenant home screen', () => {
  it('greets Sarah and puts reporting a problem first', async () => {
    renderTenant('/tenant')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Good morning, Sarah' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Something needs fixing?' })
    expect(within(hero).getByRole('link', { name: 'Report a problem' })).toHaveAttribute(
      'href',
      '/tenant/report',
    )
    expect(within(hero).getByRole('link', { name: '0800 111 999' })).toHaveAttribute(
      'href',
      'tel:0800111999',
    )
  })

  it('shows the home, the landlord’s score and which scheme holds the deposit', async () => {
    renderTenant('/tenant')
    expect(await screen.findByText('Top Floor Right, 14 Esslemont Avenue')).toBeInTheDocument()
    expect(screen.getByText('Graham Forbes')).toBeInTheDocument()
    expect(screen.getByText('Registration verified')).toBeInTheDocument()
    const deposit = screen.getByRole('article', { name: 'Your deposit' })
    const holder = within(deposit).getByText('SafeDeposits Scotland').closest('li')!
    expect(within(holder).getByText('Holds yours')).toBeInTheDocument()
    expect(within(deposit).getByText(/9 working days after your tenancy began/)).toBeInTheDocument()
    expect(within(deposit).getByText(/30 working days/)).toBeInTheDocument()
  })

  it('lists the visit coming up with its written notice, and the open repairs', async () => {
    renderTenant('/tenant')
    const visits = await screen.findByRole('region', { name: /Coming up/ })
    expect(within(visits).getByText('9am to 12pm')).toBeInTheDocument()
    expect(within(visits).getByText('Neil Buchan')).toBeInTheDocument()
    expect(within(visits).getByText(/4 days ahead/)).toBeInTheDocument()
    const repairs = screen.getByRole('region', { name: /Open repairs/ })
    expect(
      within(repairs).getByRole('link', { name: 'Damp patch spreading on the bedroom ceiling' }),
    ).toBeInTheDocument()
    expect(within(repairs).getAllByRole('list', { name: 'Job progress' }).length).toBeGreaterThan(0)
  })

  it('asks for the sealed per-repair rating of the landlord', async () => {
    renderTenant('/tenant')
    const waiting = await screen.findByRole('region', { name: /Waiting for you/ })
    expect(within(waiting).getByText('How did Graham handle the repair?')).toBeInTheDocument()
    expect(within(waiting).getByText(/Graham never sees it on its own/)).toBeInTheDocument()
    expect(within(waiting).getByRole('link', { name: 'Rate now' })).toHaveAttribute(
      'href',
      '/tenant/jobs/job_radiator_esslemont/rate/landlord',
    )
  })

  it('says what happened while Sarah was away', async () => {
    renderTenant('/tenant')
    expect(
      await screen.findByText('Since Wednesday: 1 visit update and 1 message.'),
    ).toBeInTheDocument()
    const activity = screen.getByRole('region', { name: 'Recent activity' })
    expect(within(activity).getByRole('link', { name: /Aileen Christie/ })).toHaveAttribute(
      'href',
      '/tenant/messages/thread_ceiling_esslemont',
    )
  })

  it('gives the navigation counts for unread messages and ratings to do', async () => {
    renderTenant('/tenant')
    expect(await screen.findAllByRole('link', { name: 'Messages, 1 new' })).not.toHaveLength(0)
  })
})
