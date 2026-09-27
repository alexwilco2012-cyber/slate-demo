// Moving a phone to a screen from the demo page. The phones are same-origin iframes running the
// app's own router, so a history entry plus a popstate event is enough: the portal changes page
// the way its back button would, keeping its session and without reloading.

import type { CastKey } from '../cast'
import { appPath } from '../cast'

export type FrameMap = Partial<Record<CastKey, HTMLIFrameElement | null>>

/** The router's own history state shape: its key and position, plus our (empty) state. */
function routerState(win: Window) {
  const current = win.history.state as { idx?: number } | null
  return { usr: null, key: Math.random().toString(36).slice(2, 10), idx: (current?.idx ?? 0) + 1 }
}

/** Opens `path` (e.g. '/trade/jobs/job_1') in that phone. Returns false if it can't be reached. */
export function navigateFrame(frame: HTMLIFrameElement | null | undefined, path: string): boolean {
  const win = frame?.contentWindow
  if (!win) return false
  const url = appPath(path)
  try {
    const here = `${win.location.pathname}${win.location.search}${win.location.hash}`
    if (here === url) return true
    win.history.pushState(routerState(win), '', url)
    // The event is made in the phone's own window, so its router sees an ordinary back/forward.
    const PopState = (win as Window & { PopStateEvent: typeof PopStateEvent }).PopStateEvent
    win.dispatchEvent(new PopState('popstate', { state: win.history.state }))
    return true
  } catch {
    // The phone is mid-load or not yet same-origin: a plain load gets there too.
    try {
      win.location.assign(url)
      return true
    } catch {
      return false
    }
  }
}

/** The phone's current page, without the base path, e.g. '/tenant/report'. */
export function framePath(frame: HTMLIFrameElement | null | undefined): string | null {
  try {
    const pathname = frame?.contentWindow?.location.pathname
    if (!pathname) return null
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    return pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname
  } catch {
    return null
  }
}
