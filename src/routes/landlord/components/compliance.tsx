// The compliance calendar as a plain table, with the one next step on each certificate: book a
// renewal as a job, upload one (simulated in the demo), replace it, or open the booked job.

import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  EyeIcon,
  FilePlusIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate } from '@/data'
import {
  DOCUMENT_TYPE_INFO,
  type ComplianceItem,
  type DocumentRecord,
  type DocumentType,
  type Job,
  type Property,
  type PropertyId,
  type Tenancy,
} from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { ComplianceCalendarRow, ComplianceTable } from '@/components/slate/compliance-calendar'
import { DocumentCard } from '@/components/slate/document-card'
import { formatDate } from '@/components/slate/format'
import { useViewer } from '@/session'
import { NewJobDialog, type NewJobPreset } from './new-job-dialog'
import { errorMessage, fieldErrors } from '../lib/errors'
import { placeOf } from '../lib/format'
import { isOpen } from '../lib/jobs'
import { addDaysToDate, ukDate } from '../lib/time'

/** Certificates a trade renews on a visit, so they can be booked as a job. */
const RENEWED_BY_A_VISIT: ReadonlySet<DocumentType> = new Set([
  'gas_safety',
  'eicr',
  'smoke_heat_alarms',
  'co_alarms',
  'legionella',
  'pat',
  'epc',
])

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, last))
  return target.toISOString().slice(0, 10)
}

type Upload = { type: DocumentType; propertyId: PropertyId | null; replaces?: DocumentRecord }

/**
 * The shared table stacks its rows below a 640px screen. Here the table often sits in a column
 * narrower than the screen (a drawer, a two-column page, a tablet), so it stacks by the width of
 * its own box instead: the same stacked layout, driven by a container query.
 */
const STACK_BY_CONTAINER = [
  '@max-3xl:[&_thead]:sr-only',
  '@max-3xl:[&_tr]:grid @max-3xl:[&_tr]:grid-cols-[minmax(0,1fr)_auto] @max-3xl:[&_tr]:gap-x-4 @max-3xl:[&_tr]:gap-y-1.5',
  '@max-3xl:[&_tr]:border-b @max-3xl:[&_tr]:border-line @max-3xl:[&_tr]:py-4 @max-3xl:[&_tr:last-child]:border-b-0',
  '@max-3xl:[&_td]:block @max-3xl:[&_td]:border-0 @max-3xl:[&_td]:p-0',
  '@max-3xl:[&_td[data-primary]]:col-span-full @max-3xl:[&_td[data-full]]:col-span-full',
  '@max-3xl:[&_[data-align=end]]:text-left',
  '@max-3xl:[&_td[data-label]:not([data-primary])]:before:block',
  '@max-3xl:[&_td[data-label]:not([data-primary])]:before:text-caption',
  '@max-3xl:[&_td[data-label]:not([data-primary])]:before:text-muted',
  '@max-3xl:[&_td[data-label]:not([data-primary])]:before:content-[attr(data-label)]',
].join(' ')

/**
 * Fixed column widths once the table is a table, so the tables for each home line up one under
 * another on the documents page.
 */
const FIXED_COLUMNS = [
  '@3xl:table-fixed',
  '@3xl:[&_th:nth-child(2)]:w-36 @3xl:[&_th:nth-child(3)]:w-32',
  '@3xl:[&_th:nth-child(4)]:w-36 @3xl:[&_th:nth-child(5)]:w-60',
].join(' ')

export interface ComplianceManagerProps {
  items: readonly ComplianceItem[]
  properties: readonly Property[]
  tenancies: readonly Tenancy[]
  caption: ReactNode
  hideCaption?: boolean
  showProperty?: boolean
  /** The landlord or their agent may manage documents. */
  canManage: boolean
  /** Jobs on these homes, so a renewal already raised isn't raised twice. */
  jobs?: readonly Job[]
}

