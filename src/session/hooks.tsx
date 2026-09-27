// React access to this tab's session: who is signed in, the Viewer for SlateApi calls, and the
// sign-in and sign-out helpers.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { Viewer } from '@/data/api'
import type { PersonId } from '@/domain/ids'
import type { Role } from '@/domain/types'
import { viewerOf, type Session } from './session'
import { getSessionStore, type SessionStore } from './store'

const SessionContext = createContext<SessionStore | null>(null)

/** Supplies a session store to everything inside. Without one, the tab's own store is used. */
export function SessionProvider({
  store,
  children,
}: {
  store?: SessionStore
  children: ReactNode
}) {
  const [value] = useState(() => store ?? getSessionStore())
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

function useSessionStore(): SessionStore {
  return useContext(SessionContext) ?? getSessionStore()
}

export interface SessionControls {
  /** Null when nobody is signed in in this tab. */
  session: Session | null
  viewer: Viewer | null
  /** Signs in this tab only. Other tabs keep their own person. */
  signIn: (session: Session) => void
  signOut: () => void
  /** Moves to another portal the person holds (the layout does this when the URL changes). */
  switchRole: (role: Role) => void
  /** Letting agents: work inside this landlord's account, or their own (undefined). */
  actFor: (landlordId: PersonId | undefined) => void
}

type SessionActions = Omit<SessionControls, 'session' | 'viewer'>

export function useSession(): SessionControls {
  const store = useSessionStore()
  const session = useSyncExternalStore(store.subscribe, store.get, store.get)
  // The same functions for the life of the store, so they are safe in effect deps.
  const actions = useMemo((): SessionActions => {
    const update = (change: (current: Session) => Session) => {
      const current = store.get()
      if (current) store.set(change(current))
    }
    return {
      signIn: (next) => store.set(next),
      signOut: () => store.set(null),
      switchRole: (role) => update((current) => ({ ...current, activeRole: role })),
      actFor: (landlordId) =>
        update(({ personId, activeRole }) =>
          landlordId
            ? { personId, activeRole, actingForLandlordId: landlordId }
            : { personId, activeRole },
        ),
    }
  }, [store])
  return useMemo(
    () => ({ ...actions, session, viewer: session ? viewerOf(session) : null }),
    [actions, session],
  )
}

/**
 * The Viewer every SlateApi call takes, for the person signed in to this portal. The same object
 * until the session changes, so it is safe in effect and query deps.
 *
 *   const viewer = useViewer()
 *   const { state } = useSlateQuery((api) => api.listJobs(viewer), [viewer])
 */
export function useViewer(): Viewer {
  const { viewer } = useSession()
  if (!viewer) {
    throw new Error('useViewer() needs someone signed in. Use it inside a portal route.')
  }
  return viewer
}
