// The local, in-browser implementation of SlateApi: a Zustand store saved to localStorage and
// shared between tabs over BroadcastChannel.

export { createLocalSlate, getLocalSlate, type LocalSlate, type LocalSlateOptions } from './client'
export {
  SlateProvider,
  selectNow,
  selectRevision,
  selectToday,
  useDemoNow,
  useSlate,
  useSlateQuery,
  useSlateStore,
  type QueryResult,
  type QueryState,
  type SlateClient,
} from './hooks'
export { hrefs } from './hrefs'
export { memoryStorage, STORAGE_KEY } from './storage'
export { CHANNEL_NAME, type ChannelLike, type SyncMessage } from './sync'
export type { SlateStore, SlateStoreState } from './store'
export type { SlateData } from './state'
