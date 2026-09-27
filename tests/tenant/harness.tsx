// Renders the tenant portal as the app does (behind the portal gate, inside the portal layout)
// with a fresh in-memory data layer, signed in as a tenant.

import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { LocalSlate } from '@/data'
import type { PersonId } from '@/domain/types'
import { UiProvider } from '@/components/ui/provider'
import { createSessionStore, PortalGate, SessionProvider } from '@/session'
import { SlateProvider } from '@/data'
import TenantPortal from '@/routes/tenant'
import { freshSlate } from '../shell/harness'

function Where() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

export const SARAH = 'person_sarah' as PersonId

export function renderTenant(
  path: string,
  { personId = SARAH, slate = freshSlate() }: { personId?: PersonId; slate?: LocalSlate } = {},
) {
  const store = createSessionStore(null)
  store.set({ personId, activeRole: 'tenant' })
  const result = render(
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      <SlateProvider slate={slate}>
        <SessionProvider store={store}>
          <UiProvider>
            <Routes>
              <Route
                path="/tenant/*"
                element={
                  <PortalGate role="tenant">
                    <TenantPortal />
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

export const sarah = { personId: SARAH, role: 'tenant' } as const
export const graham = { personId: 'person_graham' as PersonId, role: 'landlord' } as const
