// The landlord's compliance calendar. Status is worked out from dates and bookings on every read
// (never stored), so it moves on by itself as the demo clock does.

import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  LETTING_RULES,
  type ComplianceItem,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
  type DocumentTypeInfo,
  type IsoDate,
  type Job,
  type PersonId,
  type Property,
  type PropertyId,
} from '@/domain/types'
import { addMonthsToDate, daysBetweenDates, ukDate } from './dates'
import type { Reader } from './tx'

/** Most urgent first. A missing required item is as pressing as one about to run out. */
const STATUS_ORDER: Record<DocumentStatus, number> = {
  EXPIRED: 0,
  TO_ARRANGE: 1,
  DUE_SOON: 2,
  BOOKED: 3,
  OK: 4,
}

export function defaultExpiry(type: DocumentType, issuedAt: IsoDate): IsoDate | null {
  const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
  return info.renewalMonths === null ? null : addMonthsToDate(issuedAt, info.renewalMonths)
}

/** Whether a document type is owed at this home: required, or recommended, and gas-aware. */
export function appliesTo(type: DocumentType, property: Property): boolean {
  const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
  return info.required !== 'if_gas' || property.hasGasSupply
}

/** The newest version on file that hasn't been replaced. */
function currentDocument(
  documents: readonly DocumentRecord[],
  match: (doc: DocumentRecord) => boolean,
): DocumentRecord | undefined {
  return documents
    .filter((doc) => !doc.replacedById && match(doc))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]
}

/** A renewal job with a visit booked for it. */
function bookedRenewal(
  jobs: readonly Job[],
  type: DocumentType,
  propertyId: PropertyId,
): { job: Job; date: IsoDate } | undefined {
  for (const job of jobs) {
    if (job.complianceType !== type || job.propertyId !== propertyId) continue
    if (job.status !== 'booked' && job.status !== 'in_progress') continue
    const visit = job.visits.find((v) => v.status === 'booked' || v.status === 'on_site')
    if (visit) return { job, date: ukDate(visit.startsAt) }
  }
  return undefined
}

export function statusOf(
  document: DocumentRecord | undefined,
  booked: boolean,
  today: IsoDate,
): { status: DocumentStatus; daysLeft: number | null } {
  if (!document) return { status: booked ? 'BOOKED' : 'TO_ARRANGE', daysLeft: null }
  if (document.expiresAt === null) return { status: 'OK', daysLeft: null }
  const daysLeft = daysBetweenDates(today, document.expiresAt)
  if (daysLeft < 0) return { status: 'EXPIRED', daysLeft }
  // A booking only matters while renewal is due: once a fresh certificate is on file, it's OK.
  if (daysLeft > LETTING_RULES.documentDueSoonDays) return { status: 'OK', daysLeft }
  return { status: booked ? 'BOOKED' : 'DUE_SOON', daysLeft }
}

/**
 * Every item owed across the landlord's homes (or the given ones), most urgent first: each home's
 * certificates, the running tenancy's agreement and inventory, and the landlord's registration.
 */
export function complianceCalendar(
  db: Reader,
  landlordId: PersonId,
  properties: readonly Property[],
  includeLandlordWide: boolean,
): ComplianceItem[] {
  const today = ukDate(db.now)
  const documents = db.rows('documents').filter((doc) => doc.landlordId === landlordId)
  const jobs = db.rows('jobs')
  const items: ComplianceItem[] = []

  const item = (
    type: DocumentType,
    propertyId: PropertyId | null,
    document: DocumentRecord | undefined,
    renewal: { job: Job; date: IsoDate } | undefined,
  ) => {
    const { status, daysLeft } = statusOf(document, renewal !== undefined, today)
    const entry: ComplianceItem = { type, propertyId, status, daysLeft }
    if (document) entry.document = document
    if (renewal) {
      entry.renewalJobId = renewal.job.id
      entry.bookedFor = renewal.date
    }
    items.push(entry)
  }

  for (const property of properties) {
    for (const type of DOCUMENT_TYPES) {
      const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
      if (info.scope !== 'property' || !appliesTo(type, property)) continue
      const document = currentDocument(
        documents,
        (doc) => doc.type === type && doc.propertyId === property.id,
      )
      item(type, property.id, document, bookedRenewal(jobs, type, property.id))
    }
    const tenancy = db
      .rows('tenancies')
      .find((t) => t.propertyId === property.id && t.status === 'confirmed')
    if (tenancy) {
      for (const type of DOCUMENT_TYPES) {
        const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
        if (info.scope !== 'tenancy') continue
        const document = currentDocument(
          documents,
          (doc) => doc.type === type && doc.tenancyId === tenancy.id,
        )
        item(type, property.id, document, undefined)
      }
    }
  }

  if (includeLandlordWide) {
    for (const type of DOCUMENT_TYPES) {
      const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
      if (info.scope !== 'landlord') continue
      const document = currentDocument(documents, (doc) => doc.type === type)
      item(type, null, document, undefined)
    }
  }

  return items.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER),
  )
}

/** Whether a missing or lapsing item is one the law requires, not just one we recommend. */
export function isRequired(item: ComplianceItem): boolean {
  const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[item.type]
  return info.required !== 'recommended'
}
