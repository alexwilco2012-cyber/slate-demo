// Which questions each role is asked, in order, what makes an answer complete, and how the
// answers become a SignUpInput. The checks mirror the data layer's, so mistakes are caught on the
// screen that asked, not after the last one.

import { BRAND } from '@/config/brand'
import type { SignUpInput } from '@/data'
import type { VerificationClaim } from '@/domain/types'
import type { Draft } from './draft'

export type StepId =
  | 'name'
  | 'age'
  | 'email'
  | 'area'
  | 'id'
  | 'registration'
  | 'agent'
  | 'business'
  | 'trades'
  | 'areas'
  | 'gas'
  | 'electrical'
  | 'insurance'
  | 'check'

/** Short names for the progress bar. */
export const STEP_LABELS: Record<StepId, string> = {
  name: 'Your name',
  age: 'Age',
  email: 'Email',
  area: 'Your area',
  id: 'ID check',
  registration: 'Registration',
  agent: 'Letting agent',
  business: 'Business',
  trades: 'Your trade',
  areas: 'Areas you cover',
  gas: 'Gas Safe',
  electrical: 'Electrical scheme',
  insurance: 'Insurance',
  check: 'Check answers',
}

/** Gas engineers must give a Gas Safe number; plumbers are asked whether they work on gas. */
export function asksAboutGas(draft: Pick<Draft, 'trades'>) {
  return draft.trades.includes('gas_engineer') || draft.trades.includes('plumber')
}

export function needsGasSafe(draft: Pick<Draft, 'trades'>) {
  return draft.trades.includes('gas_engineer')
}

export function asksAboutElectrical(draft: Pick<Draft, 'trades'>) {
  return draft.trades.includes('electrician')
}

