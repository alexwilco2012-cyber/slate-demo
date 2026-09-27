import { BRAND } from '@/config/brand'
import { useDocumentTitle } from '@/routes/_shell'
import { PublicLayout } from '../layout/public-layout'
import { Closing } from './closing'
import { Doors } from './doors'
import { FairRatings } from './fair-ratings'
import { FaqSection } from './faq'
import { ForRole } from './for-role'
import { Hero } from './hero'
import { Pricing } from './pricing'
import { Scotland } from './scotland'

export function LandingPage() {
  useDocumentTitle(BRAND.tagline)
  return (
    <PublicLayout>
      <Hero />
      <Doors />
      <ForRole role="tenant" />
      <div className="border-y border-line bg-surface">
        <ForRole role="landlord" />
      </div>
      <ForRole role="trade" />
      <FairRatings />
      <Scotland />
      <Pricing />
      <FaqSection />
      <Closing />
    </PublicLayout>
  )
}
