// Messages: every conversation the tenant is part of, one per repair or tenancy, newest first.

import { Link } from 'react-router'
import {
  CaretRightIcon,
  ChatsCircleIcon,
  HouseLineIcon,
  SpeakerSlashIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage, timeAgo } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QueryError } from '../components/basics'
import { loadPeople } from '../lib/data'
import { firstName } from '../lib/format'

export function MessagesPage() {
  const viewer = useViewer()
  const now = useDemoNow()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const threads = await api.listThreads(viewer)
      const people = await loadPeople(
        api,
        viewer,
        threads.flatMap((t) => [
          ...t.thread.members.map((m) => m.personId),
          t.lastMessage?.author?.personId,
        ]),
      )
      return { threads, people }
    },
    [viewer],
  )

  const threads = [...(state.data?.threads ?? [])].sort((a, b) =>
    (b.thread.lastMessageAt ?? b.thread.createdAt).localeCompare(
      a.thread.lastMessageAt ?? a.thread.createdAt,
    ),
  )
  const unread = threads.filter((t) => t.unreadCount > 0).length

  return (
    <PortalPage title="Messages">
      <PageHeader
        title="Messages"
        description={
          unread > 0
            ? `${unread} ${unread === 1 ? 'conversation has' : 'conversations have'} something new.`
            : 'One conversation for each repair, and one for your tenancy.'
        }
      />
      {state.status === 'loading' ? (
        <LoadingRegion label="Loading your messages" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-4"
            >
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            </div>
          ))}
        </LoadingRegion>
      ) : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your messages" onRetry={refresh} />
      ) : null}
      {state.data && threads.length === 0 ? (
        <EmptyState
          icon={ChatsCircleIcon}
          headingLevel="h2"
          title="No conversations yet"
          description="When you report a problem, a conversation with your landlord starts on it. Your tenancy has one too."
        />
      ) : null}
      {state.data && threads.length > 0 ? (
        <ul className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          {threads.map(({ thread, lastMessage, unreadCount }) => {
            const others = thread.members.filter((m) => m.personId !== viewer.personId)
            const me = thread.members.find((m) => m.personId === viewer.personId)
            const lead = others[0] ? state.data!.people.get(others[0].personId) : undefined
            const author = lastMessage?.author
              ? state.data!.people.get(lastMessage.author.personId)
              : undefined
            const who = lastMessage?.author
              ? lastMessage.author.personId === viewer.personId
                ? 'You'
                : firstName(author?.displayName ?? 'Someone')
              : null
            const ContextGlyph = thread.context.kind === 'job' ? WrenchIcon : HouseLineIcon
            return (
              <li key={thread.id} className="border-b border-line last:border-b-0">
                <Link
                  to={`/tenant/messages/${thread.id}`}
                  className="flex items-start gap-3 px-4 py-4 no-underline transition-colors duration-(--duration-quick) hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                >
                  <span className="relative shrink-0">
                    {lead ? (
                      <Avatar
                        name={lead.displayName}
                        seed={lead.avatarSeed}
                        role={others[0]!.role}
                        size="md"
                        decorative
                      />
                    ) : (
                      <span className="flex size-11 items-center justify-center rounded-full bg-surface-2">
                        <ChatsCircleIcon aria-hidden className="size-5" />
                      </span>
                    )}
                    {others.length > 1 ? (
                      <span className="figures absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-surface px-1 text-[0.6875rem] font-bold text-ink shadow-soft ring-1 ring-line">
                        +{others.length - 1}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {/* Titles wrap rather than truncate: on a phone the job's name is the point. */}
                    <span
                      className={cn(
                        'line-clamp-2 text-body leading-snug text-ink',
                        unreadCount > 0 ? 'font-bold' : 'font-semibold',
                      )}
                    >
                      {thread.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-caption text-muted">
                      <ContextGlyph weight="bold" aria-hidden className="size-3.5" />
                      {thread.context.kind === 'job' ? 'Repair' : 'Tenancy'}
                      {lastMessage ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <time dateTime={lastMessage.sentAt}>
                            {timeAgo(lastMessage.sentAt, now)}
                          </time>
                        </>
                      ) : null}
                      {me?.mutedAt ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <SpeakerSlashIcon weight="bold" aria-hidden className="size-3.5" />
                          Muted
                        </>
                      ) : null}
                    </span>
                    {lastMessage ? (
                      <span
                        className={cn(
                          'mt-0.5 line-clamp-2 text-small',
                          unreadCount > 0 ? 'text-ink' : 'text-muted',
                        )}
                      >
                        {who ? `${who}: ` : ''}
                        {lastMessage.body}
                      </span>
                    ) : null}
                  </span>
                  {unreadCount > 0 ? (
                    <span className="figures mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-caption font-bold text-on-accent">
                      {unreadCount}
                      <span className="sr-only"> new</span>
                    </span>
                  ) : (
                    <CaretRightIcon
                      weight="bold"
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-muted"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </PortalPage>
  )
}
