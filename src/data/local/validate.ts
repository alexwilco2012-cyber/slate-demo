// Input checks shared by the API methods. Each throws a SlateError('validation') whose `fields`
// hold a message ready to show under the input, in plain British English.

import { SlateError } from '@/data/api'
import type { ImageRef, IsoDate, IsoDateTime } from '@/domain/types'
import { isValidDate, isValidDateTime } from './dates'

export function invalid(field: string, message: string): SlateError {
  return new SlateError('validation', message, { [field]: message })
}

interface TextRule {
  field: string
  /** Used in messages, e.g. 'your reply'. */
  label: string
  min?: number
  max: number
}

/** Trims and checks the length. Returns the trimmed text. */
export function requireText(value: unknown, rule: TextRule): string {
  const text = typeof value === 'string' ? value.trim() : ''
  const min = rule.min ?? 1
  if (text.length < min) {
    throw invalid(
      rule.field,
      min <= 1 ? `Add ${rule.label}.` : `Write at least ${min} characters for ${rule.label}.`,
    )
  }
  if (text.length > rule.max) {
    throw invalid(
      rule.field,
      `Keep ${rule.label} to ${rule.max.toLocaleString('en-GB')} characters.`,
    )
  }
  return text
}

/** Like requireText, but blank means "not given". */
export function optionalText(value: unknown, rule: TextRule): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  return requireText(value, rule)
}

export function requireOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
  message: string,
): T {
  if (typeof value === 'string' && (options as readonly string[]).includes(value)) return value as T
  throw invalid(field, message)
}

export function requireDate(value: unknown, field: string, label: string): IsoDate {
  if (typeof value === 'string' && isValidDate(value)) return value
  throw invalid(field, `Enter a real date for ${label}.`)
}

export function requireDateTime(value: unknown, field: string, label: string): IsoDateTime {
  if (typeof value === 'string' && isValidDateTime(value)) return new Date(value).toISOString()
  throw invalid(field, `Choose a real date and time for ${label}.`)
}

/** Whole pence, zero or more, up to a sensible ceiling. */
export function requirePence(
  value: unknown,
  field: string,
  label: string,
  max = 10_000_000,
): number {
  const valid = typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
  if (valid) return value
  throw invalid(field, `Enter ${label} in whole pence, between 0 and ${max / 100} pounds.`)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function requireEmail(value: unknown, field = 'email'): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) {
    throw invalid(field, 'Enter an email address like name@example.com.')
  }
  return email
}

/** The first part of a UK postcode, e.g. AB10 or AB25. */
export function requireDistrict(value: unknown, field = 'postcodeDistrict'): string {
  const district = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!/^[A-Z]{1,2}\d[A-Z\d]?$/.test(district)) {
    throw invalid(field, 'Enter the first part of a postcode, like AB10.')
  }
  return district
}

export function requireImages(value: unknown, field = 'photos', max = 10): ImageRef[] {
  if (!Array.isArray(value)) throw invalid(field, 'Photos must be a list.')
  if (value.length > max) throw invalid(field, `Add up to ${max} photos.`)
  return value.map((item: unknown) => {
    const image = item as Partial<ImageRef> | null
    if (!image || typeof image.url !== 'string' || image.url.length === 0) {
      throw invalid(field, 'One of the photos could not be read. Try adding it again.')
    }
    const alt = typeof image.alt === 'string' ? image.alt.trim().slice(0, 200) : ''
    return { url: image.url, alt: alt || 'Photo' }
  })
}
