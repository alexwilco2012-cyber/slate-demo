// Sign-in and sign-up. There is never a password: a simulated magic link stands in for the email
// a real backend would send, and the demo's on-screen inbox opens it.

import { SlateError, type MagicLinkSent, type SignUpInput, type SlateApi } from '@/data/api'
import { PERSONAS } from '@/data/seed'
import { newId } from '@/domain/ids'
import {
  ELECTRICAL_SCHEMES,
  GAS_APPLIANCE_CATEGORIES,
  ROLES,
  TRADE_TYPES,
  type Person,
  type TradeProfile,
  type VerificationClaim,
} from '@/domain/types'
import { addHours, isBefore } from '../dates'
import { randomToken } from '../random'
import type { MagicLink } from '../state'
import type { Reader } from '../tx'
import {
  invalid,
  optionalText,
  requireDistrict,
  requireEmail,
  requireOneOf,
  requireText,
} from '../validate'
import type { LocalContext } from './context'
import { BRAND } from '@/config/brand'

/** How long a magic link works for. */
const LINK_MINUTES = 15

export function findByEmail(db: Reader, email: string): Person | undefined {
  const wanted = email.trim().toLowerCase()
  return db.rows('people').find((p) => p.contact.email.toLowerCase() === wanted)
}

/** Checks a credential someone says they hold, before it goes off to be checked. */
export function validateClaim(claim: VerificationClaim, db: Reader): VerificationClaim {
  switch (claim.kind) {
    case 'id_check':
    case 'electrical_checklist':
      return { kind: claim.kind }
    case 'landlord_registration': {
      const registrationNumber = requireText(claim.registrationNumber, {
        field: 'registrationNumber',
        label: 'your landlord registration number',
        max: 30,
      })
      if (!/^\d{5,7}\/\d{3}\/\d{5}$/.test(registrationNumber)) {
        throw invalid(
          'registrationNumber',
          'Scottish landlord registration numbers look like 123456/100/12345.',
        )
      }
      const council = requireText(claim.council, {
        field: 'council',
        label: 'the council',
        max: 80,
      })
      return { kind: 'landlord_registration', registrationNumber, council }
    }
    case 'gas_safe': {
      const registrationNumber = requireText(claim.registrationNumber, {
        field: 'registrationNumber',
        label: 'your Gas Safe number',
        max: 10,
      })
      if (!/^\d{6,7}$/.test(registrationNumber)) {
        throw invalid('registrationNumber', 'A Gas Safe registration number is 6 or 7 digits.')
      }
      const categories = Array.isArray(claim.applianceCategories) ? claim.applianceCategories : []
      const applianceCategories = categories.filter((c) => GAS_APPLIANCE_CATEGORIES.includes(c))
      if (applianceCategories.length === 0) {
        throw invalid('applianceCategories', 'Choose at least one type of appliance you work on.')
      }
      return { kind: 'gas_safe', registrationNumber, applianceCategories }
    }
    case 'electrical_scheme': {
      const scheme = requireOneOf(
        claim.scheme,
        ELECTRICAL_SCHEMES,
        'scheme',
        'Choose SELECT, NICEIC or NAPIT.',
      )
      const membershipNumber = requireText(claim.membershipNumber, {
        field: 'membershipNumber',
        label: 'your membership number',
        max: 20,
      })
      return { kind: 'electrical_scheme', scheme, membershipNumber }
    }
    case 'agent_team': {
      if (!db.get('agencies', claim.agencyId)) {
        throw invalid('agencyId', "We couldn't find that letting agency.")
      }
      return { kind: 'agent_team', agencyId: claim.agencyId }
    }
  }
}

export function validateTradeProfile(profile: TradeProfile | undefined): TradeProfile {
  if (!profile) throw invalid('tradeProfile', 'Tell us about your business.')
  const businessName = requireText(profile.businessName, {
    field: 'businessName',
    label: 'your business name',
    min: 2,
    max: 80,
  })
  const trades = (Array.isArray(profile.trades) ? profile.trades : []).filter((t) =>
    TRADE_TYPES.includes(t),
  )
  if (trades.length === 0) throw invalid('trades', 'Choose at least one trade.')
  const districts = Array.isArray(profile.serviceDistricts) ? profile.serviceDistricts : []
  const serviceDistricts = districts.map((district) =>
    requireDistrict(district, 'serviceDistricts'),
  )
  if (serviceDistricts.length === 0) {
    throw invalid('serviceDistricts', 'Add at least one postcode area you cover, like AB10.')
  }
  const about = optionalText(profile.about, {
    field: 'about',
    label: 'the description of your business',
    max: 500,
  })
  return {
    businessName,
    trades: [...new Set(trades)],
    serviceDistricts: [...new Set(serviceDistricts)],
    ...(about ? { about } : {}),
    vatRegistered: profile.vatRegistered === true,
  }
}

