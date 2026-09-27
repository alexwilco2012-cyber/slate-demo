// Public profile pages for landlords and trades: who they are, their scores and the reviews the
// viewer may read. Tenants have no public profile: their ratings live in the passport.

import type { PublicHome, SlateApi } from '@/data/api'
import { canViewClientRating } from '@/domain/rating'
import { resolveViewer } from '../access'
import { ukDate } from '../dates'
import { reviewsFor } from '../reviews'
import { clientRating, landlordScore, tradeScore } from '../scores'
import { personCard } from '../views'
import type { LocalContext } from './context'

type ProfileMethods = 'getLandlordProfile' | 'getTradeProfile'

export function profilesApi(ctx: LocalContext): Pick<SlateApi, ProfileMethods> {
  return {
    async getLandlordProfile(viewer, landlordId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      const landlord = db.get('people', landlordId)
      if (!landlord || !landlord.roles.includes('landlord')) return null
      const today = ukDate(db.now)
      const homes = db
        .rows('properties')
        .filter((property) => property.landlordId === landlordId)
        .sort((a, b) => a.neighbourhood.localeCompare(b.neighbourhood, 'en-GB'))
        .map((property): PublicHome => ({
          propertyId: property.id,
          neighbourhood: property.neighbourhood,
          postcodeDistrict: property.postcodeDistrict,
          type: property.type,
          bedrooms: property.bedrooms,
          score: landlordScore(db, { propertyId: property.id }),
        }))
      return {
        landlord: personCard(landlord),
        score: landlordScore(db, { landlordId }),
        reviews: reviewsFor(db, viewer, { direction: 'tenant->landlord', subjectId: landlordId }),
        homes,
        registrationVerified: landlord.badges.some(
          (badge) =>
            badge.kind === 'landlord_registration' &&
            (badge.expiresAt === undefined || badge.expiresAt >= today),
        ),
        clientRating: canViewClientRating(viewer, landlordId) ? clientRating(db, landlordId) : null,
      }
    },

    async getTradeProfile(viewer, tradeId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const trade = db.get('people', tradeId)
      if (!trade || !trade.roles.includes('trade') || !trade.tradeProfile) return null
      const saved =
        actor.role === 'landlord' &&
        (db.get('people', actor.actingAs)?.savedTradeIds.includes(tradeId) ?? false)
      return {
        trade: personCard(trade),
        score: tradeScore(db, tradeId),
        fromLandlords: reviewsFor(db, viewer, { direction: 'landlord->trade', subjectId: tradeId }),
        fromTenants: reviewsFor(db, viewer, { direction: 'tenant->trade', subjectId: tradeId }),
        saved,
      }
    },
  }
}
