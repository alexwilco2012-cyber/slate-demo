// localStorage can be missing or can throw: private windows, blocked site data, a full quota.
// Every call goes through here so the demo keeps working, just without saving, when it does.

import type { StateStorage } from 'zustand/middleware'

export const STORAGE_KEY = 'slate-demo-v1'

/** The browser's localStorage if it can be used, otherwise null. */
function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = '__slate_probe__'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
}

/** Wraps any storage so reads return null and writes are skipped when it throws. */
export function safeStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): StateStorage {
  return {
    getItem(name) {
      try {
        return storage?.getItem(name) ?? null
      } catch {
        return null
      }
    },
    setItem(name, value) {
      try {
        storage?.setItem(name, value)
      } catch {
        // Full or blocked: keep going in memory. Other tabs still hear about it over the channel.
      }
    },
    removeItem(name) {
      try {
        storage?.removeItem(name)
      } catch {
        // Nothing to do.
      }
    },
  }
}

export function localStorageOrNothing(): StateStorage {
  return safeStorage(browserStorage())
}

/** An in-memory storage, for tests and for when nothing may be saved. */
export function memoryStorage(): StateStorage & { dump(): Record<string, string> } {
  const items = new Map<string, string>()
  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => void items.set(name, value),
    removeItem: (name) => void items.delete(name),
    dump: () => Object.fromEntries(items),
  }
}
