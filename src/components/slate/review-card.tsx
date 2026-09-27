import type { ReactNode } from 'react'
import {
  ArrowBendDownRightIcon,
  ArrowBendUpLeftIcon,
  CalendarBlankIcon,
  FlagIcon,
  HourglassMediumIcon,
  LockSimpleIcon,
  PencilSimpleLineIcon,
  ScalesIcon,
} from '@phosphor-icons/react'
import { RATING_RULES, RELATIONSHIPS } from '@/domain/criteria'
import {
  ROLE_LABELS,
  type IsoDateTime,
  type PublicReview,
  type RatingDirection,
  type ReviewContext,
  type ReviewerLabel,
  type Role,
  type SealRule,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RoleIcon } from '@/components/ui/role-icon'
import { formatDate, formatMonthYear, formatScore } from './format'
import { ScoreBar } from './score-bar'
import { answerWords, scoreWords } from './score-words'

export function subjectRoleOf(direction: RatingDirection): Role {
  return direction.split('->')[1] as Role
}

/** "Verified tenant · AB10 · 2025": reviewers are never named (SPEC §5 rule 9). */
export function reviewerText(reviewer: ReviewerLabel) {
  return `Verified ${ROLE_LABELS[reviewer.role].toLowerCase()} · ${reviewer.postcodeDistrict} · ${reviewer.year}`
}

function contextText(context: ReviewContext) {
  if (context.kind === 'job')
    return `Repair: ${context.title} · done ${formatDate(context.completedAt)}`
  const end = context.endDate ? formatMonthYear(context.endDate) : 'now'
  return `Tenancy · ${formatMonthYear(context.startDate)} to ${end}`
}

function ReviewerMark({ role }: { role: Role }) {
  return (
    <span
      aria-hidden="true"
      data-role-accent={role}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
    >
      <RoleIcon role={role} weight="bold" className="size-5" />
    </span>
  )
}

function Note({
  icon,
  title,
  date,
  children,
  indent,
}: {
  icon: ReactNode
  title: ReactNode
  date?: IsoDateTime
  children?: ReactNode
  indent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        indent && 'ml-2 border-l-2 border-input-border pl-4 sm:ml-5',
      )}
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small">
        <span className="flex items-center gap-1.5 font-semibold text-ink [&_svg]:size-4 [&_svg]:shrink-0">
          {icon}
          {title}
        </span>
        {date ? <span className="text-muted">{formatDate(date)}</span> : null}
      </p>
      {children ? <p className="text-body text-ink">{children}</p> : null}
    </div>
  )
}

