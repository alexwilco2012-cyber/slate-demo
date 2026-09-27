// Ratings from the tenant's side: where each one is written, what it's called, and how its seal
// works, in plain words.

import type { RatingTask } from '@/data/api'
import { RATING_RULES } from '@/domain/criteria'
import type { ContextRef, RatingDirection, SealRule } from '@/domain/types'
import { firstName } from './format'

/** The directions a tenant writes. */
export type TenantDirection = Extract<RatingDirection, 'tenant->landlord' | 'tenant->trade'>

/** Where the form for a rating lives. */
export function ratePath(direction: RatingDirection, context: ContextRef): string {
  if (context.kind === 'tenancy') return `/tenant/tenancies/${context.tenancyId}/rate`
  const who = direction === 'tenant->trade' ? 'trade' : 'landlord'
  return `/tenant/jobs/${context.jobId}/rate/${who}`
}

export function sealOf(direction: RatingDirection, context: ContextRef): SealRule {
  return direction === 'tenant->landlord' && context.kind === 'job'
    ? 'retaliation_shield'
    : 'double_blind'
}

/** "Rate Mhairi’s visit", "How did Graham handle it?", "Rate your time with Irene". */
export function taskTitle(task: Pick<RatingTask, 'direction' | 'context'>, subjectName: string) {
  const name = firstName(subjectName)
  if (task.context.kind === 'tenancy') return `Rate ${name} as your landlord`
  if (task.direction === 'tenant->trade') return `Rate ${name}’s visit`
  return `How did ${name} handle the repair?`
}

/** One line on how the seal works for this rating. */
export function sealLine(
  task: Pick<RatingTask, 'direction' | 'context' | 'counterpartHasRated'>,
  subjectName: string,
): string {
  const name = firstName(subjectName)
  if (sealOf(task.direction, task.context) === 'retaliation_shield') {
    return `Sealed. ${name} never sees it on its own. It only counts inside their overall score.`
  }
  if (task.counterpartHasRated) return 'Leave yours to see what they said about you.'
  return 'We reveal both ratings together once you’ve both rated, or when the window closes.'
}

/** The full explanation of the retaliation shield, for the per-repair landlord rating. */
export function shieldExplanation(landlordName: string): string {
  const name = firstName(landlordName)
  return `${name} will never see this rating on its own. It stays sealed until your tenancy ends or ${RATING_RULES.shieldReleaseTenantRaters} different tenants have rated ${name}. Even then, it only counts inside their overall score, mixed in with other tenants’ ratings.`
}

export function doubleBlindExplanation(subjectName: string, closesOn: string): string {
  const name = firstName(subjectName)
  return `${name} won’t see your answers until they’ve rated you too, or the window closes on ${closesOn}. Then we reveal both together, so neither of you can react to the other.`
}
