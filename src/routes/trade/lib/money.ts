// Quote arithmetic for the quote builder's running total. The data layer works the real totals out
// again from the lines when the quote is sent, so this only has to match it, never replace it.

import type { LineItemKind, Pence, QuoteLineItem, SavedLineItem } from '@/domain/types'

/** UK standard rate. Every repair in the demo is standard-rated. */
export const VAT_RATE = 0.2

export interface Totals {
  subtotalPence: Pence
  vatPence: Pence
  totalPence: Pence
}

export function lineTotal(line: Pick<QuoteLineItem, 'quantity' | 'unitPence'>): Pence {
  return Math.round(line.quantity * line.unitPence)
}

export function totalsOf(lines: readonly QuoteLineItem[], vatRegistered: boolean): Totals {
  const subtotalPence = lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const vatPence = vatRegistered ? Math.round(subtotalPence * VAT_RATE) : 0
  return { subtotalPence, vatPence, totalPence: subtotalPence + vatPence }
}

/** Reads "42", "42.5", "£1,240.00" as pence; null if it isn't a sum of money. */
export function parsePounds(text: string): Pence | null {
  const cleaned = text.replace(/[£,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

/** "42.50" for an input box: no symbol, always two decimals. */
export function poundsInput(pence: Pence): string {
  return (pence / 100).toFixed(2)
}

export const KIND_LABELS: Record<LineItemKind, string> = {
  labour: 'Labour',
  materials: 'Parts',
  callout: 'Call-out',
  other: 'Other',
}

export const UNIT_LABELS: Record<SavedLineItem['unit'], string> = {
  each: 'each',
  hour: 'an hour',
  metre: 'a metre',
}

/** Hours move in halves; everything else in whole units. */
export function stepFor(unit: SavedLineItem['unit'] | undefined): number {
  return unit === 'hour' ? 0.5 : 1
}

const quantityFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

/** "1.5 hours", "2", "3 metres". */
export function quantityText(quantity: number, unit: SavedLineItem['unit'] | undefined): string {
  const figure = quantityFormat.format(quantity)
  if (unit === 'hour') return `${figure} ${quantity === 1 ? 'hour' : 'hours'}`
  if (unit === 'metre') return `${figure} ${quantity === 1 ? 'metre' : 'metres'}`
  return figure
}
