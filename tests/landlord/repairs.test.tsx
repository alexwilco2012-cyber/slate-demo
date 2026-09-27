import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockScreenWidth, renderLandlord } from './harness'

const original = window.matchMedia

beforeEach(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  window.matchMedia = original
})

async function repairTitles() {
  const list = await screen.findByRole('list', { name: 'Repairs' })
  return within(list)
    .getAllByRole('link')
    .map((link) => link.querySelector('p')?.textContent)
}

describe('the repairs list', () => {
  it('opens on what needs the landlord, with what each one needs in words', async () => {
    renderLandlord('/landlord/repairs')
    const list = await screen.findByRole('list', { name: 'Repairs' })
    // Five repairs wait on the landlord. The finished one with a rating owed sits under Done,
    // so this count matches the Repairs count in the navigation.
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(5))
    expect(within(list).queryByRole('link', { name: /Bedroom radiator/ })).toBeNull()
    const damp = within(list).getByRole('link', { name: /Damp patch spreading/ })
    expect(damp).toHaveTextContent('Approve or decline')
    // Status is a word with an icon, never a colour on its own.
    expect(damp).toHaveTextContent('Reported')
    expect(damp).toHaveTextContent('Urgent')
    expect(within(list).getByRole('link', { name: /Gutter overflowing/ })).toHaveTextContent(
      'Compare 2 quotes',
    )
  })

  it('filters by status and by home, and keeps the filters in the address', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/repairs')
    await screen.findByRole('list', { name: 'Repairs' })
    await user.click(screen.getByRole('radio', { name: /All \(13\)/ }))
    await waitFor(async () => expect(await repairTitles()).toHaveLength(13))
    expect(screen.getByTestId('location')).toHaveTextContent('/landlord/repairs?show=all')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Home' }), 'property_esslemont')
    await waitFor(async () => {
      const titles = await repairTitles()
      expect(titles.length).toBeGreaterThan(0)
      expect(titles).toContain('Damp patch spreading on the bedroom ceiling')
      expect(titles).not.toContain('Gutter overflowing above the back door')
    })
    expect(screen.getByTestId('location')).toHaveTextContent('home=property_esslemont')
  })

  it('points to the next step when nothing matches', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/repairs?show=closed&home=property_jesmond')
    expect(await screen.findByRole('heading', { name: 'No repairs here' })).toBeInTheDocument()
    // One in the page header, one in the empty state.
    const raise = screen.getAllByRole('button', { name: 'Raise a repair' })
    expect(raise).toHaveLength(2)
    await user.click(raise[1]!)
    expect(await screen.findByRole('dialog', { name: /Raise a repair/ })).toBeInTheDocument()
  })

  it('opens a repair as its own page on a phone', async () => {
    const user = userEvent.setup()
    renderLandlord('/landlord/repairs')
    await user.click(await screen.findByRole('link', { name: /Damp patch spreading/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/landlord/jobs/job_ceiling_esslemont')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Damp patch spreading on the bedroom ceiling',
      }),
    ).toBeInTheDocument()
  })

  it('opens a repair in a drawer beside the list on a wide screen', async () => {
    mockScreenWidth(true)
    const user = userEvent.setup()
    renderLandlord('/landlord/repairs')
    await user.click(await screen.findByRole('link', { name: /Gutter overflowing/ }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/landlord/repairs?job=job_gutter_jesmond',
    )
    const drawer = await screen.findByRole('dialog', {
      name: 'Gutter overflowing above the back door',
    })
    expect(await within(drawer).findByRole('list', { name: 'Quotes' })).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: /Open as a full page/ })).toHaveAttribute(
      'href',
      '/landlord/jobs/job_gutter_jesmond',
    )
  })
})
