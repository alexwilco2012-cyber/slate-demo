// Keeps browser tabs in step, so three portals open side by side update each other live. Each
// change posts the whole data set with a revision number over a BroadcastChannel; other tabs take
// it if it is newer. BroadcastChannel can be missing or can throw, in which case each tab simply
// works on its own until it is reloaded.

import type { DataChange } from '@/data/api'
import { isSlateData, type SlateData } from './state'

export const CHANNEL_NAME = 'slate-demo'

export interface StateMessage {
  type: 'state'
  /** The tab that made the change. */
  origin: string
  revision: number
  data: SlateData
  changes: DataChange[]
}

export type SyncMessage = StateMessage

/** The small part of BroadcastChannel we use, so tests can pass a fake. */
export interface ChannelLike {
  postMessage(message: unknown): void
  close(): void
  onmessage: ((event: MessageEvent) => void) | null
}

export interface Sync {
  post(message: SyncMessage): void
  close(): void
}

export function isSyncMessage(value: unknown): value is SyncMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<StateMessage>
  return (
    message.type === 'state' &&
    typeof message.origin === 'string' &&
    typeof message.revision === 'number' &&
    Array.isArray(message.changes) &&
    isSlateData(message.data)
  )
}

/**
 * Whether this tab should take another tab's data. Newer revisions win. Two tabs that changed
 * something at the same moment have the same revision; the higher origin id wins, so every tab
 * ends up agreeing on the same copy.
 */
export function shouldAdopt(
  local: { revision: number; origin: string },
  message: SyncMessage,
): boolean {
  if (message.origin === local.origin) return false
  if (message.revision !== local.revision) return message.revision > local.revision
  return message.origin > local.origin
}

export function defaultChannel(name: string = CHANNEL_NAME): ChannelLike | null {
  try {
    if (typeof BroadcastChannel === 'undefined') return null
    return new BroadcastChannel(name)
  } catch {
    return null
  }
}

/** Listens on the channel and posts to it, swallowing any error the channel throws. */
export function connect(
  channel: ChannelLike | null,
  receive: (message: SyncMessage) => void,
): Sync {
  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      if (isSyncMessage(event.data)) receive(event.data)
    }
  }
  return {
    post(message) {
      try {
        channel?.postMessage(message)
      } catch {
        // A closed or broken channel: this tab carries on alone.
      }
    },
    close() {
      try {
        if (channel) {
          channel.onmessage = null
          channel.close()
        }
      } catch {
        // Already closed.
      }
    },
  }
}

/** A random id for this tab, so it can ignore its own messages. */
export function newOrigin(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}
