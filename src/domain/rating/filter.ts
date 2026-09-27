// The comment filter (SPEC §5 rule 7), run on public comments, replies and updates. It finds
// mentions of topics that have no place in a review, and says in plain English why each one
// matters, so the screen can highlight the words and explain rather than just refuse.
// 'block' stops the text being posted until it's changed. 'flag' lets it through, because the
// words are often innocent, and marks it for moderation to look at after it goes live.

import { SENSITIVE_TOPICS, type SensitiveTopic } from '@/domain/types'
import {
  DISTINCT_STREET_TYPES,
  FIRST_NAME,
  HONORIFIC_NAME,
  NOT_NAMES,
  NOT_STREET_NAME_WORDS,
  PATTERN_RULES,
  RELATION_NAME,
  STREET_TYPES,
} from './filter-rules'

export type FilterAction = 'block' | 'flag'

export interface FilterIssue {
  readonly topic: SensitiveTopic
  readonly action: FilterAction
  /** Character range in the checked text, for highlighting. */
  readonly start: number
  readonly end: number
  /** The words found, as written. */
  readonly text: string
}

export interface FilterReason {
  readonly topic: SensitiveTopic
  readonly action: FilterAction
  /** Plain British English, ready to show next to the highlighted words. */
  readonly message: string
}

/** Has the same shape as TextCheck in the data layer, plus the explanations. */
export interface FilterResult {
  readonly blocked: boolean
  readonly flagged: boolean
  /** In the order they appear in the text. A fresh array each time, like TextCheck's. */
  readonly issues: FilterIssue[]
  /** One per topic found: blocked topics first, then flagged ones. */
  readonly reasons: FilterReason[]
  /** One line for the top of the form, or null when nothing was found. */
  readonly summary: string | null
}

export interface FilterOptions {
  /**
   * Names that may appear, such as the person being rated ("Kev fixed it in an hour"). Every
   * word of each name is allowed.
   */
  readonly allowedNames?: readonly string[]
  /**
   * Names that must never appear, such as the reviewer's in the rated person's reply: reviewers
   * are only ever "Verified tenant · AB10 · 2025" (SPEC §5 rule 9). Every word of each name is
   * blocked wherever it is written as a name (capitalised), even if also in allowedNames.
   */
  readonly blockedNames?: readonly string[]
}

export const FILTER_MESSAGES = {
  children: {
    block:
      'Take out the part about children. Reviews are about how someone rented, let or worked, not about their family.',
    flag: 'This might be about children. If it is, take it out.',
  },
  benefits: {
    block: 'Take out the part about benefits. How someone pays their rent is their own business.',
    flag: 'This might be about benefits. If it is, take it out.',
  },
  health: {
    block: "Take out the part about health. Nobody's health belongs in a review.",
    flag: "This might be about someone's health. If it is, take it out.",
  },
  disability: {
    block: 'Take out the part about disability. It has no place in a review.',
    flag: 'This might be about disability or care needs. If it is, take it out.',
  },
  ethnicity: {
    block: 'Take out the part about race, ethnicity or nationality. It has no place in a review.',
    flag: 'This might touch on race, ethnicity or nationality. If it does, take it out.',
  },
  religion: {
    block: 'Take out the part about religion. It has no place in a review.',
    flag: 'This might be about religion. If it is, take it out.',
  },
  sexual_orientation: {
    block:
      'Take out the part about sexual orientation. Who someone is with has no place in a review.',
    flag: "This might be about someone's sexual orientation. If it is, take it out.",
  },
  age: {
    block:
      'Take out the part about age. Reviews are about how someone rented, let or worked, not how old they are.',
    flag: "This might be about someone's age. If it is, take it out.",
  },
  pregnancy: {
    block: 'Take out the part about pregnancy or maternity. It has no place in a review.',
    flag: 'This might be about pregnancy or maternity. If it is, take it out.',
  },
  immigration_status: {
    block: 'Take out the part about immigration status. It has no place in a review.',
    flag: 'This might be about immigration status. If it is, take it out.',
  },
  criminal_allegation: {
    block:
      "Don't accuse anyone of a crime in a review. If you think a crime has happened, contact the police. If you felt unsafe, tick the safety concern box and our team will look into it.",
    flag: 'This mentions crime or the police. Say what happened to you without accusing anyone. If you felt unsafe, tick the safety concern box.',
  },
  third_party_name: {
    block: "Take out the name. Reviews don't name anyone, including other people who were there.",
    flag: "This might be someone's name. If it is, take it out: reviews don't name anyone.",
  },
  phone_number: {
    block: "Take out the phone number. Reviews can't include contact details.",
    flag: 'This might be a phone number. If it is, take it out.',
  },
  email_address: {
    block: "Take out the email address. Reviews can't include contact details.",
    flag: 'This might be an email address. If it is, take it out.',
  },
  postal_address: {
    block: 'Take out the address. Your review already shows the area.',
    flag: 'This might be a street name. If it is, take it out: your review already shows the area.',
  },
} as const satisfies Record<SensitiveTopic, Record<FilterAction, string>>

