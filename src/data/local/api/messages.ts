// Conversations on a job or tenancy, with a role chip on every message, mute and block.

import type { SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import type { Thread } from '@/domain/types'
import {
  forbidden,
  managesProperty,
  notFound,
  requireJob,
  resolveViewer,
  type Actor,
} from '../access'
import { hrefs } from '../hrefs'
import { notify } from '../notify'
import { photosFrom } from '../photos'
import { authorFor, ensureJobThread, ensureTenancyThread, postMessage, threadFor } from '../threads'
import type { Reader } from '../tx'
import { invalid, requireImages, requireText } from '../validate'
import { blockedBy, threadSummary } from '../views'
import type { LocalContext } from './context'

type MessageMethods =
  | 'listThreads'
  | 'getThread'
  | 'getThreadFor'
  | 'listMessages'
  | 'sendMessage'
  | 'markThreadRead'
  | 'setThreadMuted'
  | 'listBlocks'
  | 'setBlocked'

/** Threads are per portal: a landlord who also rents sees each in the right place. */
function isMember(thread: Thread, actor: Actor): boolean {
  return thread.members.some((m) => m.personId === actor.person.id && m.role === actor.role)
}

function requireThread(db: Reader, actor: Actor, threadId: string): Thread {
  const thread = db.get('threads', threadId)
  if (!thread) throw notFound('conversation')
  if (!isMember(thread, actor)) throw forbidden("You're not part of that conversation.")
  return thread
}

const PREVIEW_LENGTH = 120

export function messagesApi(ctx: LocalContext): Pick<SlateApi, MessageMethods> {
  return {
    async listThreads(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('threads')
        .filter((thread) => isMember(thread, actor))
        .map((thread) => threadSummary(db, thread, actor.person.id))
        .sort((a, b) =>
          (b.thread.lastMessageAt ?? b.thread.createdAt).localeCompare(
            a.thread.lastMessageAt ?? a.thread.createdAt,
          ),
        )
    },

    async getThread(viewer, threadId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const thread = db.get('threads', threadId)
      return thread && isMember(thread, actor) ? thread : null
    },

    async getThreadFor(viewer, context) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const existing = threadFor(db, context)
      if (existing && isMember(existing, actor)) return existing
      return ctx.write((tx) => {
        const current = resolveViewer(tx, viewer)
        if (context.kind === 'job') {
          const { job } = requireJob(tx, current, context.jobId)
          const thread = ensureJobThread(tx, job)
          if (!isMember(thread, current)) throw forbidden("You're not part of that conversation.")
          return thread
        }
        const tenancy = tx.get('tenancies', context.tenancyId)
        if (!tenancy) throw notFound('tenancy')
        const property = tx.get('properties', tenancy.propertyId)
        const party =
          (current.role === 'tenant' && tenancy.tenantIds.includes(current.person.id)) ||
          (current.role === 'landlord' &&
            property !== undefined &&
            managesProperty(current, property))
        if (!party) throw forbidden("That tenancy isn't one of yours.")
        const thread = ensureTenancyThread(tx, tenancy)
        if (!isMember(thread, current)) throw forbidden("You're not part of that conversation.")
        return thread
      })
    },

    async listMessages(viewer, threadId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const thread = requireThread(db, actor, threadId)
      const blocked = blockedBy(db, actor.person.id)
      return db
        .rows('messages')
        .filter((m) => m.threadId === thread.id && !(m.author && blocked.has(m.author.personId)))
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    },

    async sendMessage(viewer, threadId, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const thread = requireThread(tx, actor, threadId)
        const images = requireImages(input.attachments ?? [], 'attachments')
        const body =
          images.length > 0 && (input.body ?? '').trim() === ''
            ? ''
            : requireText(input.body, { field: 'body', label: 'a message', max: 2000 })
        const author = authorFor(thread, actor.person.id)
        if (!author) throw forbidden("You're not part of that conversation.")
        const message = postMessage(
          tx,
          thread,
          author,
          'text',
          body,
          photosFrom(images, actor.person.id, tx.now),
        )
        const preview =
          body.length > PREVIEW_LENGTH
            ? `${body.slice(0, PREVIEW_LENGTH - 1)}…`
            : body || 'Sent a photo'
        for (const member of thread.members) {
          if (member.personId === actor.person.id || member.mutedAt) continue
          if (blockedBy(tx, member.personId).has(actor.person.id)) continue
          notify(tx, {
            to: [member.personId],
            role: member.role,
            kind: 'message',
            title: `${actor.person.displayName}: ${thread.title}`,
            body: preview,
            href: hrefs.thread(member.role, thread.id),
            ref: { entity: 'message', id: message.id },
          })
        }
        return message
      })
    },

    async markThreadRead(viewer, threadId) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const thread = requireThread(tx, actor, threadId)
        tx.put('threads', {
          ...thread,
          members: thread.members.map((m) =>
            m.personId === actor.person.id && m.role === actor.role
              ? { ...m, lastReadAt: tx.now }
              : m,
          ),
        })
        // Reading the conversation clears its message notifications too.
        const href = hrefs.thread(actor.role, thread.id)
        for (const n of tx.rows('notifications')) {
          if (n.kind !== 'message' || n.readAt || n.href !== href) continue
          if (n.recipientId !== actor.person.id || n.role !== actor.role) continue
          tx.put('notifications', { ...n, readAt: tx.now })
        }
      })
    },

    async setThreadMuted(viewer, threadId, muted) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const thread = requireThread(tx, actor, threadId)
        tx.put('threads', {
          ...thread,
          members: thread.members.map((m) => {
            if (m.personId !== actor.person.id || m.role !== actor.role) return m
            if (muted) return { ...m, mutedAt: m.mutedAt ?? tx.now }
            const { mutedAt: _unmuted, ...rest } = m
            return rest
          }),
        })
      })
    },

    async listBlocks(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db.rows('blocks').filter((b) => b.blockerId === actor.person.id)
    },

    async setBlocked(viewer, personId, blocked) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        if (personId === actor.person.id) throw invalid('personId', "You can't block yourself.")
        if (!tx.get('people', personId)) throw notFound('person')
        const existing = tx
          .rows('blocks')
          .find((b) => b.blockerId === actor.person.id && b.blockedId === personId)
        if (blocked && !existing) {
          tx.put('blocks', {
            id: newId('block'),
            blockerId: actor.person.id,
            blockedId: personId,
            createdAt: tx.now,
          })
        }
        if (!blocked && existing) tx.remove('blocks', existing.id)
      })
    },
  }
}
