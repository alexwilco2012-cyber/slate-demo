// Who is signed in, per browser tab: the session, the Viewer for SlateApi calls, ?as= links and
// the guard in front of every portal. See src/routes/README.md.

export { SessionProvider, useSession, useViewer, type SessionControls } from './hooks'
export {
  PortalGate,
  returnPathAfterSignIn,
  useOptionalPortal,
  usePortal,
  type PortalGateProps,
  type PortalState,
  type StartState,
} from './portal-gate'
export {
  hasSessionParams,
  isRole,
  parseSession,
  sessionFromParams,
  sessionHref,
  SESSION_KEY,
  START_PATH,
  viewerOf,
  withoutSessionParams,
  type Session,
} from './session'
export { createSessionStore, getSessionStore, type SessionStore } from './store'
export { SessionFromUrl } from './url-session'
