// Homes and tenancies. A tenancy counts for ratings only once both sides have confirmed it here.

import { SlateError, type SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import {
  DEPOSIT_SCHEMES,
  type PersonId,
  type Tenancy,
  type TenancyConfirmation,
} from '@/domain/types'
import {
  forbidden,
  invalidState,
  landlordSide,
  managesProperty,
  notFound,
  requireManagedProperty,
  resolveViewer,
  type Actor,
} from '../access'
import { ukDate } from '../dates'
import { hrefs } from '../hrefs'
import { notify } from '../notify'
import type { Reader } from '../tx'
import { invalid, requireDate, requireOneOf, requirePence } from '../validate'
import type { LocalContext } from './context'
import { BRAND } from '@/config/brand'

type PropertyMethods =
  | 'listProperties'
  | 'getProperty'
  | 'listTenancies'
  | 'getTenancy'
  | 'proposeTenancy'
  | 'confirmTenancy'
  | 'endTenancy'

/** Which side of a tenancy the viewer is on, if any. */
function tenancySide(db: Reader, actor: Actor, tenancy: Tenancy): 'landlord' | 'tenant' | null {
  if (actor.role === 'tenant' && tenancy.tenantIds.includes(actor.person.id)) return 'tenant'
  const property = db.get('properties', tenancy.propertyId)
  if (actor.role === 'landlord' && property && managesProperty(actor, property)) return 'landlord'
  return null
}

function visibleTenancies(db: Reader, actor: Actor): Tenancy[] {
  return db.rows('tenancies').filter((t) => tenancySide(db, actor, t) !== null)
}

export function propertiesApi(ctx: LocalContext): Pick<SlateApi, PropertyMethods> {
  return {
    async listProperties(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const properties = db.rows('properties').filter((property) => {
        switch (actor.role) {
          case 'landlord':
            return managesProperty(actor, property)
          case 'tenant':
            return db
              .rows('tenancies')
              .some((t) => t.propertyId === property.id && t.tenantIds.includes(actor.person.id))
          case 'trade':
            return db
              .rows('jobs')
              .some(
                (job) =>
                  job.propertyId === property.id &&
                  job.tradeId === actor.person.id &&
                  job.status !== 'cancelled' &&
                  job.status !== 'declined',
              )
        }
      })
      return properties.sort(
        (a, b) =>
          a.neighbourhood.localeCompare(b.neighbourhood, 'en-GB') ||
          a.addressLine.localeCompare(b.addressLine, 'en-GB'),
      )
    },

    async getProperty(viewer, propertyId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      // Property pages are public to anyone signed in: they carry the home's reviews.
      return db.get('properties', propertyId) ?? null
    },

    async listTenancies(viewer, filter = {}) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return visibleTenancies(db, actor)
        .filter((t) => !filter.propertyId || t.propertyId === filter.propertyId)
        .filter((t) => !filter.status || filter.status.includes(t.status))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
    },

    async getTenancy(viewer, tenancyId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const tenancy = db.get('tenancies', tenancyId)
      return tenancy && tenancySide(db, actor, tenancy) ? tenancy : null
    },

    async proposeTenancy(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const property = requireManagedProperty(tx, actor, input.propertyId, 'manage_tenancies')
        const tenantIds = [...new Set(input.tenantIds)]
        if (tenantIds.length === 0) throw invalid('tenantIds', 'Add at least one tenant.')
        for (const id of tenantIds) {
          const tenant = tx.get('people', id)
          if (!tenant || !tenant.roles.includes('tenant')) {
            throw invalid('tenantIds', `Every tenant needs a ${BRAND.name} tenant account.`)
          }
        }
        const startDate = requireDate(input.startDate, 'startDate', 'the start date')
        const rentPencePerMonth = requirePence(
          input.rentPencePerMonth,
          'rentPencePerMonth',
          'the rent',
        )
        if (rentPencePerMonth === 0) {
          throw invalid('rentPencePerMonth', 'Enter the monthly rent.')
        }
        const rentDueDay = input.rentDueDay
        if (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 28) {
          throw invalid('rentDueDay', 'Choose a day between the 1st and the 28th.')
        }
        const clash = tx
          .rows('tenancies')
          .find(
            (t) =>
              t.propertyId === property.id &&
              (t.status === 'proposed' ||
                (t.status === 'confirmed' && (!t.endDate || t.endDate >= startDate))),
          )
        if (clash) {
          throw invalidState(
            clash.status === 'proposed'
              ? 'There is already a tenancy waiting to be confirmed at this home.'
              : 'There is already a tenancy running at this home on that start date.',
          )
        }
        const tenancy: Tenancy = {
          id: newId('tenancy'),
          kind: 'scottish_prt',
          propertyId: property.id,
          landlordId: property.landlordId,
          tenantIds,
          startDate,
          status: 'proposed',
          confirmations: [{ personId: actor.person.id, side: 'landlord', confirmedAt: tx.now }],
          rentPencePerMonth,
          rentDueDay,
          proposedById: actor.person.id,
          proposedAt: tx.now,
        }
        if (input.deposit) {
          const amountPence = requirePence(input.deposit.amountPence, 'deposit', 'the deposit')
          // Scotland caps a deposit at two months' rent.
          if (amountPence > rentPencePerMonth * 2) {
            throw invalid('deposit', "A deposit can't be more than two months' rent.")
          }
          tenancy.deposit = {
            amountPence,
            scheme: requireOneOf(
              input.deposit.scheme,
              DEPOSIT_SCHEMES,
              'deposit',
              'Choose one of the three approved deposit schemes.',
            ),
            lodgedOn: requireDate(
              input.deposit.lodgedOn,
              'deposit',
              'the date the deposit was lodged',
            ),
          }
        }
        tx.put('tenancies', tenancy)
        notify(tx, {
          to: tenantIds,
          role: 'tenant',
          kind: 'tenancy_to_confirm',
          title: `Confirm your tenancy at ${property.addressLine}`,
          body: 'Once you confirm, the tenancy is on the record for both of you.',
          href: hrefs.tenancy('tenant', tenancy.id),
          ref: { entity: 'tenancy', id: tenancy.id },
        })
        return tenancy
      })
    },

    async confirmTenancy(viewer, tenancyId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const tenancy = tx.get('tenancies', tenancyId)
        if (!tenancy) throw notFound('tenancy')
        const side = tenancySide(tx, actor, tenancy)
        if (!side) throw forbidden("That tenancy isn't one of yours.")
        const property = tx.get('properties', tenancy.propertyId)
        if (
          side === 'landlord' &&
          property &&
          !managesProperty(actor, property, 'manage_tenancies')
        ) {
          throw forbidden("The landlord hasn't given you permission to manage tenancies.")
        }
        if (tenancy.status !== 'proposed') {
          throw new SlateError('already_done', 'This tenancy has already been confirmed.')
        }
        const done = tenancy.confirmations.some((c) =>
          side === 'tenant' ? c.personId === actor.person.id : c.side === 'landlord',
        )
        if (done) throw new SlateError('already_done', "You've already confirmed this tenancy.")
        const confirmation: TenancyConfirmation = {
          personId: actor.person.id,
          side,
          confirmedAt: tx.now,
        }
        const confirmations = [...tenancy.confirmations, confirmation]
        const everyone =
          confirmations.some((c) => c.side === 'landlord') &&
          tenancy.tenantIds.every((id) =>
            confirmations.some((c) => c.side === 'tenant' && c.personId === id),
          )
        const next = tx.put('tenancies', {
          ...tenancy,
          confirmations,
          status: everyone ? 'confirmed' : 'proposed',
        })
        if (everyone && property) {
          const others: PersonId[] = [...tenancy.tenantIds]
          notify(tx, {
            to: others,
            role: 'tenant',
            kind: 'tenancy_confirmed',
            title: `Tenancy confirmed: ${property.addressLine}`,
            href: hrefs.tenancy('tenant', tenancy.id),
            ref: { entity: 'tenancy', id: tenancy.id },
            except: actor.person.id,
          })
          notify(tx, {
            to: landlordSide(tx, property),
            role: 'landlord',
            kind: 'tenancy_confirmed',
            title: `Tenancy confirmed: ${property.addressLine}`,
            href: hrefs.tenancy('landlord', tenancy.id),
            ref: { entity: 'tenancy', id: tenancy.id },
            except: actor.person.id,
          })
        }
        return next
      })
    },

    async endTenancy(viewer, tenancyId, rawEndDate) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const tenancy = tx.get('tenancies', tenancyId)
        if (!tenancy) throw notFound('tenancy')
        const side = tenancySide(tx, actor, tenancy)
        if (!side) throw forbidden("That tenancy isn't one of yours.")
        const property = tx.get('properties', tenancy.propertyId)
        if (
          side === 'landlord' &&
          property &&
          !managesProperty(actor, property, 'manage_tenancies')
        ) {
          throw forbidden("The landlord hasn't given you permission to manage tenancies.")
        }
        if (tenancy.status !== 'confirmed') {
          throw invalidState(
            tenancy.status === 'ended'
              ? 'This tenancy has already ended.'
              : 'A tenancy has to be confirmed by both sides before it can end.',
          )
        }
        const endDate = requireDate(rawEndDate, 'endDate', 'the last day of the tenancy')
        if (endDate < tenancy.startDate) {
          throw invalid('endDate', 'The tenancy cannot end before it started.')
        }
        // A date still to come is recorded now and the tenancy ends after that day, when the
        // 28-day rating window opens. A date already past ends it at once.
        if (endDate >= ukDate(tx.now)) return tx.put('tenancies', { ...tenancy, endDate })
        return tx.put('tenancies', { ...tenancy, endDate, status: 'ended', endedAt: tx.now })
      })
    },
  }
}
