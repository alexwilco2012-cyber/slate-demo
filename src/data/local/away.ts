// "While you were away": the notifications a portal received since its home screen was last
// seen, rolled up so a busy conversation reads as one line, with a one-sentence summary on top.

import { AWAY_CATEGORIES, type AwayCategory, type AwayFeed, type AwayItem } from '@/data/api'
import type {
  IsoDateTime,
  NotificationKind,
  NotificationRecord,
  PersonId,
  Role,
} from '@/domain/types'
import { addDays, sinceText } from './dates'
import type { Reader } from './tx'

const CATEGORY_OF = {
  job_reported: 'repairs',
  job_approved: 'repairs',
  job_declined: 'repairs',
  job_cancelled: 'repairs',
  trade_instructed: 'repairs',
  job_completed: 'repairs',
  job_confirmed: 'repairs',
  quote_received: 'quotes',
  quote_accepted: 'quotes',
  quote_declined: 'quotes',
  quote_withdrawn: 'quotes',
  visit_booked: 'visits',
  visit_cancelled: 'visits',
  payment: 'payments',
  message: 'messages',
  tenancy_to_confirm: 'tenancies',
  tenancy_confirmed: 'tenancies',
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
  verification_checked: 'account',
  team_invite: 'team',
} as const satisfies Record<NotificationKind, AwayCategory>

/** Singular nouns for the summary line; an "s" is added for more than one. */
const NOUN: Record<AwayCategory, string> = {
  repairs: 'repair update',
  quotes: 'quote update',
  visits: 'visit update',
  payments: 'payment update',
  messages: 'message',
  ratings: 'rating update',
  documents: 'certificate reminder',
  tenancies: 'tenancy update',
  team: 'team update',
  reports: 'report update',
  passport: 'passport view',
  account: 'account update',
}

/** When "away" starts if the portal's home has never been seen. */
const FIRST_VISIT_DAYS = 7

export function awaySince(db: Reader, personId: PersonId, role: Role): IsoDateTime {
  return db.get('people', personId)?.lastSeen?.[role] ?? addDays(db.now, -FIRST_VISIT_DAYS)
}

function itemFrom(db: Reader, group: NotificationRecord[]): AwayItem {
  const [latest] = group
  if (!latest) throw new Error('An away item needs at least one notification')
  const category = CATEGORY_OF[latest.kind]
  const item: AwayItem = {
    key: `${latest.kind}|${latest.href}`,
    category,
    title: latest.title,
    href: latest.href,
    at: latest.createdAt,
    count: group.length,
    unread: group.some((n) => !n.readAt),
  }
  if (category === 'messages' && group.length > 1) {
    const messageId = latest.ref?.entity === 'message' ? latest.ref.id : undefined
    const thread = db.get('threads', db.get('messages', messageId)?.threadId)
    item.title = `${group.length} new messages${thread ? `: ${thread.title}` : ''}`
  }
  if (latest.body) item.body = latest.body
  return item
}

function summaryOf(items: readonly AwayItem[], since: IsoDateTime, now: IsoDateTime) {
  const counts = new Map<AwayCategory, number>()
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + item.count)
  const parts = AWAY_CATEGORIES.flatMap((category) => {
    const count = counts.get(category)
    return count ? [`${count} ${NOUN[category]}${count === 1 ? '' : 's'}`] : []
  })
  if (parts.length === 0) return null
  const list =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
  return `Since ${sinceText(since, now)}: ${list}.`
}

export function awayFeed(
  db: Reader,
  personId: PersonId,
  role: Role,
  since: IsoDateTime = awaySince(db, personId, role),
): AwayFeed {
  const recent = db
    .rows('notifications')
    .filter((n) => n.recipientId === personId && n.role === role && n.createdAt > since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const groups = new Map<string, NotificationRecord[]>()
  for (const notification of recent) {
    const key = `${notification.kind}|${notification.href}`
    groups.set(key, [...(groups.get(key) ?? []), notification])
  }
  const items = [...groups.values()].map((group) => itemFrom(db, group))
  return { since, summary: summaryOf(items, since, db.now), items }
}
