// Every tenancy on the record: eleven running now, eleven that have ended (the source of the
// rating history), and one Graham's agent has just offered to Callum.

import { addDaysToDate, startOfUkDay } from '@/data/local/dates'
import type { IsoDate, IsoDateTime, PersonId, Tenancy, TenancyConfirmation } from '@/domain/types'
import { PROPERTIES } from './properties'
import { d, on } from './time'

interface TenancySeed {
  id: Tenancy['id']
  propertyId: Tenancy['propertyId']
  tenantIds: PersonId[]
  startDate: IsoDate
  endDate?: IsoDate
  /** Ended tenancies end at midnight after their end date. */
  ended?: boolean
  rent: number
  dueDay: number
  /** Who confirmed for the landlord (Graham or his agent), and when. */
  landlordConfirmation: { by: PersonId; at: IsoDateTime }
  /** When each tenant confirmed, in the order of tenantIds. Leave out for a proposed tenancy. */
  tenantConfirmations?: IsoDateTime[]
  lodgedOn?: IsoDate
}

function tenancy(seed: TenancySeed): Tenancy {
  const property = PROPERTIES.find((p) => p.id === seed.propertyId)
  if (!property) throw new Error(`Unknown property ${seed.propertyId}`)
  const confirmations: TenancyConfirmation[] = [
    {
      personId: seed.landlordConfirmation.by,
      side: 'landlord',
      confirmedAt: seed.landlordConfirmation.at,
    },
    ...seed.tenantIds.flatMap((personId, index): TenancyConfirmation[] => {
      const confirmedAt = seed.tenantConfirmations?.[index]
      return confirmedAt ? [{ personId, side: 'tenant', confirmedAt }] : []
    }),
  ]
  const status = !seed.tenantConfirmations ? 'proposed' : seed.ended ? 'ended' : 'confirmed'
  const record: Tenancy = {
    id: seed.id,
    kind: 'scottish_prt',
    propertyId: seed.propertyId,
    landlordId: property.landlordId,
    tenantIds: seed.tenantIds,
    startDate: seed.startDate,
    status,
    confirmations,
    rentPencePerMonth: seed.rent * 100,
    rentDueDay: seed.dueDay,
    proposedById: seed.landlordConfirmation.by,
    proposedAt: seed.landlordConfirmation.at,
  }
  if (seed.endDate) record.endDate = seed.endDate
  if (seed.ended && seed.endDate) record.endedAt = startOfUkDay(addDaysToDate(seed.endDate, 1))
  if (seed.lodgedOn) {
    record.deposit = {
      amountPence: seed.rent * 100,
      scheme: property.depositScheme,
      lodgedOn: seed.lodgedOn,
    }
  }
  return record
}

const graham = 'person_graham'
const aileen = 'person_aileen'
const irene = 'person_irene'
const derek = 'person_derek'
const hannah = 'person_hannah'

