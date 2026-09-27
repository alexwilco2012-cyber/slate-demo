// The frame every portal screen sits in: role colour and word, navigation (a bottom bar on phones,
// a side bar from 1024px), notifications, help, the account menu and the demo marker. Each portal
// passes its own destinations; see src/routes/README.md.

import { useLayoutEffect, useState, type ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router'
import { QuestionIcon } from '@phosphor-icons/react'
import { hrefs } from '@/data'
import type { Role } from '@/domain/types'
import { IconButton } from '@/components/ui/icon-button'
import { BottomNav, SideNav, type NavAction, type NavItem } from '@/components/slate/app-nav'
import { Logo } from '@/components/slate/logo'
import { RoleAccentBar } from '@/components/slate/role-accent-bar'
import { RoleChip } from '@/components/slate/role-chip'
import { RoleSwitcher } from '@/components/slate/role-switcher'
import { usePortal, useSession } from '@/session'
import { AccountMenu } from './account-menu'
import { DemoMarker } from './demo-marker'
import { HelpDialog, type HelpTopic } from './help'
import { MoreSheet } from './more-sheet'
import { NotificationBell } from './notifications'
import { MAIN_ID } from './route-effects'

export interface PortalNav {
  /**
   * Every destination, most used first, as absolute paths ('/tenant/repairs'). The side bar shows
   * them all; the phone bar shows what fits and puts the rest under More. Give the home `end: true`.
   */
  items: NavItem[]
  /** The portal's one main action, e.g. the tenant's "Report a problem". */
  primaryAction?: NavAction
}

export interface PortalLayoutProps {
  nav: PortalNav
  /** Replaces the portal's standard help answers. */
  help?: HelpTopic[]
  children: ReactNode
}

/**
 * Cells in the phone bar, the main action included. Trade keeps to four so every target stays
 * wide enough for the Hi-Vis type (SPEC §9).
 */
const PHONE_CELLS: Record<Role, number> = { tenant: 5, landlord: 5, trade: 4 }

export function splitForPhone(nav: PortalNav, role: Role) {
  const room = PHONE_CELLS[role] - (nav.primaryAction ? 1 : 0)
  if (nav.items.length <= room) return { bar: nav.items, more: [] as NavItem[] }
  return { bar: nav.items.slice(0, room - 1), more: nav.items.slice(room - 1) }
}

/**
 * The role on <html> too, so toasts, menus and dialogs (mounted on <body>) take its colour, font
 * and Hi-Vis sizes. index.css sizes text on every [data-role] element, which on <html> would move
 * the rem itself (18px in trade) and scale every spacing token with it, so the root keeps the
 * browser's own size.
 */
function useRoleOnRoot(role: Role) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.role = role
    root.style.fontSize = '100%'
    return () => {
      delete root.dataset.role
      root.style.removeProperty('font-size')
    }
  }, [role])
}

export function PortalLayout({ nav, help, children }: PortalLayoutProps) {
  const { role } = usePortal()
  const { pathname } = useLocation()
  const [helpOpen, setHelpOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  useRoleOnRoot(role)

  const phone = splitForPhone(nav, role)
  const moreActive = phone.more.some((item) =>
    matchPath({ path: item.to, end: item.end ?? false }, pathname),
  )
  const moreCount = phone.more.reduce((sum, item) => sum + (item.count ?? 0), 0)

  return (
    <div data-role={role} className="min-h-dvh bg-bg text-ink lg:flex">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only-focusable fixed top-3 left-3 z-(--z-toast) rounded-control bg-surface px-4 py-3 font-semibold text-ink shadow-raised"
      >
        Skip to main content
      </a>

      <SideNav
        role={role}
        items={nav.items}
        primaryAction={nav.primaryAction}
        homeTo={hrefs.home(role)}
        footer={<SideNavFooter />}
        className="sticky top-0 hidden h-dvh shrink-0 lg:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader role={role} onHelp={() => setHelpOpen(true)} />
        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="flex-1 px-(--gutter) pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none sm:pt-6 lg:pt-8 lg:pb-16"
        >
          {children}
        </main>
      </div>

      <BottomNav
        items={phone.bar}
        primaryAction={nav.primaryAction}
        more={
          phone.more.length
            ? {
                onClick: () => setMoreOpen(true),
                active: moreActive,
                count: moreCount,
                expanded: moreOpen,
              }
            : undefined
        }
      />
      {phone.more.length ? (
        <MoreSheet items={phone.more} open={moreOpen} onOpenChange={setMoreOpen} />
      ) : null}
      <HelpDialog role={role} open={helpOpen} onOpenChange={setHelpOpen} topics={help} />
    </div>
  )
}

function PortalHeader({ role, onHelp }: { role: Role; onHelp: () => void }) {
  return (
    <header className="sticky top-0 z-(--z-nav) border-b border-line bg-bg/90 backdrop-blur-md">
      {/* On desktop it meets the side bar's own, one bar across the top. */}
      <RoleAccentBar />
      {/* From 1024px the row lines up with the side bar's lockup (its 1.25rem top padding). */}
      <div className="flex min-h-16 items-center gap-2 px-(--gutter) py-2 lg:pt-5 lg:pb-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1 lg:hidden">
          <Link
            to={hrefs.home(role)}
            className="min-w-0 self-start rounded-control no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Logo role={role} size="sm" />
          </Link>
          <DemoMarker variant="caption" />
        </div>
        <DemoMarker variant="pill" className="hidden lg:inline-flex" />
        {/* Help is always first here, on every screen of every portal (WCAG 3.2.6). */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <IconButton
            label="Help"
            icon={<QuestionIcon />}
            onClick={onHelp}
            aria-haspopup="dialog"
            className="size-11"
          />
          <NotificationBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

function SideNavFooter() {
  const { role, person, landlords } = usePortal()
  const { session } = useSession()
  const navigate = useNavigate()
  const actingFor = landlords.find((landlord) => landlord.id === session?.actingForLandlordId)
  if (person.roles.length < 2 && !actingFor) return null
  return (
    <>
      {actingFor ? (
        <RoleChip role="landlord" size="md" label={`Agent for ${actingFor.displayName}`} />
      ) : null}
      <RoleSwitcher
        variant="compact"
        roles={person.roles.map((option) => ({ role: option }))}
        value={role}
        onValueChange={(next) => navigate(hrefs.home(next))}
      />
    </>
  )
}
