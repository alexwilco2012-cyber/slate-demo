// Thirty-one repairs, written as short stories. The first eighteen are live on the demo's today
// and between them cover every job status; the rest are the history the ratings come from.
//
// Today is Saturday 26 September 2026. d(-1) is Friday, d(3) is Tuesday 29 September.

import type { JobSeed } from './build-job'
import { d, day, on } from './time'

const sarah = 'person_sarah'
const graham = 'person_graham'
const aileen = 'person_aileen'
const kev = 'person_kev'
const irene = 'person_irene'
const derek = 'person_derek'
const hannah = 'person_hannah'
const kirsty = 'person_kirsty'
const ewan = 'person_ewan'
const chloe = 'person_chloe'
const ruaridh = 'person_ruaridh'
const eilidh = 'person_eilidh'
const oliver = 'person_oliver'
const callum = 'person_callum'
const liam = 'person_liam'
const beata = 'person_beata'
const stuart = 'person_stuart'
const josh = 'person_josh'
const mhairi = 'person_mhairi'
const neil = 'person_neil'
const doug = 'person_doug'
const ian = 'person_ian'
const joanna = 'person_joanna'
const craig = 'person_craig'
const sandy = 'person_sandy'
const fiona = 'person_fiona'

// ─── Live on the demo's today ────────────────────────────────────────────────────────────────