export const FILTER_SUMMARY = {
  blocked: 'Change the highlighted words before you post.',
  flagged: 'You can post this, but check the highlighted words first.',
} as const

export function checkText(text: string, options: FilterOptions = {}): FilterResult {
  const source = normalise(text)
  const allowed = allowedNameSet(options.allowedNames ?? [])
  const found: FilterIssue[] = []
  const add = (topic: SensitiveTopic, action: FilterAction, start: number, end: number) => {
    if (end > start) found.push({ topic, action, start, end, text: text.slice(start, end) })
  }

  for (const rule of PATTERN_RULES) {
    for (const match of source.matchAll(rule.pattern)) {
      add(rule.topic, rule.action, match.index, match.index + match[0].length)
    }
  }
  findNames(source, allowed, add)
  findBlockedNames(source, options.blockedNames ?? [], add)
  findStreetNames(source, add)
  findLowerCaseAddresses(source, add)

  const issues = mergeOverlaps(found, text)
  const strongest = (topic: SensitiveTopic): FilterAction | null => {
    const actions = issues.filter((issue) => issue.topic === topic).map((issue) => issue.action)
    if (actions.includes('block')) return 'block'
    return actions.length > 0 ? 'flag' : null
  }
  const reasons = (['block', 'flag'] as const).flatMap((action) =>
    SENSITIVE_TOPICS.filter((topic) => strongest(topic) === action).map((topic): FilterReason => ({
      topic,
      action,
      message: FILTER_MESSAGES[topic][action],
    })),
  )
  const blocked = issues.some((issue) => issue.action === 'block')
  const flagged = issues.some((issue) => issue.action === 'flag')
  return {
    blocked,
    flagged,
    issues,
    reasons,
    summary: blocked ? FILTER_SUMMARY.blocked : flagged ? FILTER_SUMMARY.flagged : null,
  }
}

// Every replacement is one UTF-16 unit for one, so ranges found in the copy fit the original.
function normalise(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\uFF20/g, '@')
}

function allowedNameSet(names: readonly string[]): Set<string> {
  return new Set(
    names.flatMap((name) => name.split(/\s+/)).map((word) => word.trim().toLowerCase()),
  )
}

type AddIssue = (topic: SensitiveTopic, action: FilterAction, start: number, end: number) => void

const words = (list: readonly string[]) => `(?:${list.join('|')})`

/** "George Street": a first name that is part of a street name. */
const STREET_AFTER = new RegExp(
  String.raw`^(?:'s)?(?:\s+[A-Z][a-z'-]+){0,2}\s+${words(STREET_TYPES)}\b`,
)

/** "J Duncan & Sons", "Dave's Plumbing": a first name inside a business name. */
const BUSINESS_AFTER = new RegExp(
  String.raw`^(?:'s)?(?:\s+[A-Z][a-z'-]+){0,2}\s*(?:(?:&|\+|\band\b)\s*(?:Sons?|Co|Daughters?)\b|\s(?:Ltd|Limited|Plumbing|Heating|Electrical|Electrics|Joinery|Roofing|Building|Builders|Glazing|Locksmiths?|Services|Maintenance|Cleaning|Decorating|Lettings|Gas)\b)`,
)

