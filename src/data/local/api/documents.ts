// Documents and the landlord's compliance calendar.

import type { SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  type DocumentRecord,
  type DocumentTypeInfo,
  type Property,
} from '@/domain/types'
import {
  forbidden,
  hasPermission,
  managesProperty,
  notFound,
  requireManagedProperty,
  requireRole,
  resolveViewer,
  type Actor,
} from '../access'
import { complianceCalendar, defaultExpiry } from '../compliance'
import { ukDate } from '../dates'
import type { Reader } from '../tx'
import { invalid, optionalText, requireDate, requireOneOf, requireText } from '../validate'
import type { LocalContext } from './context'

type DocumentMethods =
  'listDocuments' | 'getDocument' | 'uploadDocument' | 'setDocumentShared' | 'getComplianceCalendar'

const TYPE_ORDER = new Map(DOCUMENT_TYPES.map((type, index) => [type, index]))

function canSee(db: Reader, actor: Actor, doc: DocumentRecord): boolean {
  if (actor.role === 'landlord') {
    if (doc.landlordId !== actor.actingAs) return false
    if (doc.propertyId === null) return true
    const property = db.get('properties', doc.propertyId)
    return property !== undefined && managesProperty(actor, property)
  }
  if (actor.role === 'tenant') {
    if (!doc.sharedWithTenant || doc.propertyId === null) return false
    // Only what's shared on the tenant's current tenancy.
    return db
      .rows('tenancies')
      .some(
        (t) =>
          t.status === 'confirmed' &&
          t.tenantIds.includes(actor.person.id) &&
          t.propertyId === doc.propertyId &&
          (doc.tenancyId === undefined || doc.tenancyId === t.id),
      )
  }
  return false
}

export function documentsApi(ctx: LocalContext): Pick<SlateApi, DocumentMethods> {
  return {
    async listDocuments(viewer, filter = {}) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('documents')
        .filter((doc) => canSee(db, actor, doc))
        .filter((doc) => filter.includeReplaced || !doc.replacedById)
        .filter((doc) => !filter.propertyId || doc.propertyId === filter.propertyId)
        .filter((doc) => !filter.tenancyId || doc.tenancyId === filter.tenancyId)
        .filter((doc) => !filter.type || doc.type === filter.type)
        .sort(
          (a, b) =>
            (TYPE_ORDER.get(a.type) ?? 0) - (TYPE_ORDER.get(b.type) ?? 0) ||
            b.issuedAt.localeCompare(a.issuedAt),
        )
    },

    async getDocument(viewer, documentId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const doc = db.get('documents', documentId)
      return doc && canSee(db, actor, doc) ? doc : null
    },

    async uploadDocument(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'landlord')
        if (!hasPermission(actor, 'manage_documents')) {
          throw forbidden("The landlord hasn't given you permission to manage documents.")
        }
        const type = requireOneOf(
          input.type,
          DOCUMENT_TYPES,
          'type',
          'Choose what kind of document this is.',
        )
        const info: DocumentTypeInfo = DOCUMENT_TYPE_INFO[type]
        let property: Property | undefined
        if (info.scope === 'landlord') {
          if (input.propertyId !== null) {
            throw invalid('propertyId', `${info.label} covers all your homes, so don't pick one.`)
          }
        } else {
          if (!input.propertyId) throw invalid('propertyId', 'Choose which home this is for.')
          property = requireManagedProperty(tx, actor, input.propertyId, 'manage_documents')
        }
        let tenancyId = input.tenancyId
        if (info.scope === 'tenancy' && !tenancyId) {
          throw invalid('tenancyId', 'Choose which tenancy this belongs to.')
        }
        if (tenancyId) {
          const tenancy = tx.get('tenancies', tenancyId)
          if (!tenancy || tenancy.propertyId !== property?.id) {
            throw invalid('tenancyId', "That tenancy isn't at this home.")
          }
          tenancyId = tenancy.id
        }
        const issuedAt = requireDate(input.issuedAt, 'issuedAt', 'the date it was issued')
        if (issuedAt > ukDate(tx.now)) {
          throw invalid('issuedAt', 'The issue date cannot be in the future.')
        }
        const expiresAt =
          input.expiresAt === undefined
            ? defaultExpiry(type, issuedAt)
            : input.expiresAt === null
              ? null
              : requireDate(input.expiresAt, 'expiresAt', 'the expiry date')
        if (expiresAt !== null && expiresAt <= issuedAt) {
          throw invalid('expiresAt', 'The expiry date must be after the issue date.')
        }
        const fileName = requireText(input.file?.name, { field: 'file', label: 'a file', max: 200 })
        const fileUrl = requireText(input.file?.url, { field: 'file', label: 'a file', max: 2000 })
        const title =
          optionalText(input.title, { field: 'title', label: 'the title', max: 120 }) ?? info.label
        const reference = optionalText(input.reference, {
          field: 'reference',
          label: 'the reference',
          max: 60,
        })
        const issuedBy = optionalText(input.issuedBy, {
          field: 'issuedBy',
          label: 'who issued it',
          max: 120,
        })

        const doc: DocumentRecord = {
          id: newId('document'),
          type,
          landlordId: actor.actingAs,
          propertyId: property?.id ?? null,
          title,
          file: {
            name: fileName,
            url: fileUrl,
            ...(input.file.sizeBytes !== undefined ? { sizeBytes: input.file.sizeBytes } : {}),
          },
          issuedAt,
          expiresAt,
          sharedWithTenant: input.sharedWithTenant === true,
          uploadedById: actor.person.id,
          uploadedAt: tx.now,
        }
        if (tenancyId) doc.tenancyId = tenancyId
        if (reference) doc.reference = reference
        if (issuedBy) doc.issuedBy = issuedBy
        if (input.jobId) {
          const job = tx.get('jobs', input.jobId)
          if (!job || job.propertyId !== doc.propertyId) {
            throw invalid('jobId', "That job isn't at this home.")
          }
          doc.jobId = job.id
        }
        if (input.replacesId) {
          const old = tx.get('documents', input.replacesId)
          if (
            !old ||
            old.landlordId !== doc.landlordId ||
            old.type !== type ||
            old.propertyId !== doc.propertyId
          ) {
            throw invalid('replacesId', "That isn't an earlier version of this document.")
          }
          if (old.replacedById) {
            throw invalid('replacesId', 'That document has already been replaced.')
          }
          tx.put('documents', { ...old, replacedById: doc.id })
        }
        return tx.put('documents', doc)
      })
    },

    async setDocumentShared(viewer, documentId, sharedWithTenant) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        requireRole(actor, 'landlord')
        const doc = tx.get('documents', documentId)
        if (!doc || !canSee(tx, actor, doc)) throw notFound('document')
        if (!hasPermission(actor, 'manage_documents')) {
          throw forbidden("The landlord hasn't given you permission to manage documents.")
        }
        return tx.put('documents', { ...doc, sharedWithTenant })
      })
    },

    async getComplianceCalendar(viewer, propertyId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'landlord')
      if (propertyId) {
        const property = requireManagedProperty(db, actor, propertyId)
        return complianceCalendar(db, actor.actingAs, [property], false)
      }
      const properties = db.rows('properties').filter((p) => managesProperty(actor, p))
      return complianceCalendar(db, actor.actingAs, properties, true)
    },
  }
}
