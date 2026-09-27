// Renders shell pieces with a fresh data layer, an in-memory session and a memory router set up
// like the app's (no transitions).

import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { createLocalSlate, memoryStorage, SlateProvider } from '@/data'
import { UiProvider } from '@/components/ui/provider'
import { createSessionStore, SessionProvider, type Session } from '@/session'

export function freshSlate() {
  return createLocalSlate({ storage: memoryStorage(), channel: null })
}

/** Shows where the router is, and the state it was given, for assertions. */
function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location" data-state={JSON.stringify(location.state ?? null)}>
      {`${location.pathname}${location.search}`}
    </output>
  )
}

export function renderShell(
  ui: ReactNode,
  { path = '/', session = null }: { path?: string; session?: Session | null } = {},
) {
  const slate = freshSlate()
  const store = createSessionStore(null)
  if (session) store.set(session)
  const result = render(
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      <SlateProvider slate={slate}>
        <SessionProvider store={store}>
          <UiProvider>
            {ui}
            <LocationProbe />
          </UiProvider>
        </SessionProvider>
      </SlateProvider>
    </MemoryRouter>,
  )
  return { ...result, slate, store }
}
