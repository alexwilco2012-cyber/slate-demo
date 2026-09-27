import { Link } from 'react-router'
import { ArrowRightIcon, SquareSplitHorizontalIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { START_PATH } from '@/session'
import { Container } from '../layout/parts'
import { PersonaLinks } from './persona-links'

/** The last word: see all three sides at once. */
export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="pb-16 sm:pb-24">
      <Container>
        <div className="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-[1.75rem] bg-brand-tint px-6 py-12 text-center sm:px-12 sm:py-16">
          <span
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--trade)_26%,transparent),transparent)]"
          />
          <h2
            id="closing-title"
            className="max-w-2xl font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-ink"
          >
            See one repair from all three sides.
          </h2>
          <p className="max-w-xl text-body-l text-muted">
            Open the tenant, landlord and trade portals side by side. Report a leak as Sarah and
            watch it reach Graham and Kev as it happens.
          </p>
          <div className="flex w-full flex-col justify-center gap-(--gap-touch) sm:w-auto sm:flex-row">
            <Link to="/demo" className={buttonVariants({ size: 'lg' })}>
              <SquareSplitHorizontalIcon weight="bold" aria-hidden />
              Open all three side by side
            </Link>
            <Link to={START_PATH} className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              Choose someone to try
              <ArrowRightIcon weight="bold" aria-hidden />
            </Link>
          </div>
          {/* On phones the three would stack into a column; the hero already offers them. */}
          <PersonaLinks className="justify-center max-sm:hidden" />
        </div>
      </Container>
    </section>
  )
}
