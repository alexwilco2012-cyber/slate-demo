// The only edits moderation may make to a review's words (SPEC §6): masking obscenity and fixing
// typos. Anything bigger changes what the reviewer said, and the rule then is to remove the
// review, never to rewrite it. These checks hold moderation to that.

import { RATING_CONFIG } from './config'

export type CorrectionReason = 'obscenity' | 'typo'

/**
 * Obscenity is masked in place: the text keeps its length, and every character that changes
 * becomes a mask character ("f***"). Nothing is added, removed or reworded.
 */
export function isMasking(before: string, after: string): boolean {
  const from = [...before]
  const to = [...after]
  if (from.length !== to.length) return false
  const masks = new Set<string>(RATING_CONFIG.correction.maskCharacters)
  let changed = 0
  for (const [index, char] of to.entries()) {
    if (char === from[index]) continue
    if (!masks.has(char)) return false
    changed += 1
  }
  return changed > 0
}

/**
 * A typo fix keeps every word in place and changes each by a letter or two ("recieve" to
 * "receive", "its" to "it's"), and only a few words in all. Adding or removing a word, such as a
 * "not", is never a typo fix.
 */
export function isTypoFix(before: string, after: string): boolean {
  const limits = RATING_CONFIG.correction.typo
  const from = words(before)
  const to = words(after)
  if (from.length !== to.length) return false
  let changedWords = 0
  for (const [index, word] of to.entries()) {
    const original = from[index] ?? ''
    if (word === original) continue
    const allowed =
      [...original].length <= limits.shortWordMaxLength
        ? limits.maxEditsPerShortWord
        : limits.maxEditsPerWord
    if (editDistance(original, word) > allowed) return false
    changedWords += 1
  }
  const maxChanged = Math.max(
    limits.minWordsChangeable,
    Math.floor(from.length * limits.maxShareOfWordsChanged),
  )
  return changedWords > 0 && changedWords <= maxChanged
}

export function isAllowedCorrection(
  reason: CorrectionReason,
  before: string,
  after: string,
): boolean {
  return reason === 'obscenity' ? isMasking(before, after) : isTypoFix(before, after)
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/**
 * Edits between two words, counting a swap of two neighbouring letters ("teh" to "the") as one,
 * as people make typos.
 */
export function editDistance(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  const rows = Array.from({ length: x.length + 1 }, (_, i) =>
    Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  const at = (i: number, j: number) => rows[i]?.[j] ?? Number.POSITIVE_INFINITY
  for (let i = 1; i <= x.length; i += 1) {
    const row = rows[i]
    if (!row) continue
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost)
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1)
      }
      row[j] = best
    }
  }
  return at(x.length, y.length)
}
