// The conversation on a job, on the same screen as the job itself. Messages appear as soon as
// they're sent (they're confirmed a moment later), photos go straight from the camera, and every
// message from someone else can be reported. Mute and block live in the header.

import { useEffect, useMemo, useRef, useState } from 'react'
import { BellSimpleIcon, BellSimpleSlashIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import type { ImageRef, Message, MessageId, PersonCard, PersonId, Thread } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/ui/avatar'
import {
  MessageComposer,
  MessageThread,
  type ThreadMessage,
} from '@/components/slate/message-thread'
import { RoleChip } from '@/components/slate/role-chip'
import { useViewer } from '@/session'
import { ReportDialog } from '../components/report-dialog'
import { PhotoQueue, usePhotoQueue } from '../components/photos'
import { firstNameOf } from '../lib/job'

/** A message the trade has just sent, shown straight away until the saved copy arrives. */
interface Pending {
  id: string
  body: string
  attachments: ImageRef[]
  sentAt: string
  /** Set once saved: the pending copy goes when the saved one is on screen, so nothing flickers. */
  savedId?: MessageId
}

/** "Callum, Irene and you" */
function listWords(words: readonly string[]): string {
  if (words.length < 2) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

export function toThreadMessage(
  message: Message,
  people: Record<PersonId, PersonCard>,
  viewerId: PersonId,
): ThreadMessage {
  const author = message.author
  if (!author) return { id: message.id, kind: 'system', body: message.body, sentAt: message.sentAt }
  const person = people[author.personId]
  const actingFor = author.actingForId ? people[author.actingForId] : undefined
  return {
    id: message.id,
    kind: message.kind,
    body: message.body,
    sentAt: message.sentAt,
    own: author.personId === viewerId,
    attachments: message.attachments,
    author: {
      name: person?.displayName ?? 'Someone',
      role: author.role,
      avatarSeed: person?.avatarSeed,
      roleLabel: actingFor ? `Agent for ${firstNameOf(actingFor.displayName)}` : undefined,
    },
  }
}

export function JobChat({
  thread,
  messages,
  people,
  title,
  variant,
  className,
}: {
  thread: Thread
  /** The conversation, oldest first; undefined while it loads. */
  messages: Message[] | undefined
  people: Record<PersonId, PersonCard>
  title: string
  /** 'panel' is the fixed-height column beside the job on a computer; 'section' flows. */
  variant: 'panel' | 'section'
  className?: string
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending[]>([])
  const [reporting, setReporting] = useState<MessageId | null>(null)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const me = thread.members.find((member) => member.personId === viewer.personId)
  const muted = Boolean(me?.mutedAt)

  const loaded = useMemo(() => messages ?? [], [messages])
  const savedIds = new Set(loaded.map((message) => message.id))
  const shown: ThreadMessage[] = [
    ...loaded.map((message) => toThreadMessage(message, people, viewer.personId)),
    ...pending
      .filter((item) => !item.savedId || !savedIds.has(item.savedId))
      .map((item): ThreadMessage => ({
        id: item.id,
        kind: 'text',
        body: item.body,
        sentAt: item.sentAt,
        own: true,
        attachments: item.attachments,
        author: { name: people[viewer.personId]?.displayName ?? 'You', role: 'trade' },
      })),
  ]

  // Reading the conversation here counts as reading it.
  const lastId = loaded.at(-1)?.id
  useEffect(() => {
    if (lastId) void api.markThreadRead(viewer, thread.id).catch(() => undefined)
  }, [api, viewer, thread.id, lastId])

  // The panel keeps the newest message in view, like any messaging app.
  const count = shown.length
  useEffect(() => {
    const element = scroller.current
    if (variant === 'panel' && element) element.scrollTop = element.scrollHeight
  }, [count, variant])

  async function send(body: string, attachments: ImageRef[] = []) {
    const item: Pending = { id: `pending-${Date.now()}`, body, attachments, sentAt: now }
    setPending((current) => [...current, item])
    try {
      const saved = await api.sendMessage(viewer, thread.id, { body, attachments })
      setPending((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, savedId: saved.id } : candidate,
        ),
      )
    } catch (error) {
      setPending((current) => current.filter((candidate) => candidate.id !== item.id))
      toast.error('Message not sent', {
        description: error instanceof Error ? error.message : undefined,
      })
      if (body) setDraft(body)
    }
  }

  // Saved copies have arrived: drop the pending ones they replace.
  useEffect(() => {
    const arrived = new Set(loaded.map((message) => message.id))
    setPending((current) => {
      const left = current.filter((item) => !item.savedId || !arrived.has(item.savedId))
      return left.length === current.length ? current : left
    })
  }, [loaded])

  const photos = usePhotoQueue(
    (image) =>
      api.sendMessage(viewer, thread.id, { body: '', attachments: [image] }).then(() => undefined),
    `Photo sent to the chat: ${title}`,
  )
  const cameraInput = useRef<HTMLInputElement>(null)

  async function toggleMute() {
    try {
      await api.setThreadMuted(viewer, thread.id, !muted)
      toast.success(muted ? 'Notifications on' : 'Muted', {
        description: muted
          ? 'We’ll tell you about new messages here.'
          : 'Messages still arrive here, but we won’t notify you.',
      })
    } catch (error) {
      toast.error('That didn’t work', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const others = thread.members.filter((member) => member.personId !== viewer.personId)
  const names = others
    .map((member) => firstNameOf(people[member.personId]?.displayName, ''))
    .filter(Boolean)

  return (
    <section
      id="chat"
      aria-labelledby="chat-title"
      className={cn(
        'flex scroll-mt-24 flex-col rounded-card border border-line bg-surface shadow-soft',
        variant === 'panel' && 'lg:h-full lg:min-h-0',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 id="chat-title" className="font-display text-display-m font-semibold text-ink">
            Messages
          </h2>
          <p className="text-small text-muted">
            {names.length > 0 ? `With ${listWords(names)}` : 'On this job'}
          </p>
        </div>
        <div className="flex gap-(--gap-touch)">
          <Button
            variant="ghost"
            size="sm"
            iconStart={
              muted ? (
                <BellSimpleSlashIcon weight="bold" aria-hidden />
              ) : (
                <BellSimpleIcon weight="bold" aria-hidden />
              )
            }
            aria-pressed={muted}
            onClick={toggleMute}
          >
            {muted ? 'Muted' : 'Mute'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconStart={<UsersThreeIcon weight="bold" aria-hidden />}
            onClick={() => setPeopleOpen(true)}
            aria-haspopup="dialog"
          >
            People
          </Button>
        </div>
      </header>

      <div
        ref={scroller}
        className={cn(
          'flex flex-col gap-4 px-4 py-4',
          variant === 'panel' && 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain',
        )}
      >
        {messages === undefined ? (
          <LoadingRegion label="Loading messages" className="flex flex-col gap-4">
            <Skeleton className="h-16 w-3/4 rounded-[1.25rem]" />
            <Skeleton className="ml-auto h-12 w-2/3 rounded-[1.25rem]" />
            <Skeleton className="h-16 w-3/4 rounded-[1.25rem]" />
          </LoadingRegion>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-muted">
            No messages yet. Say hello, or ask about access.
          </p>
        ) : (
          <MessageThread
            messages={shown}
            now={now}
            label={`Messages about ${title}`}
            onReport={(message) =>
              message.id.startsWith('message_') && setReporting(message.id as MessageId)
            }
          />
        )}
        <PhotoQueue
          items={photos.items}
          onRetry={photos.retry}
          onRemove={photos.remove}
          title="Photos for the chat"
        />
      </div>

      <div className="border-t border-line p-3">
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            if (files.length > 0) photos.add(files)
          }}
        />
        <MessageComposer
          value={draft}
          onValueChange={setDraft}
          onSend={() => {
            const body = draft.trim()
            setDraft('')
            void send(body)
          }}
          onAttach={() => cameraInput.current?.click()}
          label={`Message ${listWords(names) || 'everyone on this job'}`}
          note={names.length > 0 ? `${listWords([...names, 'you'])} can see this.` : undefined}
        />
      </div>

      {reporting ? (
        <ReportDialog
          target={{ kind: 'message', messageId: reporting }}
          what="this message"
          open
          onOpenChange={(open) => (open ? null : setReporting(null))}
        />
      ) : null}
      <PeopleDialog
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        thread={thread}
        people={people}
      />
    </section>
  )
}

/** Who is in the conversation, with block and unblock. Blocking hides their messages from you. */
function PeopleDialog({
  open,
  onOpenChange,
  thread,
  people,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  thread: Thread
  people: Record<PersonId, PersonCard>
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const { state } = useSlateQuery((a) => a.listBlocks(viewer), [viewer])
  const blocked = new Set((state.data ?? []).map((block) => block.blockedId))
  const others = thread.members.filter((member) => member.personId !== viewer.personId)

  async function toggle(personId: PersonId, name: string) {
    const next = !blocked.has(personId)
    try {
      await api.setBlocked(viewer, personId, next)
      toast.success(next ? `${name} blocked` : `${name} unblocked`, {
        description: next
          ? 'You won’t see their messages anywhere. We don’t tell them.'
          : 'You’ll see their messages again.',
      })
    } catch (error) {
      toast.error('That didn’t work', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="People on this job"
        description="Everyone here sees the whole conversation."
      >
        <ul className="flex flex-col gap-3">
          {others.map((member) => {
            const person = people[member.personId]
            const name = person?.displayName ?? 'Someone'
            const actingFor = member.actingForId ? people[member.actingForId] : undefined
            return (
              <li
                key={member.personId}
                className="flex flex-wrap items-center gap-3 rounded-card border border-line p-3"
              >
                <Avatar
                  name={name}
                  seed={person?.avatarSeed}
                  role={member.role}
                  size="md"
                  decorative
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold text-ink">{name}</span>
                  <RoleChip
                    role={member.role}
                    label={
                      actingFor ? `Agent for ${firstNameOf(actingFor.displayName)}` : undefined
                    }
                    className="self-start"
                  />
                </div>
                <Button
                  variant={blocked.has(member.personId) ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => toggle(member.personId, firstNameOf(name, name))}
                >
                  {blocked.has(member.personId) ? 'Unblock' : 'Block'}
                  <span className="sr-only"> {name}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
