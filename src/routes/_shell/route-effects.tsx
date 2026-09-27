import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { BRAND } from '@/config/brand'

/** The id of each page's main landmark: the skip link's target and where focus lands. */
export const MAIN_ID = 'main'

/** How long to wait for a lazy-loaded page's main content before giving up: about 5 seconds. */
const MAX_FOCUS_FRAMES = 300

/**
 * After moving to another page: back to the top, and focus on the main content so screen readers
 * start reading the new page rather than staying on the link that was pressed. Back and forward
 * leave the browser's own scroll position alone.
 *
 * A page whose code is still loading has no main content yet, so this keeps looking each frame
 * until it arrives. It never takes focus from something the person has moved to meanwhile.
 */
export function RouteChangeEffects() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (navigationType === 'POP') return
    window.scrollTo({ top: 0 })

    const focusedBefore = document.activeElement
    let frame = 0
    let tries = 0
    const focusMain = () => {
      const main = document.getElementById(MAIN_ID)
      if (main) {
        const active = document.activeElement
        if (!active || active === document.body || active === focusedBefore) {
          main.focus({ preventScroll: true })
        }
        return
      }
      if (++tries < MAX_FOCUS_FRAMES) frame = requestAnimationFrame(focusMain)
    }
    focusMain()
    return () => cancelAnimationFrame(frame)
  }, [pathname, navigationType])

  return null
}

/**
 * For menus, panels and sheets whose links go to another page. Normally closing one sends focus
 * back to the button that opened it; after a link, focus belongs to the new page instead (see
 * RouteChangeEffects). Call followLink() in the link's onClick and pass finalFocus to the popup.
 */
export function useFocusAfterLink() {
  const followed = useRef(false)
  return {
    followLink: () => {
      followed.current = true
    },
    finalFocus: () => {
      const backToTrigger = !followed.current
      followed.current = false
      return backToTrigger
    },
  }
}

/** Names the browser tab after the page, e.g. "Repairs · Slate". */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} · ${BRAND.name}`
    return () => {
      document.title = previous
    }
  }, [title])
}