export function stepsFor(draft: Draft): StepId[] {
  switch (draft.role) {
    case 'tenant':
      return ['name', 'age', 'email', 'area', 'id', 'check']
    case 'landlord':
      return ['name', 'age', 'email', 'area', 'registration', 'agent', 'check']
    case 'trade':
      return [
        'name',
        'age',
        'email',
        'business',
        'trades',
        'areas',
        ...(asksAboutGas(draft) ? (['gas'] as const) : []),
        ...(asksAboutElectrical(draft) ? (['electrical'] as const) : []),
        'insurance',
        'check',
      ]
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DISTRICT = /^[A-Z]{1,2}\d[A-Z\d]?$/
export const REGISTRATION_FORMAT = /^\d{5,7}\/\d{3}\/\d{5}$/
const GAS_SAFE = /^\d{6,7}$/

export type StepErrors = Partial<Record<string, string>>

export function normaliseDistrict(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** What's missing or wrong on one screen, by field. Empty when the screen is complete. */
export function validateStep(step: StepId, draft: Draft): StepErrors {
  const errors: StepErrors = {}
  switch (step) {
    case 'name': {
      const name = draft.displayName.trim()
      if (!name) errors.displayName = 'Enter your name.'
      else if (name.length < 2) errors.displayName = 'Your name needs at least 2 letters.'
      else if (name.length > 60) errors.displayName = 'Keep your name to 60 characters or fewer.'
      break
    }
    case 'age':
      if (!draft.adult) {
        errors.adult = `Tick the box to confirm you’re 18 or over. ${BRAND.name} is only for adults.`
      }
      break
    case 'email':
      if (!draft.email.trim()) errors.email = 'Enter your email address.'
      else if (!EMAIL.test(draft.email.trim())) {
        errors.email = 'Enter an email address like name@example.com.'
      }
      break
    case 'area':
      if (!draft.postcodeDistrict)
        errors.postcodeDistrict = 'Enter the first part of your postcode.'
      else if (!DISTRICT.test(normaliseDistrict(draft.postcodeDistrict))) {
        errors.postcodeDistrict = 'Enter the first part of a postcode, like AB25.'
      }
      break
    case 'registration':
      if (draft.registrationLater) break
      if (!draft.registrationNumber.trim()) {
        errors.registrationNumber = 'Enter your registration number, or choose to add it later.'
      } else if (!REGISTRATION_FORMAT.test(draft.registrationNumber.trim())) {
        errors.registrationNumber =
          'Scottish landlord registration numbers look like 123456/100/12345.'
      }
      if (draft.council === 'other' && !draft.otherCouncil.trim()) {
        errors.otherCouncil = 'Enter the council you registered with.'
      }
      break
    case 'agent':
      if (!draft.agent) errors.agent = 'Choose whether you work with a letting agent.'
      else if (
        draft.agent === 'yes' &&
        draft.agentEmail.trim() &&
        !EMAIL.test(draft.agentEmail.trim())
      ) {
        errors.agentEmail = 'Enter their email like name@example.co.uk, or leave it blank.'
      }
      break
    case 'business': {
      const name = draft.businessName.trim()
      if (!name)
        errors.businessName = 'Enter your business name, or your own if you trade under it.'
      else if (name.length < 2) errors.businessName = 'Your business name needs at least 2 letters.'
      break
    }
    case 'trades':
      if (draft.trades.length === 0) errors.trades = 'Choose at least one trade.'
      break
    case 'areas':
      if (draft.serviceDistricts.length === 0) {
        errors.serviceDistricts = 'Choose at least one area you cover.'
      }
      break
    case 'gas': {
      const doesGas = needsGasSafe(draft) || draft.gasWork === 'yes'
      if (!needsGasSafe(draft) && !draft.gasWork) {
        errors.gasWork = 'Choose whether you work on gas appliances.'
      }
      if (doesGas) {
        if (!GAS_SAFE.test(draft.gasNumber.trim())) {
          errors.gasNumber = 'A Gas Safe registration number is 6 or 7 digits.'
        }
        if (draft.gasCategories.length === 0) {
          errors.gasCategories = 'Choose at least one type of appliance you work on.'
        }
      }
      break
    }
    case 'electrical':
      if (!draft.scheme) errors.scheme = 'Choose your scheme, or that you’re not a member.'
      else if (draft.scheme !== 'none' && !draft.membershipNumber.trim()) {
        errors.membershipNumber = 'Enter your membership number.'
      }
      break
    case 'insurance':
      if (!draft.insurance) errors.insurance = 'Choose yes or not yet.'
      break
    case 'id':
    case 'check':
      break
  }
  return errors
}

/** The first screen with something missing, so a deep link can't skip a question. */
export function firstIncomplete(draft: Draft): StepId | null {
  return (
    stepsFor(draft).find(
      (step) => step !== 'check' && Object.keys(validateStep(step, draft)).length > 0,
    ) ?? null
  )
}

/** Where to send someone to fix a field the data layer rejected. */
export const FIELD_STEPS: Record<string, StepId> = {
  displayName: 'name',
  confirmsAdult: 'age',
  email: 'email',
  postcodeDistrict: 'area',
  registrationNumber: 'registration',
  council: 'registration',
  businessName: 'business',
  trades: 'trades',
  serviceDistricts: 'areas',
  applianceCategories: 'gas',
  scheme: 'electrical',
  membershipNumber: 'electrical',
}

export function claimsFrom(draft: Draft): VerificationClaim[] {
  switch (draft.role) {
    case 'tenant':
      return draft.idCheck === 'now' ? [{ kind: 'id_check' }] : []
    case 'landlord':
      return draft.registrationLater
        ? []
        : [
            {
              kind: 'landlord_registration',
              registrationNumber: draft.registrationNumber.trim(),
              council: draft.council === 'other' ? draft.otherCouncil.trim() : draft.council,
            },
          ]
    case 'trade': {
      const claims: VerificationClaim[] = []
      if (asksAboutGas(draft) && (needsGasSafe(draft) || draft.gasWork === 'yes')) {
        claims.push({
          kind: 'gas_safe',
          registrationNumber: draft.gasNumber.trim(),
          applianceCategories: draft.gasCategories,
        })
      }
      if (asksAboutElectrical(draft) && draft.scheme) {
        if (draft.scheme !== 'none') {
          claims.push({
            kind: 'electrical_scheme',
            scheme: draft.scheme,
            membershipNumber: draft.membershipNumber.trim(),
          })
        } else if (draft.checklist) {
          claims.push({ kind: 'electrical_checklist' })
        }
      }
      return claims
    }
  }
}

export function toSignUpInput(draft: Draft): SignUpInput {
  const trade = draft.role === 'trade'
  return {
    displayName: draft.displayName.trim(),
    email: draft.email.trim(),
    role: draft.role,
    postcodeDistrict: trade
      ? (draft.serviceDistricts[0] ?? '')
      : normaliseDistrict(draft.postcodeDistrict),
    confirmsAdult: true,
    claims: claimsFrom(draft),
    ...(trade
      ? {
          tradeProfile: {
            businessName: draft.businessName.trim(),
            trades: draft.trades,
            serviceDistricts: draft.serviceDistricts,
            vatRegistered: false,
          },
        }
      : {}),
  }
}
