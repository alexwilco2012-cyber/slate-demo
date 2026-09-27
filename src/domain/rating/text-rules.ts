// Length limits and the comment filter for every public piece of text on a review: the comment,
// the rated person's reply and the reviewer's update.

import { checkText, FILTER_SUMMARY, type FilterOptions, type FilterResult } from './filter'
import { fail, pass, type RuleResult } from './result'

export interface TextLimits {
  readonly minLength?: number
  readonly maxLength: number
  /** The text may be left empty (the rating comment); the too-short message then says so. */
  readonly optional?: boolean
}

export interface CheckedText {
  /** Trimmed. Empty only when the text is optional and was left blank. */
  readonly text: string
  readonly filter: FilterResult
}

/** Characters as people count them, so an emoji is one, not two. */
export function charCount(text: string): number {
  return [...text].length
}

const formatCount = (count: number) => count.toLocaleString('en-GB')

/** Trims the text and checks it against the limits. Returns the trimmed text. */
export function checkLength(
  raw: string | undefined,
  limits: TextLimits,
  field: string,
): RuleResult<string> {
  const text = (raw ?? '').trim()
  const length = charCount(text)
  if (length === 0) {
    if (limits.optional) return pass('')
    return fail('validation', 'Write something first.', {
      [field]: 'Write something first.',
    })
  }
  if (limits.minLength !== undefined && length < limits.minLength) {
    const message = limits.optional
      ? `Write at least ${formatCount(limits.minLength)} characters, or leave this empty.`
      : `Write at least ${formatCount(limits.minLength)} characters.`
    return fail('validation', message, { [field]: `${message} You have ${formatCount(length)}.` })
  }
  if (length > limits.maxLength) {
    const message = `Keep this to ${formatCount(limits.maxLength)} characters or fewer.`
    return fail('validation', message, { [field]: `${message} You have ${formatCount(length)}.` })
  }
  return pass(text)
}

/**
 * Checks limits first, then the filter. A blocked topic fails with 'blocked_text'; flagged words
 * pass, and the result carries them so they can go to moderation.
 */
export function checkPublicText(
  raw: string | undefined,
  limits: TextLimits,
  field: string,
  options: FilterOptions = {},
): RuleResult<CheckedText> {
  const length = checkLength(raw, limits, field)
  if (!length.ok) return length
  const text = length.value
  const filter = checkText(text, options)
  if (filter.blocked) {
    const reasons = filter.reasons.filter((reason) => reason.action === 'block')
    return fail('blocked_text', FILTER_SUMMARY.blocked, {
      [field]: reasons.map((reason) => reason.message).join(' '),
    })
  }
  return pass({ text, filter })
}
