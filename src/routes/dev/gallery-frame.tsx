import { createContext, useContext, useState, type ReactNode } from 'react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { PortalContainerProvider } from '@/components/ui/portal-container'
import { RoleChip } from '@/components/slate/role-chip'

export type GalleryTheme = 'light' | 'dark'

export interface GalleryView {
  roles: readonly Role[]
  themes: readonly GalleryTheme[]
}

export const GalleryViewContext = createContext<GalleryView>({
  roles: ['tenant', 'landlord', 'trade'],
  themes: ['light'],
})

/** One portal in one theme: sets data-role and data-theme, and keeps overlays inside. */
export function Frame({
  role,
  theme,
  children,
  className,
}: {
  role: Role
  theme: GalleryTheme
  children: ReactNode
  className?: string
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  return (
    <div
      data-role={role}
      data-theme={theme}
      className={cn(
        'flex min-w-0 flex-col gap-5 rounded-[1.5rem] border border-line p-4 sm:p-6',
        className,
      )}
    >
      <p className="flex items-center justify-between gap-3">
        <RoleChip role={role} size="md" />
        <span className="flex items-center gap-1.5 text-caption font-semibold text-muted">
          {theme === 'light' ? (
            <SunIcon weight="bold" aria-hidden className="size-4" />
          ) : (
            <MoonIcon weight="bold" aria-hidden className="size-4" />
          )}
          {theme === 'light' ? 'Light' : 'Dark'}
        </span>
      </p>
      <PortalContainerProvider value={container}>{children}</PortalContainerProvider>
      <div ref={setContainer} />
    </div>
  )
}

/**
 * Renders its content once per chosen role and theme, side by side from 1280px. `wide` stacks the
 * frames for components that need the width, such as tables and navigation.
 */
export function Specimens({
  children,
  wide,
}: {
  children: (role: Role, theme: GalleryTheme) => ReactNode
  wide?: boolean
}) {
  const { roles, themes } = useContext(GalleryViewContext)
  return (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div
          key={theme}
          className={cn(
            'grid gap-4',
            !wide && roles.length > 1 && 'xl:grid-cols-3',
            !wide && roles.length === 1 && 'max-w-3xl',
          )}
        >
          {roles.map((role) => (
            <Frame key={`${role}-${theme}`} role={role} theme={theme}>
              {children(role, theme)}
            </Frame>
          ))}
        </div>
      ))}
    </div>
  )
}

/** A named block inside a frame. */
export function Specimen({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <h3 className="text-caption font-semibold tracking-[0.06em] text-muted uppercase">{label}</h3>
      {children}
    </div>
  )
}

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-5">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h2 id={`${id}-title`} className="font-display text-display-l font-semibold text-ink">
          {title}
        </h2>
        {description ? <p className="text-body-l text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
