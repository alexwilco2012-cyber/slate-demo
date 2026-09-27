import type { ReactNode } from 'react'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import {
  DOCUMENT_TYPE_INFO,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
} from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { formatDate } from './format'
import { DOCUMENT_ICONS, DocumentStatusBadge } from './document-meta'

export interface DocumentCardProps {
  type: DocumentType
  status: DocumentStatus
  /** Days until expiry, negative once expired, null if it never expires or isn't on file. */
  daysLeft: number | null
  /** The current file, if there is one. */
  document?: Pick<
    DocumentRecord,
    'title' | 'issuedAt' | 'expiresAt' | 'reference' | 'issuedBy' | 'sharedWithTenant'
  >
  /** e.g. "17 Fonthill Road, AB11". Leave out on a single property's page. */
  propertyLabel?: string
  bookedFor?: string
  /** Buttons: view, replace, book renewal. */
  actions?: ReactNode
  headingLevel?: 'h3' | 'h4'
  className?: string
}

/** The big figure on the right: "158 / days left", "Due / today", "5 / days overdue". */
function countdownOf(daysLeft: number | null) {
  if (daysLeft === null) return null
  if (daysLeft === 0) return { figure: 'Due', caption: 'today' }
  const days = Math.abs(daysLeft)
  const unit = days === 1 ? 'day' : 'days'
  return { figure: String(days), caption: daysLeft < 0 ? `${unit} overdue` : `${unit} left` }
}

/** One document or certificate: what it is, its status in words, the dates and how long is left. */
export function DocumentCard({
  type,
  status,
  daysLeft,
  document,
  propertyLabel,
  bookedFor,
  actions,
  headingLevel: Heading = 'h3',
  className,
}: DocumentCardProps) {
  const Glyph = DOCUMENT_ICONS[type]
  const info = DOCUMENT_TYPE_INFO[type]
  const expired = daysLeft !== null && daysLeft < 0
  const countdown = countdownOf(daysLeft)

  return (
    <article
      className={cn(
        '@container flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-2">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-tint text-accent-text"
        >
          <Glyph weight="duotone" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 basis-32 flex-col gap-1">
          <Heading className="font-semibold leading-snug text-ink">
            {document?.title ?? info.label}
          </Heading>
          {propertyLabel ? <p className="text-small text-muted">{propertyLabel}</p> : null}
          <div className="mt-1">
            <DocumentStatusBadge status={status} size="sm" />
          </div>
        </div>
        {countdown ? (
          <p className="flex shrink-0 items-baseline gap-1.5 @max-2xs:basis-full @max-2xs:pl-14.5 @2xs:flex-col @2xs:items-end @2xs:gap-0 @2xs:text-right">
            <span
              className={cn(
                'font-display figures block text-display-m leading-none font-semibold',
                expired ? 'text-critical' : 'text-ink',
              )}
            >
              {countdown.figure}
            </span>
            <span className={cn('text-caption', expired ? 'text-critical' : 'text-muted')}>
              {countdown.caption}
            </span>
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-small">
        {document ? (
          <>
            <div>
              <dt className="text-muted">Issued</dt>
              <dd className="figures text-ink">{formatDate(document.issuedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">Expires</dt>
              <dd className="figures text-ink">
                {document.expiresAt ? formatDate(document.expiresAt) : 'Does not expire'}
              </dd>
            </div>
            {document.issuedBy ? (
              <div>
                <dt className="text-muted">Issued by</dt>
                <dd className="text-ink">{document.issuedBy}</dd>
              </div>
            ) : null}
            {document.reference ? (
              <div>
                <dt className="text-muted">Reference</dt>
                <dd className="figures break-all text-ink">{document.reference}</dd>
              </div>
            ) : null}
          </>
        ) : (
          <div className="col-span-2">
            <dt className="sr-only">On file</dt>
            <dd className="text-ink">Nothing on file yet.</dd>
          </div>
        )}
        {bookedFor ? (
          <div className="col-span-2">
            <dt className="text-muted">Renewal booked</dt>
            <dd className="figures text-ink">{formatDate(bookedFor)}</dd>
          </div>
        ) : null}
      </dl>

      {document || actions ? (
        <footer className="flex flex-wrap items-center justify-between gap-(--gap-touch) border-t border-line pt-3.5">
          {document ? (
            <p className="flex items-center gap-1.5 text-small text-muted">
              {document.sharedWithTenant ? (
                <EyeIcon weight="bold" aria-hidden className="size-4" />
              ) : (
                <EyeSlashIcon weight="bold" aria-hidden className="size-4" />
              )}
              {document.sharedWithTenant ? 'Shared with tenant' : 'Not shared with tenant'}
            </p>
          ) : (
            <span />
          )}
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </footer>
      ) : null}
    </article>
  )
}