function findNames(source: string, allowed: ReadonlySet<string>, add: AddIssue) {
  const isAllowed = (name: string) => allowed.has(name.toLowerCase())

  for (const match of source.matchAll(HONORIFIC_NAME)) {
    const name = match[1]
    if (name === undefined || isAllowed(name)) continue
    add('third_party_name', 'block', match.index, match.index + match[0].length)
  }

  for (const match of source.matchAll(RELATION_NAME)) {
    const name = match[1]
    if (name === undefined || !/^[A-Z]/.test(name) || NOT_NAMES.has(name) || isAllowed(name)) {
      continue
    }
    const end = match.index + match[0].length
    add('third_party_name', 'block', end - name.length, end)
  }

  for (const match of source.matchAll(FIRST_NAME)) {
    const name = match[0]
    const end = match.index + name.length
    const after = source.slice(end)
    if (isAllowed(name) || STREET_AFTER.test(after) || BUSINESS_AFTER.test(after)) continue
    add('third_party_name', 'flag', match.index, end)
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "Sarah" or "SARAH", but not "sarah" inside ordinary words or a lower-case "will". */
function findBlockedNames(source: string, names: readonly string[], add: AddIssue) {
  const nameWords = new Set(
    names.flatMap((name) => name.split(/\s+/)).filter((word) => /\p{L}/u.test(word)),
  )
  for (const word of nameWords) {
    const lower = word.toLowerCase()
    const capitalised = lower.charAt(0).toUpperCase() + lower.slice(1)
    const forms = [...new Set([word, capitalised, lower.toUpperCase()])].map(escapeRegExp)
    const pattern = new RegExp(
      String.raw`(?<![\p{L}\p{N}])(?:${forms.join('|')})(?![\p{L}\p{N}])`,
      'gu',
    )
    for (const match of source.matchAll(pattern)) {
      add('third_party_name', 'block', match.index, match.index + match[0].length)
    }
  }
}

/** Capitalised words that can start a street-name match without being part of the name. */
const NOT_STREET_WORDS = new Set([
  'The',
  'A',
  'An',
  'This',
  'That',
  'My',
  'Our',
  'Their',
  'His',
  'Her',
  'Your',
  'Its',
  'Then',
  'And',
  'But',
  'So',
  'On',
  'In',
  'At',
  'Off',
  'Near',
  'Along',
  'From',
  'To',
])

const STREET_NAME = new RegExp(
  String.raw`\b((?:[A-Z][a-z'-]+\s+){1,3})${words(DISTINCT_STREET_TYPES)}\b`,
  'g',
)

/** "the flat on Esslemont Avenue": flagged, since a street alone is often just the area. */
function findStreetNames(source: string, add: AddIssue) {
  for (const match of source.matchAll(STREET_NAME)) {
    const lead = [...(match[1] ?? '').matchAll(/\S+/g)]
    const first = lead.find((word) => !NOT_STREET_WORDS.has(word[0]))
    if (first === undefined) continue
    add('postal_address', 'flag', match.index + first.index, match.index + match[0].length)
  }
}

/** The words of a would-be street name are all real name words, not "the", "main" or "minutes". */
function isStreetName(words: string): boolean {
  const list = words.trim().toLowerCase().split(/\s+/)
  return list.length > 0 && list.every((word) => !NOT_STREET_NAME_WORDS.has(word))
}

/** "14 esslemont avenue", "7 union st": a house number and street, in any case. Blocked. */
const NUMBERED_STREET = new RegExp(
  String.raw`\b\d{1,4}[a-z]?,?\s+((?:[a-z][a-z'-]*\s+){1,3})${words(STREET_TYPES.map((type) => type.toLowerCase()))}\b`,
  'gi',
)

/**
 * "the flat on esslemont avenue": a lower-case street name after "on", "in" and the like. Only
 * flagged, and only for types that are rarely ordinary words ("drive" and "place" are left out).
 */
const LOWER_STREET_TYPES = DISTINCT_STREET_TYPES.filter(
  (type) => !['Drive', 'Place', 'Row', 'Square'].includes(type),
).map((type) => type.toLowerCase())
const LOWER_STREET_NAME = new RegExp(
  String.raw`\b(?:on|in|at|along|off|near|from|to|of|up|down)\s+(?:the\s+)?((?:[a-z][a-z'-]*\s+){1,2})${words(LOWER_STREET_TYPES)}\b`,
  'g',
)

function findLowerCaseAddresses(source: string, add: AddIssue) {
  for (const match of source.matchAll(NUMBERED_STREET)) {
    if (isStreetName(match[1] ?? '')) {
      add('postal_address', 'block', match.index, match.index + match[0].length)
    }
  }
  for (const match of source.matchAll(LOWER_STREET_NAME)) {
    const name = match[1] ?? ''
    if (!isStreetName(name)) continue
    // Highlight the street itself, not the "on the" before it.
    add(
      'postal_address',
      'flag',
      match.index + match[0].indexOf(name),
      match.index + match[0].length,
    )
  }
}

const STRENGTH = { block: 2, flag: 1 } as const

/** Joins overlapping finds of the same topic into one range, keeping the stronger action. */
function mergeOverlaps(found: readonly FilterIssue[], text: string): FilterIssue[] {
  const sorted = [...found].sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: FilterIssue[] = []
  for (const issue of sorted) {
    const index = merged.findIndex(
      (kept) => kept.topic === issue.topic && kept.start < issue.end && issue.start < kept.end,
    )
    const kept = merged[index]
    if (kept === undefined) {
      merged.push(issue)
      continue
    }
    const start = Math.min(kept.start, issue.start)
    const end = Math.max(kept.end, issue.end)
    const action = STRENGTH[issue.action] > STRENGTH[kept.action] ? issue.action : kept.action
    merged[index] = { topic: kept.topic, action, start, end, text: text.slice(start, end) }
  }
  return merged
}
