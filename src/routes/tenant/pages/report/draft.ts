// The report in progress. Saved to this tab's session storage as it's filled in, so a reload or a
// quick look at another screen never loses the tenant's answers; cleared once it's sent.

import { useCallback, useEffect, useState } from 'react'
import type { AccessWindow, PersonId, PropertyId, Room, Urgency } from '@/domain/types'

export const STEPS = ['room', 'problem', 'photos', 'urgency', 'access', 'check'] as const
export type Step = (typeof STEPS)[number]

export const STEP_NAMES: Record<Step, string> = {
  room: 'Room',
  problem: 'Problem',
  photos: 'Photos',
  urgency: 'Urgency',
  access: 'Access',
  check: 'Check answers',
}

export interface DraftPhoto {
  id: string
  url: string
  alt: string
  name: string
}

export interface ReportDraft {
  propertyId?: PropertyId
  room?: Room
  problemId?: string
  description: string
  photos: DraftPhoto[]
  urgency?: Urgency
  windows: AccessWindow[]
  keyAllowed: boolean
  notes: string
}

export const EMPTY_DRAFT: ReportDraft = {
  description: '',
  photos: [],
  windows: [],
  keyAllowed: false,
  notes: '',
}

export const DESCRIPTION_MIN = 10

/** The first step that still needs an answer, so a deep link can't skip ahead. */
export function firstIncomplete(draft: ReportDraft): Step {
  if (!draft.room) return 'room'
  if (!draft.problemId || draft.description.trim().length < DESCRIPTION_MIN) return 'problem'
  if (!draft.urgency) return 'urgency'
  if (draft.urgency !== 'emergency' && draft.windows.length === 0) return 'access'
  return 'check'
}

export function stepIndex(step: Step): number {
  return STEPS.indexOf(step)
}

function keyFor(personId: PersonId) {
  return `slate-report-draft:${personId}`
}

function read(personId: PersonId): ReportDraft {
  try {
    const raw = window.sessionStorage.getItem(keyFor(personId))
    if (!raw) return EMPTY_DRAFT
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<ReportDraft>) }
  } catch {
    return EMPTY_DRAFT
  }
}

function write(personId: PersonId, draft: ReportDraft) {
  try {
    window.sessionStorage.setItem(keyFor(personId), JSON.stringify(draft))
  } catch {
    // Storage full or blocked (private windows): photos are the likely cause, so keep the rest.
    try {
      window.sessionStorage.setItem(keyFor(personId), JSON.stringify({ ...draft, photos: [] }))
    } catch {
      // Nothing more to do: the draft still lives in memory for this visit.
    }
  }
}

export function clearDraft(personId: PersonId) {
  try {
    window.sessionStorage.removeItem(keyFor(personId))
  } catch {
    // Ignored: nothing was saved.
  }
}

/** The draft and a way to change it; every change is saved straight away. */
export function useReportDraft(personId: PersonId) {
  const [draft, setDraft] = useState<ReportDraft>(() => read(personId))

  useEffect(() => {
    write(personId, draft)
  }, [personId, draft])

  const update = useCallback((patch: Partial<ReportDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => {
    clearDraft(personId)
    setDraft(EMPTY_DRAFT)
  }, [personId])

  return { draft, update, setDraft, reset }
}
