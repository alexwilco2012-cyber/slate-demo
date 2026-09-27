// The session for this tab (or this iframe), kept in sessionStorage so a reload keeps you signed
// in, with a subscription for React.

import { parseSession, sameSession, SESSION_KEY, type Session } from './session'

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface SessionStore {
  get(): Session | null
  set(next: Session | null): void
  subscribe(listener: () => void): () => void
}

function read(storage: SessionStorageLike | null, key: string): Session | null {
  try {
    const raw = storage?.getItem(key)
    return raw ? parseSession(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function write(storage: SessionStorageLike | null, key: string, session: Session | null) {
  try {
    if (session) storage?.setItem(key, JSON.stringify(session))
    else storage?.removeItem(key)
  } catch {
    // Storage can be refused (private windows); the session then lasts until the tab reloads.
  }
}

export function createSessionStore(
  storage: SessionStorageLike | null = null,
  key: string = SESSION_KEY,
): SessionStore {
  let current = read(storage, key)
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set(next) {
      if (sameSession(current, next)) return
      current = next
      write(storage, key, next)
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Iframes share their tab's sessionStorage, so each one gets its own key, named after the frame.
 * An unnamed frame is given a name, which survives its reloads.
 */
function keyForThisFrame(): string {
  try {
    if (window.self === window.top) return SESSION_KEY
  } catch {
    // A cross-origin parent: this is a frame.
  }
  if (!window.name) window.name = `slate-frame-${Math.random().toString(36).slice(2, 10)}`
  return `${SESSION_KEY}:${window.name}`
}

function sessionStorageOrNothing(): SessionStorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

let shared: SessionStore | null = null

/** The app's session store, made the first time it's asked for. */
export function getSessionStore(): SessionStore {
  shared ??= createSessionStore(
    sessionStorageOrNothing(),
    typeof window === 'undefined' ? SESSION_KEY : keyForThisFrame(),
  )
  return shared
}
