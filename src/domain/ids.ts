// Ids are prefixed strings, e.g. 'person_sarah' or 'job_3f9a2c7d41e0'. The prefix is part of the
// type, so a JobId can never be passed where a PersonId is expected, yet seed data stays as plain
// string literals and a Supabase text primary key can hold exactly the same values.

export const ID_PREFIXES = [
  'person',
  'agency',
  'membership',
  'property',
  'tenancy',
  'job',
  'visit',
  'event',
  'file',
  'quote',
  'lineitem',
  'thread',
  'message',
  'block',
  'document',
  'rating',
  'reply',
  'update',
  'dispute',
  'report',
  'share',
  'notification',
] as const
export type IdPrefix = (typeof ID_PREFIXES)[number]

export type Id<P extends IdPrefix> = `${P}_${string}`

export type PersonId = Id<'person'>
export type AgencyId = Id<'agency'>
export type MembershipId = Id<'membership'>
export type PropertyId = Id<'property'>
export type TenancyId = Id<'tenancy'>
export type JobId = Id<'job'>
export type VisitId = Id<'visit'>
export type EventId = Id<'event'>
export type FileId = Id<'file'>
export type QuoteId = Id<'quote'>
export type LineItemId = Id<'lineitem'>
export type ThreadId = Id<'thread'>
export type MessageId = Id<'message'>
export type BlockId = Id<'block'>
export type DocumentId = Id<'document'>
export type RatingId = Id<'rating'>
export type ReplyId = Id<'reply'>
export type UpdateId = Id<'update'>
export type DisputeId = Id<'dispute'>
export type ReportId = Id<'report'>
export type ShareId = Id<'share'>
export type NotificationId = Id<'notification'>

export function newId<P extends IdPrefix>(prefix: P): Id<P> {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

/** Narrows an untrusted string, such as a route parameter, to an id of the given kind. */
export function isId<P extends IdPrefix>(prefix: P, value: unknown): value is Id<P> {
  return (
    typeof value === 'string' && value.length > prefix.length + 1 && value.startsWith(`${prefix}_`)
  )
}
