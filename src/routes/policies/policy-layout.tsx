import { BRAND } from '@/config/brand'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { CaretDownIcon, FlaskIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { useDocumentTitle } from '@/routes/_shell'
import { Container } from '@/routes/public/layout/parts'
import { PublicLayout } from '@/routes/public/layout/public-layout'

export interface PolicySection {
  id: string
  title: string
  body: ReactNode
}

const POLICIES = [
  { to: '/policies/reviews', label: 'Review policy' },
  { to: '/policies/reporting', label: 'Reporting' },
  { to: '/policies/privacy', label: 'Privacy' },
]

/** Running text in a policy: comfortable measure, spaced paragraphs and lists. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex max-w-prose flex-col gap-4 text-body-l leading-relaxed text-ink',
        '[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 [&_ul]:marker:text-muted',
        '[&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-6 [&_ol]:marker:text-muted',
        '[&_strong]:font-semibold',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * The section being read: the first one in the band between the sticky header and the middle of
 * the screen. Null until the page scrolls, and where the browser can't tell.
 */
function useSectionInView(sections: PolicySection[]) {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id)
          else inBand.delete(entry.target.id)
        }
        const first = sections.find((section) => inBand.has(section.id))
        if (first) setCurrent(first.id)
      },
      { rootMargin: '-96px 0px -50% 0px' },
    )
    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sections])
  return current
}

function SectionLinks({
  sections,
  current,
}: {
  sections: PolicySection[]
  current: string | null
}) {
  return (
    <ol className="flex flex-col border-l border-line">
      {sections.map((section) => (
        <li key={section.id}>
          <Link
            to={{ hash: section.id }}
            aria-current={section.id === current ? 'location' : undefined}
            className={cn(
              '-ml-px flex min-h-9 items-center border-l-2 border-transparent py-1 pl-4 text-small text-muted no-underline',
              'transition-[border-color,color] duration-(--duration-quick) hover:border-input-border hover:text-ink',
              'focus-visible:outline-2 focus-visible:outline-ring',
              'aria-[current]:border-ink aria-[current]:font-semibold aria-[current]:text-ink',
            )}
          >
            {section.title}
          </Link>
        </li>
      ))}
    </ol>
  )
}

/**
 * A policy page: title and summary, a list of sections to jump to (sticky beside the text on wide
 * screens), then the sections, each with its own anchor so other screens can link straight in.
 */
export function PolicyPage({
  title,
  lead,
  sections,
  after,
}: {
  title: string
  lead: ReactNode
  sections: PolicySection[]
  after?: ReactNode
}) {
  useDocumentTitle(title)
  const current = useSectionInView(sections)
  return (
    <PublicLayout>
      <Container className="flex flex-col gap-10 py-10 sm:py-14">
        <header className="flex max-w-3xl flex-col gap-5">
          <nav aria-label="Policy pages">
            <ul className="flex flex-wrap gap-2">
              {POLICIES.map((policy) => (
                <li key={policy.to}>
                  <NavLink
                    to={policy.to}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-9 items-center rounded-full border px-3.5 text-small font-semibold no-underline',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isActive
                          ? 'border-ink bg-ink text-bg'
                          : 'border-line bg-surface text-ink hover:bg-surface-2',
                      )
                    }
                  >
                    {policy.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <h1 className="font-display text-[clamp(2.25rem,1.7rem+2.4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <div className="text-body-l text-pretty text-muted">{lead}</div>
          <p className="flex items-start gap-2 text-small text-muted">
            <FlaskIcon weight="duotone" aria-hidden className="mt-0.5 size-4 shrink-0" />
            Written for this demo, to show how {BRAND.name} will work. It isn’t a legal agreement.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          {/* Folded away on phones, so the policy itself starts on the first screen. */}
          <details className="group rounded-card border border-line bg-surface lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-body font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              On this page
              <CaretDownIcon
                weight="bold"
                aria-hidden
                className="size-4 text-muted transition-transform duration-(--duration-base) group-open:rotate-180"
              />
            </summary>
            <nav aria-label="On this page" className="px-4 pb-3">
              <SectionLinks sections={sections} current={current} />
            </nav>
          </details>
          <nav
            aria-label="On this page"
            className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
          >
            <h2 className="mb-2 text-small font-semibold text-muted">On this page</h2>
            <SectionLinks sections={sections} current={current} />
          </nav>

          <div className="flex min-w-0 flex-col gap-12">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="flex flex-col gap-4 outline-none"
              >
                <h2
                  id={`${section.id}-title`}
                  className="font-display text-display-m leading-tight font-semibold text-ink"
                >
                  {section.title}
                </h2>
                {section.body}
              </section>
            ))}
            {after}
          </div>
        </div>
      </Container>
    </PublicLayout>
  )
}
