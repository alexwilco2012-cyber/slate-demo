import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshSlate } from '../shell/harness'
import { graham, renderLandlord } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function homeCard(name: string) {
  return screen.getByRole('heading', { level: 2, name }).closest('li')!
}

describe('documents and certificates', () => {
  it('lists what needs attention by home, each with status, date, days left and an icon', async () => {
    renderLandlord('/landlord/documents')
    await screen.findByRole('heading', { level: 2, name: '118 King Street, Old Aberdeen' })
    const king = homeCard('118 King Street, Old Aberdeen')
    const rows = within(king).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Smoke and heat alarms')
    expect(rows[0]).toHaveTextContent('Expired')
    expect(rows[0]).toHaveTextContent('17 Sept 2026')
    expect(rows[0]).toHaveTextContent('Expired 9 days ago')
    expect(rows[1]).toHaveTextContent('Electrical installation condition report (EICR)')
    expect(rows[1]).toHaveTextContent('44 days left')
  })

  it('spells out the Scottish renewal intervals in a plain table', async () => {
    renderLandlord('/landlord/documents')
    const table = await screen.findByRole('table', { name: 'Renewal intervals' })
    const row = (name: string) => within(table).getByRole('cell', { name }).closest('tr')!
    expect(row('Gas safety record')).toHaveTextContent('Every year')
    expect(row('Electrical installation condition report (EICR)')).toHaveTextContent(
      'Every 5 years',
    )
    expect(row('Landlord registration')).toHaveTextContent('Every 3 years')
    expect(row('Smoke and heat alarms')).toHaveTextContent('Every year')
    expect(row('Carbon monoxide alarms')).toHaveTextContent('Every year')
    expect(row('Legionella risk assessment')).toHaveTextContent('Every 2 years')
  })

  it('shows the next 12 months and lists what runs out in a chosen month', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/documents')
    const months = await screen.findByRole('list', { name: 'Next 12 months' })
    const november = await within(months).findByRole('button', {
      name: /Nov.*2 certificates run out/,
    })
    await user.click(november)
    expect(november).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('month=2026-11')
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { level: 2, name: '31 Jesmond Drive, Bridge of Don' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      within(homeCard("32 Queen's Road, West End")).getByText('Legionella risk assessment'),
    ).toBeInTheDocument()
    // A month with nothing in it can't be chosen.
    expect(within(months).getByText(/nothing runs out/)).toBeInTheDocument()
  })

  it('uploads a certificate (simulated) and takes it off the list', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/documents')
    await screen.findByRole('heading', { level: 2, name: '31 Jesmond Drive, Bridge of Don' })
    const jesmond = homeCard('31 Jesmond Drive, Bridge of Don')
    const inventory = within(jesmond).getByText('Inventory').closest('tr')!
    await user.click(within(inventory).getByRole('button', { name: 'Upload' }))

    const dialog = await screen.findByRole('dialog', { name: 'Upload: Inventory' })
    await user.click(within(dialog).getByRole('button', { name: 'Save document' }))
    expect(within(dialog).getByText('Choose the file, or use the sample file.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Use a sample file' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save document' }))

    await waitFor(() =>
      expect(
        within(homeCard('31 Jesmond Drive, Bridge of Don')).queryByText('Inventory'),
      ).not.toBeInTheDocument(),
    )
    const calendar = await slate.api.getComplianceCalendar(graham)
    const item = calendar.find((i) => i.type === 'inventory' && i.propertyId === 'property_jesmond')
    expect(item?.document?.file.name).toMatch(/Inventory/)
  })

  it('books a renewal as a job, which shows as booked', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/documents')
    await screen.findByRole('heading', { level: 2, name: '118 King Street, Old Aberdeen' })
    const alarms = within(homeCard('118 King Street, Old Aberdeen'))
      .getByText('Smoke and heat alarms')
      .closest('tr')!
    await user.click(within(alarms).getByRole('button', { name: 'Book renewal' }))
    const dialog = await screen.findByRole('dialog', {
      name: 'Book a renewal: smoke and heat alarms',
    })
    expect(within(dialog).getByRole('combobox', { name: 'Home' })).toHaveValue(
      'property_king_street',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Book renewal' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/\/landlord\/jobs\//),
    )
    const jobs = await slate.api.listJobs(graham)
    const renewal = jobs.find(
      (job) =>
        job.complianceType === 'smoke_heat_alarms' && job.propertyId === 'property_king_street',
    )
    expect(renewal?.status).toBe('approved')
    expect(screen.getByTestId('location')).toHaveTextContent(`/landlord/jobs/${renewal!.id}`)
  })

  it('leads to a renewal already raised instead of raising another, and never hides a lapse', async () => {
    const slate = freshSlate()
    const job = await slate.api.createJob(graham, {
      propertyId: 'property_king_street',
      room: 'whole_home',
      category: 'safety_check',
      description: 'Test and replace the smoke and heat alarms.',
      photos: [],
      urgency: 'routine',
      access: { windows: [], keyAllowed: false },
      complianceType: 'smoke_heat_alarms',
    })
    renderLandlord('/landlord/documents', { slate })
    await screen.findByRole('heading', { level: 2, name: '118 King Street, Old Aberdeen' })
    const alarms = within(homeCard('118 King Street, Old Aberdeen'))
      .getByText('Smoke and heat alarms')
      .closest('tr')!
    expect(alarms).toHaveTextContent('Expired')
    expect(within(alarms).getByRole('link', { name: 'See the renewal' })).toHaveAttribute(
      'href',
      `/landlord/jobs/${job.id}`,
    )
    expect(within(alarms).queryByRole('button', { name: 'Book renewal' })).not.toBeInTheDocument()
  })

  it('has the same calendar on each home’s page', async () => {
    renderLandlord('/landlord/homes/property_king_street/documents')
    expect(
      await screen.findByRole('table', { name: /Certificates for 118 King Street/ }),
    ).toBeInTheDocument()
  })
})