export const TENANCIES: Tenancy[] = [
  // ─── Running now ───────────────────────────────────────────────────────────────────────────
  tenancy({
    id: 'tenancy_sarah_esslemont',
    propertyId: 'property_esslemont',
    tenantIds: ['person_sarah'],
    startDate: '2025-06-01',
    rent: 875,
    dueDay: 1,
    landlordConfirmation: { by: aileen, at: on('2025-05-20', '10:15') },
    tenantConfirmations: [on('2025-05-20', '19:40')],
    lodgedOn: '2025-06-12',
  }),
  tenancy({
    id: 'tenancy_kirsty_rosemount',
    propertyId: 'property_rosemount_place',
    tenantIds: ['person_kirsty'],
    startDate: '2025-06-14',
    rent: 625,
    dueDay: 14,
    landlordConfirmation: { by: derek, at: on('2025-06-09', '21:05') },
    tenantConfirmations: [on('2025-06-10', '07:50')],
    lodgedOn: '2025-07-10',
  }),
  tenancy({
    id: 'tenancy_ewan_union',
    propertyId: 'property_union_grove',
    tenantIds: ['person_ewan'],
    startDate: '2024-09-01',
    rent: 950,
    dueDay: 1,
    landlordConfirmation: { by: aileen, at: on('2024-08-26', '11:30') },
    tenantConfirmations: [on('2024-08-26', '12:18')],
    lodgedOn: '2024-09-09',
  }),
  tenancy({
    id: 'tenancy_queens',
    propertyId: 'property_queens_road',
    tenantIds: ['person_ruaridh', 'person_chloe'],
    startDate: '2025-08-15',
    rent: 1295,
    dueDay: 15,
    landlordConfirmation: { by: aileen, at: on('2025-08-04', '09:40') },
    tenantConfirmations: [on('2025-08-04', '10:52'), on('2025-08-05', '08:58')],
    lodgedOn: '2025-08-26',
  }),
  tenancy({
    id: 'tenancy_oliver_polmuir',
    propertyId: 'property_polmuir',
    tenantIds: ['person_oliver'],
    startDate: '2026-02-01',
    rent: 725,
    dueDay: 1,
    landlordConfirmation: { by: hannah, at: on('2026-01-24', '16:30') },
    tenantConfirmations: [on('2026-01-24', '17:12')],
    lodgedOn: '2026-02-10',
  }),
  tenancy({
    id: 'tenancy_callum_spital',
    propertyId: 'property_spital',
    tenantIds: ['person_callum'],
    startDate: '2024-04-15',
    // Callum gave notice in August; the tenancy ends on Wednesday.
    endDate: '2026-09-30',
    rent: 780,
    dueDay: 15,
    landlordConfirmation: { by: irene, at: on('2024-04-01', '18:00') },
    tenantConfirmations: [on('2024-04-01', '22:20')],
    lodgedOn: '2024-04-26',
  }),
  tenancy({
    id: 'tenancy_eilidh_king',
    propertyId: 'property_king_street',
    tenantIds: ['person_eilidh'],
    startDate: '2025-07-01',
    rent: 760,
    dueDay: 1,
    landlordConfirmation: { by: aileen, at: on('2025-06-20', '14:05') },
    tenantConfirmations: [on('2025-06-20', '17:44')],
    lodgedOn: '2025-07-08',
  }),
  tenancy({
    id: 'tenancy_liam_victoria',
    propertyId: 'property_victoria_road',
    tenantIds: ['person_liam'],
    startDate: '2026-04-01',
    rent: 695,
    dueDay: 1,
    landlordConfirmation: { by: derek, at: on('2026-03-20', '12:30') },
    tenantConfirmations: [on('2026-03-20', '19:55')],
    lodgedOn: '2026-04-28',
  }),
  tenancy({
    id: 'tenancy_beata_walker',
    propertyId: 'property_walker_road',
    tenantIds: ['person_beata'],
    startDate: '2025-02-01',
    rent: 640,
    dueDay: 1,
    landlordConfirmation: { by: irene, at: on('2025-01-22', '10:00') },
    tenantConfirmations: [on('2025-01-22', '20:10')],
    lodgedOn: '2025-02-07',
  }),
  tenancy({
    id: 'tenancy_stuart_jesmond',
    propertyId: 'property_jesmond',
    tenantIds: ['person_stuart'],
    startDate: '2024-11-01',
    rent: 1150,
    dueDay: 1,
    landlordConfirmation: { by: aileen, at: on('2024-10-18', '09:20') },
    tenantConfirmations: [on('2024-10-18', '12:35')],
    lodgedOn: '2024-11-12',
  }),
  tenancy({
    id: 'tenancy_hannah_scotstown',
    propertyId: 'property_scotstown',
    tenantIds: ['person_hannah', 'person_josh'],
    startDate: '2025-04-01',
    rent: 1050,
    dueDay: 1,
    landlordConfirmation: { by: irene, at: on('2025-03-12', '10:45') },
    tenantConfirmations: [on('2025-03-12', '19:02'), on('2025-03-12', '21:34')],
    lodgedOn: '2025-04-15',
  }),

  // ─── Ended ─────────────────────────────────────────────────────────────────────────────────
  tenancy({
    id: 'tenancy_sarah_spital',
    propertyId: 'property_spital',
    tenantIds: ['person_sarah'],
    startDate: '2022-10-01',
    endDate: '2024-03-31',
    ended: true,
    rent: 720,
    dueDay: 1,
    landlordConfirmation: { by: irene, at: on('2024-01-15', '11:30') },
    tenantConfirmations: [on('2024-01-15', '21:15')],
    lodgedOn: '2022-10-19',
  }),
  tenancy({
    id: 'tenancy_callum_rosemount',
    propertyId: 'property_rosemount_place',
    tenantIds: ['person_callum'],
    startDate: '2022-09-01',
    endDate: '2024-02-29',
    ended: true,
    rent: 575,
    dueDay: 1,
    landlordConfirmation: { by: derek, at: on('2024-02-21', '10:40') },
    tenantConfirmations: [on('2024-02-22', '19:05')],
    lodgedOn: '2022-09-22',
  }),
  tenancy({
    id: 'tenancy_sarah_victoria',
    propertyId: 'property_victoria_road',
    tenantIds: ['person_sarah'],
    startDate: '2024-04-15',
    endDate: '2025-05-31',
    ended: true,
    rent: 650,
    dueDay: 15,
    landlordConfirmation: { by: derek, at: on('2024-04-10', '13:10') },
    tenantConfirmations: [on('2024-04-10', '18:26')],
    lodgedOn: '2024-05-20',
  }),
  tenancy({
    id: 'tenancy_shona_victoria',
    propertyId: 'property_victoria_road',
    tenantIds: ['person_shona'],
    startDate: '2025-06-15',
    endDate: '2026-03-15',
    ended: true,
    rent: 675,
    dueDay: 15,
    landlordConfirmation: { by: derek, at: on('2025-06-03', '09:15') },
    tenantConfirmations: [on('2025-06-03', '18:30')],
    // Deliberately late: 33 working days, past the 30 the Scottish deposit rules allow. Derek.
    lodgedOn: '2025-07-30',
  }),
  tenancy({
    id: 'tenancy_connor_rosemount',
    propertyId: 'property_rosemount_place',
    tenantIds: ['person_connor'],
    startDate: '2024-03-01',
    endDate: '2025-05-31',
    ended: true,
    rent: 600,
    dueDay: 1,
    landlordConfirmation: { by: derek, at: on('2024-03-01', '10:20') },
    tenantConfirmations: [on('2024-03-01', '12:05')],
    lodgedOn: '2024-04-02',
  }),
  tenancy({
    id: 'tenancy_kirsty_esslemont',
    propertyId: 'property_esslemont',
    tenantIds: ['person_kirsty'],
    startDate: '2023-06-01',
    endDate: '2025-05-18',
    ended: true,
    rent: 825,
    dueDay: 1,
    landlordConfirmation: { by: graham, at: on('2024-02-20', '08:45') },
    tenantConfirmations: [on('2024-02-20', '18:30')],
    lodgedOn: '2023-06-14',
  }),
  tenancy({
    id: 'tenancy_rory_union',
    propertyId: 'property_union_grove',
    tenantIds: ['person_rory'],
    startDate: '2022-09-01',
    endDate: '2024-07-31',
    ended: true,
    rent: 895,
    dueDay: 1,
    landlordConfirmation: { by: graham, at: on('2024-02-27', '07:55') },
    tenantConfirmations: [on('2024-02-27', '19:20')],
    lodgedOn: '2022-09-15',
  }),
  tenancy({
    id: 'tenancy_megan_king',
    propertyId: 'property_king_street',
    tenantIds: ['person_megan'],
    startDate: '2023-07-01',
    endDate: '2025-06-15',
    ended: true,
    rent: 725,
    dueDay: 1,
    landlordConfirmation: { by: graham, at: on('2024-03-05', '08:10') },
    tenantConfirmations: [on('2024-03-05', '12:02')],
    lodgedOn: '2023-07-11',
  }),
  tenancy({
    id: 'tenancy_grace_walker',
    propertyId: 'property_walker_road',
    tenantIds: ['person_grace'],
    startDate: '2022-11-01',
    endDate: '2024-12-20',
    ended: true,
    rent: 610,
    dueDay: 1,
    landlordConfirmation: { by: irene, at: on('2024-01-30', '09:00') },
    tenantConfirmations: [on('2024-01-30', '15:40')],
    lodgedOn: '2022-11-18',
  }),
  tenancy({
    id: 'tenancy_daniel_scotstown',
    propertyId: 'property_scotstown',
    tenantIds: ['person_daniel'],
    startDate: '2023-03-01',
    endDate: '2025-02-28',
    ended: true,
    rent: 995,
    dueDay: 1,
    landlordConfirmation: { by: irene, at: on('2024-02-10', '10:30') },
    tenantConfirmations: [on('2024-02-10', '20:48')],
    lodgedOn: '2023-03-20',
  }),
  tenancy({
    id: 'tenancy_niamh_fonthill',
    propertyId: 'property_fonthill',
    tenantIds: ['person_niamh'],
    startDate: '2024-05-01',
    endDate: '2026-08-31',
    ended: true,
    rent: 875,
    dueDay: 1,
    landlordConfirmation: { by: graham, at: on('2024-04-12', '09:25') },
    tenantConfirmations: [on('2024-04-12', '16:40')],
    lodgedOn: '2024-05-14',
  }),

  // ─── Offered, waiting for the tenant ───────────────────────────────────────────────────────
  tenancy({
    id: 'tenancy_callum_fonthill',
    propertyId: 'property_fonthill',
    tenantIds: ['person_callum'],
    startDate: '2026-10-03',
    rent: 895,
    dueDay: 3,
    landlordConfirmation: { by: aileen, at: d(-1, '15:20') },
  }),
]
