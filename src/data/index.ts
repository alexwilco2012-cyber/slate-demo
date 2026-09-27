// Everything screens need from the data layer: the SlateApi contract, the local implementation
// and its React hooks, and the demo's fixed "today" and personas.

export * from './api'
export * from './local'
export {
  DEMO_NOW,
  DEMO_TODAY,
  PERSONAS,
  PERSONA_IDS,
  PLACEHOLDER_SCHEME,
  isPlaceholder,
} from './seed'
