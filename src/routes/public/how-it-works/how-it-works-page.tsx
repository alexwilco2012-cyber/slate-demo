import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRightIcon, EyeIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { RELATIONSHIPS } from '@/domain/criteria'
import { ROLES, type Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { RoleIcon } from '@/components/ui/role-icon'
import { PassportCard } from '@/components/slate/passport-card'
import { ReviewCard } from '@/components/slate/review-card'
import { RoleChip } from '@/components/slate/role-chip'
import { TradeScoreSummary } from '@/components/slate/trade-score'
import { NotFound, useDocumentTitle } from '@/routes/_shell'
import { isRole } from '@/session'
import { planFor } from '../content/pricing'
import { ROLE_STORIES, type RatingLink } from '../content/roles'
import { PASSPORT_LINES, PEOPLE, REVIEW_OF_LANDLORD, TRADE_SCORE } from '../content/samples'
import { StepList } from '../landing/for-role'
import { LandlordShot } from '../landing/hero-visual'
import { personaHref } from '../landing/persona-links'
import {
  LandlordCompliancePicture,
  Picture,
  TenantNoticePicture,
  TenantReportPicture,
  TradeBoardPicture,
} from '../landing/vignettes'
import { Container, SectionHeading } from '../layout/parts'
import { PublicLayout } from '../layout/public-layout'
import { RatingActions } from '../ratings/rating-actions'
import { ReportRoutesDialog } from '../ratings/report-routes-dialog'

const HERO_PICTURES: Record<Role, ReactNode> = {
  tenant: <TenantReportPicture />,
  landlord: (
    <Picture caption="A landlord’s home screen starts with what needs a decision.">
      <LandlordShot className="mx-auto max-w-md" />
    </Picture>
  ),
  trade: (
    <div className="mx-auto w-full max-w-md">
      <TradeBoardPicture />
    </div>
  ),
}

const WALKTHROUGH_PICTURES: Record<Role, ReactNode> = {
  tenant: <TenantNoticePicture />,
  landlord: <LandlordCompliancePicture />,
  trade: null,
}

/** A real rating component with the sample data for this role, and what surrounds it in the app. */
function RatingSample({ role }: { role: Role }) {
  const [reporting, setReporting] = useState(false)
  if (role === 'tenant') {
    return (
      <div className="flex flex-col gap-2">
        <PassportCard landlordCount={2} lines={PASSPORT_LINES} tenantName={PEOPLE.sarah.name} />
        <RatingActions />
      </div>
    )
  }
  if (role === 'landlord') {
    return (
      <div className="flex flex-col gap-2">
        <ReviewCard review={REVIEW_OF_LANDLORD} onReport={() => setReporting(true)} />
        <RatingActions report={false} className="min-h-9" />
        <ReportRoutesDialog open={reporting} onOpenChange={setReporting} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
        <TradeScoreSummary score={TRADE_SCORE} details={false} />
      </div>
      <RatingActions />
    </div>
  )
}

function RatingLinks({ title, links }: { title: string; links: RatingLink[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-title font-semibold text-ink">{title}</h3>
      <ul className="flex flex-col gap-3">
        {links.map((link) => {
          const relationship = RELATIONSHIPS[link.direction]
          const rater = link.direction.split('->')[0] as Role
          return (
            <li
              key={link.direction}
              className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <RoleChip role={rater} />
                <span className="font-semibold text-ink">{relationship.title}</span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {relationship.criteria.map((criterion) => (
                  <li
                    key={criterion.id}
                    className="rounded-full bg-surface-2 px-2.5 py-1 text-caption font-semibold text-ink"
                  >
                    {criterion.label}
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2 text-small text-muted">
                <EyeIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
                {link.seenBy}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function HowItWorks({ role }: { role: Role }) {
  const story = ROLE_STORIES[role]
  useDocumentTitle(`How it works for ${story.plural}`)
  const others = ROLES.filter((other) => other !== role)
  const plan = planFor(role)

  return (
    <PublicLayout>
      <div data-role-accent={role}>
        <section aria-labelledby="hiw-title" className="py-10 sm:py-16">
          <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col items-start gap-6">
              <RoleChip role={role} size="md" label={`How it works for ${story.plural}`} />
              <h1
                id="hiw-title"
                className="font-display text-[clamp(2.25rem,1.7rem+2.4vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance text-ink"
              >
                {story.heading}
              </h1>
              <p className="text-body-l text-pretty text-muted">{story.intro}</p>
              <div className="flex w-full flex-col gap-(--gap-touch) sm:w-auto sm:flex-row">
                <Link to={personaHref(role)} className={buttonVariants({ size: 'lg' })}>
                  Try as {story.persona.name}
                  <ArrowRightIcon weight="bold" aria-hidden />
                </Link>
                <Link
                  to={`/signup/${role}`}
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Sign up as {story.singular}
                </Link>
              </div>
            </div>
            {HERO_PICTURES[role]}
          </Container>
        </section>

        <section
          aria-labelledby="walkthrough-title"
          className="border-y border-line bg-surface py-16 sm:py-20"
        >
          <Container className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col gap-4 rounded-card bg-accent-tint p-5">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={story.persona.name}
                    seed={story.persona.personId}
                    role={role}
                    size="lg"
                    decorative
                  />
                  <div className="flex flex-col">
                    <p className="font-display text-display-m leading-none font-semibold text-ink">
                      {story.persona.name}
                    </p>
                    <p className="text-small text-muted">{story.persona.situation}</p>
                  </div>
                </div>
                <Link
                  to={personaHref(role)}
                  className={buttonVariants({ variant: 'primary', fullWidth: true })}
                >
                  See it as {story.persona.name}
                </Link>
              </div>
            </aside>
            <div className="flex min-w-0 flex-col gap-10">
              <SectionHeading
                id="walkthrough-title"
                title={story.walkthrough.heading}
                intro={story.walkthrough.intro}
              />
              <StepList steps={story.walkthrough.steps} className="max-w-2xl" />
              {WALKTHROUGH_PICTURES[role] ? (
                <div className="max-w-2xl">{WALKTHROUGH_PICTURES[role]}</div>
              ) : null}
            </div>
          </Container>
        </section>

        <section aria-labelledby="ratings-title" className="py-16 sm:py-20">
          <Container className="flex flex-col gap-10">
            <SectionHeading
              id="ratings-title"
              title="Your ratings"
              intro="What you rate, what others say about you, and who gets to see it. Everything is revealed together, and nobody can change theirs afterwards."
            />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
              <div className="flex flex-col gap-8">
                <RatingLinks title="You rate" links={story.youRate} />
                <RatingLinks title="You’re rated by" links={story.ratedBy} />
              </div>
              <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
                <p className="text-small font-semibold text-muted">How it looks</p>
                <RatingSample role={role} />
              </div>
            </div>
          </Container>
        </section>

        <section aria-labelledby="cost-title" className="pb-16 sm:pb-20">
          <Container>
            <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex flex-col gap-1">
                <h2 id="cost-title" className="text-title font-semibold text-ink">
                  What it costs
                </h2>
                <p className="font-display text-display-m font-semibold text-ink">
                  {plan.later ? 'Free during launch' : 'Free, always'}
                </p>
                <p className="text-body text-muted">
                  {plan.later ?? `Tenants never pay for ${BRAND.name}.`}
                </p>
              </div>
              <Link to="/#pricing" className={buttonVariants({ variant: 'secondary' })}>
                See all pricing
              </Link>
            </div>
          </Container>
        </section>
      </div>

      <section aria-labelledby="others-title" className="border-t border-line bg-surface py-16">
        <Container className="flex flex-col gap-6">
          <h2 id="others-title" className="text-title font-semibold text-ink">
            How it works for the others
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {others.map((other) => {
              const otherStory = ROLE_STORIES[other]
              return (
                <li key={other} data-role-accent={other} className="flex">
                  <Link
                    to={`/how-it-works/${other}`}
                    className="group flex w-full items-center gap-4 rounded-card border border-line bg-bg p-5 text-ink no-underline transition-[box-shadow,translate] duration-(--duration-base) hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent-text"
                    >
                      <RoleIcon role={other} weight="duotone" className="size-6" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-display text-display-m leading-tight font-semibold">
                        {otherStory.door}
                      </span>
                      <span className="text-small text-muted">For {otherStory.plural}</span>
                    </span>
                    <ArrowRightIcon
                      weight="bold"
                      aria-hidden
                      className="size-5 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </section>
    </PublicLayout>
  )
}

/** /how-it-works/:role — the longer walkthrough for each party. */
export default function HowItWorksPage() {
  const { role } = useParams()
  if (!isRole(role)) return <NotFound />
  return <HowItWorks key={role} role={role} />
}
