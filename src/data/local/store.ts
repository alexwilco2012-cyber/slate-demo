// The Zustand store behind the local SlateApi. It holds the whole data set plus a revision
// number, saves both to localStorage under 'slate-demo-v1', and can go back to the seed. A saved
// copy that grew from an older seed is dropped, so a new version of the demo opens on its story.
// Screens don't read it directly: they go through SlateApi, so a real backend can replace it.

import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { SCHEMA_VERSION, isSlateData, type SlateData } from './state'
import { STORAGE_KEY } from './storage'

export interface SlateStoreState {
  data: SlateData
  /** Goes up by one with every change, in any tab. Tabs take a copy with a higher revision. */
  revision: number
  /** Fingerprint of the seed this data grew from (see seedFingerprint). */
  seedId: string
  /** Saves data changed in this tab. Returns the new revision. */
  commit(data: SlateData): number
  /** Takes data changed in another tab. */
  adopt(data: SlateData, revision: number): void
  /** Puts every record back to the seed. Returns the new revision. */
  resetToSeed(): number
}

export type SlateStore = StoreApi<SlateStoreState>

interface Persisted {
  data: SlateData
  revision: number
  seedId: string
}

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Persisted>
  return (
    typeof candidate.revision === 'number' &&
    typeof candidate.seedId === 'string' &&
    isSlateData(candidate.data)
  )
}

/**
 * A short fingerprint of the seed (FNV-1a over its JSON). Any edit to the seed changes it, so
 * nobody has to remember to bump a version when the story is rewritten.
 */
export function seedFingerprint(data: SlateData): string {
  const text = JSON.stringify(data)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${(hash >>> 0).toString(36)}-${text.length.toString(36)}`
}

export interface StoreOptions {
  storage: StateStorage
  seed: () => SlateData
}

export function createSlateStore({ storage, seed }: StoreOptions): SlateStore {
  const initial = seed()
  const seedId = seedFingerprint(initial)
  return createStore<SlateStoreState>()(
    persist(
      (set, get) => ({
        data: initial,
        revision: 0,
        seedId,
        commit(data) {
          const revision = get().revision + 1
          set({ data, revision })
          return revision
        },
        adopt(data, revision) {
          set({ data, revision })
        },
        resetToSeed() {
          const revision = get().revision + 1
          set({ data: seed(), revision })
          return revision
        },
      }),
      {
        name: STORAGE_KEY,
        version: SCHEMA_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: (state): Persisted => ({
          data: state.data,
          revision: state.revision,
          seedId: state.seedId,
        }),
        // A copy saved by an older version of the demo, or from an older seed, is replaced.
        migrate: (): Persisted => ({ data: seed(), revision: 0, seedId }),
        merge: (persisted, current) =>
          isPersisted(persisted) && persisted.seedId === seedId
            ? { ...current, data: persisted.data, revision: persisted.revision }
            : current,
      },
    ),
  )
}

/**
 * Reads the saved copy straight from storage, e.g. when another tab has changed it. Pass the
 * seed's fingerprint to ignore a copy that grew from a different seed.
 */
export function readPersisted(raw: string | null, seedId?: string): Persisted | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const state = (parsed as { state?: unknown; version?: unknown } | null)?.state
    const version = (parsed as { version?: unknown } | null)?.version
    if (version !== SCHEMA_VERSION || !isPersisted(state)) return null
    return seedId === undefined || state.seedId === seedId ? state : null
  } catch {
    return null
  }
}
