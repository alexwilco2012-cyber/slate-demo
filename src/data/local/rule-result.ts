// The rating engine's rule checks return a result rather than throw, so it stays pure. The data
// layer turns a failed result into the same SlateError every other check throws.

import { SlateError } from '@/data/api'
import type { RuleResult } from '@/domain/rating'

export function orThrow<T>(result: RuleResult<T>): T {
  if (result.ok) return result.value
  throw new SlateError(result.code, result.message, { ...result.fields })
}
