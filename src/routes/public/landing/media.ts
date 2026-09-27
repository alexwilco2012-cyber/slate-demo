// Where the landing page looks for its film and photographs (docs/LANDING_BRIEF.md §5). The files
// are made separately and dropped into public/; until they exist, every slot shows its drawn
// fallback, so the page never waits on them and never shows a broken player or image.

import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL

export const HERO_VIDEO = `${BASE}media/hero.mp4`
export const HERO_POSTER = `${BASE}media/hero-poster.webp`

export const PHOTOS = {
  street: `${BASE}images/landing/aberdeen-street.webp`,
  tenant: `${BASE}images/landing/door-tenant.webp`,
  landlord: `${BASE}images/landing/door-landlord.webp`,
  trade: `${BASE}images/landing/door-trade.webp`,
  threeDoors: `${BASE}images/landing/three-doors.webp`,
} as const

/** The film runs 15 seconds: three chapters of five, matching the storyboard. */
export const FILM_SECONDS = 15
export const CHAPTER_SECONDS = 5

function isKind(response: Response, kind: 'video' | 'image') {
  const type = response.headers.get('content-type') ?? ''
  return (response.ok || response.status === 206) && type.startsWith(`${kind}/`)
}

/**
 * Whether a media file is really there. The dev server answers a missing file with the app's HTML
 * and a 200, so only a matching content type counts. Hosts that refuse HEAD get a one-byte GET.
 */
async function mediaExists(url: string, kind: 'video' | 'image', signal?: AbortSignal) {
  if (typeof fetch !== 'function') return false
  try {
    const head = await fetch(url, { method: 'HEAD', signal, cache: 'no-cache' })
    if (head.status !== 405 && head.status !== 501) return isKind(head, kind)
    const ranged = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal, cache: 'no-cache' })
    return isKind(ranged, kind)
  } catch {
    return false
  }
}

/** True once the file is confirmed; false while checking, when missing, or when `enabled` is off. */
export function useMediaExists(url: string, kind: 'video' | 'image', enabled = true) {
  const [found, setFound] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void mediaExists(url, kind, controller.signal).then((exists) => {
      // Only a positive answer changes anything: missing media simply leaves the fallback.
      if (exists && !controller.signal.aborted) setFound(url)
    })
    return () => controller.abort()
  }, [url, kind, enabled])
  return enabled && found === url
}

/** The visitor has asked to save data (Chrome's Lite mode, some phones on metered connections). */
export function prefersSaveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}