type AuthMethods =
  | 'listPersonas'
  | 'signInAsPersona'
  | 'requestMagicLink'
  | 'completeMagicLink'
  | 'signUp'
  | 'signOut'

export function authApi(ctx: LocalContext): Pick<SlateApi, AuthMethods> {
  const sendLink = (email: string, personId: Person['id'] | null, signUp?: SignUpInput) =>
    ctx.write((tx): MagicLinkSent => {
      const link: MagicLink = {
        token: randomToken(24),
        email,
        personId,
        createdAt: tx.now,
        expiresAt: addHours(tx.now, LINK_MINUTES / 60),
        ...(signUp ? { signUp } : {}),
      }
      tx.putMagicLink(link)
      return { sentTo: email, expiresAt: link.expiresAt, demoToken: link.token }
    })

  return {
    async listPersonas() {
      const db = ctx.read()
      return PERSONAS.filter((persona) => db.get('people', persona.personId))
    },

    async signInAsPersona(personId) {
      const person = ctx.read().get('people', personId)
      if (!person) throw new SlateError('not_found', "We couldn't find that person.")
      return person
    },

    async requestMagicLink(rawEmail) {
      const email = requireEmail(rawEmail)
      // The same answer whether or not there's an account, so the form never reveals who's here.
      return sendLink(email, findByEmail(ctx.read(), email)?.id ?? null)
    },

    async completeMagicLink(token) {
      return ctx.write((tx) => {
        const link = tx.magicLink(token)
        if (!link || link.usedAt || !isBefore(tx.now, link.expiresAt)) {
          throw new SlateError(
            'link_expired',
            'That link has expired or has already been used. Ask for a new one.',
          )
        }
        tx.putMagicLink({ ...link, usedAt: tx.now })
        const existing = findByEmail(tx, link.email)
        if (existing) return existing
        if (!link.signUp) {
          throw new SlateError(
            'not_found',
            `There's no ${BRAND.name} account for that email yet. Sign up instead; it takes a minute.`,
          )
        }
        const input = link.signUp
        const person: Person = {
          id: newId('person'),
          displayName: input.displayName,
          roles: [input.role],
          avatarSeed: input.displayName,
          postcodeDistrict: input.postcodeDistrict,
          badges: [],
          joinedAt: tx.now,
          contact: { email: link.email },
          adultConfirmedAt: tx.now,
          pendingVerifications: input.claims.map((claim) => ({ claim, submittedAt: tx.now })),
          savedTradeIds: [],
          ...(input.tradeProfile ? { tradeProfile: input.tradeProfile } : {}),
        }
        tx.put('people', person)
        return person
      })
    },

    async signUp(input) {
      const db = ctx.read()
      const displayName = requireText(input.displayName, {
        field: 'displayName',
        label: 'your name',
        min: 2,
        max: 60,
      })
      const email = requireEmail(input.email)
      if (findByEmail(db, email)) {
        throw invalid('email', 'There is already an account with this email. Sign in instead.')
      }
      const role = requireOneOf(
        input.role,
        ROLES,
        'role',
        'Choose whether you rent, let or work as a trade.',
      )
      const postcodeDistrict = requireDistrict(input.postcodeDistrict)
      if (input.confirmsAdult !== true) {
        throw invalid('confirmsAdult', `${BRAND.name} is for people aged 18 and over.`)
      }
      const claims = (Array.isArray(input.claims) ? input.claims : []).map((claim) =>
        validateClaim(claim, db),
      )
      const tradeOnly = claims.some(
        (c) =>
          c.kind === 'gas_safe' ||
          c.kind === 'electrical_scheme' ||
          c.kind === 'electrical_checklist',
      )
      if (tradeOnly && role !== 'trade') {
        throw invalid('claims', 'Trade credentials can only be added to a trade account.')
      }
      if (claims.some((c) => c.kind === 'landlord_registration') && role !== 'landlord') {
        throw invalid('claims', 'Landlord registration can only be added to a landlord account.')
      }
      const tradeProfile = role === 'trade' ? validateTradeProfile(input.tradeProfile) : undefined
      const checked: SignUpInput = {
        displayName,
        email,
        role,
        postcodeDistrict,
        confirmsAdult: true,
        claims,
        ...(tradeProfile ? { tradeProfile } : {}),
      }
      return sendLink(email, null, checked)
    },

    async signOut() {
      // Who is signed in lives with each portal on screen in the demo; there is nothing to clear.
    },
  }
}
