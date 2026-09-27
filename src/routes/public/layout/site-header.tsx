import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ArrowRightIcon, ListIcon, ScalesIcon, TagIcon, type Icon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { iconButtonVariants } from '@/components/ui/icon-button'
import { RoleIcon } from '@/components/ui/role-icon'
import { Logo } from '@/components/slate/logo'
import type { Role } from '@/domain/types'
import { useFocusAfterLink } from '@/routes/_shell/route-effects'
import { Container } from './parts'
import { ThemeChoice } from './theme-choice'

interface NavEntry {
  to: string
  label: string
  role?: Role
  /** For entries without a role, the glyph in the phone menu. */
  icon?: Icon
}

export const SITE_NAV: NavEntry[] = [
  { to: '/how-it-works/tenant', label: 'Tenants', role: 'tenant' },
  { to: '/how-it-works/landlord', label: 'Landlords', role: 'landlord' },
  { to: '/how-it-works/trade', label: 'Trades', role: 'trade' },
  { to: '/#fair-ratings', label: 'Fair ratings', icon: ScalesIcon },
  { to: '/#pricing', label: 'Pricing', icon: TagIcon },
]

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex h-10 items-center rounded-control px-3 text-body font-medium text-ink no-underline',
    'transition-colors duration-(--duration-quick) hover:bg-surface-2',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    isActive &&
      'font-semibold after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-ink',
  )

function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { followLink, finalFocus } = useFocusAfterLink()
  const close = () => {
    followLink()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-haspopup="dialog"
        className={cn(iconButtonVariants({ variant: 'ghost', size: 'md' }), 'lg:hidden')}
      >
        <ListIcon weight="bold" aria-hidden />
      </button>
      <DialogContent title="Menu" finalFocus={finalFocus} initialFocus={false}>
        <nav aria-label="Site" className="flex flex-col gap-6">
          <ul className="-mx-2 flex flex-col">
            {SITE_NAV.map((entry) => (
              <li key={entry.to}>
                <Link
                  to={entry.to}
                  onClick={close}
                  data-role-accent={entry.role}
                  className="flex min-h-12 items-center gap-3 rounded-control px-2 text-body-l font-semibold text-ink no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {entry.role ? (
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full bg-accent-tint text-accent-text"
                    >
                      <RoleIcon role={entry.role} weight="bold" className="size-4" />
                    </span>
                  ) : entry.icon ? (
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink"
                    >
                      <entry.icon weight="bold" className="size-4" />
                    </span>
                  ) : null}
                  {entry.role ? `For ${entry.label.toLowerCase()}` : entry.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-(--gap-touch)">
            <Link
              to="/demo"
              onClick={close}
              className={buttonVariants({ size: 'lg', fullWidth: true })}
            >
              Try the demo
              <ArrowRightIcon weight="bold" aria-hidden />
            </Link>
            <Link
              to="/signup"
              onClick={close}
              className={buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })}
            >
              Sign up free
            </Link>
          </div>
          <ThemeChoice />
        </nav>
      </DialogContent>
    </Dialog>
  )
}

/** The public site's top bar: sticky, with a hairline once the page has scrolled under it. */
export function SiteHeader({ focused = false }: { focused?: boolean }) {
  const scrolled = useScrolled()
  const { pathname } = useLocation()
  const onSignUp = pathname.startsWith('/signup')

  return (
    <header
      className={cn(
        'sticky top-0 z-(--z-nav) border-b bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md transition-[border-color] duration-(--duration-base)',
        scrolled ? 'border-line' : 'border-transparent',
      )}
    >
      <Container className="flex h-16 items-center gap-2 sm:gap-4">
        <Link
          to="/"
          className={cn(
            'mr-auto rounded-control no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
            !focused && 'lg:mr-4',
          )}
        >
          <Logo size="sm" />
          <span className="sr-only">, home page</span>
        </Link>

        {focused ? null : (
          <nav aria-label="Site" className="mr-auto hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {SITE_NAV.map((entry) => (
                <li key={entry.to}>
                  <NavLink
                    to={entry.to}
                    className={(state) =>
                      navLinkClass({ isActive: state.isActive && !entry.to.includes('#') })
                    }
                  >
                    {entry.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {onSignUp ? null : (
          <Link
            to="/signup"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'hidden text-body sm:inline-flex',
            )}
          >
            Sign up
          </Link>
        )}
        <Link to="/demo" className={buttonVariants({ size: 'sm', className: 'text-body' })}>
          Try the demo
        </Link>
        {focused ? null : <MobileMenu />}
      </Container>
    </header>
  )
}
