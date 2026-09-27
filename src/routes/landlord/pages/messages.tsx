// Conversations on each repair and tenancy. From 1024px the list and the open conversation sit
// side by side; on phones the conversation is its own page. Every message carries a role chip,
// and anyone else's message can be reported; people can be muted or blocked.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowRightIcon,
  BellSimpleSlashIcon,
  BellSimpleIcon,
  CaretLeftIcon,
  ChatsCircleIcon,
  ProhibitIcon,
  WrenchIcon,
  HouseLineIcon,
} from '@phosphor-icons/react'
import { isPlaceholder, useDemoNow, useSlate, useSlateQuery, type ThreadSummary } from '@/data'
import {
  ROLE_LABELS,
  type Message,
  type PersonCard,
  type PersonId,
  type ThreadId,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import {
  MessageComposer,
  MessageThread,
  type ThreadMessage,
} from '@/components/slate/message-thread'
import { RoleChip } from '@/components/slate/role-chip'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage, timeAgo } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ReportDialog } from '../components/report-dialog'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { usePeople } from '../lib/data'
import { reveal } from '../lib/dom'
import { errorMessage } from '../lib/errors'
import { firstName } from '../lib/format'

type People = ReadonlyMap<PersonId, PersonCard>

function contextHref(summary: ThreadSummary) {
  const { context } = summary.thread
  return context.kind === 'job'
    ? `/landlord/jobs/${context.jobId}`
    : `/landlord/tenancies/${context.tenancyId}`
}

