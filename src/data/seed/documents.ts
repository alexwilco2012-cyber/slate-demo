// Certificates and papers on file for each home. Statuses are never stored: on the demo's today
// they work out to a realistic spread. Graham's agent is mostly on top of things (two renewals
// booked, three due soon, a couple of gaps), but the alarm check at King Street slipped past its
// date last week; Irene is tidy; Hannah, new to letting, has gaps to arrange; Derek has lapsed
// certificates and a lot missing.

import { defaultExpiry } from '@/data/local/compliance'
import { addDaysToDate, ukDate, ukDateTime } from '@/data/local/dates'
import {
  DOCUMENT_TYPE_INFO,
  type DocumentRecord,
  type DocumentType,
  type IsoDate,
  type IsoDateTime,
  type JobId,
  type PersonId,
  type PropertyId,
  type TenancyId,
} from '@/domain/types'
import { PEOPLE } from './people'
import { file } from './placeholders'

interface DocSeed {
  issued: IsoDate
  by?: string
  ref?: string
  jobId?: JobId
}

const NOT_SHARED: ReadonlySet<DocumentType> = new Set(['insurance', 'landlord_registration'])

const SIZES: Record<DocumentType, number> = {
  tenancy_agreement: 412_000,
  gas_safety: 186_000,
  eicr: 1_240_000,
  epc: 356_000,
  inventory: 2_870_000,
  smoke_heat_alarms: 98_000,
  co_alarms: 94_000,
  legionella: 221_000,
  landlord_registration: 64_000,
  pat: 143_000,
  insurance: 530_000,
}

const JOINED = new Map(PEOPLE.map((person) => [person.id, person.joinedAt]))

/**
 * Filed the day after it was issued. Papers older than the uploader's account were filed the
 * day after they joined, so nothing looks uploaded before Slate knew them.
 */
function uploadedOn(issued: IsoDate, uploadedById: PersonId): IsoDateTime {
  const afterIssue = ukDateTime(addDaysToDate(issued, 1), '10:00')
  const joined = JOINED.get(uploadedById)
  if (!joined || afterIssue > joined) return afterIssue
  return ukDateTime(addDaysToDate(ukDate(joined), 1), '10:00')
}

function slugOf(id: string): string {
  return id.slice(id.indexOf('_') + 1)
}

function record(
  id: DocumentRecord['id'],
  type: DocumentType,
  landlordId: PersonId,
  uploadedById: PersonId,
  seed: DocSeed,
  where: { propertyId: PropertyId | null; tenancyId?: TenancyId },
): DocumentRecord {
  const label = DOCUMENT_TYPE_INFO[type].label
  const year = seed.issued.slice(0, 4)
  const doc: DocumentRecord = {
    id,
    type,
    landlordId,
    propertyId: where.propertyId,
    title: label,
    file: file(slugOf(id), `${label} ${year}.pdf`, SIZES[type]),
    issuedAt: seed.issued,
    expiresAt: defaultExpiry(type, seed.issued),
    sharedWithTenant: !NOT_SHARED.has(type),
    uploadedById,
    uploadedAt: uploadedOn(seed.issued, uploadedById),
  }
  if (where.tenancyId) doc.tenancyId = where.tenancyId
  if (seed.by) doc.issuedBy = seed.by
  if (seed.ref) doc.reference = seed.ref
  if (seed.jobId) doc.jobId = seed.jobId
  return doc
}

type PropertyDocs = Partial<Record<DocumentType, DocSeed>>

function forProperty(
  propertyId: PropertyId,
  landlordId: PersonId,
  uploadedById: PersonId,
  docs: PropertyDocs,
): DocumentRecord[] {
  return (Object.entries(docs) as [DocumentType, DocSeed][]).map(([type, seed]) =>
    record(`document_${slugOf(propertyId)}_${type}`, type, landlordId, uploadedById, seed, {
      propertyId,
    }),
  )
}

function forTenancy(
  tenancyId: TenancyId,
  propertyId: PropertyId,
  landlordId: PersonId,
  uploadedById: PersonId,
  docs: Partial<Record<'tenancy_agreement' | 'inventory', DocSeed>>,
): DocumentRecord[] {
  return (Object.entries(docs) as [DocumentType, DocSeed][]).map(([type, seed]) =>
    record(`document_${slugOf(tenancyId)}_${type}`, type, landlordId, uploadedById, seed, {
      propertyId,
      tenancyId,
    }),
  )
}

