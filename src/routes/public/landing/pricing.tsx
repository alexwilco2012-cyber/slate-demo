import { BRAND } from '@/config/brand'
import { Link } from 'react-router'
import { CheckIcon, SparkleIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { RoleIcon } from '@/components/ui/role-icon'
import { PLANS } from '../content/pricing'
import { ROLE_STORIES } from '../content/roles'
import { Container, SectionHeading } from '../layout/parts'

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-t border-line bg-surface py-16 outline-none sm:py-24"
    >
      <Container className="flex flex-col gap-10 sm:gap-12">
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-positive-tint py-1 pr-3 pl-2 text-small font-semibold text-positive">
            <SparkleIcon weight="fill" aria-hidden className="size-4" />
            No card needed
          </p>
          <SectionHeading
            id="pricing-title"
            title="Free during launch"
            intro={`Everyone uses ${BRAND.name} free while we launch in Aberdeen. Tenants never pay. This is what we plan to charge afterwards.`}
            align="center"
          />
        </div>

        <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PLANS.map((plan) => (
            <li
              key={plan.role}
              data-role-accent={plan.role}
              className="relative flex flex-col gap-6 overflow-hidden rounded-card border border-line bg-bg p-6 shadow-soft sm:p-7"
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full bg-accent-tint text-accent-text"
                >
                  <RoleIcon role={plan.role} weight="bold" className="size-5" />
                </span>
                <h3 className="text-title font-semibold text-ink">{plan.name}</h3>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="flex items-baseline gap-2">
                  <span className="figures font-display text-[3rem] leading-none font-semibold tracking-[-0.03em] text-ink">
                    {plan.now}
                  </span>
                  <span className="text-body text-muted">{plan.nowNote}</span>
                </p>
                {/* Two lines kept on wide screens, so the three lists start level. */}
                <p className="min-h-[1lh] text-small text-ink md:min-h-[2lh]">
                  {plan.later ?? `Tenants never pay for ${BRAND.name}.`}
                </p>
              </div>
              <ul className="flex flex-col gap-2.5 border-t border-line pt-5 text-body text-ink">
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
                className={buttonVariants({ variant: 'primary', className: 'mt-auto' })}
              >
                Sign up as {ROLE_STORIES[plan.role].singular}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mx-auto max-w-2xl text-center text-small text-balance text-muted">
          Prices marked “from” are what we plan to charge after launch, not now. Nobody is charged
          during launch, and we’ll tell you well before that changes. {BRAND.name} never takes rent,
          holds deposits or handles payments between you.
        </p>
      </Container>
    </section>
  )
}
