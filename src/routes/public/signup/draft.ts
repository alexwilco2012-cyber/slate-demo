// The sign-up answers so far, kept in this tab's sessionStorage so a reload or a slip of the back
// button loses nothing. Cleared once the account exists.

import { useCallback, useRef, useState } from 'react'
import type { ElectricalScheme, GasApplianceCategory, Role, TradeType } from '@/domain/types'
import type { SentLink } from '../auth/use-magic-link'

export const DRAFT_KEY = 'slate-signup-draft'

export type YesNo = 'yes' | 'no'
export type Council = 'Aberdeen City Council' | 'Aberdeenshire Council' | 'other'
export type SchemeAnswer = ElectricalScheme | 'none'
export type Cover = '1m' | '2m' | '5m'

export interface Draft {
  role: Role
  displayName: string
  adult: boolean
  email: string
  postcodeDistrict: string
  /** Tenants: check ID now, or later from the profile. */
  idCheck: 'now' | 'later'
  registrationNumber: string
  council: Council
  otherCouncil: string
  /** Landlords who skipped the registration number for now. */
  registrationLater: boolean
  agent: YesNo | null
  agentEmail: string
  businessName: string
  trades: TradeType[]
  serviceDistricts: string[]
  gasWork: YesNo | null
  gasNumber: string
  gasCategories: GasApplianceCategory[]
  scheme: SchemeAnswer | null
  membershipNumber: string
  checklist: boolean
  insurance: YesNo | null
  cover: Cover
  /** Set once the sign-in link is sent. */
  sent?: SentLink
}

export function emptyDraft(role: Role): Draft {
  return {
    role,
    displayName: '',
    adult: false,
    email: '',
    postcodeDistrict: '',
    idCheck: 'now',
    registrationNumber: '',
    council: 'Aberdeen City Council',
    otherCouncil: '',
    registrationLater: false,
    agent: null,
    agentEmail: '',
    businessName: '',
    trades: [],
    serviceDistricts: [],
    gasWork: null,
    gasNumber: '',
    gasCategories: [],
    scheme: null,
    membershipNumber: '',
    checklist: false,
    insurance: null,
    cover: '2m',
  }
}

function read(role: Role): Draft {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Draft>
      if (parsed.role === role) return { ...emptyDraft(role), ...parsed }
    }
  } catch {
    // Unreadable or blocked: start afresh.
  }
  return emptyDraft(role)
}

function write(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Not saved (private window): the flow still works, it just won't survive a reload.
  }
}

/**
 * The draft for one role; another role's sign-up starts afresh. Read once on mount, so give the
 * component using it `key={role}`.
 */
export function useDraft(role: Role) {
  const [draft, setDraft] = useState<Draft>(() => read(role))
  // The latest answers, saved as they change: a screen may move on in the same moment.
  const latest = useRef(draft)

  const update = useCallback((patch: Partial<Draft>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    write(next)
    setDraft(next)
  }, [])

  const clear = useCallback(() => write(null), [])

  return { draft, update, clear }
}
