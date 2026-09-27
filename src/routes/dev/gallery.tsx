import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router'
import { ROLES, type Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { UiProvider } from '@/components/ui/provider'
import { Logo } from '@/components/slate/logo'
import { GalleryViewContext, type GalleryTheme, type GalleryView } from './gallery-frame'
import { BrandSection } from './sections/brand'
import { ControlsSection } from './sections/controls'
import { DocumentsSection } from './sections/documents'
import { FeedbackSection } from './sections/feedback'
import { FoundationsSection } from './sections/foundations'
import { NavigationSection } from './sections/navigation'
import { RatingsSection } from './sections/ratings'
import { WorkSection } from './sections/work'

type RoleChoice = Role | 'all'
type ThemeChoice = GalleryTheme | 'both'

const SECTIONS: readonly [id: string, label: string, Component: ComponentType][] = [
  ['foundations', 'Foundations', FoundationsSection],
  ['brand', 'Brand and roles', BrandSection],
  ['controls', 'Actions and forms', ControlsSection],
  ['feedback', 'Feedback and overlays', FeedbackSection],
  ['ratings', 'Ratings', RatingsSection],
  ['work', 'Jobs and messages', WorkSection],
  ['documents', 'Documents', DocumentsSection],
  ['navigation', 'Navigation', NavigationSection],
]

function readChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return allowed.includes(stored as T) ? (stored as T) : fallback
  } catch {
    return fallback
  }
}

function saveChoice(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private windows can refuse storage; the gallery still works.
  }
}

/**
 * Every component in every portal and theme, with realistic Aberdeen content. A development
 * page: it is not linked from the app.
 */
export function Gallery() {
  // ?only=ratings shows one section on its own, for reviews and screenshots.
  const [params] = useSearchParams()
  const only = params.get('only')
  const shown = SECTIONS.filter(([id]) => !only || id === only)
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(() =>
    readChoice('gallery-role', ['all', ...ROLES], 'all'),
  )
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() =>
    readChoice('gallery-theme', ['light', 'dark', 'both'], 'light'),
  )

  useEffect(() => {
    document.title = 'Design system · dev gallery'
  }, [])

  // On the root too, so toasts (mounted on <body>) match the chosen theme.
  useEffect(() => {
    const root = document.documentElement
    if (themeChoice === 'both') delete root.dataset.theme
    else root.dataset.theme = themeChoice
    return () => {
      delete root.dataset.theme
    }
  }, [themeChoice])

  const view = useMemo<GalleryView>(
    () => ({
      roles: roleChoice === 'all' ? ROLES : [roleChoice],
      themes: themeChoice === 'both' ? ['light', 'dark'] : [themeChoice],
    }),
    [roleChoice, themeChoice],
  )

  return (
    <UiProvider>
      <div className="min-h-dvh bg-bg text-ink">
        <a
          href="#gallery-main"
          className="sr-only-focusable fixed top-2 left-2 z-(--z-toast) rounded-control bg-surface px-4 py-2 font-semibold shadow-raised"
        >
          Skip to components
        </a>
        <header className="z-(--z-nav) border-b border-line bg-bg/92 backdrop-blur-md lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-[112rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-small font-semibold text-muted">Hearth design system</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[3fr_2fr] lg:w-[46rem]">
              <SegmentedControl
                label="Portal"
                hideLabel
                size="md"
                value={roleChoice}
                onValueChange={(value) => {
                  setRoleChoice(value)
                  saveChoice('gallery-role', value)
                }}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'tenant', label: 'Tenant' },
                  { value: 'landlord', label: 'Landlord' },
                  { value: 'trade', label: 'Trade' },
                ]}
              />
              <SegmentedControl
                label="Theme"
                hideLabel
                value={themeChoice}
                onValueChange={(value) => {
                  setThemeChoice(value)
                  saveChoice('gallery-theme', value)
                }}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'both', label: 'Both' },
                ]}
              />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[112rem] gap-8 px-4 sm:px-6">
          <nav
            aria-label="Sections"
            className="sticky top-24 hidden h-fit w-52 shrink-0 py-10 2xl:block"
          >
            <ul className="flex flex-col gap-1">
              {shown.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="flex min-h-10 items-center rounded-control px-3 text-small font-semibold text-muted no-underline hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <main id="gallery-main" className="flex min-w-0 flex-1 flex-col gap-16 py-8 sm:py-10">
            <div className={cn('flex max-w-3xl flex-col gap-3', only && 'sr-only')}>
              <p className="text-small font-semibold text-muted">Direction A · Hearth</p>
              <h1 className="font-display text-display-xl font-semibold text-ink">
                Components, in every portal
              </h1>
              <p className="text-body-l text-muted">
                One shared system with a colour, a word and an icon per role. The trade portal
                follows the Hi-Vis rules: Atkinson Hyperlegible Next, 7:1 text and bigger targets.
                Everything here is fictional sample content.
              </p>
            </div>
            <GalleryViewContext.Provider value={view}>
              {shown.map(([id, , Component]) => (
                <Component key={id} />
              ))}
            </GalleryViewContext.Provider>
          </main>
        </div>
      </div>
    </UiProvider>
  )
}
