// Conversations about tenancies rather than repairs. Job threads are built with their jobs.

import type {
  IsoDateTime,
  Message,
  PersonId,
  TenancyId,
  Thread,
  ThreadMember,
} from '@/domain/types'
import { d, on } from './time'

interface TenancyThreadSeed {
  tenancyId: TenancyId
  title: string
  createdAt: IsoDateTime
  members: { personId: PersonId; role: ThreadMember['role']; actingForId?: PersonId }[]
  messages: { by: PersonId; at: IsoDateTime; body: string }[]
  /** Members who haven't read the latest messages from others. */
  unreadFor?: PersonId[]
}

function tenancyThread(seed: TenancyThreadSeed): { thread: Thread; messages: Message[] } {
  const slug = seed.tenancyId.slice('tenancy_'.length)
  const threadId: Thread['id'] = `thread_${slug}`
  const roles = new Map(seed.members.map((m) => [m.personId, m]))
  const messages: Message[] = seed.messages.map((m, index) => {
    const member = roles.get(m.by)
    if (!member) throw new Error(`${threadId}: ${m.by} is not a member`)
    return {
      id: `message_${slug}_${index + 1}`,
      threadId,
      author: {
        personId: m.by,
        role: member.role,
        ...(member.actingForId ? { actingForId: member.actingForId } : {}),
      },
      kind: 'text',
      body: m.body,
      attachments: [],
      sentAt: m.at,
    }
  })
  const lastMessageAt = messages.at(-1)?.sentAt
  const members: ThreadMember[] = seed.members.map((m) => {
    const own = messages.filter((msg) => msg.author?.personId === m.personId).at(-1)?.sentAt
    const readUpTo = seed.unreadFor?.includes(m.personId) ? own : lastMessageAt
    return {
      personId: m.personId,
      role: m.role,
      ...(m.actingForId ? { actingForId: m.actingForId } : {}),
      joinedAt: seed.createdAt,
      ...(readUpTo ? { lastReadAt: readUpTo } : {}),
    }
  })
  const thread: Thread = {
    id: threadId,
    context: { kind: 'tenancy', tenancyId: seed.tenancyId },
    title: seed.title,
    members,
    createdAt: seed.createdAt,
    ...(lastMessageAt ? { lastMessageAt } : {}),
  }
  return { thread, messages }
}

const graham = 'person_graham'
const aileen = 'person_aileen'
const agentForGraham = { personId: aileen, role: 'landlord', actingForId: graham } as const

export const TENANCY_CONVERSATIONS = [
  tenancyThread({
    tenancyId: 'tenancy_sarah_esslemont',
    title: 'Top Floor Right, 14 Esslemont Avenue',
    createdAt: on('2025-06-01', '09:00'),
    members: [
      { personId: 'person_sarah', role: 'tenant' },
      { personId: graham, role: 'landlord' },
      agentForGraham,
    ],
    messages: [
      {
        by: aileen,
        at: on('2025-06-01', '09:00'),
        body: 'Welcome to Esslemont Avenue, Sarah! The keys are in the key safe as arranged. Any problems at all, just message here.',
      },
      { by: 'person_sarah', at: on('2025-06-01', '18:30'), body: 'Thank you! Settling in nicely.' },
      {
        by: aileen,
        at: d(-30, '10:00'),
        body: "Hi Sarah, a heads-up that the electrical safety check is due by the middle of October. The electrician will give you proper notice through the job when it's booked.",
      },
      { by: 'person_sarah', at: d(-30, '12:15'), body: 'No problem, thanks for letting me know.' },
    ],
  }),
  tenancyThread({
    tenancyId: 'tenancy_callum_spital',
    title: 'First Floor Left, 63 Spital',
    createdAt: on('2024-04-01', '22:30'),
    members: [
      { personId: 'person_callum', role: 'tenant' },
      { personId: 'person_irene', role: 'landlord' },
    ],
    messages: [
      {
        by: 'person_callum',
        at: on('2026-08-28', '19:00'),
        body: "Hi Irene, as we discussed, I'm giving notice to end the tenancy on 30 September. It's been a great flat; I'm just after somewhere a bit bigger.",
      },
      {
        by: 'person_irene',
        at: on('2026-08-29', '09:15'),
        body: "Thanks Callum, you've been a smashing tenant. I'll arrange the check-out for the 30th.",
      },
      {
        by: 'person_irene',
        at: d(-2, '18:00'),
        body: 'Would 11am on Wednesday suit for the check-out? Please leave the keys on the kitchen table.',
      },
      { by: 'person_callum', at: d(-2, '19:30'), body: '11 is perfect, see you then.' },
    ],
  }),
  tenancyThread({
    tenancyId: 'tenancy_callum_fonthill',
    title: 'Flat C, 9 Fonthill Road',
    createdAt: d(-1, '15:20'),
    members: [
      { personId: 'person_callum', role: 'tenant' },
      { personId: graham, role: 'landlord' },
      agentForGraham,
    ],
    messages: [
      {
        by: aileen,
        at: d(-1, '15:22'),
        body: "Hi Callum, great to meet you at the viewing. I've sent the tenancy through for you to confirm, starting Saturday 3 October.",
      },
    ],
    unreadFor: ['person_callum'],
  }),
]
