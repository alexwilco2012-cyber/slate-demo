import { Link } from 'react-router'
import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react'
import { ROLES } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { PublicPhoto } from '@/components/slate/public-photo'
import { PublicReveal } from '@/components/slate/public-reveal'
import { RoleChip } from '@/components/slate/role-chip'
import { planFor } from '../content/pricing'
import { ROLE_STORIES } from '../content/roles'
import { Container } from '../layout/parts'
import { DoorArt } from './door-art'
import { PHOTOS } from './media'
import { leadClass, sectionTitleClass, SectionLabel } from './parts'
import { personaHref } from './persona-links'

/** "I rent · I let · I'm a trade": a photograph, what's in it for you, and a way straight in. */
export function Doors() {
  return (
    <section
      id="doors"
      aria-labelledby="doors-title"
      className="py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container className="flex flex-col gap-12 sm:gap-16">
        <PublicReveal className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <SectionLabel>Who it’s for</SectionLabel>
            <h2 id="doors-title" className={cn(sectionTitleClass, 'text-ink')}>
              Three doors, one record.
            </h2>
          </div>
          <p className={cn(leadClass, 'text-muted lg:col-span-5 lg:pb-2')}>
            Each of you gets your own home screen, in your own words. Pick yours.
          </p>
        </PublicReveal>

        <ul className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          {ROLES.map((role, index) => {
            const story = ROLE_STORIES[role]
            const plan = planFor(role)
            const titleId = `door-${role}`
            return (
              <li key={role} data-role-accent={role} className="flex">
                <PublicReveal delay={index * 0.08} className="flex w-full">
                  <article
                    aria-labelledby={titleId}
                    className="flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-soft md:grid md:grid-cols-[2fr_3fr] lg:flex lg:flex-col"
                  >
                    <PublicPhoto
                      src={PHOTOS[role]}
                      alt=""
                      fallback={<DoorArt role={role} />}
                      sizes="(min-width: 1024px) 360px, (min-width: 768px) 290px, 100vw"
                      className="aspect-[16/10] md:aspect-auto md:h-full lg:aspect-[4/5] lg:h-auto"
                      imgClassName="object-[50%_30%]"
                    />
                    <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <RoleChip role={role} size="md" label={`For ${story.plural}`} />
                        <span className="text-small font-semibold text-muted">
                          {plan.later ? 'Free during launch' : 'Free, always'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3
                          id={titleId}
                          className="font-display text-[2.5rem] leading-none font-[560] tracking-[-0.03em] text-ink"
                        >
                          {story.door}
                        </h3>
                        <p className="text-body-l text-muted">{story.doorLine}</p>
                      </div>
                      <ul className="flex flex-col gap-2 border-t border-line pt-5 text-body text-ink">
                        {story.doorPoints.map((point) => (
                          <li key={point} className="flex items-start gap-2.5">
                            <CheckIcon
                              weight="bold"
                              aria-hidden
                              className="mt-1 size-4 shrink-0 text-accent-text"
                            />
                            {point}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex flex-col gap-3 pt-2">
                        <Link
                          to={personaHref(role)}
                          className={buttonVariants({ variant: 'soft', size: 'lg' })}
                        >
                          Try as {story.persona.name}
                          <ArrowRightIcon weight="bold" aria-hidden />
                        </Link>
                        <Link
                          to={`/how-it-works/${role}`}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control text-small font-semibold text-ink underline decoration-input-border decoration-[1.5px] underline-offset-[0.3em] hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          How it works for {story.plural}
                        </Link>
                      </div>
                    </div>
                  </article>
                </PublicReveal>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
