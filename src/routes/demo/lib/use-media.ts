import { useCallback, useSyncExternalStore } from 'react'

/** Whether a media query matches now, e.g. useMedia('(min-width: 64rem)'). */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  const read = () =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, read, () => false)
}

/** Three phones side by side from 1024px; one phone at a time, with tabs, below that. */
export const SIDE_BY_SIDE = '(min-width: 64rem)'
/** The story as a column beside the phones, once there's room for both. */
export const STORY_RAIL = '(min-width: 96rem)'
