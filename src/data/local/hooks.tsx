// React access to the data layer. Screens call SlateApi through useSlate() and re-run their
// queries whenever anything changes, in this tab or another.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DependencyList,
  type ReactNode,
} from 'react'
import type { DemoControls, SlateApi } from '@/data/api'
import { ukDate } from './dates'
import { getLocalSlate, type LocalSlate } from './client'
import type { SlateStoreState } from './store'

const SlateContext = createContext<LocalSlate | null>(null)

/** Supplies a data layer to everything inside. Without one, the app's shared one is used. */
export function SlateProvider({ slate, children }: { slate?: LocalSlate; children: ReactNode }) {
  const [value] = useState(() => slate ?? getLocalSlate())
  return <SlateContext.Provider value={value}>{children}</SlateContext.Provider>
}

function useLocalSlate(): LocalSlate {
  return useContext(SlateContext) ?? getLocalSlate()
}

export interface SlateClient {
  api: SlateApi
  demo: DemoControls
}

/** The data API and the demo controls. The same object on every render, safe in effect deps. */
export function useSlate(): SlateClient {
  const slate = useLocalSlate()
  return useMemo(() => ({ api: slate.api, demo: slate.demo }), [slate])
}

// ─── Selectors over the store's own state (not the records: those go through SlateApi) ─────

export const selectRevision = (state: SlateStoreState): number => state.revision
export const selectNow = (state: SlateStoreState): string => state.data.now
export const selectToday = (state: SlateStoreState): string => ukDate(state.data.now)

/** Subscribes to one value of the store's state, e.g. useSlateStore(selectNow). */
export function useSlateStore<T>(selector: (state: SlateStoreState) => T): T {
  const { store } = useLocalSlate()
  const read = useCallback(() => selector(store.getState()), [store, selector])
  return useSyncExternalStore(store.subscribe, read, read)
}

/** The demo's "now", which moves on with every change and with advanceClock. */
export function useDemoNow(): string {
  return useSlateStore(selectNow)
}

export type QueryState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: Error }

export interface QueryResult<T> {
  state: QueryState<T>
  /** Runs the query again now. */
  refresh: () => void
}

/**
 * Runs an API read and keeps it fresh: it runs again when `deps` change and whenever the data
 * changes, here or in another tab. While it refreshes, the last answer stays on screen.
 *
 *   const { state } = useSlateQuery((api) => api.listJobs(viewer), [viewer.personId, viewer.role])
 */
export function useSlateQuery<T>(
  query: (api: SlateApi) => Promise<T>,
  deps: DependencyList,
): QueryResult<T> {
  const { api } = useLocalSlate()
  const revision = useSlateStore(selectRevision)
  const [state, setState] = useState<QueryState<T>>({
    status: 'loading',
    data: undefined,
    error: undefined,
  })
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)
  // Always the latest query function, without making every render re-run it.
  const runQuery = useEffectEvent(() => query(api))

  useEffect(() => {
    const run = ++latest.current
    runQuery()
      .then((data) => {
        if (run === latest.current) setState({ status: 'success', data, error: undefined })
      })
      .catch((error: unknown) => {
        if (run !== latest.current) return
        const err = error instanceof Error ? error : new Error(String(error))
        setState((previous) => ({ status: 'error', data: previous.data, error: err }))
      })
    // `deps` are the caller's; revision and nonce re-run it when data changes or on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, revision, nonce, ...deps])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  return { state, refresh }
}
