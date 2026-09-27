// Puts the local data layer together: the store, the demo clock, cross-tab sync, and SlateApi on
// top. createLocalSlate() makes a fresh one (tests make many); getLocalSlate() is the app's.

import type { ClockJump, DataChange, DemoControls, SlateApi, Unsubscribe } from '@/data/api'
import { createSeedData } from '@/data/seed'
import { contextKey, nextShieldBatchAt } from '@/domain/rating'
import type { ContextRef, IsoDateTime } from '@/domain/types'
import type { StateStorage } from 'zustand/middleware'
import { authApi } from './api/auth'
import type { LocalContext } from './api/context'
import { documentsApi } from './api/documents'
import { homeApi } from './api/home'
import { jobsApi } from './api/jobs'
import { messagesApi } from './api/messages'
import { passportApi } from './api/passport'
import { peopleApi } from './api/people'
import { profilesApi } from './api/profiles'
import { propertiesApi } from './api/properties'
import { quotesApi } from './api/quotes'
import { ratingsApi } from './api/ratings'
import { reportsApi } from './api/reports'
import { visitsApi } from './api/visits'
import { addDays, fromMs, toMs } from './dates'
import { allReleased } from './scores'
import { completeChecksNow, settle } from './settle'
import { rowsOf, type SlateData } from './state'
import { STORAGE_KEY, localStorageOrNothing } from './storage'
import { createSlateStore, readPersisted, type SlateStore } from './store'
import {
  connect,
  defaultChannel,
  newOrigin,
  shouldAdopt,
  type ChannelLike,
  type SyncMessage,
} from './sync'
import { Draft, diffData, readerOf, type Reader } from './tx'

export interface LocalSlateOptions {
  /** Where to save. Defaults to localStorage, or nowhere if it can't be used. */
  storage?: StateStorage
  /** How to reach other tabs. Defaults to BroadcastChannel('slate-demo'); null for none. */
  channel?: ChannelLike | null
  /** The data to start from and to reset to. Defaults to the Aberdeen seed. */
  seed?: () => SlateData
  /** This tab's id. Defaults to a random one. */
  origin?: string
  /** The real clock, which nudges the demo clock forward between changes. */
  realNow?: () => number
}

export interface LocalSlate {
  api: SlateApi
  demo: DemoControls
  store: SlateStore
  origin: string
  /** Handles a message from another tab. Returns whether this tab took the data. */
  receive(message: SyncMessage): boolean
  /** Stops listening to other tabs. */
  dispose(): void
}

/**
 * Each change moves the demo clock on by the real time since the last change, at least a second
 * (so every change has its own moment) and at most five minutes (so the story's today stays put
 * when the demo sits open for days).
 */
const MIN_STEP_MS = 1_000
const MAX_STEP_MS = 5 * 60_000

