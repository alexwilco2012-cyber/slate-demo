// The application shell that every portal plugs into. See src/routes/README.md for the contract.

export { PortalLayout, splitForPhone, type PortalLayoutProps, type PortalNav } from './PortalLayout'
export { PortalPage, type PortalPageProps } from './portal-page'
export { NotFound } from './not-found'
export { PageFallback, PortalSkeleton } from './fallbacks'
export { DemoMarker } from './demo-marker'
export { HELP_TOPICS, HelpDialog, type HelpTopic } from './help'
export { MAIN_ID, RouteChangeEffects, useDocumentTitle } from './route-effects'
export {
  setThemePreference,
  startTheme,
  THEME_KEY,
  useThemePreference,
  type ThemePreference,
} from './theme'
export { timeAgo } from './notifications'