function ThreadList({
  threads,
  activeId,
  now,
}: {
  threads: ThreadSummary[]
  activeId?: ThreadId
  now: string
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={ChatsCircleIcon}
        title="No conversations yet"
        description="Each repair and tenancy gets its own conversation with the tenant and the trade, so nothing gets lost."
        headingLevel="h2"
      />
    )
  }
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Conversations">
      {threads.map((summary) => {
        const { thread, lastMessage, unreadCount } = summary
        const Glyph = thread.context.kind === 'job' ? WrenchIcon : HouseLineIcon
        const active = thread.id === activeId
        return (
          <li key={thread.id}>
            <Link
              to={`/landlord/messages/${thread.id}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-start gap-3 rounded-card border p-3.5 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'border-accent-strong bg-accent-tint'
                  : 'border-transparent hover:bg-surface-2',
              )}
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
              >
                <Glyph weight="duotone" className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'line-clamp-2 text-body leading-snug text-ink',
                      unreadCount > 0 && 'font-semibold',
                    )}
                  >
                    {thread.title}
                  </span>
                  {lastMessage ? (
                    <time
                      dateTime={lastMessage.sentAt}
                      className="shrink-0 text-caption text-muted"
                    >
                      {timeAgo(lastMessage.sentAt, now)}
                    </time>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className="line-clamp-1 flex-1 text-small text-muted">
                    {lastMessage?.body ?? 'No messages yet'}
                  </span>
                  {unreadCount > 0 ? (
                    <span className="figures flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.75rem] font-bold text-on-accent">
                      {unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

interface Pending {
  id: string
  body: string
  sentAt: string
  failed?: boolean
}

function toThreadMessage(message: Message, people: People, viewerId: PersonId): ThreadMessage {
  const author = message.author
  const card = author ? people.get(author.personId) : undefined
  const photos = message.attachments.filter((a) => isPlaceholder(a.url))
  const body = photos.length
    ? `${message.body}${photos.map((p) => `\nPhoto: ${p.alt}`).join('')}`
    : message.body
  return {
    id: message.id,
    kind: message.kind,
    body,
    sentAt: message.sentAt,
    own: author?.personId === viewerId,
    attachments: message.attachments.filter((a) => !isPlaceholder(a.url)),
    author: author
      ? {
          name: card?.displayName ?? ROLE_LABELS[author.role],
          role: author.role,
          avatarSeed: card?.avatarSeed,
          roleLabel: author.actingForId
            ? `Agent for ${firstName(people.get(author.actingForId)?.displayName ?? 'the landlord')}`
            : undefined,
        }
      : undefined,
  }
}

function Conversation({ summary, onBack }: { summary: ThreadSummary; onBack?: () => void }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const threadId = summary.thread.id
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending[]>([])
  const [reporting, setReporting] = useState<string | null>(null)
  const [blocking, setBlocking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [messages, blocks] = await Promise.all([
        api.listMessages(viewer, threadId),
        api.listBlocks(viewer),
      ])
      return { messages, blocked: new Set(blocks.map((b) => b.blockedId)) }
    },
    [viewer, threadId],
  )
  const memberIds = summary.thread.members.flatMap((m) => [
    m.personId,
    ...(m.actingForId ? [m.actingForId] : []),
  ])
  const people = usePeople(memberIds)
  const me = summary.thread.members.find((m) => m.personId === viewer.personId)
  const muted = Boolean(me?.mutedAt)

  // Opening a conversation reads it. Only when something is unread, so it never loops.
  useEffect(() => {
    if (summary.unreadCount > 0) api.markThreadRead(viewer, threadId).catch(() => undefined)
  }, [api, viewer, threadId, summary.unreadCount])

  const messages = state.data?.messages
  const count = (messages?.length ?? 0) + pending.length
  useEffect(() => {
    reveal(endRef.current, { block: 'end' })
  }, [count, threadId])

  const shown = useMemo(() => {
    if (!messages || !people.state.data) return []
    const list = messages.map((m) => toThreadMessage(m, people.state.data!, viewer.personId))
    for (const p of pending) {
      list.push({
        id: p.id,
        kind: 'text',
        body: p.failed ? `${p.body}\n(Not sent. Try again.)` : p.body,
        sentAt: p.sentAt,
        own: true,
        author: { name: 'You', role: 'landlord' },
      })
    }
    return list
  }, [messages, pending, people.state.data, viewer.personId])

  async function send() {
    const body = draft.trim()
    if (!body) return
    const temp: Pending = { id: `pending-${Date.now()}`, body, sentAt: now }
    setPending((list) => [...list, temp])
    setDraft('')
    try {
      await api.sendMessage(viewer, threadId, { body })
      setPending((list) => list.filter((p) => p.id !== temp.id))
    } catch (error) {
      setPending((list) => list.map((p) => (p.id === temp.id ? { ...p, failed: true } : p)))
      setDraft(body)
      toast.error('Message not sent', { description: errorMessage(error) })
    }
  }

  async function toggleMute() {
    try {
      await api.setThreadMuted(viewer, threadId, !muted)
      toast.success(muted ? 'Notifications back on' : 'Muted', {
        description: muted
          ? undefined
          : 'You won’t be notified about new messages here. They still arrive.',
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    }
  }

  async function setBlocked(personId: PersonId, blocked: boolean) {
    try {
      await api.setBlocked(viewer, personId, blocked)
      toast.success(blocked ? 'Blocked' : 'Unblocked', {
        description: blocked
          ? 'You won’t see their messages anywhere. They aren’t told.'
          : undefined,
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    }
  }

  const others = summary.thread.members.filter(
    (m) => m.personId !== viewer.personId && m.personId !== viewer.actingForId,
  )
  const reportedMessage = messages?.find((m) => m.id === reporting)

  return (
    <section aria-label={summary.thread.title} className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b border-line pb-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 font-semibold text-accent-text lg:hidden"
          >
            <CaretLeftIcon weight="bold" aria-hidden className="size-4.5" />
            All conversations
          </button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="font-display text-display-m font-semibold text-ink">
              {summary.thread.title}
            </h2>
            <ul className="flex flex-wrap items-center gap-2" aria-label="In this conversation">
              {others.map((member) => (
                <li key={member.personId} className="flex items-center gap-1.5 text-small text-ink">
                  {people.state.data?.get(member.personId)?.displayName ?? ROLE_LABELS[member.role]}
                  <RoleChip
                    role={member.role}
                    label={
                      member.actingForId
                        ? `Agent for ${firstName(people.state.data?.get(member.actingForId)?.displayName ?? 'the landlord')}`
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={contextHref(summary)}
              className="inline-flex min-h-(--control-h-sm) items-center gap-1.5 rounded-control px-3 text-small font-semibold text-accent-text hover:bg-surface-2"
            >
              {summary.thread.context.kind === 'job' ? 'Open the repair' : 'Open the tenancy'}
              <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              iconStart={
                muted ? (
                  <BellSimpleIcon weight="bold" aria-hidden />
                ) : (
                  <BellSimpleSlashIcon weight="bold" aria-hidden />
                )
              }
            >
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBlocking(true)}
              iconStart={<ProhibitIcon weight="bold" aria-hidden />}
            >
              Block
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 py-5 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
        {state.status === 'error' && !messages ? (
          <ErrorPanel error={state.error} onRetry={refresh} />
        ) : !messages || !people.state.data ? (
          <ListSkeleton rows={3} label="Loading messages" />
        ) : shown.length === 0 ? (
          <p className="text-center text-body text-muted">No messages yet. Say hello.</p>
        ) : (
          <MessageThread
            messages={shown}
            now={now}
            label={`Messages: ${summary.thread.title}`}
            onReport={(message) => setReporting(message.id)}
          />
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] -mx-1 bg-bg px-1 pt-2 pb-1 lg:static lg:bottom-auto lg:bg-transparent">
        <MessageComposer
          value={draft}
          onValueChange={setDraft}
          onSend={send}
          label={`Message about ${summary.thread.title}`}
          note={`Everyone here sees what you write, with “${ROLE_LABELS.landlord}” beside your name.`}
        />
      </div>

      {reportedMessage ? (
        <ReportDialog
          target={{ kind: 'message', messageId: reportedMessage.id }}
          what="this message"
          open={reporting !== null}
          onOpenChange={(open) => (open ? null : setReporting(null))}
        />
      ) : null}
      <Dialog open={blocking} onOpenChange={setBlocking}>
        <DialogContent
          title="Block someone"
          description="You stop seeing their messages everywhere. They aren’t told. Nothing is deleted, so we can still look into a report."
        >
          <ul className="flex flex-col divide-y divide-line">
            {others.map((member) => {
              const blocked = state.data?.blocked.has(member.personId) ?? false
              return (
                <li key={member.personId} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2 text-ink">
                    {people.state.data?.get(member.personId)?.displayName ??
                      ROLE_LABELS[member.role]}
                    <RoleChip role={member.role} />
                  </span>
                  <Button
                    variant={blocked ? 'secondary' : 'danger'}
                    size="sm"
                    onClick={() => setBlocked(member.personId, !blocked)}
                  >
                    {blocked ? 'Unblock' : 'Block'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default function MessagesPage() {
  const { threadId } = useParams()
  const viewer = useViewer()
  const navigate = useNavigate()
  const now = useDemoNow()
  const { state, refresh } = useSlateQuery((api) => api.listThreads(viewer), [viewer])
  const threads = state.data
  const active = threads?.find((t) => t.thread.id === threadId)

  return (
    <PortalPage title={active ? active.thread.title : 'Messages'} width="wide">
      {/* On phones an open conversation fills the screen, so the page heading stays for screen
          readers only. */}
      <div className={cn(threadId && 'max-lg:sr-only')}>
        <PageHeader
          title="Messages"
          description="One conversation for each repair and tenancy, with the tenant and the trade."
        />
      </div>
      {state.status === 'error' && !threads ? (
        <ErrorPanel error={state.error} onRetry={refresh} />
      ) : !threads ? (
        <ListSkeleton rows={4} label="Loading conversations" />
      ) : (
        <div className="lg:grid lg:h-[calc(100dvh-15rem)] lg:min-h-[28rem] lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-6">
          <div
            className={cn(
              'lg:overflow-y-auto lg:overscroll-contain lg:pr-1',
              threadId && 'max-lg:hidden',
            )}
          >
            <ThreadList threads={threads} activeId={threadId as ThreadId | undefined} now={now} />
          </div>
          <div
            className={cn(
              'flex min-h-0 flex-col lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-5 lg:shadow-soft',
              !threadId && 'max-lg:hidden',
            )}
          >
            {active ? (
              <Conversation
                key={active.thread.id}
                summary={active}
                onBack={() => navigate('/landlord/messages')}
              />
            ) : threadId ? (
              <EmptyState
                icon={ChatsCircleIcon}
                title="We couldn’t find that conversation"
                description="It may belong to a home that isn’t in this account."
                headingLevel="h2"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  icon={ChatsCircleIcon}
                  title="Choose a conversation"
                  description="Pick one from the list to read it and reply."
                  headingLevel="h2"
                  className="border-none"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </PortalPage>
  )
}
