import { SlateError } from '@/data'

/** The plain-English message to show for a failed call. SlateError messages are written for people. */
export function errorMessage(error: unknown): string {
  if (error instanceof SlateError) return error.message
  return 'Something went wrong on our side. Try again in a moment.'
}

/** Messages per field, to show under each input. Empty for errors that aren't about one field. */
export function fieldErrors(error: unknown): Partial<Record<string, string>> {
  return error instanceof SlateError ? error.fields : {}
}

/** The record doesn't exist, or isn't this account's: shown as "couldn't find it", not a failure. */
export function isMissing(error: unknown): boolean {
  return error instanceof SlateError && (error.code === 'not_found' || error.code === 'forbidden')
}
