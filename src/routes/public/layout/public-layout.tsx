import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { cn } from '@/components/ui/cn'
import { MAIN_ID } from '@/routes/_shell'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
import '../public.css'

/**
 * Links such as "/#pricing" land on their section, including from another page, where the
 * section only exists once the page has loaded. Focus follows, so keyboard and screen reader
 * users start from the section too.
 */
function useScrollToHash() {
  const { hash, key } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    let frame = 0
    const find = () => {
      const target = document.getElementById(id)
      if (target) {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        target.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        return
      }
      if (tries++ < 30) frame = requestAnimationFrame(find)
    }
    frame = requestAnimationFrame(find)
    return () => cancelAnimationFrame(frame)
  }, [hash, key])
}

export interface PublicLayoutProps {
  children: ReactNode
  /** Sign-up: the lockup and one way out, nothing to wander off to. */
  focused?: boolean
  /** Hide the footer, e.g. while signing up. */
  footer?: boolean
  className?: string
}

/** Header, main landmark and footer for every public page. */
export function PublicLayout({
  children,
  focused = false,
  footer = true,
  className,
}: PublicLayoutProps) {
  useScrollToHash()
  return (
    <div className="public-site flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only-focusable fixed top-2 left-2 z-(--z-toast) rounded-control bg-surface px-4 py-2 font-semibold text-ink shadow-overlay"
      >
        Skip to content
      </a>
      <SiteHeader focused={focused} />
      <main id={MAIN_ID} tabIndex={-1} className={cn('flex-1 outline-none', className)}>
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
    </div>
  )
}
