import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPublic } from './harness'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('how it works', () => {
  test('each party has its own walkthrough with a way to try it and sign up', async () => {
    for (const [role, heading, persona] of [
      ['tenant', 'Report it once. Watch it get fixed.', 'Sarah'],
      ['landlord', 'Everything that needs you, in one list.', 'Graham'],
      ['trade', 'Know the client before you quote.', 'Kev'],
    ] as const) {
      const view = renderPublic(`/how-it-works/${role}`)
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible()
      const tryIt = screen.getAllByRole('link', { name: new RegExp(`Try as ${persona}`) })[0]
      expect(tryIt?.getAttribute('href')).toMatch(new RegExp(`^/${role}\\?as=person_`))
      expect(screen.getAllByRole('link', { name: /Sign up as/ })[0]).toHaveAttribute(
        'href',
        `/signup/${role}`,
      )
      const ratings = screen.getByRole('region', { name: 'Your ratings' })
      expect(within(ratings).getByRole('link', { name: 'Review policy' })).toHaveAttribute(
        'href',
        '/policies/reviews',
      )
      expect(within(ratings).getByRole('button', { name: 'Report' })).toBeVisible()
      view.unmount()
    }
  })

  test('says what each party rates and who sees it', async () => {
    renderPublic('/how-it-works/tenant')
    await screen.findByRole('heading', { name: 'Your ratings' })
    expect(screen.getByText('Tenant rates trade')).toBeVisible()
    expect(screen.getByText(/Your tenant passport. Never public/)).toBeVisible()
  })

  test.each(['tenant', 'landlord', 'trade'])(
    'the %s sample rating has a Report button that shows the four routes',
    async (role) => {
      const user = userEvent.setup()
      renderPublic(`/how-it-works/${role}`)
      await user.click(await screen.findByRole('button', { name: 'Report' }))
      const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
      const routes = within(dialog).getAllByRole('link', { name: /within/ })
      expect(routes.map((link) => link.getAttribute('href'))).toEqual([
        '/policies/reporting#defamation',
        '/policies/reporting#illegal',
        '/policies/reporting#fake',
        '/policies/reporting#data-protection',
      ])
    },
  )

  test('the report sheet closes when a route is chosen', async () => {
    const user = userEvent.setup()
    const view = renderPublic('/how-it-works/landlord')
    await user.click(await screen.findByRole('button', { name: 'Report' }))
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    await user.click(within(dialog).getByRole('link', { name: /fake review/ }))
    expect(view.location()).toBe('/policies/reporting')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('an unknown party is a 404', async () => {
    renderPublic('/how-it-works/butler')
    expect(await screen.findByRole('heading', { name: 'We can’t find that page' })).toBeVisible()
  })
})
