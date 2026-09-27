// Creating notifications. Every one belongs to a portal (role), so someone who is both a
// landlord and a tenant sees each in the right place.

import { newId } from '@/domain/ids'
import type {
  EntityRef,
  Job,
  NotificationKind,
  NotificationRecord,
  PersonId,
  Role,
} from '@/domain/types'
import { jobParties } from './access'
import { hrefs } from './hrefs'
import type { Draft } from './tx'

export interface NotifyInput {
  to: readonly PersonId[]
  role: Role
  kind: NotificationKind
  title: string
  body?: string
  href: string
  ref?: EntityRef
  /** The person who caused it; they don't need telling. */
  except?: PersonId
}

export function notify(tx: Draft, input: NotifyInput): void {
  for (const recipientId of new Set(input.to)) {
    if (recipientId === input.except) continue
    const person = tx.get('people', recipientId)
    if (!person || !person.roles.includes(input.role)) continue
    const record: NotificationRecord = {
      id: newId('notification'),
      recipientId,
      role: input.role,
      kind: input.kind,
      title: input.title,
      href: input.href,
      createdAt: tx.now,
    }
    if (input.body) record.body = input.body
    if (input.ref) record.ref = input.ref
    tx.put('notifications', record)
  }
}

/** "Kev" from "Kev Rattray", for friendly notification titles. */
export function firstName(tx: Pick<Draft, 'get'>, personId: PersonId | undefined): string {
  const name = tx.get('people', personId)?.displayName ?? 'Someone'
  return name.split(' ')[0] ?? name
}

/** Tells everyone on a job except the person acting, each in the portal they use for it. */
export function notifyJobParties(
  tx: Draft,
  job: Job,
  except: PersonId,
  message: { kind: NotificationKind; title: string; body?: string },
  roles: readonly Role[] = ['tenant', 'landlord', 'trade'],
): void {
  const parties = jobParties(tx, job)
  for (const role of roles) {
    notify(tx, {
      to: parties.filter((p) => p.role === role).map((p) => p.personId),
      role,
      ...message,
      href: hrefs.job(role, job.id),
      ref: { entity: 'job', id: job.id },
      except,
    })
  }
}
