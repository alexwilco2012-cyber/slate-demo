import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { FlaskIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { cn } from '@/components/ui/cn'
import { Logo } from '@/components/slate/logo'
import { START_PATH } from '@/session'
import { Container } from './parts'
import { ThemeChoice } from './theme-choice'

const COLUMNS = [
  {
    heading: 'How it works',
    links: [
      { to: '/how-it-works/tenant', label: 'For tenants' },
      { to: '/how-it-works/landlord', label: 'For landlords' },
      { to: '/how-it-works/trade', label: 'For trades' },
      { to: '/#pricing', label: 'Pricing' },
      { to: '/#faq', label: 'Questions' },
    ],
  },
  {
    heading: 'Policies',
    links: [
      { to: '/policies/reviews', label: 'Review policy' },
      { to: '/policies/reporting', label: 'Reporting a review' },
      { to: '/policies/privacy', label: 'Privacy' },
    ],
  },
  {
    heading: 'Try it',
    links: [
      { to: START_PATH, label: 'Choose someone to try' },
      { to: '/demo', label: 'Open all three side by side' },
      { to: '/signup', label: 'Sign up' },
    ],
  },
]

const linkClass =
  'inline-flex min-h-8 items-center rounded-sm text-[var(--on-band-muted)] no-underline hover:text-[var(--on-band)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-band)]'

// The lockup's wordmark and tile are spruce, like the band; lift them so they still read.
const onBand = {
  '--brand': 'var(--on-band)',
  '--logo-tile': 'var(--band-raised)',
} as CSSProperties

// The appearance control in band colours: a spruce track, with the chosen option in cream.
const bandControl = {
  '--surface-2': 'var(--band-raised)',
  '--surface': 'color-mix(in oklab, var(--band-raised), var(--on-band) 12%)',
  '--input-border': 'var(--band-line)',
  '--ink': 'var(--on-band)',
  '--accent': 'var(--on-band)',
  '--on-accent': 'var(--band)',
  '--accent-strong': 'var(--on-band)',
  '--ring': 'var(--on-band)',
} as CSSProperties

export function SiteFooter() {
  return (
    <footer className="public-band">
      <Container className="flex flex-col gap-12 py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div
            className="col-span-2 flex flex-col gap-4 sm:col-span-3 lg:col-span-1"
            style={onBand}
          >
            <Link
              to="/"
              className="self-start rounded-control no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--on-band)]"
            >
              <Logo size="md" />
              <span className="sr-only">, home page</span>
            </Link>
            <p className="max-w-xs font-display text-title text-[var(--on-band)]">
              {BRAND.tagline}
            </p>
            <p className="max-w-xs text-small text-[var(--on-band-muted)]">
              Made for Scottish lettings, starting in Aberdeen.
            </p>
          </div>
          {COLUMNS.map((column, index) => (
            <nav
              key={column.heading}
              aria-label={column.heading}
              // Two columns on phones: the last one gets the full width so its links don't wrap.
              className={cn(index === COLUMNS.length - 1 && 'max-sm:col-span-2')}
            >
              <h2 className="mb-3 text-small font-semibold tracking-[0.02em] text-[var(--on-band)]">
                {column.heading}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-8 border-t border-[var(--band-line)] pt-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 text-small text-[var(--on-band-muted)]">
            <p className="flex items-start gap-2 font-semibold text-[var(--on-band)]">
              <FlaskIcon weight="duotone" aria-hidden className="mt-0.5 size-4 shrink-0" />
              This is a demo with fictional people and places.
            </p>
            <p className="pl-6">Nothing you type leaves your browser.</p>
          </div>
          <div style={bandControl} className="w-full shrink-0 md:w-80">
            <ThemeChoice />
          </div>
        </div>
      </Container>
    </footer>
  )
}
