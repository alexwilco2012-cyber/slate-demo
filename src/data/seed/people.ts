// The cast. Everyone here is invented: phone numbers sit in Ofcom's drama range (07700 900xxx),
// emails use example.com and example.co.uk, and registration numbers are made up.

import type {
  Agency,
  Person,
  PersonId,
  SavedLineItem,
  TeamMembership,
  TradeProfile,
  VerificationBadge,
} from '@/domain/types'
import { d, on } from './time'

const ABERDEEN = 'Aberdeen City Council'

interface PersonSeed extends Omit<
  Person,
  'avatarSeed' | 'adultConfirmedAt' | 'pendingVerifications' | 'savedTradeIds'
> {
  savedTradeIds?: PersonId[]
  pendingVerifications?: Person['pendingVerifications']
}

function person(seed: PersonSeed): Person {
  return {
    avatarSeed: seed.id,
    adultConfirmedAt: seed.joinedAt,
    pendingVerifications: [],
    savedTradeIds: [],
    ...seed,
  }
}

const idChecked = (checkedAt: string): VerificationBadge => ({ kind: 'id_check', checkedAt })

function registration(
  registrationNumber: string,
  checkedAt: string,
  expiresAt: string,
): VerificationBadge {
  return {
    kind: 'landlord_registration',
    registrationNumber,
    council: ABERDEEN,
    checkedAt,
    expiresAt,
  }
}

function trade(profile: TradeProfile): TradeProfile {
  return profile
}

// ─── Letting agency ──────────────────────────────────────────────────────────────────────────

export const AGENCIES: Agency[] = [
  {
    id: 'agency_leask_ogston',
    name: 'Leask & Ogston Lettings',
    registrationNumber: 'LARN2004117',
    postcodeDistrict: 'AB10',
  },
]

// ─── Landlords (and the agent who works for Graham) ──────────────────────────────────────────

const LANDLORDS: Person[] = [
  person({
    id: 'person_graham',
    displayName: 'Graham Forbes',
    roles: ['landlord'],
    postcodeDistrict: 'AB15',
    badges: [idChecked('2024-02-06'), registration('514782/100/26031', '2025-07-02', '2028-06-30')],
    joinedAt: on('2024-02-06', '20:14'),
    contact: { email: 'graham.forbes@example.com', phone: '07700 900101' },
    lastSeen: { landlord: d(-2, '18:30') },
    savedTradeIds: [
      'person_kev',
      'person_mhairi',
      'person_neil',
      'person_doug',
      'person_joanna',
      'person_fiona',
    ],
  }),
  person({
    id: 'person_aileen',
    displayName: 'Aileen Christie',
    roles: ['landlord'],
    postcodeDistrict: 'AB10',
    badges: [
      idChecked('2024-08-02'),
      { kind: 'agent_team', agencyId: 'agency_leask_ogston', checkedAt: '2024-08-02' },
    ],
    joinedAt: on('2024-08-02', '09:30'),
    contact: { email: 'aileen.christie@example.co.uk', phone: '07700 900102' },
  }),
  person({
    id: 'person_irene',
    displayName: 'Irene Duguid',
    roles: ['landlord'],
    postcodeDistrict: 'AB24',
    badges: [idChecked('2024-01-15'), registration('388215/100/19874', '2024-02-14', '2027-02-12')],
    joinedAt: on('2024-01-15', '11:02'),
    contact: { email: 'irene.duguid@example.com', phone: '07700 900103' },
    savedTradeIds: ['person_mhairi', 'person_doug', 'person_ian', 'person_craig', 'person_kev'],
  }),
  person({
    id: 'person_hannah',
    displayName: 'Hannah Reid',
    roles: ['landlord', 'tenant'],
    postcodeDistrict: 'AB22',
    badges: [idChecked('2025-03-10'), registration('702346/100/31158', '2025-12-03', '2028-12-01')],
    joinedAt: on('2025-03-10', '19:45'),
    contact: { email: 'hannah.reid@example.com', phone: '07700 900104' },
    lastSeen: { landlord: d(-1, '21:00'), tenant: d(-3, '20:15') },
    savedTradeIds: ['person_kev'],
  }),
  person({
    id: 'person_derek',
    displayName: 'Derek Milne',
    roles: ['landlord'],
    postcodeDistrict: 'AB11',
    badges: [idChecked('2024-01-20'), registration('276590/100/15502', '2024-01-22', '2026-11-02')],
    joinedAt: on('2024-01-20', '14:37'),
    contact: { email: 'derek.milne@example.com', phone: '07700 900105' },
  }),
]

