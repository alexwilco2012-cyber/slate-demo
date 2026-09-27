// The tenant's home at a glance: where it is, who the landlord is and what tenants say about them,
// and the deposit card with the scheme that holds it.

import { Link } from 'react-router'
import {
  CaretRightIcon,
  CheckCircleIcon,
  PiggyBankIcon,
  SealCheckIcon,
  SparkleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import {
  DEPOSIT_SCHEMES,
  DEPOSIT_SCHEME_LABELS,
  PROPERTY_TYPE_LABELS,
  type LandlordScore,
  type PersonCard,
  type Tenancy,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/components/ui/cn'
import { formatDate, formatScore, plural } from '@/components/slate/format'
import { scoreWords } from '@/components/slate/score-words'
import type { TenantHome } from '../lib/data'
import { pounds, workingDaysBetween } from '../lib/format'
import { PhotoTile } from './photo'

/** The legal deadline for lodging a deposit in Scotland, in working days from the start. */
export const DEPOSIT_LODGE_WORKING_DAYS = 30

/** "4.2 Better than expected · 3 reviews", or "New · 2 verified reviews" below three reviewers. */
export function LandlordScoreLine({
  score,
  className,
}: {
  score: Pick<LandlordScore, 'score' | 'reviewCount'>
  className?: string
}) {
  if (score.score === null) {
    return (
      <p className={cn('flex flex-wrap items-center gap-1.5 text-small text-muted', className)}>
        <SparkleIcon weight="fill" aria-hidden className="size-4 text-accent-text" />
        <span>
          <span className="font-semibold text-ink">New</span> ·{' '}
          {plural(score.reviewCount, 'verified review')}
        </span>
      </p>
    )
  }
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-1.5 text-small text-muted', className)}>
      <span className="font-display figures text-title leading-none font-semibold text-ink">
        {formatScore(score.score)}
      </span>
      <span className="sr-only">out of 5,</span>
      <span className="font-semibold text-ink">{scoreWords(score.score)}</span>
      <span className="basis-full">{plural(score.reviewCount, 'review')} from tenants</span>
    </p>
  )
}

export function LandlordRow({
  landlord,
  score,
  registrationVerified,
  className,
}: {
  landlord: PersonCard | null
  score: LandlordScore
  registrationVerified: boolean
  className?: string
}) {
  if (!landlord) return null
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Avatar
        name={landlord.displayName}
        seed={landlord.avatarSeed}
        role="landlord"
        size="md"
        decorative
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{landlord.displayName}</span>
          <span className="text-small text-muted">Your landlord</span>
        </p>
        <LandlordScoreLine score={score} />
        {registrationVerified ? (
          <p className="flex items-center gap-1.5 text-small font-semibold text-brand">
            <SealCheckIcon weight="fill" aria-hidden className="size-4" />
            Registration verified
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** The current home, with a link to the tenancy and its documents. */
export function HomeCard({
  home,
  eyebrow,
  className,
}: {
  home: TenantHome
  eyebrow?: string
  className?: string
}) {
  const { property, tenancy } = home
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft',
        className,
      )}
    >
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {property.photo ? (
          <PhotoTile image={property.photo} showCaption={false} className="size-18 shrink-0" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow ? <p className="text-small font-semibold text-muted">{eyebrow}</p> : null}
          <h3 className="font-display text-title leading-snug font-semibold text-ink">
            {property.addressLine}
          </h3>
          <p className="text-small text-muted">
            {property.neighbourhood}, {property.city} {property.postcode}
          </p>
          <p className="text-small text-muted">
            {PROPERTY_TYPE_LABELS[property.type]} · {plural(property.bedrooms, 'bedroom')}
          </p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 sm:px-5">
        <LandlordRow
          landlord={home.landlord}
          score={home.score}
          registrationVerified={home.registrationVerified}
        />
      </div>
      <Link
        to={`/tenant/tenancies/${tenancy.id}`}
        className="flex min-h-13 items-center justify-between gap-3 border-t border-line bg-surface-2/60 px-4 text-body font-semibold text-ink no-underline transition-colors duration-(--duration-quick) hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
      >
        Tenancy, documents and key dates
        <CaretRightIcon weight="bold" aria-hidden className="size-4 text-muted" />
      </Link>
    </article>
  )
}

/**
 * Which of Scotland's three approved schemes holds the deposit, and whether it was lodged within
 * the 30 working days the law allows. Slate never holds deposits itself.
 */
export function DepositCard({
  tenancy,
  className,
}: {
  tenancy: Pick<Tenancy, 'deposit' | 'startDate'>
  className?: string
}) {
  const deposit = tenancy.deposit
  const workingDays = deposit ? workingDaysBetween(tenancy.startDate, deposit.lodgedOn) : null
  const late = workingDays !== null && workingDays > DEPOSIT_LODGE_WORKING_DAYS

  return (
    <article
      aria-labelledby="deposit-title"
      className={cn(
        'flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
        >
          <PiggyBankIcon weight="duotone" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id="deposit-title" className="text-small font-semibold text-muted">
            Your deposit
          </h3>
          {deposit ? (
            <p className="font-display figures text-display-m leading-tight font-semibold text-ink">
              {pounds(deposit.amountPence)}
            </p>
          ) : (
            <p className="font-semibold text-ink">No deposit on record</p>
          )}
        </div>
      </header>

      {deposit ? (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-small text-muted">
              Held by one of Scotland’s three approved schemes:
            </p>
            <ul className="flex flex-col gap-1">
              {DEPOSIT_SCHEMES.map((scheme) => {
                const holds = scheme === deposit.scheme
                return (
                  <li
                    key={scheme}
                    className={cn(
                      'flex min-h-10 items-center gap-2.5 rounded-control px-3 py-2 text-small',
                      holds
                        ? 'bg-brand-tint font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--brand)]'
                        : 'text-muted',
                    )}
                  >
                    {holds ? (
                      <CheckCircleIcon weight="fill" aria-hidden className="size-5 text-brand" />
                    ) : (
                      // A plain list marker, not a hollow circle: this isn't a choice.
                      <span aria-hidden="true" className="flex size-5 items-center justify-center">
                        <span className="size-1.5 rounded-full bg-input-border" />
                      </span>
                    )}
                    <span className="flex-1">{DEPOSIT_SCHEME_LABELS[scheme]}</span>
                    {holds ? <span className="text-caption text-brand">Holds yours</span> : null}
                  </li>
                )
              })}
            </ul>
          </div>
          <p
            className={cn(
              'flex items-start gap-2 rounded-control p-3 text-small',
              late ? 'bg-caution-tint text-caution' : 'bg-surface-2 text-ink',
            )}
          >
            {late ? (
              <WarningIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckCircleIcon
                weight="bold"
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-positive"
              />
            )}
            <span>
              Lodged on{' '}
              <span className="figures font-semibold">{formatDate(deposit.lodgedOn)}</span>,{' '}
              {plural(workingDays ?? 0, 'working day')} after your tenancy began.{' '}
              {late
                ? `The law allows ${DEPOSIT_LODGE_WORKING_DAYS} working days. The scheme or a housing adviser can tell you your options.`
                : `The law allows up to ${DEPOSIT_LODGE_WORKING_DAYS} working days, so that’s on time.`}
            </span>
          </p>
        </>
      ) : (
        <p className="text-small text-muted">
          If you paid one, your landlord must lodge it with an approved scheme within{' '}
          {DEPOSIT_LODGE_WORKING_DAYS} working days of your tenancy starting, and tell you which.
        </p>
      )}
      <p className="text-caption text-muted">
        Your landlord and the scheme handle the deposit. We never hold or move money.
      </p>
    </article>
  )
}
