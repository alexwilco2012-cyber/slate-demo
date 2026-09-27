import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { DotsThreeCircleIcon, type Icon } from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { Logo } from './logo'
import { RoleAccentBar } from './role-accent-bar'

export interface NavItem {
  to: string
  label: string
  icon: Icon
  /** Unread or waiting count. Announced with the label. */
  count?: number
  /** Match the path exactly, for a portal's home. */
  end?: boolean
}

export interface NavAction {
  to: string
  label: string
  icon: Icon
}

function CountBubble({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'figures flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.75rem] leading-none font-bold text-on-accent ring-2 ring-surface',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function countText(count?: number) {
  return count ? `, ${count} new` : ''
}

/** A last cell that opens the destinations that didn't fit, e.g. in a sheet. */
export interface BottomNavMore {
  onClick: () => void
  label?: string
  /** True when the page on screen is one of the destinations behind it. */
  active?: boolean
  /** Unread or waiting across those destinations. */
  count?: number
  /** Whether the sheet it opens is open, for aria-expanded. */
  expanded?: boolean
}

export interface BottomNavProps {
  items: readonly NavItem[]
  /** The portal's main action, raised in the middle (tenant: "Report a problem"). */
  primaryAction?: NavAction
  /** Adds a "More" cell at the end, for a portal with more destinations than cells. */
  more?: BottomNavMore
  /** 'fixed' pins it to the foot of phone screens and hides it from 1024px; 'static' for demos. */
  position?: 'fixed' | 'static'
  className?: string
}

/**
 * Phone navigation: up to five destinations with icons and words. The current one gets a filled
 * icon inside a pill as well as its colour.
 */
export function BottomNav({
  items,
  primaryAction,
  more,
  position = 'fixed',
  className,
}: BottomNavProps) {
  const half = Math.ceil(items.length / 2)
  const cells: ReactNode[] = items.map((item) => <BottomNavLink key={item.to} item={item} />)
  if (primaryAction) {
    cells.splice(half, 0, <BottomNavAction key="primary-action" action={primaryAction} />)
  }
  if (more) cells.push(<BottomNavMoreButton key="more" more={more} />)

  return (
    <nav
      aria-label="Main"
      className={cn(
        'border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md',
        position === 'fixed' && 'fixed inset-x-0 bottom-0 z-(--z-nav) lg:hidden',
        className,
      )}
    >
      <ul className="mx-auto grid max-w-xl auto-cols-[minmax(0,1fr)] grid-flow-col px-1">
        {cells}
      </ul>
    </nav>
  )
}

function BottomNavLink({ item }: { item: NavItem }) {
  const Glyph = item.icon
  return (
    <li className="slate-nav-cell flex min-w-0">
      <NavLink
        to={item.to}
        end={item.end}
        className="group flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-px pt-2 pb-1.5 font-semibold text-muted no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=page]:text-accent-text trade:min-h-18"
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'relative flex h-8 w-full max-w-14 items-center justify-center rounded-full transition-colors duration-(--duration-quick)',
                isActive ? 'bg-accent-tint' : 'group-hover:bg-surface-2',
              )}
            >
              <Glyph weight={isActive ? 'fill' : 'regular'} aria-hidden className="size-6" />
              {item.count ? (
                <CountBubble count={item.count} className="absolute -top-1 right-1.5" />
              ) : null}
            </span>
            {/* Shrinks, then wraps, rather than cutting a word short: see components.css. */}
            <span className={cn('slate-nav-label', isActive && 'text-ink')}>
              {item.label}
              <span className="sr-only">{countText(item.count)}</span>
            </span>
          </>
        )}
      </NavLink>
    </li>
  )
}

