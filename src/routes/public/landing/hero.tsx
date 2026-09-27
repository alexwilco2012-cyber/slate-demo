import { Link } from 'react-router'
import { ArrowRightIcon, MapPinIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '../layout/parts'
import { HeroFilm } from './hero-film'
import { MoreToTry, PersonaLinks } from './persona-links'
import { leadClass } from './parts'
// Fraunces italic, for the one phrase per heading that leans. Fetched only once it is used.
import '@fontsource-variable/fraunces/full-italic.css'

/** "Every home," then "on the record." in italic on its own line. Plain if there's no comma. */
function Tagline() {
  const comma = BRAND.tagline.indexOf(', ')
  if (comma < 0) return <>{BRAND.tagline}</>
  return (
    <>
      <span className="block">{BRAND.tagline.slice(0, comma + 1)}</span>{' '}
      <em className="block font-[460] italic">{BRAND.tagline.slice(comma + 2)}</em>
    </>
  )
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative pt-8 pb-16 sm:pt-12 lg:pt-12 lg:pb-24"
    >
      <Container>
        <div className="grid gap-7 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <p className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface py-1 pr-3.5 pl-2 text-small font-semibold text-ink shadow-soft">
              <MapPinIcon weight="fill" aria-hidden className="size-4 text-brand" />
              Launching in Aberdeen
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
              <span className="font-medium text-muted">Free during launch</span>
            </p>
            <h1
              id="hero-title"
              className="font-display text-[clamp(3.1rem,1.35rem+6.4vw,7rem)] leading-[0.94] font-[560] tracking-[-0.036em] text-ink"
            >
              <Tagline />
            </h1>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5 lg:pb-2">
            <p className={`${leadClass} max-w-2xl text-muted`}>
              Tenants, landlords and trades share one record of every repair. When the work is done,
              they rate each other in plain words, and each rating stays hidden until both sides are
              in.
            </p>
            <div className="flex flex-col gap-(--gap-touch) sm:flex-row">
              <Link to="/demo" className={buttonVariants({ size: 'lg' })}>
                Try the demo
                <ArrowRightIcon weight="bold" aria-hidden />
              </Link>
              <Link to="/signup" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                Sign up free
              </Link>
            </div>
            <p className="text-small text-muted">
              Opens Sarah’s, Graham’s and Kev’s phones side by side. No sign-up, and everyone in it
              is made up.
            </p>
          </div>
        </div>

        <HeroFilm className="mt-10 sm:mt-12 lg:mt-14" />

        <div className="mt-8 flex flex-col gap-3 sm:mt-10 lg:mt-8 lg:flex-row lg:items-center lg:gap-5">
          <p className="text-small font-semibold text-ink">Or go straight in as</p>
          <PersonaLinks />
          <MoreToTry className="lg:ml-1" />
        </div>
      </Container>
    </section>
  )
}
