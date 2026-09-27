// Gas jobs only go to Gas Safe engineers registered for the right appliances, and EICRs only to
// SELECT, NICEIC or NAPIT members or checklist-evidenced electricians (SPEC §6). Only checked
// badges count; a credential someone has claimed but not had checked does not.

import { SlateError } from '@/data/api'
import {
  GAS_APPLIANCE_LABELS,
  type CredentialRequirement,
  type DocumentType,
  type IsoDate,
  type JobCategory,
  type Person,
} from '@/domain/types'
import { BRAND } from '@/config/brand'

function isCurrent(badge: { expiresAt?: IsoDate }, today: IsoDate): boolean {
  return badge.expiresAt === undefined || badge.expiresAt >= today
}

export function meetsCredential(
  trade: Person,
  requirement: CredentialRequirement | undefined,
  today: IsoDate,
): boolean {
  if (!requirement) return true
  if (requirement.kind === 'gas_safe') {
    return trade.badges.some(
      (badge) =>
        badge.kind === 'gas_safe' &&
        isCurrent(badge, today) &&
        badge.applianceCategories.includes(requirement.applianceCategory),
    )
  }
  return trade.badges.some(
    (badge) =>
      (badge.kind === 'electrical_scheme' || badge.kind === 'electrical_checklist') &&
      isCurrent(badge, today),
  )
}

export function describeRequirement(requirement: CredentialRequirement): string {
  if (requirement.kind === 'gas_safe') {
    return `a Gas Safe engineer registered for ${GAS_APPLIANCE_LABELS[requirement.applianceCategory].toLowerCase()}`
  }
  return 'an electrician who is a SELECT, NICEIC or NAPIT member, or has evidenced the competence checklist'
}

export function requireCredential(
  trade: Person,
  requirement: CredentialRequirement | undefined,
  today: IsoDate,
): void {
  if (!requirement || meetsCredential(trade, requirement, today)) return
  throw new SlateError(
    'credential_mismatch',
    `This job needs ${describeRequirement(requirement)}. ${trade.displayName} doesn't have that checked credential on ${BRAND.name}.`,
  )
}

/** The credential a job needs when nobody has said otherwise. */
export function defaultCredential(
  category: JobCategory,
  complianceType: DocumentType | undefined,
): CredentialRequirement | undefined {
  if (complianceType === 'gas_safety') return { kind: 'gas_safe', applianceCategory: 'boilers' }
  if (complianceType === 'eicr') return { kind: 'electrical_certification' }
  if (category === 'gas_appliance') return { kind: 'gas_safe', applianceCategory: 'cookers' }
  return undefined
}
