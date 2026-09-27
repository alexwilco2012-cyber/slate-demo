// Renders the landlord portal as the app does (behind the portal gate, inside the portal layout)
// with a fresh in-memory data layer, signed in as a landlord or as an agent in a landlord's account.

import { configure, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { SlateProvider, type LocalSlate } from '@/data'
import type { PersonId } from '@/domain/types'
import { UiProvider } from '@/components/ui/provider'
import { createSessionStore, PortalGate, SessionProvider } from '@/session'
import LandlordPortal from '@/routes/landlord'
import { freshSlate } from '../shell/harness'

// The landlord pages load several reads at once; give them time when the whole suite runs in
// parallel.
configure({ asyncUtilTimeout: 4000 })

function Where() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

export const GRAHAM = 'person_graham' as PersonId
export const AILEEN = 'person_aileen' as PersonId
export const DEREK = 'person_derek' as PersonId

export function renderLandlord(
  path: string,
  {
    personId = GRAHAM,
    actingForLandlordId,
    slate = freshSlate(),
  }: { personId?: PersonId; actingForLandlordId?: PersonId; slate?: LocalSlate } = {},
) {
  const store = createSessionStore(null)
  store.set({
    personId,
    activeRole: 'landlord',
    ...(actingForLandlordId ? { actingForLandlordId } : {}),
  })
  const result = render(
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      <SlateProvider slate={slate}>
        <SessionProvider store={store}>
          <UiProvider>
            <Routes>
              <Route
                path="/landlord/*"
                element={
                  <PortalGate role="landlord">
                    <LandlordPortal />
                  </PortalGate>
                }
              />
              <Route path="*" element={<p>Somewhere else</p>} />
            </Routes>
            <Where />
          </UiProvider>
        </SessionProvider>
      </SlateProvider>
    </MemoryRouter>,
  )
  return { ...result, slate, store }
}

export const graham = { personId: GRAHAM, role: 'landlord' } as const
export const derek = { personId: DEREK, role: 'landlord' } as const
export const aileen = { personId: AILEEN, role: 'landlord', actingForId: GRAHAM } as const

/** Pretends the screen is at least this wide, for the list-and-drawer layout. */
export function mockScreenWidth(minWidthMatches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: minWidthMatches && /min-width/.test(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
