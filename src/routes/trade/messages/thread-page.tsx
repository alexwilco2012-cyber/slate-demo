// A conversation link (from a notification, say). Job conversations open on their job, where the
// chat sits beside the details; anything else opens on its own.

import { Link, Navigate, useParams } from 'react-router'
import { ChatsCircleIcon } from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import { isId } from '@/domain/ids'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { JobChat } from '../jobs/job-chat'
import { LoadError, PageSkeleton } from '../components/page-bits'
import { peopleById } from '../lib/queries'

export default function ThreadPage() {
  const { threadId } = useParams()
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      if (!isId('thread', threadId)) return null
      const thread = await api.getThread(viewer, threadId).catch(() => null)
      if (!thread) return null
      if (thread.context.kind === 'job') return { thread, messages: [], people: {} }
      const [messages, people] = await Promise.all([
        api.listMessages(viewer, thread.id),
        api.getPeople(
          viewer,
          thread.members.map((member) => member.personId),
        ),
      ])
      return { thread, messages, people: peopleById(people) }
    },
    [viewer, threadId],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Messages">
        <PageSkeleton label="Loading the conversation" />
      </PortalPage>
    )
  }
  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Messages">
        <PageHeader back={{ to: '/trade/messages', label: 'Messages' }} title="Conversation" />
        <LoadError what="this conversation" onRetry={refresh} />
      </PortalPage>
    )
  }
  const data = state.data
  if (!data) {
    return (
      <PortalPage title="Messages">
        <PageHeader back={{ to: '/trade/messages', label: 'Messages' }} title="Conversation" />
        <EmptyState
          icon={ChatsCircleIcon}
          headingLevel="h2"
          title="We can’t find that conversation"
          description="It may belong to a job you’re no longer on."
          action={
            <Link to="/trade/messages" className={buttonVariants({ variant: 'primary' })}>
              All messages
            </Link>
          }
        />
      </PortalPage>
    )
  }
  if (data.thread.context.kind === 'job') {
    return (
      <Navigate
        to={{ pathname: `/trade/jobs/${data.thread.context.jobId}`, hash: 'chat' }}
        replace
      />
    )
  }
  return (
    <PortalPage title={data.thread.title}>
      <PageHeader back={{ to: '/trade/messages', label: 'Messages' }} title={data.thread.title} />
      <JobChat
        thread={data.thread}
        messages={data.messages}
        people={data.people}
        title={data.thread.title}
        variant="section"
      />
    </PortalPage>
  )
}
