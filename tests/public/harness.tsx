// Renders the public site the way the app mounts it ("/*"), with a fresh data layer, an in-memory
// session and a memory router without transitions.

import { configure, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { createLocalSlate, memoryStorage, SlateProvider } from '@/data'
import { UiProvider } from '@/components/ui/provider'
import PublicSite from '@/routes/public'
import { createSessionStore, SessionProvider, type Session } from '@/session'

// Pages here load lazily and sign-up waits on simulated checks, which is slow when the whole suite
// runs in parallel. Give lookups and whole flows room, for the files that use this harness only.
configure({ asyncUtilTimeout: 4000 })
vi.setConfig({ testTimeout: 20_000 })

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

export function renderPublic(
  path = '/',
  { state, session }: { state?: unknown; session?: Session } = {},
) {
  const slate = createLocalSlate({ storage: memoryStorage(), channel: null })
  const store = createSessionStore(null)
  if (session) store.set(session)
  const url = new URL(path, 'http://test.local')
  const entry = { pathname: url.pathname, search: url.search, hash: url.hash, state }
  const result = render(
    <MemoryRouter initialEntries={[entry]} useTransitions={false}>
      <SlateProvider slate={slate}>
        <SessionProvider store={store}>
          <UiProvider>
            <Routes>
              <Route path="/*" element={<PublicSite />} />
            </Routes>
            <LocationProbe />
          </UiProvider>
        </SessionProvider>
      </SlateProvider>
    </MemoryRouter>,
  )
  return {
    ...result,
    slate,
    store,
    location: () => screen.getByTestId('location').textContent,
  }
}
