// The plain-English policies, mounted by the public site at /policies/*. Other screens link to
// their sections, e.g. /policies/reviews#tenants-protected or /policies/reporting#fake.

import { Navigate, Route, Routes } from 'react-router'
import { NotFound } from '@/routes/_shell'
import { PrivacyPolicy } from './privacy'
import { ReportingPolicy } from './reporting'
import { ReviewPolicy } from './reviews'

export default function Policies() {
  return (
    <Routes>
      <Route index element={<Navigate to="reviews" replace />} />
      <Route path="reviews" element={<ReviewPolicy />} />
      <Route path="reporting" element={<ReportingPolicy />} />
      <Route path="privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
