// Quote arithmetic. Totals are always worked out from the line items, never typed in.

import type { Pence, QuoteLineItem } from '@/domain/types'

/** UK standard rate. Every repair in the demo is standard-rated. */
export const VAT_RATE = 0.2

export interface QuoteTotals {
  subtotalPence: Pence
  vatPence: Pence
  totalPence: Pence
}

export function lineTotal(line: QuoteLineItem): Pence {
  return Math.round(line.quantity * line.unitPence)
}

export function quoteTotals(lines: readonly QuoteLineItem[], vatRegistered: boolean): QuoteTotals {
  const subtotalPence = lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const vatPence = vatRegistered ? Math.round(subtotalPence * VAT_RATE) : 0
  return { subtotalPence, vatPence, totalPence: subtotalPence + vatPence }
}

const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

/** "£156.00", for notifications and system messages. */
export function formatPence(pence: Pence): string {
  return pounds.format(pence / 100)
}
