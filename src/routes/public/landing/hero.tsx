import { Link } from 'react-router'
import { ArrowRightIcon, FlaskIcon, MapPinIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { buttonVariants } from '@/components/ui/button'
import { START_PATH } from '@/session'
import { Container } from '../layout/parts'
import { HeroVisual } from './hero-visual'
import { PersonaLinks } from './persona-links'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative pt-8 pb-16 sm:pt-14 lg:pt-16 lg:pb-24"
    >
      <Container className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-12">
        <div className="flex flex-col items-start gap-6">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-3 pl-2 text-small font-semibold text-ink shadow-soft">
            <MapPinIcon weight="fill" aria-hidden className="size-4 text-brand" />
            Launching in Aberdeen
          </p>
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.75rem,1.75rem+4.2vw,4.75rem)] leading-[1.0] font-semibold tracking-[-0.035em] text-balance text-ink"
          >
            {BRAND.tagline}
          </h1>
          <p className="max-w-xl text-[clamp(1.125rem,1rem+0.45vw,1.3125rem)] leading-normal text-pretty text-muted">
            Tenants, landlords and trades share one record of every repair, then rate each other
            fairly once the work is done.
          </p>
          <div className="flex w-full flex-col gap-(--gap-touch) sm:w-auto sm:flex-row">
            <Link to={START_PATH} className={buttonVariants({ size: 'lg' })}>
              Try the demo
              <ArrowRightIcon weight="bold" aria-hidden />
            </Link>
            <Link to="/signup" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              Sign up free
            </Link>
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-small font-semibold text-ink">Or go straight in as</p>
            <PersonaLinks />
          </div>
          <p className="flex items-center gap-2 text-caption text-muted">
            <FlaskIcon weight="duotone" aria-hidden className="size-4 shrink-0" />A working demo
            with fictional people and places
          </p>
        </div>
        <HeroVisual />
      </Container>
    </section>
  )
}
