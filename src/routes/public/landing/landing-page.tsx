// The front page (docs/LANDING_BRIEF.md): a repair told once, in the order it happens, with the
// real product at every step and the fair-ratings rules as the turn in the middle.

import { BRAND } from '@/config/brand'
import { useDocumentTitle } from '@/routes/_shell'
import { PublicLayout } from '../layout/public-layout'
import { Closing } from './closing'
import { TenementSprite } from './door-art'
import { Doors } from './doors'
import { FairRatings } from './fair-ratings'
import { FaqSection } from './faq'
import { Hero } from './hero'
import { OneRepair } from './one-repair'
import { Pricing } from './pricing'
import { Scotland } from './scotland'
import { Statement } from './statement'
import './landing.css'

export function LandingPage() {
  useDocumentTitle(BRAND.tagline)
  return (
    <PublicLayout className="lp">
      <TenementSprite />
      <Hero />
      <Statement />
      <OneRepair />
      <FairRatings />
      <Doors />
      <Scotland />
      <Pricing />
      <FaqSection />
      <Closing />
    </PublicLayout>
  )
}
