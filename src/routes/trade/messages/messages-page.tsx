// Every conversation the trade is in, newest first. Each opens on its job, where the chat sits
// beside the details.

import { Link } from 'react-router'
import { ChatsCircleIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import type { PersonCard } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage, timeAgo } from '@/routes/_shell'
import { useViewer } from '@/session'
import { LoadError, PageSkeleton } from '../components/page-bits'
import { firstNameOf } from '../lib/job'
import { peopleById } from '../lib/queries'

export default function MessagesPage() {
  const viewer = useViewer()
  const now = useDemoNow()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const threads = await api.listThreads(viewer)
      const people = await api.getPeople(viewer, [
        ...new Set(
          threads.flatMap(({ thread }) => thread.members.map((member) => member.personId)),
        ),
      ])
      return {
        threads: [...threads].sort((a, b) =>
          (b.lastMessage?.sentAt ?? b.thread.createdAt).localeCompare(
            a.lastMessage?.sentAt ?? a.thread.createdAt,
          ),
        ),
        people: peopleById(people),
      }
    },
    [viewer],
  )

  return (
    <PortalPage title="Messages">
      <PageHeader
        title="Messages"
        description="One conversation per job, with the tenant and the landlord."
      />
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading your messages" />
      ) : !state.data ? (
        <LoadError what="your messages" onRetry={refresh} />
      ) : state.data.threads.length === 0 ? (
        <EmptyState
          icon={ChatsCircleIcon}
          headingLevel="h2"
          title="No conversations yet"
          description="When a landlord chooses you for a job, its conversation starts here."
          action={
            <Link to="/trade/board" className={buttonVariants({ variant: 'primary' })}>
              Find work on the job board
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {state.data.threads.map(({ thread, lastMessage, unreadCount }) => {
            const others = thread.members.filter((member) => member.personId !== viewer.personId)
            const first: PersonCard | undefined = others
              .map((member) => state.data?.people[member.personId])
              .find(Boolean)
            const names = others
              .map((member) => firstNameOf(state.data?.people[member.personId]?.displayName, ''))
              .filter(Boolean)
              .join(', ')
              .replace(/, ([^,]*)$/, ' and $1')
            const author = lastMessage?.author
            const who = !author
              ? ''
              : author.personId === viewer.personId
                ? 'You: '
                : `${firstNameOf(state.data?.people[author.personId]?.displayName, '')}: `
            const unread = unreadCount > 0
            return (
              <li key={thread.id}>
                <Link
                  to={`/trade/messages/${thread.id}`}
                  className={cn(
                    'flex items-start gap-3.5 rounded-card border bg-surface p-4 text-ink no-underline shadow-soft',
                    'transition-[box-shadow,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:shadow-raised',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    unread ? 'border-accent-strong' : 'border-line',
                  )}
                >
                  {first ? (
                    <Avatar
                      name={first.displayName}
                      seed={first.avatarSeed}
                      role={others[0]?.role}
                      decorative
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('leading-snug', unread ? 'font-bold' : 'font-semibold')}>
                      {thread.title}
                    </span>
                    <span className="text-small text-muted">
                      With {names}
                      {lastMessage ? ` · ${timeAgo(lastMessage.sentAt, now)}` : ''}
                    </span>
                    {lastMessage ? (
                      <span className={cn('line-clamp-2', unread ? 'text-ink' : 'text-muted')}>
                        {who}
                        {lastMessage.body || 'Sent a photo'}
                      </span>
                    ) : null}
                  </span>
                  {unread ? (
                    <span className="figures flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-accent px-2 text-small font-bold text-on-accent">
                      {unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </PortalPage>
  )
}
