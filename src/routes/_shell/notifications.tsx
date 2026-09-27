import { useState } from 'react'
import { Link } from 'react-router'
import { Popover } from '@base-ui/react/popover'
import {
  BellIcon,
  BellSimpleIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  ChatCircleTextIcon,
  ChecksIcon,
  CurrencyGbpIcon,
  EnvelopeOpenIcon,
  EyeIcon,
  FileTextIcon,
  FlagIcon,
  HouseLineIcon,
  PencilSimpleLineIcon,
  ReceiptIcon,
  SealCheckIcon,
  UserPlusIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import type { NotificationRecord } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { iconButtonVariants } from '@/components/ui/icon-button'
import { usePortalContainer } from '@/components/ui/portal-container'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/components/slate/format'
import { useViewer } from '@/session'
import { useFocusAfterLink } from './route-effects'

// Keyed by string rather than NotificationKind so a new kind can't break the shell: anything
// unlisted gets the bell.
const KIND_ICONS: Readonly<Record<string, Icon | undefined>> = {
  job_reported: WrenchIcon,
  job_approved: WrenchIcon,
  job_declined: WrenchIcon,
  job_cancelled: WrenchIcon,
  trade_instructed: WrenchIcon,
  quote_received: ReceiptIcon,
  quote_accepted: ReceiptIcon,
  quote_declined: ReceiptIcon,
  quote_withdrawn: ReceiptIcon,
  payment: CurrencyGbpIcon,
  visit_booked: CalendarCheckIcon,
  visit_cancelled: CalendarXIcon,
  job_completed: ChecksIcon,
  job_confirmed: ChecksIcon,
  message: ChatCircleTextIcon,
  tenancy_to_confirm: HouseLineIcon,
  tenancy_confirmed: HouseLineIcon,
  rating_open: PencilSimpleLineIcon,
  rating_reminder: PencilSimpleLineIcon,
  ratings_revealed: EnvelopeOpenIcon,
  review_reply: ChatCircleTextIcon,
  review_update: ChatCircleTextIcon,
  review_disputed: FlagIcon,
  report_update: FlagIcon,
  document_due_soon: FileTextIcon,
  document_expired: FileTextIcon,
  passport_viewed: EyeIcon,
  verification_checked: SealCheckIcon,
  team_invite: UserPlusIcon,
}

const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })

/** "Just now", "20 minutes ago", "Yesterday", "3 days ago", then the date. */
export function timeAgo(at: string, now: string): string {
  const minutes = Math.round((Date.parse(now) - Date.parse(at)) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return capitalise(relative.format(-days, 'day'))
  return formatDate(at)
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The bell in the header, with the unread count, and the panel it opens. */
export function NotificationBell() {
  const viewer = useViewer()
  const { api } = useSlate()
  const now = useDemoNow()
  const container = usePortalContainer()
  const [open, setOpen] = useState(false)
  const { followLink, finalFocus } = useFocusAfterLink()
  const { state } = useSlateQuery((a) => a.listNotifications(viewer), [viewer])
  const notifications = state.data ?? []
  const unread = notifications.filter((n) => !n.readAt).length

  function openOne(notification: NotificationRecord) {
    followLink()
    setOpen(false)
    if (!notification.readAt) void api.markNotificationsRead(viewer, [notification.id])
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className={cn(
          iconButtonVariants({ variant: 'ghost', size: 'md' }),
          'size-11 data-popup-open:bg-surface-2',
        )}
      >
        {unread ? <BellIcon weight="regular" aria-hidden /> : <BellSimpleIcon aria-hidden />}
        {unread ? (
          <span
            aria-hidden="true"
            className="figures absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.75rem] leading-none font-bold text-on-accent ring-2 ring-bg"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-(--z-overlay)"
        >
          <Popover.Popup
            finalFocus={finalFocus}
            className={cn(
              'flex max-h-[min(34rem,var(--available-height))] w-[min(26rem,calc(100vw-1.5rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-card border border-line bg-surface text-ink shadow-overlay outline-none',
              'transition-[opacity,scale] duration-(--duration-quick) ease-out-soft data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0',
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <Popover.Title className="font-display text-title font-semibold">
                Notifications
              </Popover.Title>
              {unread ? (
                <button
                  type="button"
                  onClick={() => void api.markNotificationsRead(viewer, 'all')}
                  className="-mr-2 inline-flex min-h-(--control-h-sm) items-center gap-1.5 rounded-control px-2 text-small font-semibold text-accent-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ChecksIcon weight="bold" aria-hidden className="size-4" />
                  Mark all as read
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {state.status === 'loading' ? (
                <NotificationSkeleton />
              ) : notifications.length === 0 ? (
                <Popover.Description className="flex flex-col items-center gap-2 px-6 py-10 text-center text-body text-muted">
                  <BellSimpleIcon
                    weight="duotone"
                    aria-hidden
                    className="size-9 text-accent-text"
                  />
                  <span className="font-semibold text-ink">Nothing new</span>
                  Updates on your repairs, messages and ratings show here.
                </Popover.Description>
              ) : (
                <ul className="flex flex-col py-1.5">
                  {notifications.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      now={now}
                      onOpen={() => openOne(notification)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function NotificationRow({
  notification,
  now,
  onOpen,
}: {
  notification: NotificationRecord
  now: string
  onOpen: () => void
}) {
  const Glyph = KIND_ICONS[notification.kind] ?? BellSimpleIcon
  const isUnread = !notification.readAt
  return (
    <li>
      <Link
        to={notification.href}
        onClick={onOpen}
        className="group mx-1.5 flex gap-3 rounded-control px-2.5 py-3 text-ink no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
            isUnread ? 'bg-accent-tint text-accent-text' : 'bg-surface-2 text-muted',
          )}
        >
          <Glyph weight={isUnread ? 'fill' : 'regular'} className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn('text-body leading-snug', isUnread && 'font-semibold')}>
            {isUnread ? <span className="sr-only">Unread: </span> : null}
            {notification.title}
          </span>
          {notification.body ? (
            <span className="line-clamp-2 text-small text-muted">{notification.body}</span>
          ) : null}
          <span className="text-caption text-muted">{timeAgo(notification.createdAt, now)}</span>
        </span>
        {isUnread ? (
          <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" />
        ) : null}
      </Link>
    </li>
  )
}

function NotificationSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 px-4 py-4">
      <span className="sr-only">Loading notifications</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
