// An upcoming visit: when, who, what for, and the written notice behind it (48 hours in
// Scotland, except in an emergency).

import { Link } from 'react-router'
import { CaretRightIcon, CheckCircleIcon, WarningOctagonIcon } from '@phosphor-icons/react'
import {
  LETTING_RULES,
  type IsoDateTime,
  type Job,
  type PersonCard,
  type Visit,
} from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatWeekday } from '@/components/slate/format'
import { tradeWord } from '../lib/jobs'
import { clock, dueIn, noticeText } from '../lib/format'
import { PersonLine } from './basics'

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Europe/London' })
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Europe/London' })
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/London' })

/** A small calendar leaf: "Tue / 29 / Sep". */
export function DateLeaf({ at, className }: { at: IsoDateTime; className?: string }) {
  const date = new Date(at)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex w-15 shrink-0 flex-col items-center overflow-hidden rounded-control border border-line bg-surface text-center shadow-soft',
        className,
      )}
    >
      <span className="w-full bg-accent py-0.5 text-caption font-bold tracking-wide text-on-accent uppercase">
        {WEEKDAY.format(date)}
      </span>
      <span className="font-display figures pt-1 text-display-m leading-none font-semibold text-ink">
        {DAY.format(date)}
      </span>
      <span className="pb-1.5 text-caption text-muted">{MONTH.format(date)}</span>
    </span>
  )
}

/** The notice line: how much written notice was given, against the 48-hour rule. */
export function NoticeLine({ visit, className }: { visit: Visit; className?: string }) {
  const { notice } = visit
  if (notice.emergency) {
    return (
      <p className={cn('flex items-start gap-2 text-small text-ink', className)}>
        <WarningOctagonIcon
          weight="bold"
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-critical"
        />
        <span>
          Emergency visit, so the {LETTING_RULES.visitNoticeHours}-hour notice rule doesn’t apply.
          They gave notice {formatWeekday(notice.givenAt)} at {clock(notice.givenAt)}.
        </span>
      </p>
    )
  }
  return (
    <p className={cn('flex items-start gap-2 text-small text-ink', className)}>
      <CheckCircleIcon weight="fill" aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
      <span>
        Written notice given {formatWeekday(notice.givenAt)}:{' '}
        <span className="font-semibold">{noticeText(notice.hoursGiven)} ahead</span>. The law asks
        for at least {LETTING_RULES.visitNoticeHours} hours.
      </span>
    </p>
  )
}

export function VisitCard({
  job,
  visit,
  trade,
  now,
  className,
}: {
  job: Pick<Job, 'id' | 'title'>
  visit: Visit
  trade: PersonCard | undefined
  now: IsoDateTime
  className?: string
}) {
  const onSite = visit.status === 'on_site'
  return (
    <article
      className={cn(
        'group relative flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <DateLeaf at={visit.startsAt} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-small font-semibold text-accent-text">
            {onSite ? 'On site now' : dueIn(visit.startsAt, now)}
          </p>
          <h3 className="text-body-l leading-snug font-semibold text-ink">
            <Link
              to={`/tenant/jobs/${job.id}`}
              className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-card"
            >
              {clock(visit.startsAt)} to {clock(visit.endsAt)}
            </Link>
          </h3>
          <p className="text-small text-muted">{job.title}</p>
        </div>
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="mt-1.5 size-4 shrink-0 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
        />
      </div>
      {trade ? (
        <PersonLine
          person={trade}
          role="trade"
          size="sm"
          subtitle={`${tradeWord(trade).replace(/^./, (c) => c.toUpperCase())}${trade.tradeProfile ? ` · ${trade.tradeProfile.businessName}` : ''}`}
        />
      ) : null}
      <NoticeLine visit={visit} className="border-t border-line pt-3" />
    </article>
  )
}
