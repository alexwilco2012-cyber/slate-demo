// People, credentials, trades directory, quick-quote lines and letting-agent teams.

import { SlateError, type SlateApi, type TradeListing } from '@/data/api'
import { newId } from '@/domain/ids'
import {
  LINE_ITEM_KINDS,
  ROLES,
  TEAM_PERMISSIONS,
  type Person,
  type PersonId,
  type SavedLineItem,
  type TeamMembership,
} from '@/domain/types'
import {
  forbidden,
  hasPermission,
  invalidState,
  notFound,
  requireManagedProperty,
  requireRole,
  resolveViewer,
  type Actor,
} from '../access'
import { meetsCredential } from '../credentials'
import { ukDate } from '../dates'
import { hrefs } from '../hrefs'
import { notify } from '../notify'
import { tradeScore } from '../scores'
import type { Draft, Reader } from '../tx'
import { invalid, requireDistrict, requireEmail, requireOneOf, requireText } from '../validate'
import { personCard, teamMember } from '../views'
import { findByEmail, validateClaim, validateTradeProfile } from './auth'
import type { LocalContext } from './context'
import { BRAND } from '@/config/brand'

type PeopleMethods =
  | 'getMe'
  | 'updateMe'
  | 'addRole'
  | 'requestVerification'
  | 'getPerson'
  | 'getPeople'
  | 'searchTrades'
  | 'listSavedTrades'
  | 'setTradeSaved'
  | 'listSavedLineItems'
  | 'saveLineItem'
  | 'deleteSavedLineItem'
  | 'listTeam'
  | 'inviteAgent'
  | 'acceptTeamInvite'
  | 'declineTeamInvite'
  | 'endTeamMembership'

/** Takes an agent off every one of the landlord's homes, when their membership stops. */
function unassign(tx: Draft, membership: TeamMembership): void {
  for (const property of tx.rows('properties')) {
    if (
      property.landlordId === membership.landlordId &&
      property.agentIds.includes(membership.agentId)
    ) {
      tx.put('properties', {
        ...property,
        agentIds: property.agentIds.filter((id) => id !== membership.agentId),
      })
    }
  }
}

/** The invitation the viewer is answering. Only the invited agent can, and only once. */
function requireInvite(tx: Draft, actor: Actor, membershipId: string): TeamMembership {
  requireRole(actor, 'landlord')
  const membership = tx.get('memberships', membershipId)
  if (!membership) throw notFound('invitation')
  if (membership.agentId !== actor.person.id) throw forbidden("That invitation isn't for you.")
  if (membership.status === 'active' || membership.status === 'declined') {
    throw new SlateError('already_done', "You've already answered this invitation.")
  }
  if (membership.status !== 'invited') {
    throw invalidState('The landlord has withdrawn this invitation.')
  }
  return membership
}

function listing(db: Reader, trade: Person, savedIds: readonly PersonId[]): TradeListing {
  return {
    trade: personCard(trade),
    score: tradeScore(db, trade.id),
    saved: savedIds.includes(trade.id),
  }
}

function tradesInDirectory(db: Reader): Person[] {
  return db.rows('people').filter((p) => p.roles.includes('trade') && p.tradeProfile !== undefined)
}

/** A–Z by business name: the directory never ranks or recommends. */
function neutralOrder(a: Person, b: Person): number {
  const nameA = a.tradeProfile?.businessName ?? a.displayName
  const nameB = b.tradeProfile?.businessName ?? b.displayName
  return nameA.localeCompare(nameB, 'en-GB')
}

function savedTradeIds(db: Reader, actor: Actor): readonly PersonId[] {
  if (actor.role !== 'landlord') return []
  return db.get('people', actor.actingAs)?.savedTradeIds ?? []
}

