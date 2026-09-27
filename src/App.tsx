import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SlateProvider } from '@/data'
import { ROLES, type Role } from '@/domain/types'
import { UiProvider } from '@/components/ui/provider'
import { PortalGate, SessionFromUrl, SessionProvider } from '@/session'
import { PageFallback, PortalSkeleton } from '@/routes/_shell/fallbacks'
import { PwaUpdates } from '@/routes/_shell/pwa-updates'
import { RouteChangeEffects } from '@/routes/_shell/route-effects'

// Every area loads on demand, so someone trying the tenant portal never downloads the others.
// Each module's default export renders its own nested <Routes>: see src/routes/README.md.
const PublicSite = lazy(() => import('@/routes/public'))
const DemoPage = lazy(() => import('@/routes/demo'))
const PORTALS = {
  tenant: lazy(() => import('@/routes/tenant')),
  landlord: lazy(() => import('@/routes/landlord')),
  trade: lazy(() => import('@/routes/trade')),
} satisfies Record<Role, unknown>
// The component gallery is for development only: not linked from the app, and left out of
// production builds entirely (Vite replaces import.meta.env.DEV with false, so the import goes too).
const Gallery = import.meta.env.DEV
  ? lazy(() => import('@/routes/dev/gallery').then((m) => ({ default: m.Gallery })))
  : null

function PortalRoute({ role }: { role: Role }) {
  const Portal = PORTALS[role]
  const skeleton = <PortalSkeleton role={role} />
  return (
    <PortalGate role={role} fallback={skeleton}>
      <Suspense fallback={skeleton}>
        <Portal />
      </Suspense>
    </PortalGate>
  )
}

/** The route tree, without a router, so tests can wrap it in a MemoryRouter. */
export function AppRoutes() {
  return (
    <>
      <SessionFromUrl />
      <RouteChangeEffects />
      <Routes>
        {ROLES.map((role) => (
          <Route key={role} path={`/${role}/*`} element={<PortalRoute role={role} />} />
        ))}
        <Route
          path="/demo/*"
          element={
            <Suspense fallback={<PageFallback />}>
              <DemoPage />
            </Suspense>
          }
        />
        {Gallery ? (
          <Route
            path="/dev/gallery/*"
            element={
              <Suspense fallback={<PageFallback />}>
                <Gallery />
              </Suspense>
            }
          />
        ) : null}
        {/* The public site owns everything else, "/" and "/start" included, and its own 404. */}
        <Route
          path="/*"
          element={
            <Suspense fallback={<PageFallback />}>
              <PublicSite />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}

/** Data, session, toasts and tooltips. Inside the router, so anything here can link. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SlateProvider>
      <SessionProvider>
        <UiProvider>
          {children}
          <PwaUpdates />
        </UiProvider>
      </SessionProvider>
    </SlateProvider>
  )
}

export function App() {
  // Without transitions, a navigation lands in the same render as the session change beside it
  // (the session store is always synchronous), so signing out never flashes a sign-in redirect.
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} useTransitions={false}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  )
}
