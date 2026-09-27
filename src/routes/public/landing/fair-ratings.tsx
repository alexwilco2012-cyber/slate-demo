import { BRAND } from '@/config/brand'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  ChatCenteredTextIcon,
  HourglassMediumIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  type Icon,
} from '@phosphor-icons/react'
import { SCALES, RATING_RULES } from '@/domain/criteria'
import { Avatar } from '@/components/ui/avatar'
import { RoleChip } from '@/components/slate/role-chip'
import { ScoreSummary } from '@/components/slate/score-summary'
import { CLIENT_RATING, PEOPLE } from '../content/samples'
import { bandOutlineButtonClass, Container } from '../layout/parts'
import { RatingActions } from '../ratings/rating-actions'

interface Principle {
  icon: Icon
  title: string
  body: string
  extra?: 'scale'
}

const PRINCIPLES: Principle[] = [
  {
    icon: SealCheckIcon,
    title: 'Verified, or not at all',
    body: 'A rating unlocks only after a finished job or a tenancy both sides confirmed. Reviewers show as “Verified tenant · AB10 · 2025”, never by name.',
  },
  {
    icon: LockKeyIcon,
    title: 'Revealed together',
    body: 'Nobody sees what the other side said until both have rated or the window closes. Then everything is revealed at once, and nobody can change theirs.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Tenants protected',
    body: `What a tenant says about their current landlord is held back until the tenancy ends, or released in a batch once the landlord has ${RATING_RULES.shieldReleaseTenantRaters} or more tenant reviewers.`,
  },
  {
    icon: IdentificationCardIcon,
    title: 'The tenant passport',
    body: 'What landlords say about a tenant is never public and has no single score. The tenant sees all of it and shares all or nothing when applying.',
  },
  {
    icon: ChatCenteredTextIcon,
    title: 'Plain words, not stars',
    body: 'Every question is answered in words, so a score always means something.',
    extra: 'scale',
  },
  {
    icon: HourglassMediumIcon,
    title: 'Fair over time',
    body: `No score until ${RATING_RULES.minReviewersForScore} different people have reviewed. Recent reviews count most, and we delete reviews after ${RATING_RULES.retentionMonths} months.`,
  },
]

/** The unique hook: trades rate their customers, and other trades see it before quoting. */
function TradesRateBack() {
  const graham = PEOPLE.graham
  return (
    <div className="grid items-center gap-8 rounded-[1.75rem] bg-[var(--band-raised)] p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="flex flex-col gap-4">
        <p className="text-small font-semibold text-[var(--on-band-muted)]">Only on {BRAND.name}</p>
        <h3 className="font-display text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance">
          Trades finally rate their customers.
        </h3>
        <p className="text-body-l text-[var(--on-band-muted)]">
          Most platforms only let customers rate trades. On {BRAND.name} it works both ways. After
          each job, the trade rates the landlord on the brief, the access and whether they paid on
          time. Other trades see it before they quote.
        </p>
        <p className="text-small text-[var(--on-band-muted)]">
          Only trades see it, and the landlord sees their own. It shows once the landlord’s rating
          of that trade is locked in, so nobody can trade favours.
        </p>
      </div>
      <div
        data-role-accent="trade"
        className="flex flex-col gap-4 rounded-card bg-surface p-5 text-ink shadow-overlay [--ring:var(--accent-text)] sm:p-6"
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
    </div>
  )
}

export function FairRatings() {
  return (
    <section
      id="fair-ratings"
      aria-labelledby="fair-ratings-title"
      className="public-band py-16 sm:py-24"
    >
      <Container className="flex flex-col gap-12 sm:gap-14">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-small font-semibold text-[var(--on-band-muted)]">Fair ratings</p>
          <h2
            id="fair-ratings-title"
            className="font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance"
          >
            Ratings that come from real work, and stay fair to all three of you.
          </h2>
          <p className="text-body-l text-[var(--on-band-muted)]">
            Nobody rates a stranger on {BRAND.name}. Ratings come from repairs and tenancies, and
            the rules are the same for everyone.
          </p>
        </div>

        <TradesRateBack />

        <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon: Glyph, title, body, extra }) => (
            <li key={title} className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full bg-[var(--band-raised)] text-[var(--on-band)]"
              >
                <Glyph weight="duotone" className="size-6" />
              </span>
              <h3 className="text-title font-semibold">{title}</h3>
              <p className="text-body text-[var(--on-band-muted)]">{body}</p>
              {extra === 'scale' ? (
                <ol className="flex flex-wrap gap-1.5" aria-label="The answers, lowest to highest">
                  {SCALES.judgement.map((point) => (
                    <li
                      key={point.score}
                      className="rounded-full border border-[var(--band-line)] px-2.5 py-1 text-caption font-semibold"
                    >
                      {point.label}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-(--gap-touch) sm:flex-row">
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
