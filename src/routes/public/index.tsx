// The public site: everything outside the portals, the demo page and the gallery. The front page
// and the persona picker load with this module; sign-up, the walkthroughs and the policies load
// when first opened. Contract: src/routes/README.md.

import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import { NotFound, PageFallback } from '@/routes/_shell'
import { LandingPage } from './landing/landing-page'
import { StartPage } from './start/start-page'

const SignUp = lazy(() => import('./signup/signup-page'))
const HowItWorks = lazy(() => import('./how-it-works/how-it-works-page'))
const Policies = lazy(() => import('@/routes/policies'))

/**
 * A tenant's passport link (/passport/:token) opens in the landlord portal, which logs the view
 * for the tenant. Someone signed out picks who they are first and comes straight back.
 */
function PassportLink() {
  const { token = '' } = useParams()
  return <Navigate to={`/landlord/passports/${encodeURIComponent(token)}`} replace />
}

function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

export default function PublicSite() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="start" element={<StartPage />} />
      <Route path="passport/:token" element={<PassportLink />} />
      <Route
        path="signup/*"
        element={
          <Deferred>
            <SignUp />
          </Deferred>
        }
      />
      <Route
        path="how-it-works/:role"
        element={
          <Deferred>
            <HowItWorks />
          </Deferred>
        }
      />
      <Route
        path="policies/*"
        element={
          <Deferred>
            <Policies />
          </Deferred>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