// ─── Tenants: current, then former ───────────────────────────────────────────────────────────

const TENANTS: Person[] = [
  person({
    id: 'person_sarah',
    displayName: 'Sarah Laing',
    roles: ['tenant'],
    postcodeDistrict: 'AB25',
    badges: [idChecked('2024-01-16')],
    joinedAt: on('2024-01-15', '21:08'),
    contact: { email: 'sarah.laing@example.com', phone: '07700 900201' },
    lastSeen: { tenant: d(-3, '20:00') },
  }),
  person({
    id: 'person_kirsty',
    displayName: 'Kirsty Paterson',
    roles: ['tenant'],
    postcodeDistrict: 'AB25',
    badges: [idChecked('2024-02-20')],
    joinedAt: on('2024-02-19', '18:22'),
    contact: { email: 'kirsty.paterson@example.com', phone: '07700 900202' },
  }),
  person({
    id: 'person_ewan',
    displayName: 'Ewan Stewart',
    roles: ['tenant'],
    postcodeDistrict: 'AB10',
    badges: [idChecked('2024-08-26')],
    joinedAt: on('2024-08-25', '12:10'),
    contact: { email: 'ewan.stewart@example.com', phone: '07700 900203' },
  }),
  person({
    id: 'person_ruaridh',
    displayName: 'Ruaridh Mackenzie',
    roles: ['tenant'],
    postcodeDistrict: 'AB15',
    badges: [idChecked('2025-08-04')],
    joinedAt: on('2025-08-03', '10:40'),
    contact: { email: 'ruaridh.mackenzie@example.com', phone: '07700 900204' },
  }),
  person({
    id: 'person_chloe',
    displayName: 'Chloe Watt',
    roles: ['tenant'],
    postcodeDistrict: 'AB15',
    badges: [idChecked('2025-08-05')],
    joinedAt: on('2025-08-04', '08:55'),
    contact: { email: 'chloe.watt@example.com', phone: '07700 900205' },
  }),
  person({
    id: 'person_oliver',
    displayName: 'Oliver Brown',
    roles: ['tenant'],
    postcodeDistrict: 'AB11',
    badges: [],
    pendingVerifications: [{ claim: { kind: 'id_check' }, submittedAt: d(0, '09:12') }],
    joinedAt: on('2026-01-24', '17:05'),
    contact: { email: 'oliver.brown@example.co.uk', phone: '07700 900206' },
  }),
  person({
    id: 'person_callum',
    displayName: 'Callum Gray',
    roles: ['tenant'],
    postcodeDistrict: 'AB24',
    badges: [idChecked('2024-02-21')],
    joinedAt: on('2024-02-20', '22:15'),
    contact: { email: 'callum.gray@example.com', phone: '07700 900207' },
  }),
  person({
    id: 'person_eilidh',
    displayName: 'Eilidh Munro',
    roles: ['tenant'],
    postcodeDistrict: 'AB24',
    badges: [idChecked('2025-06-20')],
    joinedAt: on('2025-06-19', '13:30'),
    contact: { email: 'eilidh.munro@example.com', phone: '07700 900208' },
  }),
  person({
    id: 'person_liam',
    displayName: 'Liam Duncan',
    roles: ['tenant'],
    postcodeDistrict: 'AB11',
    badges: [idChecked('2026-03-20')],
    joinedAt: on('2026-03-19', '19:50'),
    contact: { email: 'liam.duncan@example.com', phone: '07700 900209' },
  }),
  person({
    id: 'person_beata',
    displayName: 'Beata Nowak',
    roles: ['tenant'],
    postcodeDistrict: 'AB11',
    badges: [idChecked('2025-01-22')],
    joinedAt: on('2025-01-21', '20:02'),
    contact: { email: 'beata.nowak@example.com', phone: '07700 900210' },
  }),
  person({
    id: 'person_stuart',
    displayName: 'Stuart Simpson',
    roles: ['tenant'],
    postcodeDistrict: 'AB22',
    badges: [idChecked('2024-10-18')],
    joinedAt: on('2024-10-17', '07:45'),
    contact: { email: 'stuart.simpson@example.com', phone: '07700 900211' },
  }),
  person({
    id: 'person_josh',
    displayName: 'Josh Allan',
    roles: ['tenant'],
    postcodeDistrict: 'AB22',
    badges: [idChecked('2025-03-12')],
    joinedAt: on('2025-03-11', '21:30'),
    contact: { email: 'josh.allan@example.com', phone: '07700 900212' },
  }),
  person({
    id: 'person_niamh',
    displayName: 'Niamh Gordon',
    roles: ['tenant'],
    postcodeDistrict: 'AB16',
    badges: [idChecked('2024-04-12')],
    joinedAt: on('2024-04-11', '16:25'),
    contact: { email: 'niamh.gordon@example.com', phone: '07700 900213' },
  }),
  person({
    id: 'person_rory',
    displayName: 'Rory Gillespie',
    roles: ['tenant'],
    postcodeDistrict: 'AB15',
    badges: [idChecked('2024-02-27')],
    joinedAt: on('2024-02-26', '19:12'),
    contact: { email: 'rory.gillespie@example.com', phone: '07700 900214' },
  }),
  person({
    id: 'person_megan',
    displayName: 'Megan Taylor',
    roles: ['tenant'],
    postcodeDistrict: 'AB24',
    badges: [idChecked('2024-03-05')],
    joinedAt: on('2024-03-04', '11:48'),
    contact: { email: 'megan.taylor@example.com', phone: '07700 900215' },
  }),
  person({
    id: 'person_connor',
    displayName: 'Connor Bain',
    roles: ['tenant'],
    postcodeDistrict: 'AB16',
    badges: [idChecked('2024-03-02')],
    joinedAt: on('2024-03-01', '09:05'),
    contact: { email: 'connor.bain@example.com', phone: '07700 900216' },
  }),
  person({
    id: 'person_grace',
    displayName: 'Grace Mitchell',
    roles: ['tenant'],
    postcodeDistrict: 'AB11',
    badges: [idChecked('2024-01-30')],
    joinedAt: on('2024-01-29', '15:20'),
    contact: { email: 'grace.mitchell@example.com', phone: '07700 900217' },
  }),
  person({
    id: 'person_daniel',
    displayName: 'Daniel Ross',
    roles: ['tenant'],
    postcodeDistrict: 'AB22',
    badges: [idChecked('2024-02-10')],
    joinedAt: on('2024-02-09', '20:40'),
    contact: { email: 'daniel.ross@example.com', phone: '07700 900218' },
  }),
  person({
    id: 'person_shona',
    displayName: 'Shona Adams',
    roles: ['tenant'],
    postcodeDistrict: 'AB16',
    badges: [idChecked('2025-06-03')],
    joinedAt: on('2025-06-02', '18:18'),
    contact: { email: 'shona.adams@example.com', phone: '07700 900219' },
  }),
]

