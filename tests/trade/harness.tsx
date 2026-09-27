// Renders the trade portal as the app does (behind the portal gate, inside the portal layout)
// with a fresh in-memory data layer, signed in as Kev the plumber.

import { configure, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { SlateProvider, type LocalSlate } from '@/data'
import type { PersonId } from '@/domain/types'
import { UiProvider } from '@/components/ui/provider'
import { createSessionStore, PortalGate, SessionProvider } from '@/session'
import TradePortal from '@/routes/trade'
import { freshSlate } from '../shell/harness'

function Where() {
  const location = useLocation()
  return (
    <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
  )
}

// Pages load lazily; with the whole suite running in parallel the first render can take more than
// the default second, so waits here allow longer before failing.
configure({ asyncUtilTimeout: 5000 })
vi.setConfig({ testTimeout: 15_000 })

export const KEV = 'person_kev' as PersonId
export const kev = { personId: KEV, role: 'trade' } as const
export const graham = { personId: 'person_graham' as PersonId, role: 'landlord' } as const

export function renderTrade(
  path: string,
  { personId = KEV, slate = freshSlate() }: { personId?: PersonId; slate?: LocalSlate } = {},
) {
  const store = createSessionStore(null)
  store.set({ personId, activeRole: 'trade' })
  const result = render(
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      <SlateProvider slate={slate}>
        <SessionProvider store={store}>
          <UiProvider>
            <Routes>
              <Route
                path="/trade/*"
                element={
                  <PortalGate role="trade">
                    <TradePortal />
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

/** A tiny photo, as if the camera had just taken it. */
export function photoFile(name = 'photo.jpg') {
  return new File([new Uint8Array([255, 216, 255, 224])], name, { type: 'image/jpeg' })
}
