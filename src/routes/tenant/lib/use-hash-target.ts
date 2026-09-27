import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useReducedMotion } from 'motion/react'

/**
 * Links like /tenant/jobs/:id#messages land on that section once the page has loaded: scrolled
 * into view, with focus on its heading so a screen reader starts there too.
 */
export function useHashTarget(ready: boolean) {
  const { hash, key } = useLocation()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!ready || !hash) return
    // After the shell's own "back to the top" on a new page.
    const frame = window.requestAnimationFrame(() => {
      const id = decodeURIComponent(hash.slice(1))
      const target = document.getElementById(id)
      if (!target) return
      target.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
      const heading = document.getElementById(`${id}-title`) ?? target
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [ready, hash, key, reduce])
}
