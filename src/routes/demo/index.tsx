// The side-by-side demo: /demo. See demo-page.tsx.

import { Route, Routes } from 'react-router'
import { NotFound } from '@/routes/_shell'
import { DemoPage } from './demo-page'

export default function DemoRoutes() {
  return (
    <Routes>
      <Route index element={<DemoPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
