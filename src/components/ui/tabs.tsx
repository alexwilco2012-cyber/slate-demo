import type { ComponentProps } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from './cn'

type ClassNameProp = { className?: string }

/**
 * Tabs switch between views of the same thing. Arrow keys move between tabs and show each panel
 * straight away (panels here are already loaded); Home and End jump to the ends.
 */
export function Tabs({
  className,
  ...props
}: Omit<ComponentProps<typeof BaseTabs.Root>, 'className'> & ClassNameProp) {
  return <BaseTabs.Root className={cn('flex flex-col gap-4', className)} {...props} />
}

export function TabsList({
  className,
  children,
  activateOnFocus = true,
  ...props
}: Omit<ComponentProps<typeof BaseTabs.List>, 'className'> & ClassNameProp) {
  return (
    <BaseTabs.List
      activateOnFocus={activateOnFocus}
      className={cn(
        'relative z-0 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]',
        className,
      )}
      {...props}
    >
      {children}
      {/* The underline is a shape as well as a colour, so the active tab never relies on hue. */}
      <BaseTabs.Indicator className="absolute bottom-0 left-0 -z-1 h-[3px] w-(--active-tab-width) translate-x-(--active-tab-left) rounded-t-full bg-accent-strong transition-[translate,width] duration-(--duration-base) ease-out-soft" />
    </BaseTabs.List>
  )
}

export function TabsTab({
  className,
  ...props
}: Omit<ComponentProps<typeof BaseTabs.Tab>, 'className'> & ClassNameProp) {
  return (
    <BaseTabs.Tab
      className={cn(
        'relative flex h-(--control-h) shrink-0 items-center gap-2 whitespace-nowrap rounded-t-control px-3.5 text-body font-semibold text-muted',
        'transition-colors duration-(--duration-quick) hover:text-ink data-active:text-ink',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        '[&_svg]:size-[1.15em]',
        className,
      )}
      {...props}
    />
  )
}

export function TabsPanel({
  className,
  ...props
}: Omit<ComponentProps<typeof BaseTabs.Panel>, 'className'> & ClassNameProp) {
  return (
    <BaseTabs.Panel
      className={cn(
        'focus-visible:rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}
