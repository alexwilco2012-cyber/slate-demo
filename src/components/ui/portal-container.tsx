import { createContext, useContext } from 'react'

/**
 * Where dialogs and tooltips mount. Unset, they go to <body>. A portal shown inside another (the
 * side-by-side demo, the dev gallery) sets its own element here, so an overlay opened in the trade
 * panel keeps the trade theme and role rather than the page's.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null)

export const PortalContainerProvider = PortalContainerContext.Provider

export function usePortalContainer() {
  return useContext(PortalContainerContext) ?? undefined
}
