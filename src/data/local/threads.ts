// Message threads for jobs and tenancies. Each job and tenancy has at most one, made the first
// time it's needed, and everyone involved is a member with the role chip they speak under.

import { newId } from '@/domain/ids'
import type {
  ContextRef,
  Job,
  Message,
  MessageAuthor,
  Photo,
  PersonId,
  Property,
  Role,
  Tenancy,
  Thread,
  ThreadMember,
} from '@/domain/types'
import { jobParties, landlordSide } from './access'
import type { Draft, Reader } from './tx'

export function threadFor(db: Reader, context: ContextRef): Thread | undefined {
  return db
    .rows('threads')
    .find((thread) =>
      context.kind === 'job'
        ? thread.context.kind === 'job' && thread.context.jobId === context.jobId
        : thread.context.kind === 'tenancy' && thread.context.tenancyId === context.tenancyId,
    )
}

function member(
  personId: PersonId,
  role: Role,
  property: Property | undefined,
  joinedAt: string,
): ThreadMember {
  const entry: ThreadMember = { personId, role, joinedAt }
  if (role === 'landlord' && property && personId !== property.landlordId) {
    entry.actingForId = property.landlordId
  }
  return entry
}

/** Adds anyone involved who isn't a member yet, e.g. a trade who has just been instructed. */
function withMembers(
  tx: Draft,
  thread: Thread,
  parties: { personId: PersonId; role: Role }[],
  property: Property | undefined,
): Thread {
  const missing = parties.filter(
    (p) => !thread.members.some((m) => m.personId === p.personId && m.role === p.role),
  )
  if (missing.length === 0) return thread
  return tx.put('threads', {
    ...thread,
    members: [
      ...thread.members,
      ...missing.map((p) => member(p.personId, p.role, property, tx.now)),
    ],
  })
}

export function ensureJobThread(tx: Draft, job: Job): Thread {
  const property = tx.get('properties', job.propertyId)
  const parties = jobParties(tx, job)
  const existing = threadFor(tx, { kind: 'job', jobId: job.id })
  if (existing) return withMembers(tx, existing, parties, property)
  return tx.put('threads', {
    id: newId('thread'),
    context: { kind: 'job', jobId: job.id },
    title: job.title,
    members: parties.map((p) => member(p.personId, p.role, property, tx.now)),
    createdAt: tx.now,
  })
}

export function ensureTenancyThread(tx: Draft, tenancy: Tenancy): Thread {
  const property = tx.get('properties', tenancy.propertyId)
  const parties = [
    ...tenancy.tenantIds.map((personId) => ({ personId, role: 'tenant' as const })),
    ...(property ? landlordSide(tx, property) : [tenancy.landlordId]).map((personId) => ({
      personId,
      role: 'landlord' as const,
    })),
  ]
  const existing = threadFor(tx, { kind: 'tenancy', tenancyId: tenancy.id })
  if (existing) return withMembers(tx, existing, parties, property)
  return tx.put('threads', {
    id: newId('thread'),
    context: { kind: 'tenancy', tenancyId: tenancy.id },
    title: property?.addressLine ?? 'Tenancy',
    members: parties.map((p) => member(p.personId, p.role, property, tx.now)),
    createdAt: tx.now,
  })
}

/** The chip a member's messages carry: their role, and whose account an agent speaks for. */
export function authorFor(thread: Thread, personId: PersonId): MessageAuthor | null {
  const entry = thread.members.find((m) => m.personId === personId)
  if (!entry) return null
  return {
    personId,
    role: entry.role,
    ...(entry.actingForId ? { actingForId: entry.actingForId } : {}),
  }
}

/** Adds a message and moves the thread on. The author has, by definition, read it. */
export function postMessage(
  tx: Draft,
  thread: Thread,
  author: MessageAuthor | null,
  kind: Message['kind'],
  body: string,
  attachments: Photo[] = [],
): Message {
  const message: Message = {
    id: newId('message'),
    threadId: thread.id,
    author,
    kind,
    body,
    attachments,
    sentAt: tx.now,
  }
  tx.put('messages', message)
  const current = tx.get('threads', thread.id) ?? thread
  tx.put('threads', {
    ...current,
    lastMessageAt: tx.now,
    members: current.members.map((m) =>
      author && m.personId === author.personId ? { ...m, lastReadAt: tx.now } : m,
    ),
  })
  return message
}
