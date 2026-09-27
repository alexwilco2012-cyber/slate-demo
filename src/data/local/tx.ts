// Reading and changing the store's data. A Draft is one change in progress: it copies a table
// only when it first writes to it, records what changed for subscribers and other tabs, and is
// thrown away if a rule check fails part-way, so a failed call never leaves half a change behind.

import type { DataChange } from '@/data/api'
import type { IsoDateTime } from '@/domain/types'
import {
  TABLE_ENTITY,
  rowsOf,
  type MagicLink,
  type SlateData,
  type Table,
  type TableName,
  type Tables,
} from './state'

/** Read access shared by a committed snapshot and a draft. */
export interface Reader {
  readonly now: IsoDateTime
  get<K extends TableName>(table: K, id: string | undefined): Tables[K] | undefined
  rows<K extends TableName>(table: K): Tables[K][]
  magicLink(token: string): MagicLink | undefined
}

type MutableTables = { [K in TableName]: Table<Tables[K]> }

/** A read-only view of committed data, with each table's rows listed once and reused. */
export function readerOf(data: SlateData): Reader {
  const cache = new Map<TableName, unknown[]>()
  return {
    now: data.now,
    get: (table, id) => (id === undefined ? undefined : data.tables[table][id]),
    rows<K extends TableName>(table: K): Tables[K][] {
      const cached = cache.get(table) as Tables[K][] | undefined
      if (cached) return cached
      const rows = rowsOf(data.tables[table])
      cache.set(table, rows)
      return rows
    },
    magicLink: (token) => data.magicLinks[token],
  }
}

export class Draft implements Reader {
  readonly base: SlateData
  now: IsoDateTime
  private readonly tables: MutableTables
  private readonly copied = new Set<TableName>()
  private magicLinks: Table<MagicLink>
  private readonly changed = new Map<string, DataChange>()

  constructor(base: SlateData, now: IsoDateTime) {
    this.base = base
    this.now = now
    this.tables = { ...base.tables }
    this.magicLinks = base.magicLinks
  }

  get<K extends TableName>(table: K, id: string | undefined): Tables[K] | undefined {
    return id === undefined ? undefined : this.tables[table][id]
  }

  rows<K extends TableName>(table: K): Tables[K][] {
    return rowsOf(this.tables[table])
  }

  /** Adds or replaces a row. Rows are never changed in place: pass a new object. */
  put<K extends TableName>(table: K, row: Tables[K]): Tables[K] {
    const rows = this.writable(table)
    rows[row.id] = row
    const existed = this.base.tables[table][row.id] !== undefined
    this.record(table, row.id, existed ? 'updated' : 'created')
    return row
  }

  /** Changes some fields of an existing row. */
  patch<K extends TableName>(table: K, id: string, fields: Partial<Tables[K]>): Tables[K] {
    const current = this.get(table, id)
    if (!current) throw new Error(`No ${table} row ${id}`)
    return this.put(table, { ...current, ...fields })
  }

  remove<K extends TableName>(table: K, id: string): void {
    if (!this.get(table, id)) return
    const rows = this.writable(table)
    delete rows[id]
    const existed = this.base.tables[table][id] !== undefined
    if (existed) this.record(table, id, 'deleted')
    else this.changed.delete(`${table}:${id}`)
  }

  magicLink(token: string): MagicLink | undefined {
    return this.magicLinks[token]
  }

  putMagicLink(link: MagicLink): void {
    this.magicLinks = { ...this.magicLinks, [link.token]: link }
  }

  /** Marks a row as changed without replacing it, e.g. because derived views of it moved on. */
  touch(table: TableName, id: string): void {
    const key = `${table}:${id}`
    if (!this.changed.has(key)) this.record(table, id, 'updated')
  }

  changes(): DataChange[] {
    return [...this.changed.values()]
  }

  hasChanges(): boolean {
    return this.changed.size > 0 || this.magicLinks !== this.base.magicLinks
  }

  /** The data as it stands in this draft. */
  snapshot(): SlateData {
    return { ...this.base, now: this.now, tables: { ...this.tables }, magicLinks: this.magicLinks }
  }

  private writable<K extends TableName>(table: K): Partial<Record<string, Tables[K]>> {
    if (!this.copied.has(table)) {
      this.tables[table] = { ...this.tables[table] }
      this.copied.add(table)
    }
    return this.tables[table] as Partial<Record<string, Tables[K]>>
  }

  private record(table: TableName, id: string, op: DataChange['op']): void {
    const key = `${table}:${id}`
    const previous = this.changed.get(key)
    // Created then changed in the same draft is still a creation for everyone else.
    const finalOp = previous?.op === 'created' && op === 'updated' ? 'created' : op
    this.changed.set(key, changeOf(table, id, finalOp))
  }
}

export function changeOf(table: TableName, id: string, op: DataChange['op']): DataChange {
  // The id belongs to this table, so its prefix matches the entity; TypeScript can't see that.
  return { entity: TABLE_ENTITY[table], id, op } as DataChange
}

/** Every row that differs between two copies of the data, compared by reference. */
export function diffData(before: SlateData, after: SlateData): DataChange[] {
  const changes: DataChange[] = []
  for (const table of Object.keys(TABLE_ENTITY) as TableName[]) {
    const a = before.tables[table]
    const b = after.tables[table]
    if (a === b) continue
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const was = a[id]
      const is = b[id]
      if (was === is) continue
      changes.push(changeOf(table, id, !was ? 'created' : !is ? 'deleted' : 'updated'))
    }
  }
  return changes
}
