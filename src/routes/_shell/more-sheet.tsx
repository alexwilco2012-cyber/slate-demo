import { NavLink } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { NavItem } from '@/components/slate/app-nav'
import { useFocusAfterLink } from './route-effects'

/** The destinations that didn't fit in the phone's bottom bar, as big rows in a bottom sheet. */
export function MoreSheet({
  items,
  open,
  onOpenChange,
}: {
  items: readonly NavItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { followLink, finalFocus } = useFocusAfterLink()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="More" finalFocus={finalFocus}>
        <nav aria-label="More">
          <ul className="flex flex-col gap-(--gap-touch)">
            {items.map((item) => {
              const Glyph = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      followLink()
                      onOpenChange(false)
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-16 items-center gap-4 rounded-card border border-line px-4 text-body-l font-semibold text-ink no-underline transition-colors duration-(--duration-quick)',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isActive
                          ? 'border-accent-strong bg-accent-tint'
                          : 'bg-surface hover:bg-surface-2',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
                        >
                          <Glyph weight={isActive ? 'fill' : 'regular'} className="size-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          {item.label}
                          {item.count ? <span className="sr-only">, {item.count} new</span> : null}
                        </span>
                        {item.count ? (
                          <span
                            aria-hidden="true"
                            className="figures flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-small font-bold text-on-accent"
                          >
                            {item.count > 99 ? '99+' : item.count}
                          </span>
                        ) : null}
                        <CaretRightIcon weight="bold" aria-hidden className="size-5 text-muted" />
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  )
}
