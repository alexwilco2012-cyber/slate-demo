import { Link } from 'react-router'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { PublicPhoto } from '@/components/slate/public-photo'
import { PublicReveal } from '@/components/slate/public-reveal'
import { Container } from '../layout/parts'
import { ThreeDoorsArt } from './door-art'
import { PHOTOS } from './media'
import { leadClass, sectionTitleClass } from './parts'
import { MoreToTry, PersonaLinks } from './persona-links'

/** The last word: see all three sides at once, behind three doors on one landing. */
export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="pb-20 sm:pb-28 lg:pb-32">
      <Container>
        <PublicReveal className="grid overflow-hidden rounded-[2rem] bg-brand-tint lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-7 p-7 sm:p-12 lg:p-16">
            <h2 id="closing-title" className={cn(sectionTitleClass, 'text-ink')}>
              See one repair from <em className="font-[460] italic">all three sides.</em>
            </h2>
            <p className={cn(leadClass, 'max-w-lg text-muted')}>
              Open Sarah’s, Graham’s and Kev’s phones side by side. Report a leak as Sarah and watch
              it reach Graham and Kev as it happens.
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
            <div className="mt-2 flex flex-col gap-3 border-t border-[color-mix(in_oklab,var(--brand)_18%,transparent)] pt-6">
              <p className="text-small font-semibold text-ink">Or go straight in as</p>
              <PersonaLinks />
              <MoreToTry />
            </div>
          </div>
          <PublicPhoto
            src={PHOTOS.threeDoors}
            alt=""
            fallback={<ThreeDoorsArt />}
            sizes="(min-width: 1024px) 540px, 100vw"
            className="aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[32rem]"
          />
        </PublicReveal>
      </Container>
    </section>
  )
}
