import { Link } from 'react-router'
import {
  CaretRightIcon,
  CheckCircleIcon,
  HouseLineIcon,
  PaperPlaneTiltIcon,
  SealCheckIcon,
} from '@phosphor-icons/react'
import type { JobBoardPost } from '@/data'
import {
  GAS_APPLIANCE_LABELS,
  JOB_CATEGORY_LABELS,
  PROPERTY_TYPE_LABELS,
  type ClientRating,
  type CredentialRequirement,
  type IsoDateTime,
  type PersonCard,
  type PropertyType,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { formatPence, plural } from '@/components/slate/format'
import { timeAgo } from '@/routes/_shell'
import { ClientScore, PaidOnTime } from '../components/client-record'
import { DistanceBadge, UrgencyBadge } from '../components/job-meta'
import { PhotoTile } from '../components/photos'
import { formatShortDay } from '../lib/time'

export function credentialText(credential: CredentialRequirement): string {
  return credential.kind === 'gas_safe'
    ? `Gas Safe: ${GAS_APPLIANCE_LABELS[credential.applianceCategory].toLowerCase()}`
    : 'SELECT, NICEIC or NAPIT, or the electrical checklist'
}

/** "posted yesterday", "posted 3 hours ago", "posted 19 Sept 2026". */
function postedAgo(at: IsoDateTime, now: IsoDateTime): string {
  const ago = timeAgo(at, now)
  return /^\d/.test(ago) ? ago : ago.charAt(0).toLowerCase() + ago.slice(1)
}

export interface PostCardProps {
  post: JobBoardPost
  landlord: PersonCard | undefined
  client: ClientRating | undefined
  propertyType: PropertyType | undefined
  /** The trade's own quote total, when they've sent one. */
  myQuoteTotal?: number
  now: IsoDateTime
  /** The first card's "Send a quote" is the screen's main action. */
  primary?: boolean
}

/**
 * One open job on the board: what and where (the area only, never the address), how urgent, and
 * the client's record with other trades, so a slow payer is visible before anyone quotes.
 */
export function PostCard({
  post,
  landlord,
  client,
  propertyType,
  myQuoteTotal,
  now,
  primary,
}: PostCardProps) {
  const to = `/trade/board/${post.jobId}`
  const quoted = post.myQuoteId !== undefined
  return (
    <article className="@container flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <div className="flex flex-col gap-3.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={post.urgency} />
          <DistanceBadge post={post} />
          {!post.inServiceArea ? (
            <span className="text-small text-muted">Outside your usual area</span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-title leading-snug font-bold text-ink">
            <Link
              to={to}
              className="-my-2.5 block rounded-sm py-2.5 no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {post.title}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 text-ink">
            <span>
              {post.neighbourhood} · {post.postcodeDistrict}
            </span>
            {propertyType ? (
              <span className="flex items-center gap-1.5 text-muted">
                <HouseLineIcon weight="bold" aria-hidden className="size-4.5" />
                {PROPERTY_TYPE_LABELS[propertyType]}
              </span>
            ) : null}
          </p>
          <p className="text-small text-muted">{JOB_CATEGORY_LABELS[post.category]}</p>
        </div>
        <p className="line-clamp-3 text-ink">{post.description}</p>
        {post.photos.length > 0 ? (
          <ul className="grid max-w-md grid-cols-3 gap-2" aria-label="Photos">
            {post.photos.slice(0, 3).map((photo) => (
              <li key={photo.id}>
                <PhotoTile photo={photo} />
              </li>
            ))}
          </ul>
        ) : null}
        {post.credentialNeeded ? (
          <p className="flex items-center gap-2 text-small font-semibold text-ink">
            <SealCheckIcon weight="fill" aria-hidden className="size-5 text-brand" />
            Needs {credentialText(post.credentialNeeded)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-line bg-surface-2/60 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          {landlord ? (
            <Avatar
              name={landlord.displayName}
              seed={landlord.avatarSeed}
              role="landlord"
              size="sm"
              decorative
            />
          ) : null}
          <div className="flex min-w-0 flex-col">
            <p className="font-semibold text-ink">
              {landlord?.displayName ?? 'Landlord'}
              <span className="sr-only">, the client</span>
            </p>
            {client ? <ClientScore rating={client} /> : null}
          </div>
        </div>
        {client ? <PaidOnTime rating={client} /> : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-line p-4 @md:flex-row @md:items-center @md:justify-between sm:px-5">
        <p className="text-small text-muted">
          Posted {postedAgo(post.postedAt, now)}
          {post.closesAt ? ` · Closes ${formatShortDay(post.closesAt)}` : ''} ·{' '}
          {post.quoteCount === 0 ? 'No quotes yet' : plural(post.quoteCount, 'quote')}
        </p>
        {quoted ? (
          <Link to={to} className={cn(buttonVariants({ variant: 'soft' }), '@max-md:w-full')}>
            <CheckCircleIcon weight="fill" aria-hidden />
            Quote sent{myQuoteTotal !== undefined ? `: ${formatPence(myQuoteTotal)}` : ''}
            <CaretRightIcon weight="bold" aria-hidden />
          </Link>
        ) : (
          <Link
            to={to}
            className={cn(
              buttonVariants({ variant: primary ? 'primary' : 'secondary' }),
              '@max-md:w-full',
            )}
          >
            <PaperPlaneTiltIcon weight="bold" aria-hidden />
            Send a quote
            <span className="sr-only">: {post.title}</span>
          </Link>
        )}
      </div>
    </article>
  )
}

/** A short version for the Today screen: what, where, and the client's payment record. */
export function PostTeaser({
  post,
  client,
}: {
  post: JobBoardPost
  client: ClientRating | undefined
}) {
  return (
    <li>
      <Link
        to={`/trade/board/${post.jobId}`}
        className="group flex flex-col gap-2 rounded-card border border-line bg-surface p-4 text-ink no-underline shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={post.urgency} size="sm" />
          <DistanceBadge post={post} />
        </span>
        <span className="flex items-start justify-between gap-2">
          <span className="leading-snug font-bold">{post.title}</span>
          <CaretRightIcon
            weight="bold"
            aria-hidden
            className="mt-1 size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          />
        </span>
        <span className="text-small text-muted">
          {post.neighbourhood} · {post.postcodeDistrict}
        </span>
        {client ? <PaidOnTime rating={client} as="span" className="text-small" /> : null}
      </Link>
    </li>
  )
}