export function peopleApi(ctx: LocalContext): Pick<SlateApi, PeopleMethods> {
  return {
    async getMe(viewer) {
      return resolveViewer(ctx.read(), viewer).person
    },

    async updateMe(viewer, patch) {
      return ctx.write((tx) => {
        const { person } = resolveViewer(tx, viewer)
        const next: Person = { ...person }
        if (patch.displayName !== undefined) {
          next.displayName = requireText(patch.displayName, {
            field: 'displayName',
            label: 'your name',
            min: 2,
            max: 60,
          })
        }
        if (patch.postcodeDistrict !== undefined) {
          next.postcodeDistrict = requireDistrict(patch.postcodeDistrict)
        }
        if (patch.avatarSeed !== undefined) {
          next.avatarSeed = requireText(patch.avatarSeed, {
            field: 'avatarSeed',
            label: 'an avatar',
            max: 60,
          })
        }
        if (patch.tradeProfile !== undefined) {
          if (!person.roles.includes('trade')) {
            throw invalid('tradeProfile', 'Only trade accounts have a business profile.')
          }
          next.tradeProfile = validateTradeProfile(patch.tradeProfile)
        }
        return tx.put('people', next)
      })
    },

    async addRole(viewer, role) {
      return ctx.write((tx) => {
        const { person } = resolveViewer(tx, viewer)
        const wanted = requireOneOf(role, ROLES, 'role', 'Choose tenant, landlord or trade.')
        if (person.roles.includes(wanted)) return person
        if (wanted === 'trade' && !person.tradeProfile) {
          throw invalid(
            'tradeProfile',
            'Add your business details first, then switch on the trade portal.',
          )
        }
        return tx.put('people', { ...person, roles: [...person.roles, wanted] })
      })
    },

    async requestVerification(viewer, rawClaim) {
      return ctx.write((tx) => {
        const { person } = resolveViewer(tx, viewer)
        const claim = validateClaim(rawClaim, tx)
        const tradeClaim =
          claim.kind === 'gas_safe' ||
          claim.kind === 'electrical_scheme' ||
          claim.kind === 'electrical_checklist'
        if (tradeClaim && !person.roles.includes('trade')) {
          throw forbidden('Trade credentials can only be added to a trade account.')
        }
        if (
          (claim.kind === 'landlord_registration' || claim.kind === 'agent_team') &&
          !person.roles.includes('landlord')
        ) {
          throw forbidden('That credential belongs to the landlord portal.')
        }
        if (person.pendingVerifications.some((p) => p.claim.kind === claim.kind)) {
          throw new SlateError(
            'already_done',
            "We're already checking that one. It takes about a day.",
          )
        }
        const today = ukDate(tx.now)
        const current = person.badges.some(
          (b) => b.kind === claim.kind && (b.expiresAt === undefined || b.expiresAt >= today),
        )
        if (claim.kind === 'id_check' && current) {
          throw new SlateError('already_done', 'Your ID has already been checked.')
        }
        const pending = { claim, submittedAt: tx.now }
        tx.put('people', {
          ...person,
          pendingVerifications: [...person.pendingVerifications, pending],
        })
        return pending
      })
    },

    async getPerson(viewer, personId) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      const person = db.get('people', personId)
      return person ? personCard(person) : null
    },

    async getPeople(viewer, personIds) {
      const db = ctx.read()
      resolveViewer(db, viewer)
      return [...new Set(personIds)].flatMap((id) => {
        const person = db.get('people', id)
        return person ? [personCard(person)] : []
      })
    },

    async searchTrades(viewer, search) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const today = ukDate(db.now)
      const job = search.forJobId ? db.get('jobs', search.forJobId) : undefined
      if (search.forJobId && !job) throw notFound('job')
      if (job) requireManagedProperty(db, actor, job.propertyId)
      const text = search.text?.trim().toLowerCase()
      const saved = savedTradeIds(db, actor)
      return tradesInDirectory(db)
        .filter((trade) => !search.trade || trade.tradeProfile?.trades.includes(search.trade))
        .filter(
          (trade) =>
            !search.district || trade.tradeProfile?.serviceDistricts.includes(search.district),
        )
        .filter((trade) => !job || meetsCredential(trade, job.credentialNeeded, today))
        .filter((trade) => {
          if (!text) return true
          const profile = trade.tradeProfile
          return [trade.displayName, profile?.businessName, profile?.about]
            .filter((value): value is string => value !== undefined)
            .some((value) => value.toLowerCase().includes(text))
        })
        .sort(neutralOrder)
        .map((trade) => listing(db, trade, saved))
    },

    async listSavedTrades(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'landlord')
      const saved = savedTradeIds(db, actor)
      return saved
        .flatMap((id) => {
          const trade = db.get('people', id)
          return trade ? [trade] : []
        })
        .sort(neutralOrder)
        .map((trade) => listing(db, trade, saved))
    },

    async setTradeSaved(viewer, tradeId, saved) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'landlord')
        if (!hasPermission(actor, 'instruct_trades')) {
          throw forbidden("The landlord hasn't given you permission to manage their trades.")
        }
        const trade = tx.get('people', tradeId)
        if (!trade || !trade.roles.includes('trade')) throw notFound('trade')
        const landlord = tx.get('people', actor.actingAs)
        if (!landlord) throw notFound('landlord')
        const without = landlord.savedTradeIds.filter((id) => id !== tradeId)
        const savedTradeIds = saved ? [...without, tradeId] : without
        tx.put('people', { ...landlord, savedTradeIds })
      })
    },

    async listSavedLineItems(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'trade')
      return db
        .rows('lineItems')
        .filter((item) => item.tradeId === actor.person.id)
        .sort((a, b) => a.description.localeCompare(b.description, 'en-GB'))
    },

    async saveLineItem(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'trade')
        const unitPence = input.unitPence
        if (!Number.isInteger(unitPence) || unitPence < 0 || unitPence > 10_000_000) {
          throw invalid('unitPence', 'Enter the price in whole pence.')
        }
        const item: SavedLineItem = {
          id: newId('lineitem'),
          tradeId: actor.person.id,
          description: requireText(input.description, {
            field: 'description',
            label: 'a description',
            max: 120,
          }),
          kind: requireOneOf(
            input.kind,
            LINE_ITEM_KINDS,
            'kind',
            'Choose what kind of line this is.',
          ),
          unit: requireOneOf(input.unit, ['each', 'hour', 'metre'], 'unit', 'Choose a unit.'),
          unitPence,
        }
        return tx.put('lineItems', item)
      })
    },

    async deleteSavedLineItem(viewer, itemId) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'trade')
        const item = tx.get('lineItems', itemId)
        if (!item) throw notFound('saved line')
        if (item.tradeId !== actor.person.id) throw forbidden()
        tx.remove('lineItems', itemId)
      })
    },

    async listTeam(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'landlord')
      const me = actor.person.id
      return db
        .rows('memberships')
        .filter((m) => m.landlordId === actor.actingAs || m.agentId === me)
        .sort((a, b) => a.invitedAt.localeCompare(b.invitedAt))
        .flatMap((m) => {
          const member = teamMember(db, m)
          return member ? [member] : []
        })
    },

    async inviteAgent(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'landlord')
        if (actor.membership) throw forbidden('Only the landlord can add people to their team.')
        const agency = tx.get('agencies', input.agencyId)
        if (!agency) throw invalid('agencyId', "We couldn't find that letting agency.")
        const email = requireEmail(input.email)
        const agent = findByEmail(tx, email)
        if (!agent) {
          throw invalid(
            'email',
            `There's no ${BRAND.name} account with that email yet. Ask them to sign up first.`,
          )
        }
        if (agent.id === actor.person.id) throw invalid('email', "You can't invite yourself.")
        if (!agent.roles.includes('landlord')) {
          throw invalid(
            'email',
            'Letting agents work in the landlord portal. Ask them to switch it on first.',
          )
        }
        const permissions = [...new Set(input.permissions)].filter((p) =>
          TEAM_PERMISSIONS.includes(p),
        )
        if (permissions.length === 0) {
          throw invalid('permissions', 'Choose at least one thing they can do.')
        }
        const existing = tx
          .rows('memberships')
          .find(
            (m) =>
              m.agentId === agent.id &&
              m.landlordId === actor.person.id &&
              (m.status === 'invited' || m.status === 'active'),
          )
        if (existing) {
          throw new SlateError('already_done', `${agent.displayName} is already on your team.`)
        }
        for (const propertyId of input.propertyIds) {
          const property = requireManagedProperty(tx, actor, propertyId)
          if (!property.agentIds.includes(agent.id)) {
            tx.put('properties', { ...property, agentIds: [...property.agentIds, agent.id] })
          }
        }
        const membership: TeamMembership = {
          id: newId('membership'),
          agencyId: agency.id,
          agentId: agent.id,
          landlordId: actor.person.id,
          permissions,
          status: 'invited',
          invitedAt: tx.now,
        }
        tx.put('memberships', membership)
        notify(tx, {
          to: [agent.id],
          role: 'landlord',
          kind: 'team_invite',
          title: `${actor.person.displayName} has invited you to their team`,
          body: `As ${agency.name}, working on ${input.propertyIds.length} of their homes.`,
          href: hrefs.team(),
          ref: { entity: 'membership', id: membership.id },
        })
        return membership
      })
    },

    async acceptTeamInvite(viewer, membershipId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const membership = requireInvite(tx, actor, membershipId)
        const agency = tx.get('agencies', membership.agencyId)
        const accepted = tx.put('memberships', {
          ...membership,
          status: 'active',
          acceptedAt: tx.now,
        })
        notify(tx, {
          to: [membership.landlordId],
          role: 'landlord',
          kind: 'team_invite',
          title: `${actor.person.displayName} joined your team`,
          body: `They can now work on your homes for ${agency?.name ?? 'their agency'}, with the permissions you chose.`,
          href: hrefs.team(),
          ref: { entity: 'membership', id: membership.id },
        })
        return accepted
      })
    },

    async declineTeamInvite(viewer, membershipId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const membership = requireInvite(tx, actor, membershipId)
        unassign(tx, membership)
        const declined = tx.put('memberships', {
          ...membership,
          status: 'declined',
          declinedAt: tx.now,
        })
        notify(tx, {
          to: [membership.landlordId],
          role: 'landlord',
          kind: 'team_invite',
          title: `${actor.person.displayName} declined your invitation`,
          body: "They haven't joined your team. You can invite them again, or someone else.",
          href: hrefs.team(),
          ref: { entity: 'membership', id: membership.id },
        })
        return declined
      })
    },

    async endTeamMembership(viewer, membershipId) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'landlord')
        const membership = tx.get('memberships', membershipId)
        if (!membership) throw notFound('team membership')
        const isLandlord = !actor.membership && membership.landlordId === actor.person.id
        const isAgent = membership.agentId === actor.person.id
        if (!isLandlord && !isAgent) throw forbidden()
        if (membership.status === 'ended' || membership.status === 'declined') return membership
        unassign(tx, membership)
        return tx.put('memberships', { ...membership, status: 'ended', endedAt: tx.now })
      })
    },
  }
}
