// "While you were away": read once when the home screen opens and kept on screen, then marked as
// seen when the tenant leaves it (marking empties the feed, so it must come second). When there's
// nothing new, recent activity falls back to the latest notifications, so it's never blank.

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  FileTextIcon,
  FlagIcon,
  HouseIcon,
  IdentificationCardIcon,
  StarIcon,
  UserIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { AwayCategory, AwayFeed, AwayItem } from '@/data/api'
import { useSlate } from '@/data'
import type { IsoDateTime, NotificationKind, NotificationRecord } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { Skeleton } from '@/components/ui/skeleton'
import { timeAgo } from '@/routes/_shell'
import { useViewer } from '@/session'

const CATEGORY_ICONS: Record<AwayCategory, Icon> = {
  repairs: WrenchIcon,
  quotes: WrenchIcon,
  visits: CalendarCheckIcon,
  payments: FileTextIcon,
  messages: ChatCircleTextIcon,
  ratings: StarIcon,
  documents: FileTextIcon,
  tenancies: HouseIcon,
  team: UserIcon,
  reports: FlagIcon,
  passport: IdentificationCardIcon,
  account: UserIcon,
}

const KIND_CATEGORY: Partial<Record<NotificationKind, AwayCategory>> = {
  visit_booked: 'visits',
  visit_cancelled: 'visits',
  message: 'messages',
  rating_open: 'ratings',
  rating_reminder: 'ratings',
  ratings_revealed: 'ratings',
  review_reply: 'ratings',
  review_update: 'ratings',
  review_disputed: 'ratings',
  report_update: 'reports',
  document_due_soon: 'documents',
  document_expired: 'documents',
  passport_viewed: 'passport',
  tenancy_to_confirm: 'tenancies',
  tenancy_confirmed: 'tenancies',
  verification_checked: 'account',
}

/** How many recent notifications stand in when nothing is new. */
const RECENT_LIMIT = 4

function asActivity(notification: NotificationRecord): AwayItem {
  return {
    key: notification.id,
    category: KIND_CATEGORY[notification.kind] ?? 'repairs',
    title: notification.title,
    ...(notification.body ? { body: notification.body } : {}),
    href: notification.href,
    at: notification.createdAt,
    count: 1,
    unread: !notification.readAt,
  }
}

// A pending "seen" is cancelled if the home screen mounts again straight away (React's strict
// mode does exactly that in development), so the feed isn't emptied while it's on screen.
let pendingSeen: number | undefined

/** Reads the feed once and marks it seen on leaving. */
export function useAwayFeed(): AwayFeed | null | undefined {
  const { api } = useSlate()
  const viewer = useViewer()
  const [feed, setFeed] = useState<AwayFeed | null | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(pendingSeen)
    let live = true
    api
      .getAwayFeed(viewer)
      .then((result) => live && setFeed(result))
      .catch(() => live && setFeed(null))
    return () => {
      live = false
      pendingSeen = window.setTimeout(() => {
        void api.markAwaySeen(viewer).catch(() => undefined)
      }, 0)
    }
  }, [api, viewer])

  return feed
}

export function AwaySummary({ feed, className }: { feed: AwayFeed; className?: string }) {
  if (!feed.summary) return null
  return (
    <p
      className={cn(
        'inline-flex max-w-full items-center gap-2 self-start rounded-full bg-surface py-1.5 pr-3.5 pl-2 text-small text-ink shadow-soft ring-1 ring-line',
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
      {feed.summary}
    </p>
  )
}

export function ActivityList({
  feed,
  recent = [],
  now,
  className,
}: {
  feed: AwayFeed | null | undefined
  /** The latest notifications, newest first, shown when the feed has nothing new. */
  recent?: readonly NotificationRecord[]
  now: IsoDateTime
  className?: string
}) {
  if (feed === undefined) {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  const items = feed?.items.length ? feed.items : recent.slice(0, RECENT_LIMIT).map(asActivity)
  if (items.length === 0) {
    return (
      <p
        className={cn(
          'rounded-card border border-dashed border-line p-4 text-small text-muted',
          className,
        )}
      >
        Nothing here yet. Updates on your repairs and messages will show here.
      </p>
    )
  }
  return (
    <ul className={cn('flex flex-col', className)}>
      {items.map((item) => {
        const Glyph = CATEGORY_ICONS[item.category]
        return (
          <li key={item.key} className="border-b border-line last:border-b-0">
            <Link
              to={item.href}
              className="flex items-start gap-3 rounded-control py-3 no-underline transition-colors duration-(--duration-quick) hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden="true"
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
              >
                <Glyph weight="bold" className="size-4.5" />
                {item.unread ? (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-surface" />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body leading-snug font-semibold text-ink">
                  {item.title}
                  {item.unread ? <span className="sr-only"> (new)</span> : null}
                </span>
                {item.body ? (
                  <span className="line-clamp-2 text-small text-muted">{item.body}</span>
                ) : null}
                <span className="text-caption text-muted">
                  {timeAgo(item.at, now)}
                  {item.count > 1 ? ` · ${item.count} updates` : ''}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