export interface ReviewCardProps {
  review: PublicReview
  /** Opens the report sheet (four routes, SPEC §6). Shown on every review. */
  onReport?: () => void
  /** Shown to the person rated while they can still reply and haven't. */
  onReply?: () => void
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/**
 * One revealed review: who (never by name), what it was about, the answers in words, the
 * reviewer's opinion, and everything added afterwards. The rating itself never changes: replies,
 * updates and disputes sit beside it with their own dates.
 */
export function ReviewCard({
  review,
  onReport,
  onReply,
  headingLevel: Heading = 'h3',
  className,
}: ReviewCardProps) {
  const raterRole = review.reviewer.role
  const subjectRole = subjectRoleOf(review.direction)
  const subjectWord = ROLE_LABELS[subjectRole].toLowerCase()
  const relationship = RELATIONSHIPS[review.direction]
  const answered = relationship.criteria.flatMap((criterion) => {
    const score = review.answers[criterion.id as keyof typeof review.answers]
    return score === undefined ? [] : [{ criterion, score }]
  })

  return (
    <article
      className={cn(
        '@container flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5',
        className,
      )}
    >
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <ReviewerMark role={raterRole} />
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
          {/* "Verified tenant · AB11 · 2025". When narrow, the place and year wrap as one piece and
              the dot before them is clipped, so no line starts with it. Screen readers get one
              dot, from the hidden text, rather than the drawn one. */}
          <Heading className="flex flex-wrap items-baseline gap-x-3 overflow-hidden text-ink">
            <span className="font-semibold">
              Verified {ROLE_LABELS[review.reviewer.role].toLowerCase()}
            </span>
            <span className="relative whitespace-nowrap text-muted">
              <span aria-hidden="true" className="absolute -left-1.5 -translate-x-1/2">
                ·
              </span>
              <span className="sr-only">{' · '}</span>
              {review.reviewer.postcodeDistrict} · {review.reviewer.year}
            </span>
          </Heading>
          <p className="text-small text-muted">{contextText(review.context)}</p>
        </div>
        {/* Beside the reviewer when there's room; its own line under them on a narrow card. */}
        <p className="flex items-baseline gap-2 @max-sm:basis-full @max-sm:pl-13 @sm:flex-col @sm:items-end @sm:gap-0.5 @sm:text-right">
          <span className="font-display figures text-display-m leading-none font-semibold text-ink">
            {formatScore(review.score)}
          </span>
          <span className="sr-only"> out of 5, </span>
          <span className="text-caption text-muted">{scoreWords(review.score)}</span>
        </p>
      </header>

      {review.pendingFakeCheck ? (
        <p className="flex items-start gap-2 rounded-control bg-info-tint px-3 py-2.5 text-small text-info">
          <HourglassMediumIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-semibold">Pending check.</span> Reported as a possible fake
            review. It stays up while we look into it.
          </span>
        </p>
      ) : null}

      {answered.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {answered.map(({ criterion, score }) => (
            // Each question and its answer sit directly in one wrapper, as a <dl> needs. The answer
            // never breaks mid-phrase; if there's no room it drops to its own line. The bar is a
            // picture of the same answer, so screen readers skip it.
            <div
              key={criterion.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-small"
            >
              <dt className="text-muted">{criterion.short}</dt>
              <dd className="ml-auto text-right font-semibold whitespace-nowrap text-ink">
                {answerWords(criterion.scale, score)}
              </dd>
              <dd aria-hidden="true" className="basis-full">
                <ScoreBar value={score} max={5} size="sm" />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {review.comment ? (
        <figure className="flex flex-col gap-1.5 rounded-control bg-surface-2 px-4 py-3.5">
          <figcaption className="text-small font-semibold text-muted">
            {ROLE_LABELS[raterRole]}&rsquo;s opinion
          </figcaption>
          <blockquote className="text-body text-ink">{review.comment}</blockquote>
          {review.corrected ? (
            <p className="text-caption text-muted">
              Corrected by moderation (spelling or obscenity only).
            </p>
          ) : null}
        </figure>
      ) : null}

      {review.update || review.dispute || review.reply ? (
        <div className="flex flex-col gap-4">
          {review.update ? (
            <Note
              icon={<PencilSimpleLineIcon weight="bold" aria-hidden />}
              title="Update from the reviewer"
              date={review.update.postedAt}
            >
              {review.update.body}
            </Note>
          ) : null}
          {review.dispute ? (
            <Note
              icon={<ScalesIcon weight="bold" aria-hidden />}
              title={`${ROLE_LABELS[subjectRole]} disputes this`}
              date={review.dispute.createdAt}
            />
          ) : null}
          {review.reply ? (
            <Note
              indent
              icon={<ArrowBendDownRightIcon weight="bold" aria-hidden />}
              title={`Reply from the ${subjectWord}`}
              date={review.reply.postedAt}
            >
              {review.reply.body}
            </Note>
          ) : null}
        </div>
      ) : null}

      {onReport || (onReply && !review.reply) ? (
        <footer className="-mb-1 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-caption text-muted">Revealed {formatDate(review.revealedAt)}</p>
          <div className="flex flex-wrap gap-2">
            {onReply && !review.reply ? (
              <Button
                variant="soft"
                size="sm"
                iconStart={<ArrowBendUpLeftIcon weight="bold" aria-hidden />}
                onClick={onReply}
              >
                Reply
              </Button>
            ) : null}
            {onReport ? (
              <Button
                variant="ghost"
                size="sm"
                iconStart={<FlagIcon weight="bold" aria-hidden />}
                onClick={onReport}
              >
                Report
              </Button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </article>
  )
}

export interface SealedReviewCardProps {
  seal: SealRule
  /** Who wrote it. */
  raterRole: Role
  /** The latest reveal date, when there is one. */
  revealAt: IsoDateTime | null
  /** e.g. "Repair: Leak under the kitchen sink". */
  context?: string
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

/** A submitted rating nobody can read yet: double-blind, or held back by the retaliation shield. */
export function SealedReviewCard({
  seal,
  raterRole,
  revealAt,
  context,
  headingLevel: Heading = 'h3',
  className,
}: SealedReviewCardProps) {
  const shield = seal === 'retaliation_shield'
  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-card border border-dashed border-input-border bg-surface-2 p-4 sm:p-5',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-soft"
      >
        <LockSimpleIcon weight="bold" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="font-semibold text-ink">
          Sealed rating from a verified {ROLE_LABELS[raterRole].toLowerCase()}
        </Heading>
        {context ? <p className="text-small text-muted">{context}</p> : null}
        <p className="text-body text-ink">
          {shield
            ? `Only ever shared inside an overall score: at the end of the tenancy, or once ${RATING_RULES.shieldReleaseTenantRaters} different tenants have rated. Never shown on its own.`
            : 'Revealed together with the other side’s rating once both have rated, so neither can react to the other.'}
        </p>
        {!shield && revealAt ? (
          <p className="flex items-center gap-1.5 text-small text-muted">
            <CalendarBlankIcon weight="bold" aria-hidden className="size-4" />
            Revealed by {formatDate(revealAt)} at the latest
          </p>
        ) : null}
      </div>
    </article>
  )
}