// ─── Trades ──────────────────────────────────────────────────────────────────────────────────

const TRADES: Person[] = [
  person({
    id: 'person_kev',
    displayName: 'Kev Rattray',
    roles: ['trade'],
    postcodeDistrict: 'AB16',
    badges: [idChecked('2024-03-05')],
    tradeProfile: trade({
      businessName: 'Rattray Plumbing',
      trades: ['plumber'],
      serviceDistricts: ['AB10', 'AB11', 'AB15', 'AB16', 'AB24', 'AB25'],
      about:
        'Leaks, taps, toilets, showers and blocked sinks. Sole trader, twenty years on the tools, tidy and on time.',
      vatRegistered: false,
    }),
    joinedAt: on('2024-03-04', '19:30'),
    contact: { email: 'kev.rattray@example.co.uk', phone: '07700 900301' },
    lastSeen: { trade: d(-1, '19:45') },
  }),
  person({
    id: 'person_mhairi',
    displayName: 'Mhairi Robertson',
    roles: ['trade'],
    postcodeDistrict: 'AB15',
    badges: [
      idChecked('2024-03-11'),
      {
        kind: 'gas_safe',
        registrationNumber: '581273',
        applianceCategories: ['boilers', 'water_heaters', 'cookers', 'fires'],
        checkedAt: '2026-03-09',
        expiresAt: '2027-03-31',
      },
    ],
    tradeProfile: trade({
      businessName: 'Denburn Gas & Heating',
      trades: ['gas_engineer', 'plumber'],
      serviceDistricts: ['AB10', 'AB11', 'AB15', 'AB16', 'AB22', 'AB24', 'AB25'],
      about:
        'Gas safety records, boiler servicing and repairs, radiators and heating controls across Aberdeen.',
      vatRegistered: true,
    }),
    joinedAt: on('2024-03-10', '08:15'),
    contact: { email: 'mhairi.robertson@example.co.uk', phone: '07700 900302' },
  }),
  person({
    id: 'person_neil',
    displayName: 'Neil Buchan',
    roles: ['trade'],
    postcodeDistrict: 'AB22',
    badges: [
      idChecked('2024-05-14'),
      {
        kind: 'electrical_scheme',
        scheme: 'SELECT',
        membershipNumber: 'S20417',
        checkedAt: '2026-01-12',
        expiresAt: '2026-12-31',
      },
    ],
    tradeProfile: trade({
      businessName: 'Buchan Electrical',
      trades: ['electrician'],
      serviceDistricts: ['AB10', 'AB11', 'AB15', 'AB22', 'AB24', 'AB25'],
      about: 'EICRs, fault finding, rewires and alarm installs for landlords and letting agents.',
      vatRegistered: true,
    }),
    joinedAt: on('2024-05-13', '12:00'),
    contact: { email: 'neil.buchan@example.co.uk', phone: '07700 900303' },
  }),
  person({
    id: 'person_doug',
    displayName: 'Doug Lawrie',
    roles: ['trade'],
    postcodeDistrict: 'AB24',
    badges: [idChecked('2024-04-22')],
    tradeProfile: trade({
      businessName: 'Lawrie Joinery',
      trades: ['joiner'],
      serviceDistricts: ['AB10', 'AB15', 'AB24', 'AB25'],
      about: 'Doors, sash windows, skirtings, kitchens and floors. Old granite flats a speciality.',
      vatRegistered: false,
    }),
    joinedAt: on('2024-04-21', '20:30'),
    contact: { email: 'doug.lawrie@example.com', phone: '07700 900304' },
  }),
  person({
    id: 'person_ian',
    displayName: 'Ian Kinnear',
    roles: ['trade'],
    postcodeDistrict: 'AB22',
    badges: [idChecked('2024-09-03')],
    tradeProfile: trade({
      businessName: 'Kinnear Slaters',
      trades: ['roofer'],
      serviceDistricts: ['AB11', 'AB15', 'AB16', 'AB22', 'AB24'],
      about: 'Slates, flashings, gutters and chimney heads. Scaffold and access arranged.',
      vatRegistered: true,
    }),
    joinedAt: on('2024-09-02', '07:20'),
    contact: { email: 'ian.kinnear@example.co.uk', phone: '07700 900305' },
  }),
  person({
    id: 'person_joanna',
    displayName: 'Joanna Kowalska',
    roles: ['trade'],
    postcodeDistrict: 'AB25',
    badges: [idChecked('2025-02-17')],
    tradeProfile: trade({
      businessName: 'Kowalska Cleaning',
      trades: ['cleaner'],
      serviceDistricts: ['AB10', 'AB11', 'AB15', 'AB24', 'AB25'],
      about: 'End-of-tenancy and deep cleans, ovens included. Photos sent when done.',
      vatRegistered: false,
    }),
    joinedAt: on('2025-02-16', '10:10'),
    contact: { email: 'joanna.kowalska@example.com', phone: '07700 900306' },
  }),
  person({
    id: 'person_craig',
    displayName: 'Craig Ewen',
    roles: ['trade'],
    postcodeDistrict: 'AB10',
    badges: [idChecked('2024-06-10')],
    tradeProfile: trade({
      businessName: 'Ewen Locks',
      trades: ['locksmith'],
      serviceDistricts: ['AB10', 'AB11', 'AB15', 'AB16', 'AB22', 'AB24', 'AB25'],
      about: 'Lockouts, lock changes and door security. Out-of-hours callouts across the city.',
      vatRegistered: false,
    }),
    joinedAt: on('2024-06-09', '22:40'),
    contact: { email: 'craig.ewen@example.com', phone: '07700 900307' },
  }),
  person({
    id: 'person_sandy',
    displayName: 'Sandy Morrison',
    roles: ['trade'],
    postcodeDistrict: 'AB11',
    badges: [idChecked('2025-04-07')],
    tradeProfile: trade({
      businessName: 'Morrison Property Repairs',
      trades: ['handyman'],
      serviceDistricts: ['AB11', 'AB16', 'AB22', 'AB25'],
      about: 'Small jobs done properly: cupboard doors, shelves, fences, sealant and gutters.',
      vatRegistered: false,
    }),
    joinedAt: on('2025-04-06', '09:00'),
    contact: { email: 'sandy.morrison@example.com', phone: '07700 900308' },
  }),
  person({
    id: 'person_fiona',
    displayName: 'Fiona Leiper',
    roles: ['trade'],
    postcodeDistrict: 'AB16',
    badges: [idChecked('2025-11-18')],
    tradeProfile: trade({
      businessName: 'Leiper Glazing',
      trades: ['glazier'],
      serviceDistricts: ['AB10', 'AB15', 'AB16', 'AB24', 'AB25'],
      about: 'Broken panes, misted double glazing, sash cords and window locks.',
      vatRegistered: true,
    }),
    joinedAt: on('2025-11-17', '14:25'),
    contact: { email: 'fiona.leiper@example.co.uk', phone: '07700 900309' },
  }),
  person({
    id: 'person_pete',
    displayName: 'Pete Anderson',
    roles: ['trade'],
    postcodeDistrict: 'AB15',
    badges: [],
    pendingVerifications: [{ claim: { kind: 'id_check' }, submittedAt: d(-1, '18:40') }],
    tradeProfile: trade({
      businessName: 'Anderson Decorators',
      trades: ['decorator'],
      serviceDistricts: ['AB10', 'AB15', 'AB25'],
      about: 'Painting and decorating between tenancies. Quick turnarounds, clean finish.',
      vatRegistered: false,
    }),
    joinedAt: on('2026-09-25', '17:32'),
    contact: { email: 'pete.anderson@example.com', phone: '07700 900310' },
  }),
]