export function createLocalSlate(options: LocalSlateOptions = {}): LocalSlate {
  const seed = options.seed ?? createSeedData
  const storage = options.storage ?? localStorageOrNothing()
  const origin = options.origin ?? newOrigin()
  const realNow = options.realNow ?? Date.now
  const store = createSlateStore({ storage, seed })
  const listeners = new Set<(change: DataChange) => void>()
  let lastReal = realNow()

  const emit = (changes: readonly DataChange[]) => {
    for (const change of changes) {
      for (const listener of listeners) {
        try {
          listener(change)
        } catch (error) {
          // One broken screen must not stop the others hearing about the change.
          console.error('A Slate data listener failed', error)
        }
      }
    }
  }

  const step = (now: string): string => {
    const real = realNow()
    const elapsed = Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, real - lastReal))
    lastReal = real
    return fromMs(toMs(now) + elapsed)
  }

  const publish = (data: SlateData, revision: number, changes: DataChange[]) => {
    sync.post({ type: 'state', origin, revision, data, changes })
    emit(changes)
  }

  const run = <T>(change: (tx: Draft) => T, now: string, always: boolean): T => {
    const tx = new Draft(store.getState().data, now)
    const result = change(tx)
    settle(tx)
    if (!always && !tx.hasChanges()) return result
    const data = tx.snapshot()
    const revision = store.getState().commit(data)
    publish(data, revision, tx.changes())
    return result
  }

  const receive = (message: SyncMessage): boolean => {
    const state = store.getState()
    if (!shouldAdopt({ revision: state.revision, origin }, message)) return false
    state.adopt(message.data, message.revision)
    lastReal = realNow()
    emit(message.changes)
    return true
  }

  const channel = options.channel === undefined ? defaultChannel() : options.channel
  const sync = connect(channel, receive)

  // Without BroadcastChannel, fall back to the storage event, which fires in other tabs when
  // localStorage changes.
  let stopStorageEvents: Unsubscribe = () => {}
  if (!channel && options.storage === undefined && typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const saved = readPersisted(event.newValue, store.getState().seedId)
      if (!saved) return
      const before = store.getState().data
      receive({
        type: 'state',
        origin: 'storage',
        revision: saved.revision,
        data: saved.data,
        changes: diffData(before, saved.data),
      })
    }
    try {
      window.addEventListener('storage', onStorage)
      stopStorageEvents = () => window.removeEventListener('storage', onStorage)
    } catch {
      // No events: this tab works on its own.
    }
  }

  const context: LocalContext = {
    read: (): Reader => readerOf(store.getState().data),
    write: (change) => run(change, step(store.getState().data.now), false),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }

  const api = detached({
    ...authApi(context),
    ...peopleApi(context),
    ...profilesApi(context),
    ...propertiesApi(context),
    ...jobsApi(context),
    ...quotesApi(context),
    ...visitsApi(context),
    ...messagesApi(context),
    ...documentsApi(context),
    ...ratingsApi(context),
    ...passportApi(context),
    ...reportsApi(context),
    ...homeApi(context),
    subscribe: context.subscribe,
  })

  /** Moves the demo clock to `to` and reports what the jump revealed or released. */
  const jumpTo = (to: IsoDateTime): ClockJump => {
    const before = store.getState().data
    const releasedBefore = allReleased(readerOf(before))
    run(() => undefined, to, true)
    // Statuses worked out from dates (certificates, windows, shield batches) may have moved
    // without any record changing, so tell screens every document moved on too.
    emit(
      Object.keys(store.getState().data.tables.documents).map(
        (id) => ({ entity: 'document', id, op: 'updated' }) as DataChange,
      ),
    )
    const after = store.getState().data
    const revealed = rowsOf(after.tables.ratings)
      .filter((r) => r.state === 'revealed' && before.tables.ratings[r.id]?.state === 'sealed')
      .map((r) => r.id)
    const released = [...allReleased(readerOf(after))].filter((id) => !releasedBefore.has(id))
    return { from: before.now, to: after.now, ratingIds: [...revealed, ...released] }
  }

  /** The soonest date a sealed double-blind rating (on `context`, if given) will be revealed. */
  const nextReveal = (context?: ContextRef): { at: IsoDateTime; context: ContextRef } | null => {
    const data = store.getState().data
    const key = context ? contextKey(context) : null
    let soonest: { at: IsoDateTime; context: ContextRef } | null = null
    for (const rating of rowsOf(data.tables.ratings)) {
      if (rating.state !== 'sealed' || rating.seal !== 'double_blind' || !rating.revealAt) continue
      if (key !== null && contextKey(rating.context) !== key) continue
      if (!soonest || rating.revealAt < soonest.at) {
        soonest = { at: rating.revealAt, context: rating.context }
      }
    }
    return soonest
  }

  /** Never backwards: a moment already passed moves the clock on by a second. */
  const notBefore = (at: IsoDateTime): IsoDateTime => {
    const now = store.getState().data.now
    return at > now ? at : fromMs(toMs(now) + MIN_STEP_MS)
  }

  const demo: DemoControls = {
    async reset() {
      const before = store.getState().data
      const revision = store.getState().resetToSeed()
      const data = store.getState().data
      lastReal = realNow()
      publish(data, revision, diffData(before, data))
    },
    now: () => store.getState().data.now,
    async advanceClock(days) {
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        throw new RangeError('Move the clock on by between 0 and 365 days.')
      }
      jumpTo(addDays(store.getState().data.now, days))
    },
    async nextReveal(context) {
      return nextReveal(context)
    },
    async advanceToNextReveal(context) {
      const next = nextReveal(context)
      return next ? jumpTo(notBefore(next.at)) : null
    },
    async advanceToShieldRelease() {
      return jumpTo(nextShieldBatchAt(store.getState().data.now))
    },
    async completeChecks(personId) {
      run((tx) => completeChecksNow(tx, personId), step(store.getState().data.now), false)
    },
  }

  return {
    api,
    demo,
    store,
    origin,
    receive,
    dispose() {
      sync.close()
      stopStorageEvents()
      listeners.clear()
    },
  }
}

/**
 * Hands out copies, so a screen that changes an object it was given can never change the store
 * behind everyone else's back, just as it couldn't with a real server.
 */
function detached(api: SlateApi): SlateApi {
  const wrapped: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(api)) {
    const method = value as (...args: unknown[]) => unknown
    wrapped[name] =
      name === 'subscribe'
        ? method
        : async (...args: unknown[]) => structuredClone(await method(...structuredClone(args)))
  }
  return wrapped as unknown as SlateApi
}

let shared: LocalSlate | null = null

/** The app's one local data layer, made the first time it's asked for. */
export function getLocalSlate(): LocalSlate {
  shared ??= createLocalSlate()
  return shared
}