const LIVE: JobSeed[] = [
  // Reported last night; waiting for Graham or his agent to approve.
  {
    id: 'job_fan_union',
    propertyId: 'property_union_grove',
    tenancyId: 'tenancy_ewan_union',
    reporter: ewan,
    reportedAs: 'tenant',
    title: 'Bathroom extractor fan has stopped',
    room: 'bathroom',
    category: 'electrics',
    description:
      "The extractor fan in the bathroom stopped working on Wednesday. The light still comes on but the fan doesn't start, so the mirror stays steamed up for ages and I don't want mould starting on the ceiling.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(3), slot: 'morning' },
        { date: day(4), slot: 'all_day' },
        { date: day(5), slot: 'afternoon' },
      ],
      keyAllowed: true,
      notes: 'Buzzer 1. I work from home most days.',
    },
    photos: [{ slug: 'fan-union-grove', alt: 'Bathroom ceiling extractor fan with a grey grille' }],
    status: 'reported',
    reportedAt: d(-1, '18:42'),
    messages: [
      {
        by: ewan,
        at: d(-1, '18:44'),
        body: "Not urgent, just letting you know. It's been like this since Wednesday.",
      },
    ],
    unreadFor: [graham, aileen],
  },

  // Twelve days and three messages later, the poor landlord still hasn't replied.
  {
    id: 'job_mould_victoria',
    propertyId: 'property_victoria_road',
    tenancyId: 'tenancy_liam_victoria',
    reporter: liam,
    reportedAs: 'tenant',
    title: 'Black mould spreading behind the bed',
    room: 'bedroom',
    category: 'damp',
    description:
      "There's black mould on the outside wall behind the bed, about a metre wide now, and it's coming back through the paint. The window drips with condensation every morning even with the vent open. I've been wiping it down with mould spray but it's getting worse since the weather turned.",
    urgency: 'urgent',
    access: {
      windows: [
        { date: day(-10), slot: 'evening' },
        { date: day(-9), slot: 'evening' },
        { date: day(-8), slot: 'all_day' },
      ],
      keyAllowed: false,
      notes: 'I work shifts, so evenings are best. Message me here first.',
    },
    photos: [
      { slug: 'mould-behind-bed', alt: 'Black mould on a bedroom wall behind a headboard' },
      {
        slug: 'condensation-window',
        alt: 'Condensation running down a single-glazed window onto the sill',
      },
    ],
    status: 'reported',
    reportedAt: d(-12, '20:15'),
    messages: [
      {
        by: liam,
        at: d(-12, '20:17'),
        body: "Hi Derek, photos are on the report. It's got a lot worse in the last fortnight. Could someone come and have a look?",
      },
      {
        by: liam,
        at: d(-5, '19:02'),
        body: "Just checking you've seen this? It's starting on the ceiling now.",
      },
      {
        by: liam,
        at: d(-1, '08:30'),
        body: "Hi again. Could you let me know when someone can come out? I've moved the bed away from the wall for now.",
      },
    ],
    unreadFor: [derek],
  },

  // Approved by the agent; she hasn't chosen a joiner yet.
  {
    id: 'job_window_queens',
    propertyId: 'property_queens_road',
    tenancyId: 'tenancy_queens',
    reporter: chloe,
    reportedAs: 'tenant',
    title: "Sash window won't stay open in the living room",
    room: 'living_room',
    category: 'doors_windows_locks',
    description:
      "One of the sash cords on the big living room window has snapped. The bottom half drops as soon as you let go, so we can't open it for air. It's closed and safe for now.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(2), slot: 'afternoon' },
        { date: day(4), slot: 'afternoon' },
        { date: day(5), slot: 'morning' },
      ],
      keyAllowed: true,
      notes: 'Either of us can let someone in. Please ring the top buzzer.',
    },
    photos: [
      {
        slug: 'sash-cord-queens',
        alt: 'Tall sash window with a frayed cord hanging loose at the side',
      },
    ],
    status: 'approved',
    reportedAt: d(-4, '08:05'),
    approved: { at: d(-2, '11:20'), by: aileen },
    messages: [
      {
        by: chloe,
        at: d(-4, '08:06'),
        body: "Morning! No rush, it's shut and safe, but it'd be nice to get some air in before winter.",
      },
      {
        by: aileen,
        at: d(-2, '11:22'),
        body: "Thanks Chloe, that's approved. I'll get a joiner lined up and they'll give you proper notice before they come.",
      },
    ],
  },

  // Out on the job board with two quotes in; the agent needs to pick one.
  {
    id: 'job_gutter_jesmond',
    propertyId: 'property_jesmond',
    tenancyId: 'tenancy_stuart_jesmond',
    reporter: stuart,
    reportedAs: 'tenant',
    title: 'Gutter overflowing above the back door',
    room: 'outside',
    category: 'roof_outside',
    description:
      "When it rains hard, water pours over the gutter above the back door instead of going down the pipe. There's a green streak down the harling now and a puddle right where you step out. I think the gutter's blocked or has slipped at the corner.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(-7), slot: 'all_day' },
        { date: day(-6), slot: 'all_day' },
        { date: day(4), slot: 'all_day' },
      ],
      keyAllowed: true,
      notes: 'The side gate is unlocked. No need to come inside.',
    },
    photos: [
      { slug: 'gutter-jesmond', alt: 'Rainwater spilling over a white gutter above a back door' },
      {
        slug: 'harling-streak',
        alt: 'Green stain running down pebble-dash harling under a gutter',
      },
    ],
    status: 'quoting',
    reportedAt: d(-9, '17:30'),
    approved: { at: d(-8, '09:10'), by: aileen },
    board: { at: d(-8, '09:12'), by: aileen, closesAt: d(3, '17:00') },
    quotes: [
      {
        id: 'quote_gutter_ian',
        trade: ian,
        at: d(-6, '19:40'),
        lines: [
          ['Clear and reseat the rear gutter, reseal the corner joint', 'labour', 1, 14500],
          ['Gutter bracket and corner union', 'materials', 2, 1250],
          ['Access tower for the day', 'other', 1, 6000],
        ],
        notes:
          'Had a look from the lane: the corner union has dropped. Price includes clearing the full run and checking the downpipe.',
        earliestStart: day(3),
      },
      {
        id: 'quote_gutter_sandy',
        trade: sandy,
        at: d(-5, '12:15'),
        lines: [
          ['Clear gutter and downpipe, refix corner bracket', 'labour', 2, 3500],
          ['Bracket and sealant', 'materials', 1, 1500],
        ],
        notes: "Can do it from ladders if the ground's firm. Free next Thursday, the 1st.",
        earliestStart: day(5),
      },
    ],
    messages: [
      {
        by: stuart,
        at: d(-9, '17:32'),
        body: 'It was like a waterfall during that downpour on Monday!',
      },
      {
        by: aileen,
        at: d(-8, '09:14'),
        body: "Thanks Stuart. I've put it out for quotes and I'll let you know who's coming. They'll only need the garden.",
      },
    ],
  },

  // Hannah asked Kev directly. His price came in last night; she accepted it this morning and
  // told him to go ahead, so it's his to book.
  {
    id: 'job_tap_polmuir',
    propertyId: 'property_polmuir',
    tenancyId: 'tenancy_oliver_polmuir',
    reporter: oliver,
    reportedAs: 'tenant',
    title: "Kitchen tap won't stop dripping",
    room: 'kitchen',
    category: 'leak',
    description:
      'The hot side of the kitchen mixer tap drips all the time, even turned off hard. It filled a mug overnight.',
    urgency: 'routine',
    access: {
      windows: [
        { date: day(2), slot: 'morning' },
        { date: day(3), slot: 'morning' },
        { date: day(5), slot: 'evening' },
      ],
      keyAllowed: true,
      notes: "Hannah has a key if I'm out.",
    },
    photos: [
      { slug: 'tap-polmuir', alt: 'Chrome kitchen mixer tap with a drip forming at the spout' },
    ],
    status: 'instructed',
    reportedAt: d(-3, '07:50'),
    approved: { at: d(-3, '12:30'), by: hannah },
    chosen: { trade: kev, at: d(-3, '12:34'), by: hannah, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_tap_polmuir_kev',
        trade: kev,
        at: d(-1, '20:15'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Ceramic tap cartridge, hot side', 'materials', 1, 1450],
        ],
        notes: "Price includes checking the cold side while I'm there.",
        earliestStart: day(2),
        outcome: { status: 'accepted', at: d(0, '08:40'), by: hannah },
      },
    ],
    instructed: {
      at: d(0, '08:40'),
      by: hannah,
      note: "Oliver is happy for you to use the spare key if he's out.",
    },
    messages: [
      {
        by: oliver,
        at: d(-3, '07:52'),
        body: "Sorry to bother you again! It's only a drip but it's constant.",
      },
      {
        by: hannah,
        at: d(-3, '12:36'),
        body: "Not a bother at all. I've asked Kev, who fixed the toilet in May. Kev, could you send a price when you get a chance?",
      },
      {
        by: kev,
        at: d(-3, '18:05'),
        body: "No bother. Sounds like a worn cartridge. I'll get a price over by Monday and come round later in the week.",
      },
      {
        by: hannah,
        at: d(0, '08:43'),
        body: "Thanks Kev, that's fine. Go ahead whenever suits Oliver.",
      },
    ],
    unreadFor: [kev],
  },

  // The five-yearly electrical inspection, booked with four days' notice.
  {
    id: 'job_eicr_esslemont',
    propertyId: 'property_esslemont',
    tenancyId: 'tenancy_sarah_esslemont',
    reporter: aileen,
    reportedAs: 'landlord',
    title: 'Electrical safety inspection (EICR)',
    room: 'whole_home',
    category: 'safety_check',
    description:
      'The five-yearly EICR is due by 14 October. Full inspection and test of the installation, with the report sent to us and shared with the tenant.',
    urgency: 'routine',
    complianceType: 'eicr',
    credential: { kind: 'electrical_certification' },
    access: {
      windows: [{ date: day(3), slot: 'morning' }],
      keyAllowed: true,
      notes: 'The tenant is working from home that morning.',
    },
    status: 'booked',
    reportedAt: d(-10, '09:30'),
    approved: { at: d(-10, '09:30'), by: aileen },
    chosen: { trade: neil, at: d(-10, '09:32'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_eicr_neil',
        trade: neil,
        at: d(-9, '16:20'),
        lines: [['EICR for a two-bedroom flat, including the report', 'labour', 1, 15000]],
        notes: 'Allow three hours. The power will be off for spells during testing.',
        outcome: { status: 'accepted', at: d(-8, '10:05'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_eicr_esslemont',
        purpose: 'safety_check',
        bookedAt: d(-2, '16:10'),
        bookedBy: neil,
        startsAt: d(3, '09:00'),
        endsAt: d(3, '12:00'),
        note: 'The power will be off for short spells while I test. The fridge and freezer will be fine.',
        status: 'booked',
      },
    ],
    messages: [
      {
        by: sarah,
        at: d(-2, '17:02'),
        body: "That's fine, I'll be working from home that morning. Is it OK if I'm on calls in the bedroom?",
      },
      {
        by: neil,
        at: d(-2, '17:30'),
        body: "Perfect. I'll start in the kitchen and leave the bedroom till last, so you'll have a couple of hours.",
      },
    ],
  },

  // The annual gas safety check, booked before the record runs out on 8 October.
  {
    id: 'job_gas_union',
    propertyId: 'property_union_grove',
    tenancyId: 'tenancy_ewan_union',
    reporter: aileen,
    reportedAs: 'landlord',
    title: 'Annual gas safety check',
    room: 'whole_home',
    category: 'safety_check',
    description:
      'Gas safety record due by 8 October. Boiler and hob to check, plus a boiler service while you are there.',
    urgency: 'routine',
    complianceType: 'gas_safety',
    credential: { kind: 'gas_safe', applianceCategory: 'boilers' },
    access: { windows: [{ date: day(4), slot: 'afternoon' }], keyAllowed: true },
    status: 'booked',
    reportedAt: d(-14, '10:00'),
    approved: { at: d(-14, '10:00'), by: aileen },
    chosen: { trade: mhairi, at: d(-14, '10:02'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_gas_union_mhairi',
        trade: mhairi,
        at: d(-13, '08:40'),
        lines: [
          ['Gas safety record, up to three appliances', 'labour', 1, 6500],
          ['Boiler service', 'labour', 1, 7500],
        ],
        outcome: { status: 'accepted', at: d(-12, '14:15'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_gas_union',
        purpose: 'safety_check',
        bookedAt: d(-4, '10:30'),
        bookedBy: mhairi,
        startsAt: d(4, '13:00'),
        endsAt: d(4, '14:30'),
        status: 'booked',
      },
    ],
    messages: [
      {
        by: ewan,
        at: d(-4, '12:10'),
        body: "That's fine, I'll be in. The boiler's in the hall cupboard; I'll clear it out.",
      },
    ],
  },

  // The house Hannah rents with Josh. Irene has chosen a handyman and he's booked for Wednesday.
  {
    id: 'job_fence_scotstown',
    propertyId: 'property_scotstown',
    tenancyId: 'tenancy_hannah_scotstown',
    reporter: josh,
    reportedAs: 'tenant',
    title: 'Back fence blown down in the wind',
    room: 'outside',
    category: 'roof_outside',
    description:
      "Two panels of the back fence came down in the wind on Sunday night, and the post between them has snapped at the bottom. The garden's open to the lane now and the panels are lying on the grass.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(4), slot: 'afternoon' },
        { date: day(5), slot: 'all_day' },
      ],
      keyAllowed: false,
      notes: 'No need to come inside. The back garden is through the gate from the lane.',
    },
    photos: [
      {
        slug: 'fence-scotstown',
        alt: 'Two wooden fence panels lying flat on a back lawn beside a snapped post',
      },
    ],
    status: 'booked',
    reportedAt: d(-5, '08:10'),
    approved: { at: d(-5, '12:40'), by: irene },
    chosen: { trade: sandy, at: d(-5, '12:45'), by: irene, route: 'directory' },
    quotes: [
      {
        id: 'quote_fence_sandy',
        trade: sandy,
        at: d(-4, '19:20'),
        lines: [
          ['Replace the snapped post and hang two fence panels', 'labour', 1, 9000],
          ['Fence post, postcrete and two panels', 'materials', 1, 8500],
        ],
        notes: 'One of the panels has split, so I have priced for two new ones to match.',
        outcome: { status: 'accepted', at: d(-3, '09:05'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_fence_scotstown',
        purpose: 'repair',
        bookedAt: d(-2, '17:30'),
        bookedBy: sandy,
        startsAt: d(4, '13:00'),
        endsAt: d(4, '16:00'),
        note: "I'll come in by the lane gate, so nobody needs to be in.",
        status: 'booked',
      },
    ],
    messages: [
      {
        by: josh,
        at: d(-5, '08:12'),
        body: "Morning Irene. Photo's on the report. Nothing else is damaged, it's just the fence.",
      },
      {
        by: irene,
        at: d(-5, '12:47'),
        body: "Thanks Josh. I've asked Sandy Morrison to have a look; he's local and does a lot of fencing.",
      },
      {
        by: hannah,
        at: d(-2, '18:05'),
        body: 'Thanks Sandy. The lane gate sticks a bit, so just give it a good shove.',
      },
    ],
    unreadFor: [sandy],
  },

  // Kev is on site right now.
  {
    id: 'job_toilet_walker',
    propertyId: 'property_walker_road',
    tenancyId: 'tenancy_beata_walker',
    reporter: beata,
    reportedAs: 'tenant',
    title: 'Toilet keeps running after flushing',
    room: 'bathroom',
    category: 'leak',
    description:
      "After every flush the cistern keeps filling and water trickles into the bowl for ages. Sometimes it doesn't stop at all unless I lift the lid and push the float up. I've turned the little valve on the pipe down so it doesn't waste water.",
    urgency: 'urgent',
    access: {
      windows: [{ date: day(0), slot: 'morning' }],
      keyAllowed: false,
      notes: "I'll be in all Saturday morning.",
    },
    photos: [
      {
        slug: 'cistern-walker',
        alt: 'Inside of a toilet cistern with the float arm and fill valve',
      },
    ],
    status: 'in_progress',
    reportedAt: d(-6, '21:05'),
    approved: { at: d(-5, '08:15'), by: irene },
    chosen: { trade: kev, at: d(-5, '08:17'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_toilet_walker_kev',
        trade: kev,
        at: d(-5, '12:00'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Toilet fill valve', 'materials', 1, 1800],
          ['Labour', 'labour', 0.5, 4200],
        ],
        outcome: { status: 'accepted', at: d(-5, '12:40'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_toilet_walker',
        purpose: 'repair',
        bookedAt: d(-4, '09:30'),
        bookedBy: kev,
        startsAt: d(0, '09:00'),
        endsAt: d(0, '10:30'),
        status: 'on_site',
        startedAt: d(0, '09:04'),
      },
    ],
    messages: [
      {
        by: beata,
        at: d(-6, '21:07'),
        body: "Hi Irene, sorry it's late. It's not flooding, just running constantly.",
      },
      {
        by: irene,
        at: d(-5, '08:16'),
        body: "Morning Beata, thanks for letting me know. I've asked Kev to take a look; he's very good.",
      },
      {
        by: kev,
        at: d(-4, '09:31'),
        body: "Hi Beata, does Saturday first thing suit? Should only take half an hour once I'm in.",
      },
      { by: beata, at: d(-4, '10:12'), body: 'Saturday is perfect, thank you.' },
      { by: kev, at: d(0, '08:52'), body: 'On my way, there in ten.' },
    ],
  },

  // Done on Wednesday; the landlord still hasn't confirmed it.
  {
    id: 'job_shower_rosemount',
    propertyId: 'property_rosemount_place',
    tenancyId: 'tenancy_kirsty_rosemount',
    reporter: kirsty,
    reportedAs: 'tenant',
    title: 'Shower mixer dripping constantly',
    room: 'bathroom',
    category: 'leak',
    description:
      "The shower head keeps dripping after it's turned off, and the dial has got very stiff. It's been going about a week and the tray is starting to stain.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(-8), slot: 'afternoon' },
        { date: day(-3), slot: 'afternoon' },
      ],
      keyAllowed: false,
      notes: 'Afternoons are best.',
    },
    photos: [
      { slug: 'shower-rosemount', alt: 'Wall-mounted shower mixer with limescale around the dial' },
    ],
    status: 'completed',
    reportedAt: d(-13, '19:20'),
    approved: { at: d(-9, '22:47'), by: derek },
    chosen: { trade: kev, at: d(-9, '22:50'), by: derek, route: 'directory' },
    quotes: [
      {
        id: 'quote_shower_kev',
        trade: kev,
        at: d(-8, '18:00'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Thermostatic shower cartridge', 'materials', 1, 3800],
          ['Labour', 'labour', 1.5, 4200],
        ],
        outcome: { status: 'accepted', at: d(-7, '23:10'), by: derek },
      },
    ],
    visits: [
      {
        id: 'visit_shower_rosemount',
        purpose: 'repair',
        bookedAt: d(-6, '08:00'),
        bookedBy: kev,
        startsAt: d(-3, '14:00'),
        endsAt: d(-3, '16:00'),
        status: 'done',
        startedAt: d(-3, '14:06'),
        finishedAt: d(-3, '15:38'),
        tenantConfirmedAt: d(-3, '18:30'),
      },
    ],
    completion: {
      at: d(-3, '15:40'),
      pricePence: 15600,
      note: "Replaced the thermostatic cartridge and descaled the body. No drips after half an hour's testing.",
      photos: [
        { slug: 'shower-fixed-rosemount', alt: 'Clean shower mixer with a new chrome dial' },
      ],
    },
    payment: { invoicedAt: d(-3, '15:45'), dueInDays: 7 },
    messages: [
      {
        by: kirsty,
        at: d(-13, '19:22'),
        body: "Hi Derek, the shower's been dripping for about a week. Photo's on the report.",
      },
      { by: kirsty, at: d(-10, '18:40'), body: 'Hi, just checking you saw this one?' },
      { by: derek, at: d(-9, '22:48'), body: 'Seen. Getting a plumber.' },
      {
        by: kev,
        at: d(-6, '08:02'),
        body: "Hi Kirsty, Kev the plumber here. I've booked Wednesday afternoon. If that's no good just shout.",
      },
      { by: kirsty, at: d(-6, '08:30'), body: "Wednesday's great, thanks Kev." },
      {
        by: kev,
        at: d(-3, '15:42'),
        body: "All done. New cartridge in and I've given it a good clean. Give it a day and let me know if it drips again.",
      },
      { by: kirsty, at: d(-3, '18:31'), body: "Brilliant, it's lovely now. Thanks so much!" },
    ],
    unreadFor: [derek],
  },

  // Confirmed a week ago. The agent and the engineer have rated; Sarah hasn't yet, so everything
  // on this job is still sealed.
  {
    id: 'job_radiator_esslemont',
    propertyId: 'property_esslemont',
    tenancyId: 'tenancy_sarah_esslemont',
    reporter: sarah,
    reportedAs: 'tenant',
    title: 'Bedroom radiator only warm at the bottom',
    room: 'bedroom',
    category: 'heating',
    description:
      'The radiator in the bedroom is cold at the top and only warm along the bottom. I tried bleeding it with the key and a bit of water came out but no air. The boiler pressure gauge is sitting just under 1.',
    urgency: 'routine',
    credential: { kind: 'gas_safe', applianceCategory: 'boilers' },
    access: {
      windows: [
        { date: day(-8), slot: 'afternoon' },
        { date: day(-7), slot: 'all_day' },
      ],
      keyAllowed: true,
      notes: "The agent has a key if I'm not in.",
    },
    photos: [{ slug: 'radiator-esslemont', alt: 'White panel radiator under a bedroom window' }],
    status: 'confirmed',
    reportedAt: d(-15, '08:30'),
    approved: { at: d(-15, '10:05'), by: aileen },
    chosen: { trade: mhairi, at: d(-15, '10:07'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_radiator_mhairi',
        trade: mhairi,
        at: d(-14, '17:45'),
        lines: [
          ['Boiler check and repressurise', 'labour', 1, 4500],
          ['Flush the bedroom radiator and fit a new valve', 'labour', 1, 3500],
        ],
        outcome: { status: 'accepted', at: d(-14, '19:02'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_radiator_esslemont',
        purpose: 'repair',
        bookedAt: d(-14, '19:30'),
        bookedBy: mhairi,
        startsAt: d(-8, '13:00'),
        endsAt: d(-8, '15:00'),
        status: 'done',
        startedAt: d(-8, '13:04'),
        finishedAt: d(-8, '14:38'),
        tenantConfirmedAt: d(-8, '18:10'),
      },
    ],
    completion: {
      at: d(-8, '14:40'),
      pricePence: 9600,
      note: 'Radiator full of sludge. Flushed it through, fitted a new valve, repressurised the boiler to 1.3 bar and checked the expansion vessel. All hot now.',
      photos: [{ slug: 'radiator-flushed', alt: 'Bucket of dark sludge flushed from a radiator' }],
    },
    payment: {
      invoicedAt: d(-8, '14:45'),
      dueInDays: 14,
      paid: { at: d(-6, '10:30'), by: 'landlord' },
    },
    confirmed: { at: d(-7, '09:15'), by: aileen },
    messages: [
      {
        by: sarah,
        at: d(-15, '08:31'),
        body: "Morning! Not an emergency, the rest of the flat's warm. It's just the bedroom that's chilly.",
      },
      {
        by: aileen,
        at: d(-15, '10:08'),
        body: "Thanks Sarah. I've asked Mhairi from Denburn Gas & Heating to have a look, as it might be the boiler pressure.",
      },
      {
        by: mhairi,
        at: d(-14, '19:32'),
        body: "Hi Sarah, I've booked next Friday afternoon and the notice is below. Could you clear a bit of space around the radiator?",
      },
      { by: sarah, at: d(-14, '20:05'), body: 'Will do, thanks!' },
      {
        by: mhairi,
        at: d(-8, '14:41'),
        body: 'All sorted. There was a fair bit of sludge in that one. Give the boiler a glance now and again; the needle should sit between 1 and 1.5.',
      },
      { by: sarah, at: d(-8, '18:12'), body: 'Toasty again, thank you so much.' },
    ],
  },

  // Declined, with the kind of reason that shows up in a landlord's ratings.
  {
    id: 'job_lock_victoria',
    propertyId: 'property_victoria_road',
    tenancyId: 'tenancy_liam_victoria',
    reporter: liam,
    reportedAs: 'tenant',
    title: 'Front door lock sticking',
    room: 'hall',
    category: 'doors_windows_locks',
    description:
      "The key sticks in the front door lock and I have to jiggle it for a minute to get it to turn. I'm worried it'll jam and I'll be locked out.",
    urgency: 'routine',
    access: { windows: [{ date: day(-38), slot: 'evening' }], keyAllowed: false },
    status: 'declined',
    reportedAt: d(-40, '07:45'),
    declined: {
      at: d(-33, '21:30'),
      by: derek,
      reason: 'Put some graphite or WD-40 in it. Not paying a locksmith for a sticky key.',
    },
    messages: [
      {
        by: liam,
        at: d(-40, '07:46'),
        body: "It's got worse this week, especially when it's damp out.",
      },
      {
        by: liam,
        at: d(-33, '21:40'),
        body: "OK, I'll try that. Can we look at it again if it doesn't sort it?",
      },
    ],
    unreadFor: [derek],
  },

  // Cancelled by the tenant, who fixed it himself.
  {
    id: 'job_washer_polmuir',
    propertyId: 'property_polmuir',
    tenancyId: 'tenancy_oliver_polmuir',
    reporter: oliver,
    reportedAs: 'tenant',
    title: "Washing machine won't drain",
    room: 'kitchen',
    category: 'appliance',
    description:
      "The washing machine stopped mid-cycle and there's still water sitting in the drum. It shows an error light and won't drain.",
    urgency: 'routine',
    access: { windows: [{ date: day(-19), slot: 'evening' }], keyAllowed: true },
    status: 'cancelled',
    reportedAt: d(-20, '19:10'),
    cancelled: {
      at: d(-20, '21:02'),
      by: oliver,
      reason:
        'Found a sock stuck in the filter at the bottom. All sorted now, sorry for the bother!',
    },
    messages: [
      {
        by: hannah,
        at: d(-20, '21:10'),
        body: 'Ha, glad it was an easy one! Thanks for letting me know.',
      },
    ],
  },

  // Reported by Sarah this morning after a wet night; waiting for Graham or his agent.
  {
    id: 'job_ceiling_esslemont',
    propertyId: 'property_esslemont',
    tenancyId: 'tenancy_sarah_esslemont',
    reporter: sarah,
    reportedAs: 'tenant',
    title: 'Damp patch spreading on the bedroom ceiling',
    room: 'bedroom',
    category: 'roof_outside',
    description:
      "After the rain last night there's a brown damp patch on the bedroom ceiling by the window, about the size of a dinner plate. It feels cold and a bit soft. We're on the top floor, so I think it might be the roof or a gutter.",
    urgency: 'urgent',
    access: {
      windows: [
        { date: day(2), slot: 'all_day' },
        { date: day(3), slot: 'afternoon' },
        { date: day(4), slot: 'all_day' },
      ],
      keyAllowed: true,
      notes: 'I work from home most days. The agent has a key.',
    },
    photos: [
      {
        slug: 'ceiling-esslemont',
        alt: 'Brown water stain on a white bedroom ceiling beside a sash window',
      },
      {
        slug: 'ceiling-esslemont-close',
        alt: 'Close-up of bubbling paint at the edge of the ceiling stain',
      },
    ],
    status: 'reported',
    reportedAt: d(0, '07:55'),
    messages: [
      {
        by: sarah,
        at: d(0, '07:58'),
        body: "Morning! It wasn't there yesterday. I've moved the bed away from the wall just in case.",
      },
      {
        by: aileen,
        at: d(0, '09:20'),
        body: "Thanks Sarah, sorry you woke up to that. I've passed it to Graham to approve and I'll line up a roofer.",
      },
    ],
    unreadFor: [graham, sarah],
  },

  // Kev's second job today, done before Callum hands the keys back on Wednesday.
  {
    id: 'job_taps_spital',
    propertyId: 'property_spital',
    tenancyId: 'tenancy_callum_spital',
    reporter: callum,
    reportedAs: 'tenant',
    title: 'Bath taps dripping and the hot tap is stiff',
    room: 'bathroom',
    category: 'leak',
    description:
      "Both bath taps drip all the time and the hot one is really stiff to turn. It's left a brown mark in the bath under the hot tap.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(0), slot: 'afternoon' },
        { date: day(1), slot: 'all_day' },
      ],
      keyAllowed: true,
      notes: "I'm packing to move out, so I'm in most of the weekend.",
    },
    photos: [
      { slug: 'bath-taps-spital', alt: 'Pair of chrome bath taps with a drip at the spout' },
    ],
    status: 'booked',
    reportedAt: d(-6, '18:40'),
    approved: { at: d(-5, '09:05'), by: irene },
    chosen: { trade: kev, at: d(-5, '09:10'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_taps_spital_kev',
        trade: kev,
        at: d(-4, '19:30'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Pair of bath tap cartridges', 'materials', 1, 2400],
          ['Labour', 'labour', 1, 4200],
        ],
        outcome: { status: 'accepted', at: d(-3, '09:20'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_taps_spital',
        purpose: 'repair',
        bookedAt: d(-3, '17:20'),
        bookedBy: kev,
        startsAt: d(0, '13:30'),
        endsAt: d(0, '15:00'),
        status: 'booked',
      },
    ],
    messages: [
      {
        by: callum,
        at: d(-6, '18:42'),
        body: "Hi Irene, I'd like to get this sorted before I hand the keys back.",
      },
      {
        by: irene,
        at: d(-5, '09:12'),
        body: "Thanks Callum. I've asked Kev Rattray to take a look. He's very tidy.",
      },
      {
        by: kev,
        at: d(-3, '17:22'),
        body: 'Hi Callum, does Saturday afternoon suit? The notice is below.',
      },
      { by: callum, at: d(-3, '18:05'), body: "Saturday's great, see you then." },
    ],
  },

  // On the board since Thursday. Kev's quote is in; Graham and his agent haven't answered yet.
  {
    id: 'job_basin_king',
    propertyId: 'property_king_street',
    tenancyId: 'tenancy_eilidh_king',
    reporter: eilidh,
    reportedAs: 'tenant',
    title: 'Bathroom basin tap loose and dripping',
    room: 'bathroom',
    category: 'leak',
    description:
      'The basin mixer tap has come loose at the base, so it swivels when you turn it on, and it drips from underneath onto the pedestal.',
    urgency: 'routine',
    access: {
      windows: [
        { date: day(2), slot: 'morning' },
        { date: day(3), slot: 'morning' },
        { date: day(4), slot: 'evening' },
      ],
      keyAllowed: true,
    },
    photos: [{ slug: 'basin-king', alt: 'Bathroom basin mixer tap leaning to one side' }],
    status: 'quoting',
    reportedAt: d(-3, '19:05'),
    approved: { at: d(-2, '09:38'), by: aileen },
    board: { at: d(-2, '09:40'), by: aileen, closesAt: d(5, '17:00') },
    quotes: [
      {
        id: 'quote_basin_kev',
        trade: kev,
        at: d(-1, '19:10'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Basin tap fixing kit and washers', 'materials', 1, 900],
        ],
        notes:
          'Should be a quick one: a new fixing kit and washers. If the tap body is cracked I will price a new mixer before fitting anything.',
        earliestStart: day(2),
      },
    ],
    messages: [
      {
        by: eilidh,
        at: d(-3, '19:07'),
        body: "It's still usable, it just wobbles and drips.",
      },
      {
        by: aileen,
        at: d(-2, '09:42'),
        body: "Thanks Eilidh. It's out for quotes now and I'll let you know who's coming.",
      },
    ],
  },

  // Derek put this on the board late last night; no quotes yet.
  {
    id: 'job_valve_rosemount',
    propertyId: 'property_rosemount_place',
    tenancyId: 'tenancy_kirsty_rosemount',
    reporter: kirsty,
    reportedAs: 'tenant',
    title: 'Radiator valve leaking in the hall',
    room: 'hall',
    category: 'leak',
    description:
      'The valve at the bottom of the hall radiator is weeping. There is a damp patch on the carpet and a little puddle by the morning.',
    urgency: 'urgent',
    access: {
      windows: [
        { date: day(1), slot: 'afternoon' },
        { date: day(2), slot: 'afternoon' },
        { date: day(3), slot: 'afternoon' },
      ],
      keyAllowed: false,
      notes: 'Afternoons are best.',
    },
    photos: [
      {
        slug: 'valve-rosemount',
        alt: 'Radiator valve with a drip and a damp patch on the carpet below',
      },
    ],
    status: 'quoting',
    reportedAt: d(-2, '18:10'),
    approved: { at: d(-1, '21:35'), by: derek },
    board: { at: d(-1, '21:40'), by: derek, closesAt: d(6, '21:40') },
    messages: [
      {
        by: kirsty,
        at: d(-2, '18:12'),
        body: "Hi Derek, another one I'm afraid. I've put a towel down for now.",
      },
      { by: derek, at: d(-1, '21:41'), body: 'Put it on the job board.' },
    ],
    unreadFor: [kirsty],
  },

  // The agent put this on the board first thing this morning.
  {
    id: 'job_sink_queens',
    propertyId: 'property_queens_road',
    tenancyId: 'tenancy_queens',
    reporter: ruaridh,
    reportedAs: 'tenant',
    title: 'Kitchen sink draining slowly',
    room: 'kitchen',
    category: 'drains',
    description:
      "The kitchen sink takes ages to empty and gurgles when it does. We've tried a plunger and drain unblocker but it keeps coming back.",
    urgency: 'routine',
    access: {
      windows: [
        { date: day(2), slot: 'afternoon' },
        { date: day(4), slot: 'afternoon' },
        { date: day(5), slot: 'morning' },
      ],
      keyAllowed: true,
    },
    photos: [{ slug: 'sink-queens', alt: 'Kitchen sink with standing grey water' }],
    status: 'quoting',
    reportedAt: d(-2, '19:20'),
    approved: { at: d(0, '08:02'), by: aileen },
    board: { at: d(0, '08:05'), by: aileen, closesAt: d(7, '17:00') },
    messages: [
      {
        by: aileen,
        at: d(0, '08:07'),
        body: "Morning Ruaridh. It's on the job board now, so a plumber should be in touch this week.",
      },
    ],
  },
]

// ─── History ─────────────────────────────────────────────────────────────────────────────────

const HISTORY: JobSeed[] = [
  // Three weeks ago. Derek confirmed it late and still hasn't paid Kev's invoice.
  {
    id: 'job_waste_victoria',
    propertyId: 'property_victoria_road',
    tenancyId: 'tenancy_liam_victoria',
    reporter: liam,
    reportedAs: 'tenant',
    title: 'Kitchen sink waste leaking into the cupboard',
    room: 'kitchen',
    category: 'leak',
    description:
      'Every time the sink drains, water drips from the joint under the plughole into the cupboard. The base of the cupboard has gone soft.',
    urgency: 'urgent',
    access: {
      windows: [{ date: '2026-09-03', slot: 'morning' }],
      keyAllowed: false,
      notes: 'I finish my night shift at 7, so mornings are fine.',
    },
    photos: [{ slug: 'sink-waste-victoria', alt: 'Swollen chipboard under a kitchen sink trap' }],
    status: 'confirmed',
    reportedAt: on('2026-08-26', '08:05'),
    approved: { at: on('2026-08-29', '23:40'), by: derek },
    chosen: { trade: kev, at: on('2026-08-29', '23:42'), by: derek, route: 'directory' },
    quotes: [
      {
        id: 'quote_waste_victoria_kev',
        trade: kev,
        at: on('2026-08-30', '09:15'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Sink waste and trap', 'materials', 1, 1650],
          ['Labour', 'labour', 0.5, 4200],
        ],
        notes: 'Payment within 7 days of the invoice, by bank transfer.',
        outcome: { status: 'accepted', at: on('2026-08-30', '22:50'), by: derek },
      },
    ],
    visits: [
      {
        id: 'visit_waste_victoria',
        purpose: 'repair',
        bookedAt: on('2026-08-31', '08:30'),
        bookedBy: kev,
        startsAt: on('2026-09-03', '09:00'),
        endsAt: on('2026-09-03', '10:30'),
        status: 'done',
        startedAt: on('2026-09-03', '09:05'),
        finishedAt: on('2026-09-03', '09:55'),
        tenantConfirmedAt: on('2026-09-03', '18:20'),
      },
    ],
    completion: {
      at: on('2026-09-03', '10:00'),
      pricePence: 9250,
      note: 'Replaced the waste and trap and resealed the plughole. Dry after a full sink test. The cupboard base will need replacing once it dries out.',
    },
    payment: { invoicedAt: on('2026-09-03', '10:05'), dueInDays: 7 },
    confirmed: { at: on('2026-09-12', '22:30'), by: derek },
    messages: [
      {
        by: liam,
        at: on('2026-08-26', '08:07'),
        body: "Photo's on the report. I've put a bowl under it for now.",
      },
      {
        by: liam,
        at: on('2026-08-29', '19:30'),
        body: "Hi Derek, it's getting worse. The cupboard floor is going soft.",
      },
      { by: derek, at: on('2026-08-29', '23:43'), body: 'Asked a plumber to price it.' },
      {
        by: kev,
        at: on('2026-08-31', '08:32'),
        body: 'Hi Liam, Kev the plumber here. Does Thursday at 9 suit? The notice is below.',
      },
      { by: liam, at: on('2026-08-31', '09:10'), body: 'Perfect, thanks.' },
      {
        by: kev,
        at: on('2026-09-03', '10:02'),
        body: 'All sorted, Liam. Leave the cupboard doors open for a few days so the base dries out.',
      },
    ],
  },
  {
    id: 'job_sink_esslemont',
    propertyId: 'property_esslemont',
    tenancyId: 'tenancy_kirsty_esslemont',
    reporter: kirsty,
    reportedAs: 'tenant',
    title: 'Leak under the kitchen sink',
    room: 'kitchen',
    category: 'leak',
    description:
      "There's water pooling in the cupboard under the kitchen sink. It seems to drip from where the waste pipe joins the trap. I've put a basin under it.",
    urgency: 'urgent',
    access: { windows: [{ date: '2024-11-21', slot: 'morning' }], keyAllowed: true },
    photos: [
      {
        slug: 'leak-under-sink',
        alt: 'Water pooling on the base of the cupboard under a kitchen sink',
      },
    ],
    status: 'confirmed',
    reportedAt: on('2024-11-18', '07:40'),
    approved: { at: on('2024-11-18', '09:15'), by: aileen },
    chosen: { trade: kev, at: on('2024-11-18', '09:18'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_sink_kev',
        trade: kev,
        at: on('2024-11-18', '12:30'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Sink waste trap and fittings', 'materials', 1, 1200],
        ],
        outcome: { status: 'accepted', at: on('2024-11-18', '13:02'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_sink_esslemont',
        purpose: 'repair',
        bookedAt: on('2024-11-18', '13:10'),
        bookedBy: kev,
        startsAt: on('2024-11-21', '09:00'),
        endsAt: on('2024-11-21', '10:30'),
        status: 'done',
        startedAt: on('2024-11-21', '09:02'),
        finishedAt: on('2024-11-21', '09:48'),
        tenantConfirmedAt: on('2024-11-21', '12:00'),
      },
    ],
    completion: {
      at: on('2024-11-21', '09:50'),
      pricePence: 6700,
      note: 'Replaced the perished trap seal and the waste fitting. Dry after testing.',
    },
    confirmed: { at: on('2024-11-22', '09:00'), by: aileen },
    messages: [
      {
        by: kev,
        at: on('2024-11-21', '09:51'),
        body: 'All dry now. Leave the cupboard door open today so it can dry out.',
      },
      { by: kirsty, at: on('2024-11-21', '12:01'), body: 'Thank you, that was quick!' },
    ],
  },
  {
    id: 'job_sockets_union',
    propertyId: 'property_union_grove',
    tenancyId: 'tenancy_ewan_union',
    reporter: ewan,
    reportedAs: 'tenant',
    title: 'Kitchen sockets keep tripping the fuse box',
    room: 'kitchen',
    category: 'electrics',
    description:
      "Every time the kettle and toaster are on at once, the kitchen sockets trip at the fuse box. It's happened four times this week, and once with just the fridge on.",
    urgency: 'urgent',
    access: { windows: [{ date: '2025-03-07', slot: 'morning' }], keyAllowed: true },
    status: 'confirmed',
    reportedAt: on('2025-03-04', '08:10'),
    approved: { at: on('2025-03-04', '09:05'), by: aileen },
    chosen: { trade: neil, at: on('2025-03-04', '09:07'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_sockets_neil',
        trade: neil,
        at: on('2025-03-04', '15:30'),
        lines: [
          ['Fault-find the kitchen ring circuit', 'labour', 2, 5500],
          ['Replacement double socket', 'materials', 1, 1400],
        ],
        outcome: { status: 'accepted', at: on('2025-03-04', '16:00'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_sockets_union',
        purpose: 'repair',
        bookedAt: on('2025-03-04', '16:20'),
        bookedBy: neil,
        startsAt: on('2025-03-07', '09:00'),
        endsAt: on('2025-03-07', '11:00'),
        status: 'done',
        startedAt: on('2025-03-07', '09:03'),
        finishedAt: on('2025-03-07', '10:40'),
        tenantConfirmedAt: on('2025-03-07', '17:30'),
      },
    ],
    completion: {
      at: on('2025-03-07', '10:45'),
      pricePence: 14880,
      note: 'Found a scorched socket behind the fridge. Replaced it and tested the ring; all readings fine.',
    },
    confirmed: { at: on('2025-03-08', '10:00'), by: aileen },
  },
  {
    id: 'job_door_spital',
    propertyId: 'property_spital',
    tenancyId: 'tenancy_callum_spital',
    reporter: callum,
    reportedAs: 'tenant',
    title: 'Bedroom door sticking and handle loose',
    room: 'bedroom',
    category: 'doors_windows_locks',
    description:
      "The bedroom door catches on the floor and you have to shove it closed, and the handle's come loose so it spins without catching.",
    urgency: 'routine',
    access: {
      windows: [{ date: '2025-06-16', slot: 'morning' }],
      keyAllowed: true,
      notes: 'I might be at work; Irene has a key.',
    },
    status: 'confirmed',
    reportedAt: on('2025-06-10', '19:30'),
    approved: { at: on('2025-06-11', '08:40'), by: irene },
    chosen: { trade: doug, at: on('2025-06-11', '08:45'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_door_doug',
        trade: doug,
        at: on('2025-06-11', '20:10'),
        lines: [
          ['Ease and rehang the bedroom door', 'labour', 1.5, 3600],
          ['Mortice latch and handle set', 'materials', 1, 2400],
        ],
        outcome: { status: 'accepted', at: on('2025-06-12', '09:00'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_door_spital',
        purpose: 'repair',
        bookedAt: on('2025-06-12', '09:30'),
        bookedBy: doug,
        startsAt: on('2025-06-16', '10:00'),
        endsAt: on('2025-06-16', '12:00'),
        status: 'done',
        startedAt: on('2025-06-16', '10:10'),
        finishedAt: on('2025-06-16', '11:35'),
        tenantConfirmedAt: on('2025-06-16', '18:00'),
      },
    ],
    completion: {
      at: on('2025-06-16', '11:40'),
      pricePence: 7800,
      note: 'Planed the bottom of the door, adjusted the hinges and fitted a new latch and handles.',
    },
    confirmed: { at: on('2025-06-17', '09:30'), by: irene },
  },
  {
    id: 'job_bath_victoria',
    propertyId: 'property_victoria_road',
    tenancyId: 'tenancy_sarah_victoria',
    reporter: sarah,
    reportedAs: 'tenant',
    title: 'Bath waste leaking into the flat below',
    room: 'bathroom',
    category: 'leak',
    description:
      "The neighbour downstairs says water comes through their bathroom ceiling when I use the bath. There's a damp patch on the bath panel by the plughole end.",
    urgency: 'urgent',
    access: { windows: [{ date: '2025-01-24', slot: 'morning' }], keyAllowed: false },
    status: 'confirmed',
    reportedAt: on('2025-01-13', '08:05'),
    approved: { at: on('2025-01-19', '20:30'), by: derek },
    chosen: { trade: kev, at: on('2025-01-19', '20:34'), by: derek, route: 'directory' },
    quotes: [
      {
        id: 'quote_bath_kev',
        trade: kev,
        at: on('2025-01-20', '12:00'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Replace bath waste and overflow', 'labour', 1, 4200],
          ['Bath waste and overflow kit', 'materials', 1, 2400],
        ],
        outcome: { status: 'accepted', at: on('2025-01-20', '22:15'), by: derek },
      },
    ],
    visits: [
      {
        id: 'visit_bath_victoria',
        purpose: 'repair',
        bookedAt: on('2025-01-21', '08:00'),
        bookedBy: kev,
        startsAt: on('2025-01-24', '10:00'),
        endsAt: on('2025-01-24', '12:00'),
        status: 'done',
        startedAt: on('2025-01-24', '10:05'),
        finishedAt: on('2025-01-24', '11:30'),
        tenantConfirmedAt: on('2025-01-24', '17:45'),
      },
    ],
    completion: {
      at: on('2025-01-24', '11:35'),
      pricePence: 12100,
      note: 'The bath waste seal had failed. New waste and overflow fitted; panel left off for a day so it can dry.',
    },
    confirmed: { at: on('2025-01-27', '21:00'), by: derek },
    messages: [
      {
        by: sarah,
        at: on('2025-01-13', '08:06'),
        body: "The neighbour's been round twice about it. I'm not using the bath until it's fixed.",
      },
      { by: sarah, at: on('2025-01-16', '19:30'), body: 'Hi Derek, any update on this?' },
      { by: derek, at: on('2025-01-19', '20:32'), body: 'Sorting it this week.' },
      {
        by: kev,
        at: on('2025-01-24', '11:36'),
        body: "All done. It was the seal under the plug. You're fine to use the bath again from tonight.",
      },
    ],
  },
  {
    id: 'job_cupboard_rosemount',
    propertyId: 'property_rosemount_place',
    tenancyId: 'tenancy_kirsty_rosemount',
    reporter: kirsty,
    reportedAs: 'tenant',
    title: 'Kitchen cupboard door hanging off',
    room: 'kitchen',
    category: 'other',
    description:
      "The top hinge on the cupboard next to the cooker has pulled out of the side panel, so the door hangs at an angle and won't close.",
    urgency: 'routine',
    access: { windows: [{ date: '2026-08-19', slot: 'afternoon' }], keyAllowed: false },
    status: 'confirmed',
    reportedAt: on('2026-08-10', '18:15'),
    approved: { at: on('2026-08-14', '23:05'), by: derek },
    chosen: { trade: sandy, at: on('2026-08-14', '23:08'), by: derek, route: 'directory' },
    quotes: [
      {
        id: 'quote_cupboard_sandy',
        trade: sandy,
        at: on('2026-08-15', '09:30'),
        lines: [
          ['Refix the cupboard door with new hinges and a repair block', 'labour', 1, 4500],
          ['Pair of soft-close hinges', 'materials', 1, 1200],
        ],
        outcome: { status: 'accepted', at: on('2026-08-15', '21:40'), by: derek },
      },
    ],
    visits: [
      {
        id: 'visit_cupboard_rosemount',
        purpose: 'repair',
        bookedAt: on('2026-08-16', '10:00'),
        bookedBy: sandy,
        startsAt: on('2026-08-19', '14:00'),
        endsAt: on('2026-08-19', '15:00'),
        status: 'done',
        startedAt: on('2026-08-19', '14:02'),
        finishedAt: on('2026-08-19', '14:50'),
        tenantConfirmedAt: on('2026-08-19', '19:00'),
      },
    ],
    completion: {
      at: on('2026-08-19', '14:52'),
      pricePence: 5700,
      note: 'The side panel had split, so I fitted a repair block and new hinges. Door adjusted and closing flush.',
      photos: [
        { slug: 'cupboard-fixed', alt: 'Kitchen cupboard door hanging straight and closed' },
      ],
    },
    confirmed: { at: on('2026-08-20', '22:10'), by: derek },
  },
  {
    id: 'job_boiler_victoria',
    propertyId: 'property_victoria_road',
    tenancyId: 'tenancy_liam_victoria',
    reporter: liam,
    reportedAs: 'tenant',
    title: 'Boiler keeps losing pressure, no hot water',
    room: 'kitchen',
    category: 'heating',
    description:
      "The boiler pressure drops to zero every couple of days and then there's no hot water until I top it up. I've been using the filling loop but it's happening more often.",
    urgency: 'urgent',
    credential: { kind: 'gas_safe', applianceCategory: 'boilers' },
    access: { windows: [{ date: '2026-06-24', slot: 'morning' }], keyAllowed: false },
    status: 'confirmed',
    reportedAt: on('2026-06-08', '07:30'),
    approved: { at: on('2026-06-19', '22:15'), by: derek },
    chosen: { trade: mhairi, at: on('2026-06-19', '22:20'), by: derek, route: 'directory' },
    quotes: [
      {
        id: 'quote_boiler_mhairi',
        trade: mhairi,
        at: on('2026-06-20', '10:00'),
        lines: [
          ['Find the cause of the pressure loss', 'labour', 1, 5000],
          ['Replace the pressure relief valve', 'labour', 1, 5000],
          ['Pressure relief valve', 'materials', 1, 2800],
        ],
        outcome: { status: 'accepted', at: on('2026-06-21', '20:05'), by: derek },
      },
    ],
    visits: [
      {
        id: 'visit_boiler_victoria',
        purpose: 'repair',
        bookedAt: on('2026-06-21', '20:30'),
        bookedBy: mhairi,
        startsAt: on('2026-06-24', '08:30'),
        endsAt: on('2026-06-24', '10:30'),
        status: 'done',
        startedAt: on('2026-06-24', '08:31'),
        finishedAt: on('2026-06-24', '10:05'),
        tenantConfirmedAt: on('2026-06-24', '18:20'),
      },
    ],
    completion: {
      at: on('2026-06-24', '10:10'),
      pricePence: 15360,
      note: 'The pressure relief valve was letting by. Replaced it, repressurised and ran the system for an hour. Holding at 1.2 bar.',
    },
    confirmed: { at: on('2026-07-01', '21:30'), by: derek },
    messages: [
      {
        by: liam,
        at: on('2026-06-08', '07:31'),
        body: "Topped it up again this morning. Could someone look at it soon? It's every two days now.",
      },
      { by: liam, at: on('2026-06-15', '08:00'), body: 'Hi Derek, still no word on this?' },
      { by: derek, at: on('2026-06-19', '22:16'), body: 'Plumber booked.' },
      {
        by: mhairi,
        at: on('2026-06-24', '10:11'),
        body: 'All fixed. If the pressure drops below 1 again, give me a shout through here.',
      },
    ],
  },
  {
    id: 'job_gutter_scotstown',
    propertyId: 'property_scotstown',
    tenancyId: 'tenancy_hannah_scotstown',
    reporter: hannah,
    reportedAs: 'tenant',
    title: 'Gutter overflowing at the front',
    room: 'outside',
    category: 'roof_outside',
    description:
      "The gutter above the front bedroom window overflows in heavy rain and splashes against the window frame. It looks like there's a plant growing out of it.",
    urgency: 'routine',
    access: { windows: [{ date: '2025-11-12', slot: 'morning' }], keyAllowed: true },
    status: 'confirmed',
    reportedAt: on('2025-11-03', '18:40'),
    approved: { at: on('2025-11-04', '09:00'), by: irene },
    chosen: { trade: ian, at: on('2025-11-04', '09:05'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_gutter_scotstown_ian',
        trade: ian,
        at: on('2025-11-05', '17:00'),
        lines: [['Clear the front gutters and downpipe', 'labour', 1, 9500]],
        outcome: { status: 'accepted', at: on('2025-11-05', '19:30'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_gutter_scotstown',
        purpose: 'repair',
        bookedAt: on('2025-11-06', '08:15'),
        bookedBy: ian,
        startsAt: on('2025-11-12', '09:00'),
        endsAt: on('2025-11-12', '11:00'),
        status: 'done',
        startedAt: on('2025-11-12', '09:10'),
        finishedAt: on('2025-11-12', '10:20'),
        tenantConfirmedAt: on('2025-11-12', '17:00'),
      },
    ],
    completion: {
      at: on('2025-11-12', '10:25'),
      pricePence: 11400,
      note: 'Cleared a good bucketful of moss and a small sapling. Downpipe flushed and running freely.',
    },
    confirmed: { at: on('2025-11-12', '16:00'), by: irene },
  },
  {
    id: 'job_lockout_walker',
    propertyId: 'property_walker_road',
    tenancyId: 'tenancy_beata_walker',
    reporter: beata,
    reportedAs: 'tenant',
    title: 'Key snapped in the front door lock',
    room: 'hall',
    category: 'doors_windows_locks',
    description:
      "My key snapped in the front door lock when I got home. Half of it is stuck inside and I can't get in.",
    urgency: 'emergency',
    access: { windows: [{ date: '2026-02-14', slot: 'evening' }], keyAllowed: false },
    status: 'confirmed',
    reportedAt: on('2026-02-14', '22:10'),
    approved: { at: on('2026-02-14', '22:14'), by: irene },
    chosen: { trade: craig, at: on('2026-02-14', '22:16'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_lockout_craig',
        trade: craig,
        at: on('2026-02-14', '22:20'),
        lines: [
          ['Out-of-hours call-out', 'callout', 1, 8500],
          ['Extract the broken key and replace the cylinder', 'labour', 1, 3000],
          ['Euro cylinder with three keys', 'materials', 1, 2500],
        ],
        outcome: { status: 'accepted', at: on('2026-02-14', '22:22'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_lockout_walker',
        purpose: 'repair',
        bookedAt: on('2026-02-14', '22:25'),
        bookedBy: craig,
        startsAt: on('2026-02-14', '23:00'),
        endsAt: on('2026-02-14', '23:45'),
        emergency: true,
        status: 'done',
        startedAt: on('2026-02-14', '23:05'),
        finishedAt: on('2026-02-14', '23:40'),
        tenantConfirmedAt: on('2026-02-15', '09:30'),
      },
    ],
    completion: {
      at: on('2026-02-14', '23:45'),
      pricePence: 14000,
      note: "Extracted the broken key and fitted a new cylinder. Three keys handed over; the landlord's copy is in the post.",
    },
    confirmed: { at: on('2026-02-15', '10:00'), by: irene },
    messages: [
      {
        by: beata,
        at: on('2026-02-14', '22:11'),
        body: "I'm waiting at a neighbour's. Sorry, I know it's late!",
      },
      {
        by: irene,
        at: on('2026-02-14', '22:17'),
        body: "Don't be daft, that's what I'm here for. Craig from Ewen Locks is on his way.",
      },
      {
        by: craig,
        at: on('2026-02-14', '22:26'),
        body: "Be there about eleven. Wrap up, it's baltic out.",
      },
    ],
  },
  {
    id: 'job_toilet_polmuir',
    propertyId: 'property_polmuir',
    tenancyId: 'tenancy_oliver_polmuir',
    reporter: oliver,
    reportedAs: 'tenant',
    title: 'Toilet cistern not refilling',
    room: 'bathroom',
    category: 'leak',
    description:
      'The toilet cistern takes ages to refill after a flush, sometimes twenty minutes, and it hisses the whole time.',
    urgency: 'urgent',
    access: { windows: [{ date: '2026-05-15', slot: 'afternoon' }], keyAllowed: true },
    status: 'confirmed',
    reportedAt: on('2026-05-11', '08:20'),
    approved: { at: on('2026-05-11', '12:10'), by: hannah },
    chosen: { trade: kev, at: on('2026-05-11', '12:20'), by: hannah, route: 'directory' },
    quotes: [
      {
        id: 'quote_toilet_polmuir_kev',
        trade: kev,
        at: on('2026-05-11', '17:30'),
        lines: [
          ['Call-out, including the first half hour', 'callout', 1, 5500],
          ['Toilet fill valve', 'materials', 1, 1800],
        ],
        outcome: { status: 'accepted', at: on('2026-05-11', '18:02'), by: hannah },
      },
    ],
    visits: [
      {
        id: 'visit_toilet_polmuir',
        purpose: 'repair',
        bookedAt: on('2026-05-11', '18:10'),
        bookedBy: kev,
        startsAt: on('2026-05-15', '16:00'),
        endsAt: on('2026-05-15', '17:00'),
        status: 'done',
        startedAt: on('2026-05-15', '16:02'),
        finishedAt: on('2026-05-15', '16:40'),
        tenantConfirmedAt: on('2026-05-15', '19:00'),
      },
    ],
    completion: {
      at: on('2026-05-15', '16:45'),
      pricePence: 7300,
      note: 'The fill valve was furred up. Fitted a new one; it refills in under a minute now.',
    },
    confirmed: { at: on('2026-05-16', '10:00'), by: hannah },
    messages: [
      {
        by: hannah,
        at: on('2026-05-11', '12:22'),
        body: 'Hi Kev, first time doing this as a landlord, so bear with me! Could you take a look?',
      },
      {
        by: kev,
        at: on('2026-05-11', '17:31'),
        body: 'No bother at all. Sounds like the fill valve. The price is on here.',
      },
    ],
  },
  {
    id: 'job_clean_fonthill',
    propertyId: 'property_fonthill',
    reporter: aileen,
    reportedAs: 'landlord',
    title: 'End-of-tenancy clean',
    room: 'whole_home',
    category: 'cleaning',
    description:
      'Full clean between tenants: kitchen including the oven, bathroom descale, windows inside, carpets hoovered and floors mopped.',
    urgency: 'routine',
    access: {
      windows: [{ date: day(-21), slot: 'all_day' }],
      keyAllowed: true,
      notes: 'Keys at the Leask & Ogston office.',
    },
    status: 'confirmed',
    reportedAt: d(-25, '09:00'),
    approved: { at: d(-25, '09:00'), by: aileen },
    chosen: { trade: joanna, at: d(-25, '09:05'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_clean_joanna',
        trade: joanna,
        at: d(-25, '14:00'),
        lines: [
          ['End-of-tenancy clean, two-bedroom flat', 'labour', 1, 18000],
          ['Oven clean', 'labour', 1, 4500],
        ],
        outcome: { status: 'accepted', at: d(-24, '09:30'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_clean_fonthill',
        purpose: 'repair',
        bookedAt: d(-24, '10:00'),
        bookedBy: joanna,
        startsAt: d(-21, '09:00'),
        endsAt: d(-21, '15:00'),
        status: 'done',
        startedAt: d(-21, '09:05'),
        finishedAt: d(-21, '14:30'),
      },
    ],
    completion: {
      at: d(-21, '14:35'),
      pricePence: 22500,
      note: 'All done. The oven came up like new. Photos of every room attached.',
      photos: [
        { slug: 'clean-kitchen-fonthill', alt: 'Spotless kitchen with a gleaming oven door' },
        { slug: 'clean-bathroom-fonthill', alt: 'Descaled bath and shower screen, taps shining' },
        { slug: 'clean-living-fonthill', alt: 'Empty living room with a freshly hoovered carpet' },
        { slug: 'clean-bedroom-fonthill', alt: 'Bare bedroom with clean windows and skirting' },
      ],
    },
    payment: {
      invoicedAt: d(-21, '15:00'),
      dueInDays: 14,
      paid: { at: d(-18, '11:20'), by: 'landlord' },
    },
    confirmed: { at: d(-20, '09:10'), by: aileen },
  },
  {
    id: 'job_pane_queens',
    propertyId: 'property_queens_road',
    tenancyId: 'tenancy_queens',
    reporter: ruaridh,
    reportedAs: 'tenant',
    title: 'Cracked pane in the bedroom window',
    room: 'bedroom',
    category: 'doors_windows_locks',
    description:
      "There's a crack right across the bottom pane of the bedroom window. Not sure how it happened, possibly the cold snap. It's letting a draught in.",
    urgency: 'routine',
    access: { windows: [{ date: '2026-04-16', slot: 'morning' }], keyAllowed: true },
    status: 'confirmed',
    reportedAt: on('2026-04-07', '19:00'),
    approved: { at: on('2026-04-08', '09:15'), by: aileen },
    chosen: { trade: fiona, at: on('2026-04-08', '09:20'), by: aileen, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_pane_fiona',
        trade: fiona,
        at: on('2026-04-08', '16:40'),
        lines: [
          ['Measure up and fit a toughened pane', 'labour', 1, 11500],
          ['Toughened glass pane', 'materials', 1, 6000],
        ],
        outcome: { status: 'accepted', at: on('2026-04-09', '08:50'), by: aileen },
      },
    ],
    visits: [
      {
        id: 'visit_pane_queens',
        purpose: 'repair',
        bookedAt: on('2026-04-09', '09:30'),
        bookedBy: fiona,
        startsAt: on('2026-04-16', '10:00'),
        endsAt: on('2026-04-16', '12:00'),
        status: 'done',
        startedAt: on('2026-04-16', '10:15'),
        finishedAt: on('2026-04-16', '11:40'),
        tenantConfirmedAt: on('2026-04-16', '18:30'),
      },
    ],
    completion: { at: on('2026-04-16', '11:45'), pricePence: 21000 },
    confirmed: { at: on('2026-04-17', '09:00'), by: aileen },
  },
  {
    id: 'job_gas_spital',
    propertyId: 'property_spital',
    tenancyId: 'tenancy_callum_spital',
    reporter: irene,
    reportedAs: 'landlord',
    title: 'Annual gas safety check',
    room: 'whole_home',
    category: 'safety_check',
    description: 'Yearly gas safety record for the boiler and the gas hob.',
    urgency: 'routine',
    complianceType: 'gas_safety',
    credential: { kind: 'gas_safe', applianceCategory: 'boilers' },
    access: { windows: [{ date: '2025-10-09', slot: 'morning' }], keyAllowed: true },
    status: 'confirmed',
    reportedAt: on('2025-09-22', '10:00'),
    approved: { at: on('2025-09-22', '10:00'), by: irene },
    chosen: { trade: mhairi, at: on('2025-09-22', '10:05'), by: irene, route: 'saved_trades' },
    quotes: [
      {
        id: 'quote_gas_spital_mhairi',
        trade: mhairi,
        at: on('2025-09-22', '18:00'),
        lines: [['Gas safety record, up to three appliances', 'labour', 1, 6000]],
        outcome: { status: 'accepted', at: on('2025-09-23', '08:30'), by: irene },
      },
    ],
    visits: [
      {
        id: 'visit_gas_spital',
        purpose: 'safety_check',
        bookedAt: on('2025-09-23', '09:00'),
        bookedBy: mhairi,
        startsAt: on('2025-10-09', '09:00'),
        endsAt: on('2025-10-09', '10:00'),
        status: 'done',
        startedAt: on('2025-10-09', '09:02'),
        finishedAt: on('2025-10-09', '09:50'),
        tenantConfirmedAt: on('2025-10-09', '12:00'),
      },
    ],
    completion: {
      at: on('2025-10-09', '09:55'),
      pricePence: 7200,
      note: 'Boiler and hob both passed. Gas safety record uploaded.',
    },
    confirmed: { at: on('2025-10-09', '14:00'), by: irene },
  },
]

export const JOB_SEEDS: JobSeed[] = [...LIVE, ...HISTORY]
