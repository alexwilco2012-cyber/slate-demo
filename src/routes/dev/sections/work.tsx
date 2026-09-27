import { useState } from 'react'
import type { Role } from '@/domain/types'
import { useToast } from '@/components/ui/toast'
import { JobTimeline, jobStages } from '@/components/slate/job-timeline'
import {
  MessageComposer,
  MessageThread,
  type ThreadMessage,
} from '@/components/slate/message-thread'
import { declinedJob, doneJob, leakJob, messages, NOW, PEOPLE } from '../gallery-data'
import { Section, Specimen, Specimens } from '../gallery-frame'

const VIEWER: Record<Role, string> = {
  tenant: PEOPLE.sarah.name,
  landlord: PEOPLE.graham.name,
  trade: PEOPLE.kev.name,
}

/** The sample thread as each portal sees it: the viewer's own messages sit on the right. */
function threadFor(role: Role): ThreadMessage[] {
  return messages.map((message) => ({
    ...message,
    own: message.author?.name === VIEWER[role],
  }))
}

function ThreadDemo({ role }: { role: Role }) {
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState(() => threadFor(role))
  const author = {
    name: VIEWER[role],
    role,
    avatarSeed:
      role === 'tenant'
        ? PEOPLE.sarah.seed
        : role === 'landlord'
          ? PEOPLE.graham.seed
          : PEOPLE.kev.seed,
  }
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-bg p-3 sm:p-4">
      <MessageThread
        label="Messages about the leak under the kitchen sink"
        messages={thread}
        now={NOW}
        onReport={(message) =>
          toast.info('Report opened', { description: `Message from ${message.author?.name}` })
        }
      />
      <MessageComposer
        value={draft}
        onValueChange={setDraft}
        onAttach={() => toast.info('Camera opens here')}
        onSend={() => {
          setThread((current) => [
            ...current,
            {
              id: `new-${current.length}`,
              kind: 'text',
              body: draft.trim(),
              sentAt: NOW,
              author,
              own: true,
            },
          ])
          setDraft('')
        }}
        label="Message Sarah, Graham and Kev"
        note="Sarah, Graham and Kev can see this conversation."
      />
    </div>
  )
}

export function WorkSection() {
  return (
    <Section
      id="work"
      title="Jobs and messages"
      description="Every repair shows the same six stages to everyone. Each stage says done, now or next, with its own marker shape. Every message carries its writer’s role chip."
    >
      <Specimens>
        {() => (
          <>
            <Specimen label="Job timeline">
              <JobTimeline
                stages={jobStages(leakJob, {
                  reported: 'By Sarah, tenant · Kitchen',
                  approved: 'Graham chose Kev Rattray from saved trades',
                  booked: 'For Mon 28 Sept, 9am to 11am · 48 hours’ notice sent',
                  visit: 'Kev visits on Monday morning',
                })}
              />
            </Specimen>
            <Specimen label="Compact, for list cards">
              <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-4">
                <JobTimeline
                  variant="compact"
                  stages={jobStages(leakJob, { visit: 'Mon 28 Sept, 9am' })}
                />
                <JobTimeline variant="compact" stages={jobStages(doneJob)} />
                <JobTimeline
                  variant="compact"
                  stages={jobStages(declinedJob, { approved: 'Covered by the building factor' })}
                />
              </div>
            </Specimen>
          </>
        )}
      </Specimens>
      <Specimens>
        {(role) => (
          <Specimen label="Thread">
            <ThreadDemo role={role} />
          </Specimen>
        )}
      </Specimens>
    </Section>
  )
}
