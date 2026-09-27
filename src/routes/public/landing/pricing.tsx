import { Link } from 'react-router'
import { CheckIcon, SparkleIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { PublicReveal } from '@/components/slate/public-reveal'
import { RoleChip } from '@/components/slate/role-chip'
import { PLANS } from '../content/pricing'
import { ROLE_STORIES } from '../content/roles'
import { Container } from '../layout/parts'
import { leadClass, sectionTitleClass, SectionLabel } from './parts'

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container className="flex flex-col gap-12 sm:gap-16">
        <PublicReveal className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <SectionLabel>Pricing</SectionLabel>
            <h2 id="pricing-title" className={cn(sectionTitleClass, 'text-ink')}>
              Free during launch.
            </h2>
          </div>
          <div className="flex flex-col items-start gap-4 lg:col-span-5 lg:pb-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-positive-tint py-1 pr-3 pl-2 text-small font-semibold text-positive">
              <SparkleIcon weight="fill" aria-hidden className="size-4" />
              No card needed
            </p>
            <p className={cn(leadClass, 'text-muted')}>
              Everyone uses {BRAND.name} free while we launch in Aberdeen. Tenants never pay. Here’s
              what we plan to charge afterwards.
            </p>
          </div>
        </PublicReveal>

        <PublicReveal>
          <ul className="grid overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-soft lg:grid-cols-3">
            {PLANS.map((plan) => (
              <li
                key={plan.role}
                data-role-accent={plan.role}
                className="flex flex-col gap-7 border-line p-7 not-first:border-t sm:p-9 lg:not-first:border-t-0 lg:not-first:border-l"
              >
                <h3 className="self-start">
                  <RoleChip role={plan.role} size="md" label={plan.name} />
                </h3>
                <div className="flex flex-col gap-2">
                  <p className="flex items-baseline gap-2.5">
                    <span className="figures font-display text-[4rem] leading-none font-[500] tracking-[-0.04em] text-ink">
                      {plan.now}
                    </span>
                    <span className="text-body-l text-muted">{plan.nowNote}</span>
                  </p>
                  {/* Two lines kept on wide screens, so the three lists start level. */}
                  <p className="min-h-[1lh] text-small text-ink lg:min-h-[2lh]">
                    {plan.later ?? `Tenants never pay for ${BRAND.name}.`}
                  </p>
                </div>
                <ul className="flex flex-col gap-2.5 border-t border-line pt-6 text-body text-ink">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckIcon
                        weight="bold"
                        aria-hidden
                        className="mt-1 size-4 shrink-0 text-accent-text"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/signup/${plan.role}`}
                  className={buttonVariants({ variant: 'secondary', className: 'mt-auto' })}
                >
                  Sign up as {ROLE_STORIES[plan.role].singular}
                </Link>
              </li>
            ))}
          </ul>
        </PublicReveal>

        <p className="max-w-2xl text-small text-muted">
          Prices marked “from” are what we plan to charge after launch, not now. Nobody is charged
          during launch, and we’ll tell you well before that changes. {BRAND.name} never takes rent,
          holds deposits or handles payments between you.
        </p>
      </Container>
    </section>
  )
}
