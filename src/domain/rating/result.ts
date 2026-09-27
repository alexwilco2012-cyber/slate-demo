// Rule checks return a result instead of throwing, so the data layer can turn a failure into a
// SlateError with the same code, and screens can show the message as it is.

/** The SlateError codes the rating rules produce. */
export type RuleCode =
  'forbidden' | 'invalid_state' | 'validation' | 'window_closed' | 'already_done' | 'blocked_text'

export interface RuleFailure {
  readonly ok: false
  readonly code: RuleCode
  /** Plain British English, ready to show. */
  readonly message: string
  /** Messages per input field, e.g. { comment: 'Write at least 30 characters…' }. */
  readonly fields: Readonly<Partial<Record<string, string>>>
}

export interface RuleSuccess<T> {
  readonly ok: true
  readonly value: T
}

export type RuleResult<T = true> = RuleSuccess<T> | RuleFailure

export function pass<T>(value: T): RuleSuccess<T> {
  return { ok: true, value }
}

export function fail(
  code: RuleCode,
  message: string,
  fields: Partial<Record<string, string>> = {},
): RuleFailure {
  return { ok: false, code, message, fields }
}
