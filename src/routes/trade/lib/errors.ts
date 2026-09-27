import { SlateError } from '@/data'

/** The data layer's own words for what went wrong: already plain British English. */
export function errorText(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}

/** The message for one field, ready to show under it. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof SlateError ? error.fields[field] : undefined
}