function BottomNavMoreButton({ more }: { more: BottomNavMore }) {
  const label = more.label ?? 'More'
  return (
    <li className="slate-nav-cell flex min-w-0">
      <button
        type="button"
        onClick={more.onClick}
        aria-haspopup="dialog"
        aria-expanded={more.expanded ?? false}
        className={cn(
          'group flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-px pt-2 pb-1.5 font-semibold text-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring trade:min-h-18',
          more.active && 'text-accent-text',
        )}
      >
        <span
          className={cn(
            'relative flex h-8 w-full max-w-14 items-center justify-center rounded-full transition-colors duration-(--duration-quick)',
            more.active ? 'bg-accent-tint' : 'group-hover:bg-surface-2',
          )}
        >
          <DotsThreeCircleIcon
            weight={more.active ? 'fill' : 'regular'}
            aria-hidden
            className="size-6"
          />
          {more.count ? (
            <CountBubble count={more.count} className="absolute -top-1 right-1.5" />
          ) : null}
        </span>
        <span className={cn('slate-nav-label', more.active && 'text-ink')}>
          {label}
          <span className="sr-only">
            {more.active ? ', current section' : ''}
            {countText(more.count)}
          </span>
        </span>
      </button>
    </li>
  )
}

function BottomNavAction({ action }: { action: NavAction }) {
  const Glyph = action.icon
  return (
    <li className="slate-nav-cell flex min-w-0">
      <Link
        to={action.to}
        className="group flex min-h-16 min-w-0 flex-1 flex-col items-center justify-end gap-1 px-px pb-1.5 font-semibold text-ink no-underline focus-visible:outline-none"
      >
        <span className="-mt-5 flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-raised ring-4 ring-surface transition-[background-color,scale] duration-(--duration-quick) group-hover:bg-accent-hover group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring group-active:scale-95">
          <Glyph weight="bold" aria-hidden className="size-7" />
        </span>
        <span className="slate-nav-label">{action.label}</span>
      </Link>
    </li>
  )
}

export interface SideNavProps {
  role: Role
  items: readonly NavItem[]
  primaryAction?: NavAction
  /** Under the items: the role switcher, account and help (help always in the same place). */
  footer?: ReactNode
  /** Where the lockup links to: the portal's home once signed in. */
  homeTo?: string
  className?: string
}

/** Desktop navigation, from 1024px: lockup with the role word, the main action, then pages. */
export function SideNav({
  role,
  items,
  primaryAction,
  footer,
  homeTo = '/',
  className,
}: SideNavProps) {
  const ActionGlyph = primaryAction?.icon
  return (
    <nav
      aria-label="Main"
      data-role-accent={role}
      className={cn('flex w-72 flex-col border-r border-line bg-surface', className)}
    >
      <RoleAccentBar />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-5 pb-4 [scrollbar-width:thin]">
        <Link
          to={homeTo}
          className="flex min-h-11 items-center self-start rounded-control px-1 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo role={role} size="sm" />
        </Link>

        {primaryAction && ActionGlyph ? (
          <Link
            to={primaryAction.to}
            className="flex h-(--control-h) items-center justify-center gap-2 rounded-control bg-accent px-4 font-semibold text-on-accent no-underline shadow-soft transition-colors duration-(--duration-quick) hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ActionGlyph weight="bold" aria-hidden className="size-5" />
            {primaryAction.label}
          </Link>
        ) : null}

        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Glyph = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-(--control-h) items-center gap-3 rounded-control px-3 text-body text-ink no-underline transition-colors duration-(--duration-quick)',
                      'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                      isActive ? 'bg-accent-tint font-semibold' : 'hover:bg-surface-2',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent-strong"
                        />
                      ) : null}
                      <Glyph
                        weight={isActive ? 'fill' : 'regular'}
                        aria-hidden
                        className={cn(
                          'size-5.5 shrink-0',
                          isActive ? 'text-accent-text' : 'text-muted',
                        )}
                      />
                      <span className="flex-1 truncate">
                        {item.label}
                        <span className="sr-only">{countText(item.count)}</span>
                      </span>
                      {item.count ? <CountBubble count={item.count} className="ring-0" /> : null}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {footer ? <div className="mt-auto flex flex-col gap-4">{footer}</div> : null}
      </div>
    </nav>
  )
}
