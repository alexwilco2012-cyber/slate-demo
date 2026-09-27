// What every group of API methods is given: a way to read the committed data and a way to make a
// change. A change runs inside a Draft; if it throws, nothing is saved.

import type { DataChange, Unsubscribe } from '@/data/api'
import type { Draft, Reader } from '../tx'

export interface LocalContext {
  /** The data as it stands now. */
  read(): Reader
  /**
   * Makes a change. The clock moves on a little, the change runs, then everything that follows
   * from it (reveals, notifications) is worked out, and the lot is saved and sent to other tabs.
   */
  write<T>(change: (tx: Draft) => T): T
  subscribe(listener: (change: DataChange) => void): Unsubscribe
}
