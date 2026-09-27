// The shape of everything the local store holds: one table per record type, keyed by id, plus
// the demo clock and the simulated magic links. It is plain JSON so it can go straight into
// localStorage and across a BroadcastChannel.

import type { SignUpInput } from '@/data/api'
import type {
  Agency,
  Block,
  ContentReport,
  DisputeNote,
  DocumentRecord,
  EntityKind,
  IsoDateTime,
  Job,
  Message,
  NotificationRecord,
  PassportShare,
  Person,
  PersonId,
  Property,
  Quote,
  Rating,
  RatingUpdate,
  Reply,
  SavedLineItem,
  TeamMembership,
  Tenancy,
  Thread,
} from '@/domain/types'

/** Bump when the shape changes, so an old copy in localStorage is replaced by the seed. */
export const SCHEMA_VERSION = 1

export interface Tables {
  people: Person
  agencies: Agency
  memberships: TeamMembership
  properties: Property
  tenancies: Tenancy
  jobs: Job
  quotes: Quote
  lineItems: SavedLineItem
  threads: Thread
  messages: Message
  blocks: Block
  documents: DocumentRecord
  ratings: Rating
  replies: Reply
  updates: RatingUpdate
  disputes: DisputeNote
  reports: ContentReport
  shares: PassportShare
  notifications: NotificationRecord
}

export type TableName = keyof Tables
export type Row<K extends TableName> = Tables[K]

/** Keyed by id. Partial, so a lookup by an unknown id is typed as possibly missing. */
export type Table<T> = Readonly<Partial<Record<string, T>>>

export type TableSet = { readonly [K in TableName]: Table<Tables[K]> }

/** Which entity each table holds, for change events. */
export const TABLE_ENTITY = {
  people: 'person',
  agencies: 'agency',
  memberships: 'membership',
  properties: 'property',
  tenancies: 'tenancy',
  jobs: 'job',
  quotes: 'quote',
  lineItems: 'lineitem',
  threads: 'thread',
  messages: 'message',
  blocks: 'block',
  documents: 'document',
  ratings: 'rating',
  replies: 'reply',
  updates: 'update',
  disputes: 'dispute',
  reports: 'report',
  shares: 'share',
  notifications: 'notification',
} as const satisfies Record<TableName, EntityKind>

export const TABLE_NAMES = Object.keys(TABLE_ENTITY) as TableName[]

/** A simulated magic link. The demo "inbox" opens it; a real backend would email it. */
export interface MagicLink {
  token: string
  email: string
  /** The account it signs in to. Null for a sign-up until the link is opened. */
  personId: PersonId | null
  signUp?: SignUpInput
  createdAt: IsoDateTime
  expiresAt: IsoDateTime
  usedAt?: IsoDateTime
}

export interface SlateData {
  schema: typeof SCHEMA_VERSION
  /** The demo's "now". It moves on a little with each change, and jumps with advanceClock. */
  now: IsoDateTime
  tables: TableSet
  magicLinks: Table<MagicLink>
}

export function emptyTables(): TableSet {
  return {
    people: {},
    agencies: {},
    memberships: {},
    properties: {},
    tenancies: {},
    jobs: {},
    quotes: {},
    lineItems: {},
    threads: {},
    messages: {},
    blocks: {},
    documents: {},
    ratings: {},
    replies: {},
    updates: {},
    disputes: {},
    reports: {},
    shares: {},
    notifications: {},
  }
}

export function indexById<T extends { id: string }>(rows: readonly T[]): Table<T> {
  const table: Partial<Record<string, T>> = {}
  for (const row of rows) {
    if (table[row.id]) throw new Error(`Duplicate id in seed data: ${row.id}`)
    table[row.id] = row
  }
  return table
}

export function rowsOf<T>(table: Table<T>): T[] {
  return Object.values(table).filter((row): row is T => row !== undefined)
}

/** Loose check that something read from storage or another tab is data this version can use. */
export function isSlateData(value: unknown): value is SlateData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<SlateData>
  if (candidate.schema !== SCHEMA_VERSION || typeof candidate.now !== 'string') return false
  const tables = candidate.tables
  if (typeof tables !== 'object' || tables === null) return false
  return TABLE_NAMES.every((name) => typeof tables[name] === 'object' && tables[name] !== null)
}