export function ComplianceManager({
  items,
  properties,
  tenancies,
  caption,
  hideCaption,
  showProperty,
  canManage,
  jobs = [],
}: ComplianceManagerProps) {
  const navigate = useNavigate()
  const [renewal, setRenewal] = useState<NewJobPreset | null>(null)
  const [upload, setUpload] = useState<Upload | null>(null)
  const [viewing, setViewing] = useState<ComplianceItem | null>(null)
  const byId = new Map(properties.map((p) => [p.id, p]))

  function actionFor(item: ComplianceItem) {
    if (item.status === 'BOOKED' && item.renewalJobId) {
      return (
        <Link
          to={`/landlord/jobs/${item.renewalJobId}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'max-sm:w-full')}
        >
          See the booking
          <ArrowRightIcon weight="bold" aria-hidden />
        </Link>
      )
    }
    const needsAction = item.status !== 'OK'
    const bookable = item.propertyId !== null && RENEWED_BY_A_VISIT.has(item.type)
    // A renewal raised but not yet booked in: the status still says expired or due, and the
    // row leads to that job rather than raising another.
    const raised = needsAction
      ? jobs.find(
          (job) =>
            job.complianceType === item.type && job.propertyId === item.propertyId && isOpen(job),
        )
      : undefined
    const view = item.document ? (
      <Button
        variant="ghost"
        size="sm"
        iconStart={<EyeIcon weight="bold" aria-hidden />}
        onClick={() => setViewing(item)}
      >
        View
      </Button>
    ) : null
    let main = null
    if (raised) {
      main = (
        <Link
          to={`/landlord/jobs/${raised.id}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          See the renewal
          <ArrowRightIcon weight="bold" aria-hidden />
        </Link>
      )
    } else if (canManage && needsAction && bookable) {
      main = (
        <Button
          size="sm"
          variant={item.status === 'EXPIRED' ? 'primary' : 'secondary'}
          iconStart={<CalendarPlusIcon weight="bold" aria-hidden />}
          onClick={() => setRenewal({ propertyId: item.propertyId!, complianceType: item.type })}
        >
          {item.status === 'TO_ARRANGE' ? 'Arrange' : 'Book renewal'}
        </Button>
      )
    } else if (canManage && needsAction) {
      main = (
        <Button
          size="sm"
          variant={item.status === 'EXPIRED' ? 'primary' : 'secondary'}
          iconStart={
            item.document ? (
              <FilePlusIcon weight="bold" aria-hidden />
            ) : (
              <UploadSimpleIcon weight="bold" aria-hidden />
            )
          }
          onClick={() =>
            setUpload({ type: item.type, propertyId: item.propertyId, replaces: item.document })
          }
        >
          {item.document ? 'Replace' : 'Upload'}
        </Button>
      )
    } else if (canManage && !item.document) {
      main = (
        <Button
          size="sm"
          variant="ghost"
          iconStart={<UploadSimpleIcon weight="bold" aria-hidden />}
          onClick={() => setUpload({ type: item.type, propertyId: item.propertyId })}
        >
          Upload
        </Button>
      )
    }
    // Replacing or uploading an in-date certificate lives in the View sheet, to keep rows calm.
    return (
      <span className="flex justify-end gap-2 @max-3xl:justify-start @max-3xl:pt-2 max-sm:flex-wrap max-sm:justify-stretch max-sm:[&>*]:flex-1">
        {view}
        {main}
      </span>
    )
  }

  return (
    <>
      <div className="@container">
        <ComplianceTable
          caption={caption}
          hideCaption={hideCaption}
          showProperty={showProperty}
          className={cn(STACK_BY_CONTAINER, !showProperty && FIXED_COLUMNS)}
        >
          {items.map((item) => {
            const property = item.propertyId ? byId.get(item.propertyId) : undefined
            return (
              <ComplianceCalendarRow
                key={`${item.type}-${item.propertyId ?? 'all'}`}
                item={item}
                propertyLabel={
                  showProperty ? (property ? placeOf(property) : 'All homes') : undefined
                }
                action={actionFor(item)}
              />
            )
          })}
        </ComplianceTable>
      </div>
      <NewJobDialog
        open={renewal !== null}
        onOpenChange={(open) => (open ? null : setRenewal(null))}
        properties={properties}
        preset={renewal ?? undefined}
        onCreated={(job) => navigate(`/landlord/jobs/${job.id}`)}
      />
      <UploadDialog
        upload={upload}
        onClose={() => setUpload(null)}
        properties={properties}
        tenancies={tenancies}
      />
      <DocumentDialog
        item={viewing}
        property={viewing?.propertyId ? byId.get(viewing.propertyId) : undefined}
        canManage={canManage}
        onClose={() => setViewing(null)}
        onReplace={(item) => {
          setViewing(null)
          setUpload({ type: item.type, propertyId: item.propertyId, replaces: item.document })
        }}
      />
    </>
  )
}

function UploadDialog({
  upload,
  onClose,
  properties,
  tenancies,
}: {
  upload: Upload | null
  onClose: () => void
  properties: readonly Property[]
  tenancies: readonly Tenancy[]
}) {
  return (
    <Dialog open={upload !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {upload ? (
        <UploadForm
          upload={upload}
          onClose={onClose}
          properties={properties}
          tenancies={tenancies}
        />
      ) : null}
    </Dialog>
  )
}

function UploadForm({
  upload,
  onClose,
  properties,
  tenancies,
}: {
  upload: Upload
  onClose: () => void
  properties: readonly Property[]
  tenancies: readonly Tenancy[]
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const today = ukDate(now)
  const info = DOCUMENT_TYPE_INFO[upload.type]
  const property = properties.find((p) => p.id === upload.propertyId)
  const tenancy = upload.propertyId
    ? tenancies.find((t) => t.propertyId === upload.propertyId && t.status === 'confirmed')
    : undefined
  const needsTenancy = info.scope === 'tenancy'
  const [file, setFile] = useState<{ name: string; sizeBytes?: number } | null>(null)
  const [issuedAt, setIssuedAt] = useState(today)
  const [expiresAt, setExpiresAt] = useState(
    info.renewalMonths === null ? '' : addMonths(today, info.renewalMonths),
  )
  const [reference, setReference] = useState('')
  const [issuedBy, setIssuedBy] = useState('')
  const [shared, setShared] = useState(info.scope !== 'landlord' && upload.type !== 'insurance')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!file) return setErrors({ file: 'Choose the file, or use the sample file.' })
    if (needsTenancy && !tenancy) {
      return setErrors({ file: 'This belongs to a tenancy, and nobody lives here at the moment.' })
    }
    setBusy(true)
    try {
      const slug = `${upload.type}-${Date.now().toString(36)}`
      await api.uploadDocument(viewer, {
        type: upload.type,
        propertyId: upload.propertyId,
        ...(tenancy && needsTenancy ? { tenancyId: tenancy.id } : {}),
        file: { name: file.name, url: `placeholder://document/${slug}`, sizeBytes: file.sizeBytes },
        issuedAt,
        expiresAt: info.renewalMonths === null ? null : expiresAt || undefined,
        ...(reference.trim() ? { reference } : {}),
        ...(issuedBy.trim() ? { issuedBy } : {}),
        sharedWithTenant: shared,
        ...(upload.replaces ? { replacesId: upload.replaces.id } : {}),
      })
      toast.success(upload.replaces ? 'New version saved' : 'Document saved', {
        description: upload.replaces
          ? 'The old one stays on file. The calendar now uses the new dates.'
          : 'The calendar now uses its dates.',
      })
      onClose()
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { file: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogContent
      title={upload.replaces ? `Replace: ${info.label}` : `Upload: ${info.label}`}
      description={property ? placeOf(property) : 'Covers all your homes'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            Save document
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-body font-semibold text-ink" htmlFor="landlord-upload-file">
            File
          </label>
          <p className="-mt-1 text-small text-muted">
            A PDF or photo of the certificate. In this demo the file stays on your device, and we
            keep only its name.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                buttonVariants({ variant: 'secondary' }),
                'cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring',
              )}
            >
              <UploadSimpleIcon weight="bold" aria-hidden />
              Choose file
              <input
                id="landlord-upload-file"
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(event) => {
                  const chosen = event.target.files?.[0]
                  if (chosen) setFile({ name: chosen.name, sizeBytes: chosen.size })
                  setErrors({})
                }}
              />
            </label>
            <Button
              variant="ghost"
              onClick={() => {
                setFile({ name: `${info.label} ${today.slice(0, 4)}.pdf`, sizeBytes: 184_000 })
                setErrors({})
              }}
            >
              Use a sample file
            </Button>
          </div>
          <p aria-live="polite" className="text-small text-ink">
            {file ? (
              <>
                <span className="font-semibold">Chosen:</span> {file.name}
              </>
            ) : null}
          </p>
          {errors.file ? (
            <p className="text-small font-semibold text-critical">{errors.file}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Issued on"
            type="date"
            value={issuedAt}
            max={today}
            onChange={(event) => {
              setIssuedAt(event.target.value)
              if (info.renewalMonths !== null && event.target.value) {
                setExpiresAt(addMonths(event.target.value, info.renewalMonths))
              }
            }}
            error={errors.issuedAt}
          />
          {info.renewalMonths !== null ? (
            <Input
              label="Expires on"
              type="date"
              value={expiresAt}
              min={addDaysToDate(issuedAt || today, 1)}
              hint={`Usually ${info.renewalMonths % 12 === 0 ? `${info.renewalMonths / 12} ${info.renewalMonths === 12 ? 'year' : 'years'}` : `${info.renewalMonths} months`} after it’s issued.`}
              onChange={(event) => setExpiresAt(event.target.value)}
              error={errors.expiresAt}
            />
          ) : (
            <p className="self-end pb-3 text-small text-muted">This doesn’t expire.</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Certificate or reference number"
            optional
            value={reference}
            maxLength={60}
            onChange={(event) => setReference(event.target.value)}
            error={errors.reference}
          />
          <Input
            label="Issued by"
            optional
            placeholder="e.g. the engineer’s business"
            value={issuedBy}
            maxLength={120}
            onChange={(event) => setIssuedBy(event.target.value)}
            error={errors.issuedBy}
          />
        </div>
        {info.scope !== 'landlord' ? (
          <Switch
            label="Share with the tenant"
            description="They see it under their documents. You can change this later."
            checked={shared}
            onCheckedChange={setShared}
          />
        ) : null}
      </div>
    </DialogContent>
  )
}

function DocumentDialog({
  item,
  property,
  canManage,
  onClose,
  onReplace,
}: {
  item: ComplianceItem | null
  property: Property | undefined
  canManage: boolean
  onClose: () => void
  onReplace: (item: ComplianceItem) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const document = item?.document
  const info = item ? DOCUMENT_TYPE_INFO[item.type] : null

  async function toggleShared(next: boolean) {
    if (!document) return
    setBusy(true)
    try {
      await api.setDocumentShared(viewer, document.id, next)
      toast.success(next ? 'Shared with the tenant' : 'No longer shared')
    } catch (error) {
      toast.error('That didn’t save', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {item && document && info ? (
        <DialogContent
          title={info.label}
          description={property ? placeOf(property) : 'Covers all your homes'}
          footer={
            canManage ? (
              <Button variant="secondary" onClick={() => onReplace(item)}>
                Replace with a new version
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <DocumentCard
              type={item.type}
              status={item.status}
              daysLeft={item.daysLeft}
              document={document}
              bookedFor={item.bookedFor}
            />
            <p className="text-small text-muted">
              File: {document.file.name} · uploaded {formatDate(document.uploadedAt)}
            </p>
            {canManage && info.scope !== 'landlord' ? (
              <Switch
                label="Shared with the tenant"
                checked={document.sharedWithTenant}
                disabled={busy}
                onCheckedChange={toggleShared}
              />
            ) : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