export const PEOPLE: Person[] = [...LANDLORDS, ...TENANTS, ...TRADES]

export const MEMBERSHIPS: TeamMembership[] = [
  {
    id: 'membership_aileen_graham',
    agencyId: 'agency_leask_ogston',
    agentId: 'person_aileen',
    landlordId: 'person_graham',
    permissions: [
      'approve_repairs',
      'instruct_trades',
      'accept_quotes',
      'manage_documents',
      'manage_tenancies',
      'message',
    ],
    status: 'active',
    invitedAt: on('2024-08-01', '16:45'),
    acceptedAt: on('2024-08-02', '09:31'),
  },
]

/** Kev's and Mhairi's quick-quote lines. */
export const SAVED_LINE_ITEMS: SavedLineItem[] = [
  {
    id: 'lineitem_kev_callout',
    tradeId: 'person_kev',
    description: 'Call-out, including the first half hour',
    kind: 'callout',
    unit: 'each',
    unitPence: 5500,
  },
  {
    id: 'lineitem_kev_labour',
    tradeId: 'person_kev',
    description: 'Labour',
    kind: 'labour',
    unit: 'hour',
    unitPence: 4200,
  },
  {
    id: 'lineitem_kev_tap_cartridge',
    tradeId: 'person_kev',
    description: 'Ceramic tap cartridge',
    kind: 'materials',
    unit: 'each',
    unitPence: 1450,
  },
  {
    id: 'lineitem_kev_fill_valve',
    tradeId: 'person_kev',
    description: 'Toilet fill valve',
    kind: 'materials',
    unit: 'each',
    unitPence: 1800,
  },
  {
    id: 'lineitem_kev_shower_cartridge',
    tradeId: 'person_kev',
    description: 'Thermostatic shower cartridge',
    kind: 'materials',
    unit: 'each',
    unitPence: 3800,
  },
  {
    id: 'lineitem_kev_waste_trap',
    tradeId: 'person_kev',
    description: 'Sink waste trap and fittings',
    kind: 'materials',
    unit: 'each',
    unitPence: 1200,
  },
  {
    id: 'lineitem_mhairi_gsr',
    tradeId: 'person_mhairi',
    description: 'Gas safety record, up to three appliances',
    kind: 'labour',
    unit: 'each',
    unitPence: 6500,
  },
  {
    id: 'lineitem_mhairi_service',
    tradeId: 'person_mhairi',
    description: 'Boiler service',
    kind: 'labour',
    unit: 'each',
    unitPence: 7500,
  },
  {
    id: 'lineitem_mhairi_labour',
    tradeId: 'person_mhairi',
    description: 'Labour',
    kind: 'labour',
    unit: 'hour',
    unitPence: 5000,
  },
]
