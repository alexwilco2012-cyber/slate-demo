import type { ReactNode } from 'react'
import { DOCUMENT_TYPE_INFO, type ComplianceItem } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatDate } from './format'
import { DOCUMENT_ICONS, DocumentStatusBadge, daysLeftText } from './document-meta'

export interface ComplianceTableProps {
  /** Says what the table covers, e.g. "Certificates for 17 Fonthill Road". */
  caption: ReactNode
  hideCaption?: boolean
  /** Show the property column (a whole portfolio rather than one home). */
  showProperty?: boolean
  children: ReactNode
  className?: string
}

/**
 * The landlord compliance calendar. A plain table (SPEC §9: compliance screens stay plain tables)
 * that turns into stacked rows on phones, so nothing scrolls sideways at 320px.
 */
export function ComplianceTable({
  caption,
  hideCaption,
  showProperty,
  children,
  className,
}: ComplianceTableProps) {
  return (
    <table className={cn('slate-table', className)}>
      <caption className={cn('pb-3 text-title font-semibold text-ink', hideCaption && 'sr-only')}>
        {caption}
      </caption>
      <thead>
        <tr>
          <th scope="col">Certificate or check</th>
          {showProperty ? <th scope="col">Home</th> : null}
          <th scope="col">Status</th>
          <th scope="col">Expires</th>
          <th scope="col" data-align="end">
            Time left
          </th>
          <th scope="col">
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Nothing() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">None</span>
    </>
  )
}

export interface ComplianceCalendarRowProps {
  item: Pick<ComplianceItem, 'type' | 'status' | 'daysLeft' | 'bookedFor'> & {
    document?: Pick<NonNullable<ComplianceItem['document']>, 'expiresAt'>
  }
  /** Needed when the table has a property column. */
  propertyLabel?: string
  /** One next step, e.g. a "Book renewal" or "Upload" button. */
  action?: ReactNode
}

/** One certificate or check: icon and name, status in words, expiry date and days left. */
export function ComplianceCalendarRow({ item, propertyLabel, action }: ComplianceCalendarRowProps) {
  const Glyph = DOCUMENT_ICONS[item.type]
  const info = DOCUMENT_TYPE_INFO[item.type]
  const expiresAt = item.document?.expiresAt
  const renewal =
    info.renewalMonths === null
      ? 'No renewal'
      : info.renewalMonths % 12 === 0
        ? `Every ${info.renewalMonths === 12 ? 'year' : `${info.renewalMonths / 12} years`}`
        : `Every ${info.renewalMonths} months`

  return (
    <tr>
      <td data-primary data-label="Certificate or check">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-ink"
          >
            <Glyph weight="duotone" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold text-ink">{info.label}</span>
            <span className="text-small text-muted">{renewal}</span>
          </span>
        </span>
      </td>
      {propertyLabel !== undefined ? (
        <td data-label="Home" className="text-small text-ink">
          {propertyLabel}
        </td>
      ) : null}
      <td data-label="Status">
        <DocumentStatusBadge status={item.status} size="sm" />
        {item.status === 'BOOKED' && item.bookedFor ? (
          <span className="mt-1 block text-caption text-muted">
            Booked for {formatDate(item.bookedFor)}
          </span>
        ) : null}
      </td>
      {/* Dates, day counts and the action keep to one line; the name and home columns wrap. */}
      <td data-label="Expires" className="figures text-small whitespace-nowrap text-ink">
        {expiresAt ? formatDate(expiresAt) : <Nothing />}
      </td>
      <td
        data-label="Time left"
        data-align="end"
        className={cn(
          'figures text-small whitespace-nowrap',
          item.daysLeft !== null && item.daysLeft < 0 ? 'font-semibold text-critical' : 'text-ink',
        )}
      >
        {daysLeftText(item.daysLeft) ?? <Nothing />}
      </td>
      <td data-full data-align="end" className="whitespace-nowrap">
        {action}
      </td>
    </tr>
  )
}