function registration(landlordId: PersonId, issued: IsoDate, ref: string): DocumentRecord {
  return record(
    `document_${slugOf(landlordId)}_landlord_registration`,
    'landlord_registration',
    landlordId,
    landlordId,
    { issued, by: 'Aberdeen City Council', ref },
    { propertyId: null },
  )
}

const GAS = 'Denburn Gas & Heating'
const ELECTRICAL = 'Buchan Electrical'
const AGENT = 'Leask & Ogston Lettings'
const graham = 'person_graham'
const aileen = 'person_aileen'
const irene = 'person_irene'
const hannah = 'person_hannah'
const derek = 'person_derek'

// Esslemont Avenue's gas record from last year, kept on file after this year's replaced it.
const esslemontGasPrevious: DocumentRecord = {
  ...record(
    'document_esslemont_gas_safety_2025',
    'gas_safety',
    graham,
    aileen,
    { issued: '2025-01-10', by: GAS, ref: 'DGH-2025-0110' },
    { propertyId: 'property_esslemont' },
  ),
  replacedById: 'document_esslemont_gas_safety',
}

export const DOCUMENTS: DocumentRecord[] = [
  // ─── Graham (managed by his agent) ─────────────────────────────────────────────────────────
  registration(graham, '2025-06-30', '514782/100/26031'),
  esslemontGasPrevious,
  ...forProperty('property_esslemont', graham, aileen, {
    gas_safety: { issued: '2026-01-12', by: GAS, ref: 'DGH-2026-0112' },
    eicr: { issued: '2021-10-14', by: ELECTRICAL, ref: 'BE-EICR-21-1014' },
    epc: { issued: '2019-06-11', ref: '9102-3841-5520-6613-4298' },
    smoke_heat_alarms: { issued: '2026-01-12', by: ELECTRICAL },
    co_alarms: { issued: '2026-01-12', by: GAS },
    legionella: { issued: '2025-04-02', by: AGENT },
    pat: { issued: '2022-05-30', by: ELECTRICAL },
    insurance: { issued: '2026-04-01', ref: 'LLP-448210' },
  }),
  ...forTenancy('tenancy_sarah_esslemont', 'property_esslemont', graham, aileen, {
    tenancy_agreement: { issued: '2025-05-20' },
    inventory: { issued: '2025-06-01', by: AGENT },
  }),
  ...forProperty('property_union_grove', graham, aileen, {
    gas_safety: { issued: '2025-10-08', by: GAS, ref: 'DGH-2025-1008' },
    eicr: { issued: '2023-03-20', by: ELECTRICAL, ref: 'BE-EICR-23-0320' },
    epc: { issued: '2018-09-01', ref: '8830-4172-6609-2245-1180' },
    smoke_heat_alarms: { issued: '2025-10-20', by: ELECTRICAL },
    co_alarms: { issued: '2026-02-10', by: GAS },
    legionella: { issued: '2025-02-14', by: AGENT },
    pat: { issued: '2023-03-20', by: ELECTRICAL },
    insurance: { issued: '2026-04-01', ref: 'LLP-448211' },
  }),
  ...forTenancy('tenancy_ewan_union', 'property_union_grove', graham, aileen, {
    tenancy_agreement: { issued: '2024-08-26' },
    inventory: { issued: '2024-09-01', by: AGENT },
  }),
  ...forProperty('property_queens_road', graham, aileen, {
    gas_safety: { issued: '2026-03-02', by: GAS, ref: 'DGH-2026-0302' },
    eicr: { issued: '2022-08-15', by: ELECTRICAL, ref: 'BE-EICR-22-0815' },
    epc: { issued: '2017-05-22', ref: '9311-2264-8810-5532-9901' },
    smoke_heat_alarms: { issued: '2026-03-02', by: ELECTRICAL },
    co_alarms: { issued: '2026-03-02', by: GAS },
    legionella: { issued: '2024-11-15', by: AGENT },
    pat: { issued: '2022-08-15', by: ELECTRICAL },
    insurance: { issued: '2026-04-01', ref: 'LLP-448212' },
  }),
  ...forTenancy('tenancy_queens', 'property_queens_road', graham, aileen, {
    tenancy_agreement: { issued: '2025-08-04' },
    inventory: { issued: '2025-08-15', by: AGENT },
  }),
  ...forProperty('property_fonthill', graham, aileen, {
    gas_safety: { issued: '2026-05-18', by: GAS, ref: 'DGH-2026-0518' },
    eicr: { issued: '2024-02-28', by: ELECTRICAL, ref: 'BE-EICR-24-0228' },
    epc: { issued: '2020-01-09', ref: '9520-6618-3301-4427-8815' },
    smoke_heat_alarms: { issued: '2026-05-18', by: ELECTRICAL },
    co_alarms: { issued: '2026-05-18', by: GAS },
    legionella: { issued: '2025-09-01', by: AGENT },
    pat: { issued: '2024-02-28', by: ELECTRICAL },
    insurance: { issued: '2026-04-01', ref: 'LLP-448213' },
  }),
  // The EICR runs out in November and nothing is booked yet; the alarm check lapsed on 17 September.
  ...forProperty('property_king_street', graham, aileen, {
    eicr: { issued: '2021-11-09', by: ELECTRICAL, ref: 'BE-EICR-21-1109' },
    epc: { issued: '2021-11-30', ref: '9014-5527-1186-3390-2264' },
    smoke_heat_alarms: { issued: '2025-09-17', by: ELECTRICAL },
    legionella: { issued: '2025-06-30', by: AGENT },
    pat: { issued: '2023-02-01', by: ELECTRICAL },
    insurance: { issued: '2026-04-01', ref: 'LLP-448214' },
  }),
  ...forTenancy('tenancy_eilidh_king', 'property_king_street', graham, aileen, {
    tenancy_agreement: { issued: '2025-06-20' },
    inventory: { issued: '2025-07-01', by: AGENT },
  }),
  // PAT test and inventory still to arrange here.
  ...forProperty('property_jesmond', graham, aileen, {
    gas_safety: { issued: '2026-07-07', by: GAS, ref: 'DGH-2026-0707' },
    eicr: { issued: '2022-10-10', by: ELECTRICAL, ref: 'BE-EICR-22-1010' },
    epc: { issued: '2019-02-14', ref: '8807-3319-2250-6674-1128' },
    smoke_heat_alarms: { issued: '2026-07-07', by: ELECTRICAL },
    co_alarms: { issued: '2026-07-07', by: GAS },
    legionella: { issued: '2025-10-18', by: AGENT },
    insurance: { issued: '2026-04-01', ref: 'LLP-448215' },
  }),
  ...forTenancy('tenancy_stuart_jesmond', 'property_jesmond', graham, aileen, {
    tenancy_agreement: { issued: '2024-10-18' },
  }),

  // ─── Hannah: first-time landlord, a few things still to arrange ────────────────────────────
  registration(hannah, '2025-12-01', '702346/100/31158'),
  ...forProperty('property_polmuir', hannah, hannah, {
    gas_safety: { issued: '2026-01-20', by: GAS, ref: 'DGH-2026-0120' },
    eicr: { issued: '2026-01-15', by: ELECTRICAL, ref: 'BE-EICR-26-0115' },
    epc: { issued: '2020-03-10', ref: '9228-1045-7731-5506-3342' },
    smoke_heat_alarms: { issued: '2026-01-20', by: ELECTRICAL },
    co_alarms: { issued: '2026-01-20', by: GAS },
  }),
  ...forTenancy('tenancy_oliver_polmuir', 'property_polmuir', hannah, hannah, {
    tenancy_agreement: { issued: '2026-01-24' },
  }),

  // ─── Irene: tidy, one gas record and one EPC coming up ─────────────────────────────────────
  registration(irene, '2024-02-12', '388215/100/19874'),
  ...forProperty('property_spital', irene, irene, {
    gas_safety: { issued: '2025-10-09', by: GAS, ref: 'DGH-2025-1009', jobId: 'job_gas_spital' },
    eicr: { issued: '2024-05-06', by: ELECTRICAL, ref: 'BE-EICR-24-0506' },
    epc: { issued: '2018-04-12', ref: '8816-2290-4453-1172-6609' },
    smoke_heat_alarms: { issued: '2025-12-04', by: ELECTRICAL },
    co_alarms: { issued: '2025-12-04', by: GAS },
    legionella: { issued: '2025-01-15' },
    pat: { issued: '2024-05-06', by: ELECTRICAL },
    insurance: { issued: '2026-02-01', ref: 'HDL-99120' },
  }),
  ...forTenancy('tenancy_callum_spital', 'property_spital', irene, irene, {
    tenancy_agreement: { issued: '2024-04-01' },
    inventory: { issued: '2024-04-15' },
  }),
  ...forProperty('property_walker_road', irene, irene, {
    gas_safety: { issued: '2026-02-20', by: GAS, ref: 'DGH-2026-0220' },
    eicr: { issued: '2025-03-11', by: ELECTRICAL, ref: 'BE-EICR-25-0311' },
    epc: { issued: '2017-10-03', ref: '9105-7742-3318-2206-5519' },
    smoke_heat_alarms: { issued: '2026-02-20', by: ELECTRICAL },
    co_alarms: { issued: '2026-02-20', by: GAS },
    legionella: { issued: '2025-03-11' },
    pat: { issued: '2025-03-11', by: ELECTRICAL },
    insurance: { issued: '2026-02-01', ref: 'HDL-99121' },
  }),
  ...forTenancy('tenancy_beata_walker', 'property_walker_road', irene, irene, {
    tenancy_agreement: { issued: '2025-01-22' },
    inventory: { issued: '2025-02-01' },
  }),
  ...forProperty('property_scotstown', irene, irene, {
    gas_safety: { issued: '2026-03-26', by: GAS, ref: 'DGH-2026-0326' },
    eicr: { issued: '2025-06-02', by: ELECTRICAL, ref: 'BE-EICR-25-0602' },
    epc: { issued: '2016-11-21', ref: '8609-3354-1127-4480-2231' },
    smoke_heat_alarms: { issued: '2026-03-26', by: ELECTRICAL },
    co_alarms: { issued: '2026-03-26', by: GAS },
    legionella: { issued: '2025-03-20' },
    pat: { issued: '2025-06-02', by: ELECTRICAL },
    insurance: { issued: '2026-02-01', ref: 'HDL-99122' },
  }),
  ...forTenancy('tenancy_hannah_scotstown', 'property_scotstown', irene, irene, {
    tenancy_agreement: { issued: '2025-03-12' },
    inventory: { issued: '2025-04-01' },
  }),

  // ─── Derek: lapsed certificates and gaps ───────────────────────────────────────────────────
  registration(derek, '2023-11-02', '276590/100/15502'),
  ...forProperty('property_rosemount_place', derek, derek, {
    gas_safety: { issued: '2025-08-30', by: GAS, ref: 'DGH-2025-0830' },
    eicr: { issued: '2021-11-20', ref: 'EICR-211120' },
    epc: { issued: '2017-04-05', ref: '9013-6621-8845-3307-1196' },
    co_alarms: { issued: '2024-06-01' },
    insurance: { issued: '2025-10-01', ref: 'PLI-30554' },
  }),
  ...forTenancy('tenancy_kirsty_rosemount', 'property_rosemount_place', derek, derek, {
    tenancy_agreement: { issued: '2025-06-09' },
  }),
  ...forProperty('property_victoria_road', derek, derek, {
    gas_safety: { issued: '2025-12-12', by: GAS, ref: 'DGH-2025-1212' },
    eicr: { issued: '2022-03-01', ref: 'EICR-220301' },
    epc: { issued: '2016-07-19', ref: '8611-2093-5574-1180-4467' },
    smoke_heat_alarms: { issued: '2025-02-01' },
    insurance: { issued: '2025-10-01', ref: 'PLI-30555' },
  }),
  ...forTenancy('tenancy_liam_victoria', 'property_victoria_road', derek, derek, {
    tenancy_agreement: { issued: '2026-03-20' },
  }),
]
