// The tenant passport: landlords' ratings of a tenant, never public and never one number. The
// tenant shares all of it or none of it, through a link that lasts 30 days and logs every view.

import type { SharedPassport, SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import type { PassportShare, PersonId, TenantPassport } from '@/domain/types'
import { forbidden, notFound, requireRole, resolveViewer } from '../access'
import { hrefs } from '../hrefs'
import { notify } from '../notify'
import { randomToken } from '../random'
import {
  passportRatings,
  passportShareExpiresAt,
  passportSummary,
  shareStatus,
} from '@/domain/rating'
import type { Reader } from '../tx'
import { optionalText } from '../validate'
import { personCard, publicReview } from '../views'
import type { LocalContext } from './context'

type PassportMethods =
  | 'getMyPassport'
  | 'createPassportShare'
  | 'listPassportShares'
  | 'revokePassportShare'
  | 'openPassportShare'

export function passportOf(db: Reader, tenantId: PersonId): TenantPassport {
  const ratings = db.rows('ratings')
  const summary = passportSummary(tenantId, ratings, db.now)
  return {
    ...summary,
    reviews: passportRatings(ratings, tenantId, db.now).flatMap((rating) => {
      const review = publicReview(db, rating)
      return review ? [review] : []
    }),
  }
}

/** How a view shows in the tenant's log. Never the viewer's name. */
function viewerLabel(db: Reader, viewerId: PersonId | undefined): string {
  const person = viewerId ? db.get('people', viewerId) : undefined
  if (!person) return 'Someone with the link'
  const isAgent =
    person.badges.some((b) => b.kind === 'agent_team') ||
    db.rows('memberships').some((m) => m.agentId === person.id && m.status === 'active')
  if (isAgent) return 'Signed-in letting agent'
  if (person.roles.includes('landlord')) return 'Signed-in landlord'
  return 'Signed-in member'
}

export function passportApi(ctx: LocalContext): Pick<SlateApi, PassportMethods> {
  return {
    async getMyPassport(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'tenant')
      return passportOf(db, actor.person.id)
    },

    async createPassportShare(viewer, rawLabel) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'tenant')
        const label = optionalText(rawLabel, { field: 'label', label: 'the label', max: 80 })
        const share: PassportShare = {
          id: newId('share'),
          tenantId: actor.person.id,
          token: randomToken(20),
          createdAt: tx.now,
          expiresAt: passportShareExpiresAt(tx.now),
          views: [],
          ...(label ? { label } : {}),
        }
        return tx.put('shares', share)
      })
    },

    async listPassportShares(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'tenant')
      return db
        .rows('shares')
        .filter((s) => s.tenantId === actor.person.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async revokePassportShare(viewer, shareId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'tenant')
        const share = tx.get('shares', shareId)
        if (!share) throw notFound('link')
        if (share.tenantId !== actor.person.id) throw forbidden()
        if (share.revokedAt) return share
        return tx.put('shares', { ...share, revokedAt: tx.now })
      })
    },

    async openPassportShare(token, viewerId) {
      return ctx.write((tx): SharedPassport => {
        const share = tx.rows('shares').find((s) => s.token === token)
        const status = shareStatus(share, tx.now)
        if (!share || status !== 'ok') return { status: status === 'ok' ? 'not_found' : status }
        const tenant = tx.get('people', share.tenantId)
        if (!tenant) return { status: 'not_found' }
        if (viewerId !== share.tenantId) {
          const label = viewerLabel(tx, viewerId)
          tx.put('shares', {
            ...share,
            views: [
              ...share.views,
              { viewedAt: tx.now, viewerLabel: label, ...(viewerId ? { viewerId } : {}) },
            ],
          })
          notify(tx, {
            to: [tenant.id],
            role: 'tenant',
            kind: 'passport_viewed',
            title: `${label === 'Someone with the link' ? 'Someone with the link' : `A ${label.toLowerCase()}`} opened your passport`,
            ...(share.label ? { body: share.label } : {}),
            href: hrefs.passport(),
            ref: { entity: 'share', id: share.id },
          })
        }
        return {
          status: 'ok',
          tenant: personCard(tenant),
          passport: passportOf(tx, tenant.id),
          expiresAt: share.expiresAt,
        }
      })
    },
  }
}
