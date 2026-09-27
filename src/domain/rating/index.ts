// The rating engine: pure functions over the records in types.ts, with every number in config.ts.
// Nothing here stores anything or knows about React or storage; the data layer calls these on
// every read and write so the rules in SPEC §5 and §6 hold in one place.
//
// Rule 11 holds by design: nothing here sorts, filters or rejects tenants by their ratings, the
// tenant passport never becomes a single number, and scoreSummary refuses to score a tenant.

export * from './config'
export * from './correction'
export * from './display'
export * from './filter'
export * from './helpful'
export * from './moderation'
export * from './passport'
export * from './reports'
export * from './responses'
export * from './result'
export * from './retention'
export * from './reveal'
export * from './review'
export * from './roles'
export * from './scoring'
export * from './shield'
export * from './submit'
export * from './text-rules'
export * from './time'
export * from './unlock'
export * from './visibility'
