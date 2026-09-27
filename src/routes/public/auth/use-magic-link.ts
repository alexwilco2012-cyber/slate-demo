import { useState } from 'react'
import { SlateError, useSlate, type MagicLinkSent } from '@/data'
import type { Person } from '@/domain/types'

/** A sent link, and the demo moment it was sent. */
export interface SentLink {
  sent: MagicLinkSent
  sentAt: string
}

/** Turns anything thrown by the data layer into words for the screen. */
export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong on our side. Try again.'
}

/** Field-by-field messages from a validation error, or none. */
export function fieldErrorsOf(error: unknown): Partial<Record<string, string>> {
  return error instanceof SlateError ? error.fields : {}
}

/**
 * Opening a magic link from the demo inbox. Resolves with the person, or keeps the reason it
 * failed (expired, already used, no account) for the screen to show.
 */
export function useOpenMagicLink() {
  const { api } = useSlate()
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(token: string | undefined): Promise<Person | null> {
    if (!token) {
      setError('That link can’t be opened here. Ask for a new one.')
      return null
    }
    setOpening(true)
    setError(null)
    try {
      return await api.completeMagicLink(token)
    } catch (caught) {
      setError(messageOf(caught))
      return null
    } finally {
      setOpening(false)
    }
  }

  return { open, opening, error, clearError: () => setError(null) }
}
