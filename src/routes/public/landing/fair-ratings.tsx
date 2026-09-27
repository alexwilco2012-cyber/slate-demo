import { Link } from 'react-router'
import { ArrowRightIcon, ShareNetworkIcon } from '@phosphor-icons/react'
import { SCALES, RATING_RULES } from '@/domain/criteria'
import { LETTING_RULES } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { PassportCard } from '@/components/slate/passport-card'
import { PublicReveal } from '@/components/slate/public-reveal'
import { RoleChip } from '@/components/slate/role-chip'
import { ScoreSummary } from '@/components/slate/score-summary'
import { CLIENT_RATING, PASSPORT_LINES, PEOPLE } from '../content/samples'
import { bandOutlineButtonClass, Container } from '../layout/parts'
import { RatingActions } from '../ratings/rating-actions'
import { featureTitleClass, leadClass, sectionTitleClass, SectionLabel } from './parts'
import { RevealDemo } from './reveal-demo'

const judgement = SCALES.judgement
const frequency = SCALES.frequency

const RULES = [
  {
    title: 'Only after real work.',
    body: 'A rating opens only after a finished job, or a tenancy both sides confirmed. Reviewers show as “Verified tenant · AB25 · 2025”, never by name.',
  },
  {
    title: 'Hidden until both are in.',
    body: 'Neither side sees the other’s rating until both have rated or the window closes. Then they appear together, and nobody can change theirs.',
  },
  {
    title: 'Sealed while you live there.',
    body: `What a tenant says about their current landlord stays sealed until the tenancy ends, or until ${RATING_RULES.shieldReleaseTenantRaters} different tenants have rated them.`,
  },
  {
    title: 'Plain words, never stars.',
    body: `Every question is answered in words, from “${judgement[0].label}” to “${judgement[4].label}”, or “${frequency[0].label}” to “${frequency[4].label}”, so a score always means something.`,
  },
]

/** A dark panel inside the band, holding one idea and the real component that shows it. */
const panelClass =
  'flex flex-col gap-8 rounded-[1.75rem] bg-[var(--band-raised)] p-5 sm:p-8 lg:p-10'

function TenantPassport() {
  return (
    <PublicReveal className={panelClass}>
      <div className="flex flex-col gap-3">
        <h3 className={featureTitleClass}>The tenant passport.</h3>
        <p className="max-w-lg text-body-l text-[var(--on-band-muted)]">
          What landlords say about a tenant is never public and never becomes a single score. The
          tenant sees every answer and shares all of it or none of it when applying for their next
          home.
        </p>
      </div>
      <div inert className="mt-auto select-none">
        <PassportCard
          landlordCount={2}
          lines={PASSPORT_LINES}
          tenantName={PEOPLE.sarah.name}
          headingLevel="h4"
          className="text-ink shadow-overlay"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-small text-muted">
                Link works for {LETTING_RULES.passportShareDays} days · views logged
              </span>
              <Button
                size="sm"
                tabIndex={-1}
                iconStart={<ShareNetworkIcon weight="bold" aria-hidden />}
              >
                Share
              </Button>
            </div>
          }
        />
      </div>
    </PublicReveal>
  )
}

/** The unique hook: trades rate their customers, and other trades see it before quoting. */
function TradesRateBack() {
  const graham = PEOPLE.graham
  return (
    <PublicReveal delay={0.08} className={panelClass}>
      <div className="flex flex-col gap-3">
        <h3 className={featureTitleClass}>Trades finally rate their customers.</h3>
        <p className="max-w-lg text-body-l text-[var(--on-band-muted)]">
          After each job, the trade rates the landlord on the brief, the access and whether they
          paid on time. Other trades see it before they quote. It appears once the landlord’s rating
          of that trade is locked in, so nobody can swap favours.
        </p>
      </div>
      <div
        data-role-accent="trade"
        className="mt-auto flex flex-col gap-4 rounded-card bg-surface p-5 text-ink shadow-overlay [--ring:var(--accent-text)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={graham.name} seed={graham.seed} role="landlord" size="md" decorative />
            <div className="flex flex-col">
              <span className="font-semibold">{graham.name}</span>
              <span className="text-small text-muted">Landlord · AB15</span>
            </div>
          </div>
          <RoleChip role="trade" label="Seen by trades" />
        </div>
        <ScoreSummary
          summary={CLIENT_RATING.summary}
          direction="trade->landlord"
          title="Client rating from trades"
          headingLevel="h4"
          variant="compact"
          facts={[
            <>
              Paid on time on{' '}
              <span className="figures font-semibold text-ink">
                {CLIENT_RATING.paidOnTime.onTime} of {CLIENT_RATING.paidOnTime.jobs}
              </span>{' '}
              jobs
            </>,
          ]}
        />
        <RatingActions className="border-t border-line pt-3" />
      </div>
    </PublicReveal>
  )
}

export function FairRatings() {
  return (
    <section
      id="fair-ratings"
      aria-labelledby="fair-ratings-title"
      className="public-band py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container className="flex flex-col">
        <PublicReveal className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <SectionLabel className="text-[var(--on-band-muted)]">Fair ratings</SectionLabel>
            <h2 id="fair-ratings-title" className={sectionTitleClass}>
              Nobody rates in <em className="font-[460] italic">revenge.</em>
            </h2>
          </div>
          <p className={cn(leadClass, 'text-[var(--on-band-muted)] lg:col-span-5 lg:pb-2')}>
            Ratings open only after real work, and both sides’ ratings stay hidden until both are
            in. Then they appear together, so nobody can answer back with a low score.
          </p>
        </PublicReveal>

        <PublicReveal className="mt-12 sm:mt-16">
          <RevealDemo />
        </PublicReveal>

        <ol className="mt-16 grid gap-x-10 gap-y-10 border-t border-[var(--band-line)] pt-10 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {RULES.map((rule, index) => (
            <li key={rule.title}>
              <PublicReveal delay={index * 0.06} className="flex flex-col gap-3">
                <span
                  aria-hidden="true"
                  className="figures font-display text-[2.5rem] leading-none font-[400] text-[var(--on-band-muted)]"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-title font-semibold">{rule.title}</h3>
                <p className="text-body text-[var(--on-band-muted)]">{rule.body}</p>
              </PublicReveal>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl text-small text-[var(--on-band-muted)]">
          No score until {RATING_RULES.minReviewersForScore} different people have reviewed. Recent
          reviews count most, and reviews are deleted after {RATING_RULES.retentionMonths} months.
        </p>

        <div className="mt-16 grid gap-5 sm:mt-20 lg:grid-cols-2">
          <TenantPassport />
          <TradesRateBack />
        </div>

        <div className="mt-12 flex flex-col gap-(--gap-touch) sm:flex-row">
          <Link to="/policies/reviews" className={bandOutlineButtonClass}>
            Read the review policy
            <ArrowRightIcon weight="bold" aria-hidden />
          </Link>
          <Link to="/policies/reporting" className={bandOutlineButtonClass}>
            How reporting works
          </Link>
        </div>
      </Container>
    </section>
  )
}
