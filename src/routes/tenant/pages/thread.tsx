// One conversation: the messages, who's in it (with block), mute, and a link to the repair or
// tenancy it belongs to.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRightIcon, ProhibitIcon, SpeakerSlashIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import type { PersonCard, PersonId } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { NotFound, PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { JobStatusBadge, PersonLine, QueryError } from '../components/basics'
import { Conversation } from '../components/conversation'
import { loadPeople } from '../lib/data'
import { firstName } from '../lib/format'

export function ThreadPage() {
  const { threadId } = useParams()
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const validId = isId('thread', threadId) ? threadId : null
  const [blocking, setBlocking] = useState<PersonCard | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const { state, refresh } = useSlateQuery(
    async (a) => {
      if (!validId) return null
      const thread = await a.getThread(viewer, validId)
      if (!thread) return null
      const [people, blocks, job] = await Promise.all([
        loadPeople(
          a,
          viewer,
          thread.members.flatMap((m) => [m.personId, m.actingForId]),
        ),
        a.listBlocks(viewer),
        thread.context.kind === 'job'
          ? a.getJob(viewer, thread.context.jobId)
          : Promise.resolve(null),
      ])
      return { thread, people, blocked: new Set<PersonId>(blocks.map((b) => b.blockedId)), job }
    },
    [viewer, validId],
  )

  if (!validId || (state.status === 'success' && !state.data)) return <NotFound />
  if (state.status === 'loading') {
    return (
      <PortalPage title="Messages">
        <LoadingRegion label="Loading the conversation" className="flex flex-col gap-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-96 w-full rounded-card" />
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Messages">
        <PageHeader back={{ to: '/tenant/messages', label: 'Messages' }} title="Conversation" />
        <QueryError what="this conversation" onRetry={refresh} />
      </PortalPage>
    )
  }

  const { thread, people, blocked, job } = state.data
  const me = thread.members.find((m) => m.personId === viewer.personId)
  const others = thread.members.filter((m) => m.personId !== viewer.personId)
  const contextLink =
    thread.context.kind === 'job'
      ? { to: `/tenant/jobs/${thread.context.jobId}`, label: 'View the repair' }
      : { to: `/tenant/tenancies/${thread.context.tenancyId}`, label: 'View your tenancy' }

  async function setMuted(muted: boolean) {
    try {
      await api.setThreadMuted(viewer, thread.id, muted)
      toast.success(muted ? 'Muted' : 'Unmuted', {
        description: muted
          ? 'We won’t notify you about new messages here. They’ll still arrive.'
          : 'We’ll notify you about new messages again.',
      })
    } catch {
      toast.error('That didn’t change. Try again.')
    }
  }

  async function setBlocked(person: PersonCard, block: boolean) {
    try {
      await api.setBlocked(viewer, person.id, block)
      setBlockOpen(false)
      toast.success(
        block
          ? `${firstName(person.displayName)} is blocked`
          : `${firstName(person.displayName)} is unblocked`,
        {
          description: block
            ? 'You won’t see their messages anywhere. We don’t delete anything, and our moderators can still see it all.'
            : 'Their messages will show again.',
        },
      )
    } catch {
      toast.error('That didn’t work. Try again.')
    }
  }

  return (
    <PortalPage title={thread.title}>
      <PageHeader
        back={{ to: '/tenant/messages', label: 'Messages' }}
        eyebrow={thread.context.kind === 'job' ? 'Repair' : 'Tenancy'}
        title={thread.title}
        meta={job ? <JobStatusBadge status={job.status} size="md" /> : null}
        actions={
          <Link
            to={contextLink.to}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {contextLink.label}
            <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
          </Link>
        }
      />
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-10">
        <div className="rounded-card border border-line bg-surface/60 p-3 sm:p-4">
          <Conversation threadId={thread.id} label={`Messages about ${thread.title}`} />
        </div>
        <aside
          aria-labelledby="people-title"
          className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
        >
          <h2 id="people-title" className="text-title font-semibold text-ink">
            In this conversation
          </h2>
          <ul className="flex flex-col gap-3">
            {others.map((member) => {
              const person = people.get(member.personId)
              if (!person) return null
              const actingFor = member.actingForId ? people.get(member.actingForId) : undefined
              const isBlocked = blocked.has(person.id)
              return (
                <li
                  key={member.personId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                >
                  <PersonLine
                    person={person}
                    role={member.role}
                    size="sm"
                    roleLabel={
                      actingFor ? `Agent for ${firstName(actingFor.displayName)}` : undefined
                    }
                    subtitle={isBlocked ? 'Blocked' : undefined}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconStart={<ProhibitIcon weight="bold" aria-hidden />}
                    onClick={() =>
                      isBlocked
                        ? setBlocked(person, false)
                        : (setBlocking(person), setBlockOpen(true))
                    }
                  >
                    {isBlocked ? 'Unblock' : 'Block'}
                    <span className="sr-only"> {person.displayName}</span>
                  </Button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line pt-2">
            <Switch
              label={
                <span className="flex items-center gap-2">
                  <SpeakerSlashIcon weight="bold" aria-hidden className="size-4.5" />
                  Mute this conversation
                </span>
              }
              description="No notifications. Messages still arrive."
              checked={Boolean(me?.mutedAt)}
              onCheckedChange={setMuted}
            />
          </div>
          <p className="text-caption text-muted">
            To report a message, use the flag beside it. Reports go to our moderators, not to the
            person.
          </p>
        </aside>
      </div>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent
          size="sm"
          title={`Block ${blocking ? firstName(blocking.displayName) : ''}?`}
          description="You won’t see their messages anywhere. Repairs and your tenancy carry on as normal, and our moderators can still see everything."
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Cancel</Button>} />
              <Button variant="danger" onClick={() => blocking && setBlocked(blocking, true)}>
                Block
              </Button>
            </>
          }
        />
      </Dialog>
    </PortalPage>
  )
}
