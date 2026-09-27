// Wording shared by the landlord screens.

import type { Pence, Property } from '@/domain/types'

/** "14 Esslemont Avenue": the street part of the address, for lists and headings. */
export function streetOf(property: Pick<Property, 'addressLine'>): string {
  const parts = property.addressLine.split(', ')
  return parts.at(-1) ?? property.addressLine
}

/** "Top Floor Right": the flat part, or null for a whole house. */
export function flatOf(property: Pick<Property, 'addressLine'>): string | null {
  const parts = property.addressLine.split(', ')
  return parts.length > 1 ? parts.slice(0, -1).join(', ') : null
}

/** "14 Esslemont Avenue, Rosemount". */
export function placeOf(property: Pick<Property, 'addressLine' | 'neighbourhood'>): string {
  return `${streetOf(property)}, ${property.neighbourhood}`
}

const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** "£875", or "£64.50" when there are pence. */
export function formatPounds(pence: Pence): string {
  return pounds.format(pence / 100)
}

/** "Sarah", from "Sarah Laing". */
export function firstName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName
}

/** "Sarah", "Ruaridh and Chloe", "Ann, Bea and Cat". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** "gas safety record" from "Gas safety record", leaving acronyms such as "LPG" or "EICR" alone. */
export function lowerFirst(label: string): string {
  return /^[A-Z][A-Z]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1)
}

/** "1 thing", "3 things". */
export function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "1st", "2nd", "23rd", "11th": a day of the month. */
export function ordinal(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13
  const suffix = teen
    ? 'th'
    : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th')
  return `${day}${suffix}`
}
