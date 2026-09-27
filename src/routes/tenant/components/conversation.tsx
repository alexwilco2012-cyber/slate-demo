// A conversation on a job or tenancy: the messages with a role chip on each, the written notices
// of visits, a box to reply, and a report button on other people's messages. Used on the job page
// (messages on one screen with the repair) and on the thread page.

import { useEffect, useMemo, useRef, useState } from 'react'
import { SlateError, type SendMessageInput } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import type { Message, MessageId, Thread, ThreadId } from '@/domain/types'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  MessageComposer,
  MessageThread,
  type ThreadMessage,
} from '@/components/slate/message-thread'
import { useViewer } from '@/session'
import { loadPeople, type People } from '../lib/data'
import { firstName } from '../lib/format'
import { QueryError } from './basics'
import { ReportDialog } from './report-dialog'

function toThreadMessage(message: Message, people: People, me: string): ThreadMessage {
  const author = message.author
  const card = author ? people.get(author.personId) : undefined
  const actingFor = author?.actingForId ? people.get(author.actingForId) : undefined
  return {
    id: message.id,
    kind: message.kind,
    body: message.body,
    sentAt: message.sentAt,
    own: author?.personId === me,
    attachments: message.attachments.filter((image) => !image.url.startsWith('placeholder://')),
    ...(author
      ? {
          author: {
            name: card?.displayName ?? 'Someone',
            role: author.role,
            avatarSeed: card?.avatarSeed,
            ...(actingFor ? { roleLabel: `Agent for ${firstName(actingFor.displayName)}` } : {}),
          },
        }
      : {}),
  }
}

/** "Graham, Aileen and Kev can see this conversation." */
export function audienceText(thread: Thread, people: People, me: string): string {
  const names = thread.members
    .filter((member) => member.personId !== me)
    .map((member) => firstName(people.get(member.personId)?.displayName ?? 'Someone'))
  if (names.length === 0) return 'Only you can see this conversation so far.'
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
  return `${list} can see this conversation.`
}

interface Pending {
  id: string
  body: string
  sentAt: string
  /** Set once the message is saved; the pending copy goes when the saved one is on screen. */
  savedId?: MessageId
}

export function Conversation({
  threadId,
  label,
  emptyText = 'No messages yet. Say hello, or ask a question about the repair.',
  className,
}: {
  threadId: ThreadId
  /** Accessible name, e.g. "Messages about the leak under the kitchen sink". */
  label: string
  emptyText?: string
  className?: string
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending[]>([])
  const [reportId, setReportId] = useState<MessageId | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const { state, refresh } = useSlateQuery(
    async (a) => {
      const [thread, messages] = await Promise.all([
        a.getThread(viewer, threadId),
        a.listMessages(viewer, threadId),
      ])
      const ids = [
        ...(thread?.members.flatMap((m) => [m.personId, m.actingForId]) ?? []),
        ...messages.flatMap((m) => [m.author?.personId, m.author?.actingForId]),
      ]
      return { thread, messages, people: await loadPeople(a, viewer, ids) }
    },
    [viewer, threadId],
  )

  // Opening the conversation reads it. Only when something is unread, so it never loops.
  const unreadKey = state.data?.messages.at(-1)?.id
  useEffect(() => {
    if (!state.data?.thread) return
    const member = state.data.thread.members.find((m) => m.personId === viewer.personId)
    const last = state.data.messages.at(-1)
    if (!last || (member?.lastReadAt && member.lastReadAt >= last.sentAt)) return
    void api.markThreadRead(viewer, threadId).catch(() => undefined)
  }, [api, viewer, threadId, unreadKey, state.data])

  const messages = useMemo(() => {
    if (!state.data) return []
    const shown = state.data.messages.map((m) =>
      toThreadMessage(m, state.data!.people, viewer.personId),
    )
    const me = state.data.people.get(viewer.personId)
    const saved = new Set<string>(state.data.messages.map((m) => m.id))
    const mine: ThreadMessage[] = pending
      .filter((p) => !p.savedId || !saved.has(p.savedId))
      .map((p) => ({
        id: p.id,
        kind: 'text',
        body: p.body,
        sentAt: p.sentAt,
        own: true,
        author: { name: me?.displayName ?? 'You', role: 'tenant', avatarSeed: me?.avatarSeed },
      }))
    return [...shown, ...mine]
  }, [state.data, pending, viewer.personId])

  const endRef = useRef<HTMLDivElement>(null)
  const count = messages.length
  const firstLoad = useRef(true)
  useEffect(() => {
    if (count === 0) return
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }
    endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [count])

  async function send() {
    const body = draft.trim()
    if (!body) return
    const optimistic: Pending = { id: `pending-${Date.now()}`, body, sentAt: now }
    setPending((current) => [...current, optimistic])
    setDraft('')
    try {
      const input: SendMessageInput = { body }
      const message = await api.sendMessage(viewer, threadId, input)
      setPending((current) =>
        current.map((p) => (p.id === optimistic.id ? { ...p, savedId: message.id } : p)),
      )
    } catch (error) {
      setPending((current) => current.filter((p) => p.id !== optimistic.id))
      setDraft(body)
      toast.error('Your message didn’t send', {
        description:
          error instanceof SlateError ? error.message : 'It’s back in the box. Try again.',
      })
    }
  }

  if (state.status === 'loading') {
    return (
      <LoadingRegion label="Loading messages" className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-16 w-3/4 rounded-[1.25rem]" />
        </div>
        <Skeleton className="ml-auto h-12 w-2/3 rounded-[1.25rem]" />
        <Skeleton className="h-11 w-full rounded-[1.375rem]" />
      </LoadingRegion>
    )
  }
  if (!state.data?.thread) {
    return <QueryError what="these messages" onRetry={refresh} className={className} />
  }

  const { thread, people } = state.data
  const reportedMessage = reportId ? state.data.messages.find((m) => m.id === reportId) : null

  return (
    <div className={className}>
      <div className="flex flex-col gap-5">
        {messages.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-4 text-center text-small text-muted">
            {emptyText}
          </p>
        ) : (
          <MessageThread
            label={label}
            messages={messages}
            now={now}
            onReport={(message) => {
              setReportId(message.id as MessageId)
              setReportOpen(true)
            }}
          />
        )}
        <div ref={endRef} />
        <MessageComposer
          value={draft}
          onValueChange={setDraft}
          onSend={send}
          label={`Message ${audienceText(thread, people, viewer.personId).replace(' can see this conversation.', '')}`}
          note={audienceText(thread, people, viewer.personId)}
        />
      </div>
      {reportedMessage ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          target={{ kind: 'message', messageId: reportedMessage.id }}
          what="this message"
        />
      ) : null}
    </div>
  )
}
