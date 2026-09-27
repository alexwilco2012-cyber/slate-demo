// Shared set-up for the data-layer tests: a fresh local store with nothing saved and no other
// tabs, and the cast's viewers.

import type { Viewer } from '@/data/api'
import { createLocalSlate, memoryStorage, type LocalSlateOptions } from '@/data/local'

export const sarah: Viewer = { personId: 'person_sarah', role: 'tenant' }
export const graham: Viewer = { personId: 'person_graham', role: 'landlord' }
export const aileen: Viewer = {
  personId: 'person_aileen',
  role: 'landlord',
  actingForId: 'person_graham',
}
export const kev: Viewer = { personId: 'person_kev', role: 'trade' }
export const mhairi: Viewer = { personId: 'person_mhairi', role: 'trade' }
export const derek: Viewer = { personId: 'person_derek', role: 'landlord' }
export const liam: Viewer = { personId: 'person_liam', role: 'tenant' }
export const callum: Viewer = { personId: 'person_callum', role: 'tenant' }
export const kirsty: Viewer = { personId: 'person_kirsty', role: 'tenant' }

export function freshSlate(options: LocalSlateOptions = {}) {
  return createLocalSlate({ storage: memoryStorage(), channel: null, ...options })
}

/** Resolves to the SlateError code a call rejects with, or 'resolved' if it doesn't. */
export async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
    return 'resolved'
  } catch (error) {
    return (error as { code?: string }).code ?? String(error)
  }
}
