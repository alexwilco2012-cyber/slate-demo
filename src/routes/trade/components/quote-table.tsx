// A quote as a plain table: money stays in plain tables (SPEC §9), with tabular figures.

import type { Quote } from '@/domain/types'
import { formatPence } from '@/components/slate/format'
import { KIND_LABELS, lineTotal } from '../lib/money'

const quantityFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

export function QuoteTable({ quote, caption }: { quote: Quote; caption?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <table className="slate-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" data-align="end">
              Qty
            </th>
            <th scope="col" data-align="end">
              Price
            </th>
            <th scope="col" data-align="end">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((line, index) => (
            <tr key={`${line.description}-${index}`}>
              <td>
                <span className="font-semibold text-ink">{line.description}</span>
                <span className="block text-small text-muted">
                  {KIND_LABELS[line.kind]}
                  {/* Phones: the quantity and price columns fold into this line. */}
                  <span className="sm:hidden">
                    {' '}
                    · {quantityFormat.format(line.quantity)} × {formatPence(line.unitPence)}
                  </span>
                </span>
              </td>
              <td data-align="end" className="max-sm:hidden">
                {quantityFormat.format(line.quantity)}
              </td>
              <td data-align="end" className="max-sm:hidden">
                {formatPence(line.unitPence)}
              </td>
              <td data-align="end" className="font-semibold">
                {formatPence(lineTotal(line))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Totals subtotal={quote.subtotalPence} vat={quote.vatPence} total={quote.totalPence} />
    </div>
  )
}

export function Totals({
  subtotal,
  vat,
  total,
  vatNote,
}: {
  subtotal: number
  vat: number
  total: number
  /** Shown instead of a VAT line when none is charged. */
  vatNote?: string
}) {
  return (
    <dl className="figures ml-auto flex w-full max-w-xs flex-col gap-1.5 border-t border-input-border pt-3">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Subtotal</dt>
        <dd className="text-ink">{formatPence(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">VAT</dt>
        <dd className="text-ink">{vat > 0 ? formatPence(vat) : (vatNote ?? 'None')}</dd>
      </div>
      <div className="flex justify-between gap-4 text-body-l font-bold">
        <dt className="text-ink">Total</dt>
        <dd className="text-ink">{formatPence(total)}</dd>
      </div>
    </dl>
  )
}
