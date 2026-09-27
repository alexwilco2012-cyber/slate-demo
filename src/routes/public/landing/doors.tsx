import { Link } from 'react-router'
import { ArrowDownIcon, CheckIcon } from '@phosphor-icons/react'
import { ROLES } from '@/domain/types'
import { RoleIcon } from '@/components/ui/role-icon'
import { ROLE_STORIES } from '../content/roles'
import { Container, SectionHeading } from '../layout/parts'

/** "I rent · I let · I'm a trade": each door leads to its own section further down. */
export function Doors() {
  return (
    <section
      aria-labelledby="doors-title"
      className="border-y border-line bg-surface py-16 sm:py-24"
    >
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeading
          id="doors-title"
          title="Three doors, one record"
          intro="Each of you gets your own home screen, in your own words. Pick yours to see how it works."
          align="center"
        />
        <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
          {ROLES.map((role) => {
            const story = ROLE_STORIES[role]
            return (
              <li key={role} data-role-accent={role} className="flex">
                <Link
                  to={{ hash: story.sectionId }}
                  className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-card border border-line bg-bg p-6 text-ink no-underline shadow-soft transition-[box-shadow,translate,border-color] duration-(--duration-base) ease-out-soft hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--accent),transparent_55%)] hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-7"
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
                  <span
                    aria-hidden="true"
                    className="flex size-14 items-center justify-center rounded-2xl bg-accent-tint text-accent-text"
                  >
                    <RoleIcon role={role} weight="duotone" className="size-7" />
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="font-display text-[2rem] leading-none font-semibold tracking-[-0.02em]">
                      {story.door}
                    </span>
                    <span className="text-body text-muted">{story.doorLine}</span>
                  </span>
                  <ul className="flex flex-col gap-2 text-small">
                    {story.doorPoints.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckIcon
                          weight="bold"
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-accent-text"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto flex items-center gap-2 pt-2 font-semibold text-accent-text">
                    How it works for {story.plural}
                    <ArrowDownIcon
                      weight="bold"
                      aria-hidden
                      className="size-4 transition-transform duration-(--duration-base) ease-out-soft group-hover:translate-y-0.5"
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
