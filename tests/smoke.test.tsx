import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppProviders, AppRoutes } from '@/App'
import { BRAND } from '@/config/brand'

// The public site loads lazily, which takes a little over a second when the whole suite runs in
// parallel. Give it the same room as tests/public/harness.tsx does.
const LAZY_PAGE = { timeout: 4000 }

test('the app starts on the public site with the brand name', async () => {
  render(
    <MemoryRouter initialEntries={['/']} useTransitions={false}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
  expect(await screen.findByRole('main', {}, LAZY_PAGE)).toBeInTheDocument()
  expect(screen.getAllByText(BRAND.name).length).toBeGreaterThan(0)
})

test('an unknown address shows the friendly page, not a blank screen', async () => {
  render(
    <MemoryRouter initialEntries={['/no-such-page']} useTransitions={false}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
  expect(
    await screen.findByRole('heading', { name: 'We can’t find that page' }, LAZY_PAGE),
  ).toBeInTheDocument()
})
