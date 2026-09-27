// Two and a half years of ratings in all six directions. Each entry is only what the rater sent
// and when; the seal, window and reveal are worked out by the rating engine when the seed loads,
// so the history always agrees with the rules.
//
// What the history shows:
// - Derek, the landlord with a poor record, scores visibly lower from tenants and from trades
//   ("Paid on time on 0 of 3 jobs").
// - On the radiator job everyone but Graham has rated, Sarah included, so the whole job is still
//   sealed: her rating waits for his, or for his window to close on Saturday 3 October.
// - On Derek's sink waste job only Kev's rating of Derek is still to come; he has 30 days so he
//   can see whether he is paid, and everything on the job waits for it.
// - Niamh has rated Graham at the end of her tenancy; Graham has until Monday night to reply in kind.
// - Three per-repair ratings sit behind the retaliation shield and are never shown on their own.
//   Liam's and Kirsty's of Derek were released together into his score on 1 September, in a
//   monthly batch, because Derek has five or more different tenant raters. Ewan's of Graham is
//   held back entirely, because Graham has four.
// - Graham disputes Rory's review and has replied to it; Derek disputes Sarah's.
// - Derek's review of Sandy is restricted while a defamation report is handled. An earlier review
//   of his, of Connor, was removed after Connor's defamation report went unanswered.
// - Kev has started rating Kirsty for the shower job and saved it as a draft.

import type {
  ContentReport,
  DisputeNote,
  IsoDateTime,
  JobId,
  PassportShare,
  PersonId,
  RatingDirection,
  RatingId,
  RatingUpdate,
  Reply,
  ScaleScore,
  TenancyId,
  WouldAgain,
} from '@/domain/types'
import { reportClock } from '@/domain/rating'
import { d, on } from './time'

export interface RatingFact {
  id: RatingId
  direction: RatingDirection
  on: { job: JobId } | { tenancy: TenancyId }
  rater: PersonId
  subject: PersonId
  /** Criterion id to score, in the relationship's order. */
  answers: Record<string, ScaleScore>
  submittedAt: IsoDateTime
  comment?: string
  privateNote?: string
  wouldAgain?: WouldAgain
}

const sarah = 'person_sarah'
const graham = 'person_graham'
const kev = 'person_kev'
const irene = 'person_irene'
const derek = 'person_derek'
const hannah = 'person_hannah'
const kirsty = 'person_kirsty'
const ewan = 'person_ewan'
const ruaridh = 'person_ruaridh'
const oliver = 'person_oliver'
const callum = 'person_callum'
const liam = 'person_liam'
const beata = 'person_beata'
const mhairi = 'person_mhairi'
const neil = 'person_neil'
const doug = 'person_doug'
const ian = 'person_ian'
const joanna = 'person_joanna'
const craig = 'person_craig'
const sandy = 'person_sandy'
const fiona = 'person_fiona'

// Criterion order, so each rating below reads as one line of scores.
const tenantRatesLandlord = (s: [ScaleScore, ScaleScore, ScaleScore, ScaleScore, ScaleScore]) => ({
  fixed_quickly: s[0],
  kept_informed: s[1],
  home_as_advertised: s[2],
  proper_notice: s[3],
  fair_about_money: s[4],
})
const perRepair = (s: [ScaleScore, ScaleScore]) => ({ fixed_quickly: s[0], kept_informed: s[1] })
const landlordRatesTenant = (s: [ScaleScore, ScaleScore, ScaleScore, ScaleScore, ScaleScore]) => ({
  rent_on_time: s[0],
  looked_after_home: s[1],
  easy_to_reach: s[2],
  allowed_access: s[3],
  left_as_expected: s[4],
})
const landlordRatesTrade = (s: [ScaleScore, ScaleScore, ScaleScore, ScaleScore, ScaleScore]) => ({
  properly_fixed: s[0],
  price_matched_quote: s[1],
  on_time: s[2],
  kept_updated: s[3],
  right_paperwork: s[4],
})
const tradeRatesLandlord = (s: [ScaleScore, ScaleScore, ScaleScore, ScaleScore]) => ({
  clear_description: s[0],
  paid_on_time: s[1],
  arranged_access: s[2],
  fair_to_deal_with: s[3],
})
const tenantRatesTrade = (s: [ScaleScore, ScaleScore, ScaleScore, ScaleScore]) => ({
  turned_up: s[0],
  respectful: s[1],
  left_tidy: s[2],
  problem_fixed: s[3],
})
const tradeRatesTenant = (s: [ScaleScore, ScaleScore, ScaleScore]) => ({
  access_given: s[0],
  felt_safe: s[1],
  clear_information: s[2],
})

// Yes / Partly / No are stored as 5 / 3 / 1.
const YES = 5
const PARTLY = 3

// ─── End of tenancy ──────────────────────────────────────────────────────────────────────────

const TENANCY_RATINGS: RatingFact[] = [
  // Sarah and Irene, Spital, ended March 2024
  {
    id: 'rating_spital_sarah_irene',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_sarah_spital' },
    rater: sarah,
    subject: irene,
    answers: tenantRatesLandlord([5, 5, 4, 5, 5]),
    submittedAt: on('2024-04-06', '20:15'),
    comment:
      'In my experience a fair and responsive landlord. Repairs were sorted within days and the full deposit came back without any fuss.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_spital_irene_sarah',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_sarah_spital' },
    rater: irene,
    subject: sarah,
    answers: landlordRatesTenant([5, 5, 5, 5, 5]),
    submittedAt: on('2024-04-03', '10:00'),
    comment:
      'In my experience an ideal tenant. Rent always arrived on the day and the flat was handed back spotless.',
    wouldAgain: 'yes',
  },

  // Callum and Derek, Rosemount Place, ended February 2024
  {
    id: 'rating_rosemount_callum_derek',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_callum_rosemount' },
    rater: callum,
    subject: derek,
    answers: tenantRatesLandlord([2, 2, 3, 2, 3]),
    submittedAt: on('2024-03-05', '19:00'),
    comment:
      'In my experience repairs were slow and it was hard to get a straight answer, although the rent stayed fair the whole time.',
    wouldAgain: 'no',
  },
  {
    id: 'rating_rosemount_derek_callum',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_callum_rosemount' },
    rater: derek,
    subject: callum,
    answers: landlordRatesTenant([5, 4, 4, 5, 4]),
    submittedAt: on('2024-03-12', '21:00'),
    wouldAgain: 'yes',
  },

  // Rory and Graham, Union Grove, ended July 2024. Graham disputes the boiler part and replied.
  {
    id: 'rating_union_rory_graham',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_rory_union' },
    rater: 'person_rory',
    subject: graham,
    answers: tenantRatesLandlord([3, 3, 4, 5, 4]),
    submittedAt: on('2024-08-10', '20:30'),
    comment:
      'In my experience a decent landlord, but when the boiler failed in February it took nearly three weeks to replace, with only a small heater in the meantime. Everything else was handled well.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_union_graham_rory',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_rory_union' },
    rater: graham,
    subject: 'person_rory',
    answers: landlordRatesTenant([4, 4, 5, 5, 4]),
    submittedAt: on('2024-08-05', '10:00'),
    wouldAgain: 'yes',
  },

  // Grace and Irene, Walker Road, ended December 2024
  {
    id: 'rating_walker_grace_irene',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_grace_walker' },
    rater: 'person_grace',
    subject: irene,
    answers: tenantRatesLandlord([4, 4, 4, 5, 4]),
    submittedAt: on('2025-01-05', '13:00'),
    comment:
      'In my experience a kind landlord who kept the flat in good order. Heating repairs could be a bit slow over the winter.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_walker_irene_grace',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_grace_walker' },
    rater: irene,
    subject: 'person_grace',
    answers: landlordRatesTenant([5, 4, 5, 5, 4]),
    submittedAt: on('2024-12-28', '11:00'),
    wouldAgain: 'yes',
  },

  // Daniel and Irene, Scotstown Road, ended February 2025
  {
    id: 'rating_scotstown_daniel_irene',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_daniel_scotstown' },
    rater: 'person_daniel',
    subject: irene,
    answers: tenantRatesLandlord([5, 4, 5, 5, 4]),
    submittedAt: on('2025-03-08', '15:30'),
    comment:
      'Good house, good landlord. Anything that went wrong was fixed within the week, and she always asked before popping round.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_scotstown_irene_daniel',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_daniel_scotstown' },
    rater: irene,
    subject: 'person_daniel',
    answers: landlordRatesTenant([4, 4, 5, 5, 4]),
    submittedAt: on('2025-03-03', '10:30'),
    wouldAgain: 'yes',
  },

  // Kirsty and Graham, Esslemont Avenue, ended May 2025
  {
    id: 'rating_esslemont_kirsty_graham',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_kirsty_esslemont' },
    rater: kirsty,
    subject: graham,
    answers: tenantRatesLandlord([5, 4, 5, 5, 4]),
    submittedAt: on('2025-05-24', '14:20'),
    comment:
      'In my experience a well-run flat. The agent answered quickly and repairs were usually sorted within the week.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_esslemont_graham_kirsty',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_kirsty_esslemont' },
    rater: graham,
    subject: kirsty,
    answers: landlordRatesTenant([5, 5, 5, 5, 5]),
    submittedAt: on('2025-05-22', '09:40'),
    comment:
      'In my experience a model tenant: rent on time every month and the flat was handed back in lovely condition.',
    wouldAgain: 'yes',
  },

  // Sarah and Derek, Victoria Road, ended May 2025. Derek disputes Sarah's review.
  {
    id: 'rating_victoria_sarah_derek',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_sarah_victoria' },
    rater: sarah,
    subject: derek,
    answers: tenantRatesLandlord([1, 2, 2, 2, 2]),
    submittedAt: on('2025-06-08', '19:30'),
    comment:
      'In my experience repairs took weeks to be looked at, and the damp in the bedroom was never properly dealt with. Messages often went unanswered.',
    privateNote:
      'Deposit deductions were for normal wear and tear; I got most of it back through the scheme.',
    wouldAgain: 'no',
  },
  {
    id: 'rating_victoria_derek_sarah',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_sarah_victoria' },
    rater: derek,
    subject: sarah,
    answers: landlordRatesTenant([5, 3, 4, 5, 3]),
    submittedAt: on('2025-06-20', '22:40'),
    wouldAgain: 'not_sure',
  },

  // Connor and Derek, Rosemount Place, ended May 2025
  {
    id: 'rating_rosemount_connor_derek',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_connor_rosemount' },
    rater: 'person_connor',
    subject: derek,
    answers: tenantRatesLandlord([2, 2, 3, 1, 2]),
    submittedAt: on('2025-06-05', '18:45'),
    comment:
      'In my experience visits happened with little or no warning, which made it hard to feel settled. Repairs were slow, although the flat itself was in reasonable shape.',
    wouldAgain: 'no',
  },
  {
    id: 'rating_rosemount_derek_connor',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_connor_rosemount' },
    rater: derek,
    subject: 'person_connor',
    answers: landlordRatesTenant([4, 2, 3, 4, 1]),
    submittedAt: on('2025-06-25', '20:00'),
    // Removed after Connor's defamation report: see REMOVALS.
    comment:
      'In my experience the flat was left in a poor state at the end, and the carpets in both rooms had to be replaced.',
    wouldAgain: 'no',
  },

  // Megan and Graham, King Street, ended June 2025
  {
    id: 'rating_king_megan_graham',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_megan_king' },
    rater: 'person_megan',
    subject: graham,
    answers: tenantRatesLandlord([5, 5, 5, 5, 5]),
    submittedAt: on('2025-06-19', '17:10'),
    comment:
      'In my experience everything was handled quickly and politely, and the flat was exactly as described.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_king_graham_megan',
    direction: 'landlord->tenant',
    on: { tenancy: 'tenancy_megan_king' },
    rater: graham,
    subject: 'person_megan',
    answers: landlordRatesTenant([5, 5, 4, 5, 5]),
    submittedAt: on('2025-06-18', '09:00'),
    wouldAgain: 'yes',
  },

  // Shona and Derek, Victoria Road, ended March 2026. Derek never rated her; the window closed.
  {
    id: 'rating_victoria_shona_derek',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_shona_victoria' },
    rater: 'person_shona',
    subject: derek,
    answers: tenantRatesLandlord([2, 1, 2, 3, 2]),
    submittedAt: on('2026-03-20', '21:00'),
    comment:
      'In my experience it was very hard to get a reply about anything. The boiler and the damp were ongoing problems the whole time I lived there.',
    wouldAgain: 'no',
  },

  // Niamh and Graham, Fonthill Road, ended August 2026. Sealed: Graham still owes his.
  {
    id: 'rating_fonthill_niamh_graham',
    direction: 'tenant->landlord',
    on: { tenancy: 'tenancy_niamh_fonthill' },
    rater: 'person_niamh',
    subject: graham,
    answers: tenantRatesLandlord([4, 5, 4, 5, 4]),
    submittedAt: d(-16, '20:10'),
    comment:
      'In my experience the agent was quick to answer and fair when the deposit was returned. Small repairs sometimes waited a while, but they always got done.',
    wouldAgain: 'yes',
  },
]

// ─── Repair jobs ─────────────────────────────────────────────────────────────────────────────

const JOB_RATINGS: RatingFact[] = [
  // Leak under the sink, Esslemont Avenue, November 2024
  {
    id: 'rating_sink_graham_kev',
    direction: 'landlord->trade',
    on: { job: 'job_sink_esslemont' },
    rater: graham,
    subject: kev,
    answers: landlordRatesTrade([5, 5, 5, 4, 4]),
    submittedAt: on('2024-11-23', '10:00'),
    comment:
      'In my experience quick to respond and tidy. Sent photos of the fix and the invoice the same day.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_sink_kev_graham',
    direction: 'trade->landlord',
    on: { job: 'job_sink_esslemont' },
    rater: kev,
    subject: graham,
    answers: tradeRatesLandlord([4, 5, 5, 5]),
    submittedAt: on('2024-12-05', '18:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_sink_kirsty_kev',
    direction: 'tenant->trade',
    on: { job: 'job_sink_esslemont' },
    rater: kirsty,
    subject: kev,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: on('2024-11-21', '19:30'),
    comment:
      'Came when he said he would, sorted the leak in under an hour and cleaned up after himself. Could not ask for more.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_sink_kev_kirsty',
    direction: 'trade->tenant',
    on: { job: 'job_sink_esslemont' },
    rater: kev,
    subject: kirsty,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2024-11-21', '12:30'),
  },

  // Sockets tripping, Union Grove, March 2025
  {
    id: 'rating_sockets_graham_neil',
    direction: 'landlord->trade',
    on: { job: 'job_sockets_union' },
    rater: graham,
    subject: neil,
    answers: landlordRatesTrade([5, 5, 4, 5, 5]),
    submittedAt: on('2025-03-09', '11:00'),
    comment:
      'In my experience knowledgeable and straightforward. Found the fault quickly and explained it clearly.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_sockets_neil_graham',
    direction: 'trade->landlord',
    on: { job: 'job_sockets_union' },
    rater: neil,
    subject: graham,
    answers: tradeRatesLandlord([5, 5, 4, 5]),
    submittedAt: on('2025-03-20', '12:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_sockets_ewan_neil',
    direction: 'tenant->trade',
    on: { job: 'job_sockets_union' },
    rater: ewan,
    subject: neil,
    answers: tenantRatesTrade([5, 5, 4, YES]),
    submittedAt: on('2025-03-07', '18:00'),
    wouldAgain: 'yes',
  },
  // Ewan's per-repair rating of Graham, his current landlord. Graham has only four different
  // tenant raters, so the retaliation shield holds it back from his score entirely.
  {
    id: 'rating_sockets_ewan_graham',
    direction: 'tenant->landlord',
    on: { job: 'job_sockets_union' },
    rater: ewan,
    subject: graham,
    answers: perRepair([4, 4]),
    submittedAt: on('2025-03-07', '18:05'),
  },
  {
    id: 'rating_sockets_neil_ewan',
    direction: 'trade->tenant',
    on: { job: 'job_sockets_union' },
    rater: neil,
    subject: ewan,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2025-03-07', '12:00'),
  },

  // Bedroom door, Spital, June 2025
  {
    id: 'rating_door_irene_doug',
    direction: 'landlord->trade',
    on: { job: 'job_door_spital' },
    rater: irene,
    subject: doug,
    answers: landlordRatesTrade([5, 4, 5, 4, 4]),
    submittedAt: on('2025-06-18', '10:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_door_doug_irene',
    direction: 'trade->landlord',
    on: { job: 'job_door_spital' },
    rater: doug,
    subject: irene,
    answers: tradeRatesLandlord([5, 5, 5, 5]),
    submittedAt: on('2025-06-30', '19:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_door_callum_doug',
    direction: 'tenant->trade',
    on: { job: 'job_door_spital' },
    rater: callum,
    subject: doug,
    answers: tenantRatesTrade([4, 5, 5, YES]),
    submittedAt: on('2025-06-17', '20:00'),
    comment:
      'Friendly and careful, and put dust sheets down before he started. The door closes properly for the first time since I moved in.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_door_doug_callum',
    direction: 'trade->tenant',
    on: { job: 'job_door_spital' },
    rater: doug,
    subject: callum,
    // Partly: nobody was in at the agreed time, so the key had to be fetched from the landlord.
    answers: tradeRatesTenant([PARTLY, YES, 4]),
    submittedAt: on('2025-06-16', '13:00'),
  },

  // Bath waste, Victoria Road, January 2025: Kev was still chasing payment three weeks on.
  {
    id: 'rating_bath_derek_kev',
    direction: 'landlord->trade',
    on: { job: 'job_bath_victoria' },
    rater: derek,
    subject: kev,
    answers: landlordRatesTrade([4, 4, 4, 3, 3]),
    submittedAt: on('2025-01-30', '21:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_bath_kev_derek',
    direction: 'trade->landlord',
    on: { job: 'job_bath_victoria' },
    rater: kev,
    subject: derek,
    answers: tradeRatesLandlord([2, 2, 2, 3]),
    submittedAt: on('2025-02-18', '20:00'),
    privateNote: 'Still not paid after three and a half weeks and two reminders.',
    wouldAgain: 'not_sure',
  },
  {
    id: 'rating_bath_sarah_kev',
    direction: 'tenant->trade',
    on: { job: 'job_bath_victoria' },
    rater: sarah,
    subject: kev,
    answers: tenantRatesTrade([5, 5, 4, YES]),
    submittedAt: on('2025-01-25', '10:00'),
    comment:
      'Arrived when he said, explained what had gone wrong and left the bathroom spotless. The leak has not come back.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_bath_kev_sarah',
    direction: 'trade->tenant',
    on: { job: 'job_bath_victoria' },
    rater: kev,
    subject: sarah,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2025-01-24', '12:15'),
  },

  // Cupboard door, Rosemount Place, August 2026. Derek's review of Sandy is under a report.
  {
    id: 'rating_cupboard_derek_sandy',
    direction: 'landlord->trade',
    on: { job: 'job_cupboard_rosemount' },
    rater: derek,
    subject: sandy,
    answers: landlordRatesTrade([1, 2, 2, 1, 2]),
    submittedAt: on('2026-08-23', '22:30'),
    comment:
      'In my experience far too expensive for a cupboard hinge, and the door still was not straight when I checked it.',
    wouldAgain: 'no',
  },
  {
    id: 'rating_cupboard_sandy_derek',
    direction: 'trade->landlord',
    on: { job: 'job_cupboard_rosemount' },
    rater: sandy,
    subject: derek,
    answers: tradeRatesLandlord([3, 1, 3, 2]),
    submittedAt: on('2026-09-15', '18:00'),
    privateNote: 'Still not paid after four weeks, despite the price being agreed in writing.',
    wouldAgain: 'no',
  },
  {
    id: 'rating_cupboard_kirsty_sandy',
    direction: 'tenant->trade',
    on: { job: 'job_cupboard_rosemount' },
    rater: kirsty,
    subject: sandy,
    answers: tenantRatesTrade([5, 5, 4, YES]),
    submittedAt: on('2026-08-20', '19:15'),
    comment: 'Quick, friendly and tidied up after himself. The door closes perfectly now.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_cupboard_kirsty_derek',
    direction: 'tenant->landlord',
    on: { job: 'job_cupboard_rosemount' },
    rater: kirsty,
    subject: derek,
    answers: perRepair([2, 1]),
    submittedAt: on('2026-08-20', '19:25'),
    privateNote: 'Four days before anyone even replied.',
  },
  {
    id: 'rating_cupboard_sandy_kirsty',
    direction: 'trade->tenant',
    on: { job: 'job_cupboard_rosemount' },
    rater: sandy,
    subject: kirsty,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2026-08-19', '20:00'),
  },

  // Boiler pressure, Victoria Road, June 2026. Liam also rated Derek, sealed by the shield.
  {
    id: 'rating_boiler_derek_mhairi',
    direction: 'landlord->trade',
    on: { job: 'job_boiler_victoria' },
    rater: derek,
    subject: mhairi,
    answers: landlordRatesTrade([3, 3, 4, 3, 4]),
    submittedAt: on('2026-07-05', '20:00'),
    wouldAgain: 'not_sure',
  },
  {
    id: 'rating_boiler_mhairi_derek',
    direction: 'trade->landlord',
    on: { job: 'job_boiler_victoria' },
    rater: mhairi,
    subject: derek,
    answers: tradeRatesLandlord([3, 3, 2, 3]),
    submittedAt: on('2026-07-20', '19:30'),
    privateNote:
      'Paid after three weeks. The tenant had been without hot water on and off for a fortnight before I was called.',
    wouldAgain: 'not_sure',
  },
  {
    id: 'rating_boiler_liam_mhairi',
    direction: 'tenant->trade',
    on: { job: 'job_boiler_victoria' },
    rater: liam,
    subject: mhairi,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: on('2026-06-25', '08:15'),
    comment:
      'Explained exactly what had failed and showed me how to keep an eye on the pressure. Hot water has been fine since.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_boiler_mhairi_liam',
    direction: 'trade->tenant',
    on: { job: 'job_boiler_victoria' },
    rater: mhairi,
    subject: liam,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2026-06-24', '19:00'),
  },
  {
    id: 'rating_boiler_liam_derek',
    direction: 'tenant->landlord',
    on: { job: 'job_boiler_victoria' },
    rater: liam,
    subject: derek,
    answers: perRepair([1, 1]),
    submittedAt: on('2026-06-26', '21:40'),
    privateNote: 'Eleven days with no hot water before anyone replied.',
  },

  // Front gutter, Scotstown Road, November 2025
  {
    id: 'rating_gutter_irene_ian',
    direction: 'landlord->trade',
    on: { job: 'job_gutter_scotstown' },
    rater: irene,
    subject: ian,
    answers: landlordRatesTrade([5, 5, 5, 5, 4]),
    submittedAt: on('2025-11-13', '09:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gutter_ian_irene',
    direction: 'trade->landlord',
    on: { job: 'job_gutter_scotstown' },
    rater: ian,
    subject: irene,
    answers: tradeRatesLandlord([5, 5, 5, 5]),
    submittedAt: on('2025-11-28', '17:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gutter_hannah_ian',
    direction: 'tenant->trade',
    on: { job: 'job_gutter_scotstown' },
    rater: hannah,
    subject: ian,
    answers: tenantRatesTrade([5, 5, 4, YES]),
    submittedAt: on('2025-11-12', '19:00'),
    comment:
      'Turned up early, kept us in the loop and swept the path before he left. No more waterfall at the window.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gutter_ian_hannah',
    direction: 'trade->tenant',
    on: { job: 'job_gutter_scotstown' },
    rater: ian,
    subject: hannah,
    answers: tradeRatesTenant([YES, YES, 4]),
    submittedAt: on('2025-11-12', '11:00'),
  },

  // Snapped key, Walker Road, February 2026
  {
    id: 'rating_lockout_irene_craig',
    direction: 'landlord->trade',
    on: { job: 'job_lockout_walker' },
    rater: irene,
    subject: craig,
    answers: landlordRatesTrade([5, 5, 5, 5, 4]),
    submittedAt: on('2026-02-16', '09:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_lockout_craig_irene',
    direction: 'trade->landlord',
    on: { job: 'job_lockout_walker' },
    rater: craig,
    subject: irene,
    answers: tradeRatesLandlord([5, 5, 5, 5]),
    submittedAt: on('2026-02-25', '20:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_lockout_beata_craig',
    direction: 'tenant->trade',
    on: { job: 'job_lockout_walker' },
    rater: beata,
    subject: craig,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: on('2026-02-15', '10:00'),
    comment:
      'Came out late on a freezing night, had me back inside in half an hour and was kind about it too.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_lockout_craig_beata',
    direction: 'trade->tenant',
    on: { job: 'job_lockout_walker' },
    rater: craig,
    subject: beata,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2026-02-15', '08:00'),
  },

  // Toilet cistern, Polmuir Road, May 2026: Hannah's first job as a landlord
  {
    id: 'rating_toilet_hannah_kev',
    direction: 'landlord->trade',
    on: { job: 'job_toilet_polmuir' },
    rater: hannah,
    subject: kev,
    answers: landlordRatesTrade([5, 5, 5, 5, 4]),
    submittedAt: on('2026-05-17', '10:00'),
    comment:
      'In my experience a first-class plumber. Clear price, turned up when he said, and patient with a first-time landlord.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_toilet_kev_hannah',
    direction: 'trade->landlord',
    on: { job: 'job_toilet_polmuir' },
    rater: kev,
    subject: hannah,
    answers: tradeRatesLandlord([4, 5, 5, 5]),
    submittedAt: on('2026-06-01', '19:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_toilet_oliver_kev',
    direction: 'tenant->trade',
    on: { job: 'job_toilet_polmuir' },
    rater: oliver,
    subject: kev,
    answers: tenantRatesTrade([5, 4, 5, YES]),
    submittedAt: on('2026-05-15', '20:30'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_toilet_kev_oliver',
    direction: 'trade->tenant',
    on: { job: 'job_toilet_polmuir' },
    rater: kev,
    subject: oliver,
    answers: tradeRatesTenant([YES, YES, 4]),
    submittedAt: on('2026-05-15', '17:30'),
  },

  // End-of-tenancy clean, Fonthill Road, September 2026
  {
    id: 'rating_clean_graham_joanna',
    direction: 'landlord->trade',
    on: { job: 'job_clean_fonthill' },
    rater: graham,
    subject: joanna,
    answers: landlordRatesTrade([5, 5, 5, 5, 5]),
    submittedAt: d(-20, '09:20'),
    comment:
      'In my experience the most thorough end-of-tenancy clean we have had. Photos of every room were sent at the end.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_clean_joanna_graham',
    direction: 'trade->landlord',
    on: { job: 'job_clean_fonthill' },
    rater: joanna,
    subject: graham,
    answers: tradeRatesLandlord([5, 5, 5, 5]),
    submittedAt: d(-6, '11:00'),
    wouldAgain: 'yes',
  },

  // Cracked pane, Queen's Road, April 2026
  {
    id: 'rating_pane_graham_fiona',
    direction: 'landlord->trade',
    on: { job: 'job_pane_queens' },
    rater: graham,
    subject: fiona,
    answers: landlordRatesTrade([4, 5, 4, 4, 5]),
    submittedAt: on('2026-04-18', '09:30'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_pane_fiona_graham',
    direction: 'trade->landlord',
    on: { job: 'job_pane_queens' },
    rater: fiona,
    subject: graham,
    answers: tradeRatesLandlord([4, 4, 4, 5]),
    submittedAt: on('2026-05-10', '16:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_pane_ruaridh_fiona',
    direction: 'tenant->trade',
    on: { job: 'job_pane_queens' },
    rater: ruaridh,
    subject: fiona,
    answers: tenantRatesTrade([4, 5, 5, YES]),
    submittedAt: on('2026-04-16', '20:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_pane_fiona_ruaridh',
    direction: 'trade->tenant',
    on: { job: 'job_pane_queens' },
    rater: fiona,
    subject: ruaridh,
    answers: tradeRatesTenant([YES, YES, 4]),
    submittedAt: on('2026-04-16', '12:30'),
  },

  // Gas safety check, Spital, October 2025
  {
    id: 'rating_gas_spital_irene_mhairi',
    direction: 'landlord->trade',
    on: { job: 'job_gas_spital' },
    rater: irene,
    subject: mhairi,
    answers: landlordRatesTrade([5, 5, 5, 5, 5]),
    submittedAt: on('2025-10-10', '09:00'),
    comment:
      'In my experience always on time, and the certificate arrives the same day. Could not be easier.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gas_spital_mhairi_irene',
    direction: 'trade->landlord',
    on: { job: 'job_gas_spital' },
    rater: mhairi,
    subject: irene,
    answers: tradeRatesLandlord([5, 5, 5, 5]),
    submittedAt: on('2025-10-24', '18:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gas_spital_callum_mhairi',
    direction: 'tenant->trade',
    on: { job: 'job_gas_spital' },
    rater: callum,
    subject: mhairi,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: on('2025-10-09', '19:00'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_gas_spital_mhairi_callum',
    direction: 'trade->tenant',
    on: { job: 'job_gas_spital' },
    rater: mhairi,
    subject: callum,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2025-10-09', '11:00'),
  },

  // Radiator, Esslemont Avenue, this month. Three of four sent; Graham's is still to come, so
  // everything here, Sarah's rating included, stays sealed until he rates or his window closes.
  {
    id: 'rating_radiator_sarah_mhairi',
    direction: 'tenant->trade',
    on: { job: 'job_radiator_esslemont' },
    rater: sarah,
    subject: mhairi,
    answers: tenantRatesTrade([5, 5, 4, YES]),
    submittedAt: d(-5, '21:05'),
    comment:
      'In my experience friendly and careful. Explained what was wrong with the radiator and how to keep an eye on the boiler.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_radiator_mhairi_graham',
    direction: 'trade->landlord',
    on: { job: 'job_radiator_esslemont' },
    rater: mhairi,
    subject: graham,
    answers: tradeRatesLandlord([5, 4, 5, 5]),
    submittedAt: d(-6, '20:30'),
    wouldAgain: 'yes',
  },
  {
    id: 'rating_radiator_mhairi_sarah',
    direction: 'trade->tenant',
    on: { job: 'job_radiator_esslemont' },
    rater: mhairi,
    subject: sarah,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: d(-8, '19:00'),
  },

  // Sink waste, Victoria Road, three weeks ago. Kev still has to rate Derek, who hasn't paid.
  {
    id: 'rating_waste_derek_kev',
    direction: 'landlord->trade',
    on: { job: 'job_waste_victoria' },
    rater: derek,
    subject: kev,
    answers: landlordRatesTrade([4, 5, 5, 3, 3]),
    submittedAt: d(-1, '23:10'),
    wouldAgain: 'not_sure',
  },
  {
    id: 'rating_waste_liam_kev',
    direction: 'tenant->trade',
    on: { job: 'job_waste_victoria' },
    rater: liam,
    subject: kev,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: on('2026-09-04', '20:00'),
    comment:
      'In my experience quick, tidy and honest. Came when he said, fixed it in under an hour and explained what to do about the cupboard.',
    wouldAgain: 'yes',
  },
  {
    id: 'rating_waste_kev_liam',
    direction: 'trade->tenant',
    on: { job: 'job_waste_victoria' },
    rater: kev,
    subject: liam,
    answers: tradeRatesTenant([YES, YES, 5]),
    submittedAt: on('2026-09-03', '13:00'),
  },

  // Shower, Rosemount Place, this week. Kirsty has rated Kev; Kev has yet to rate her.
  {
    id: 'rating_shower_kirsty_kev',
    direction: 'tenant->trade',
    on: { job: 'job_shower_rosemount' },
    rater: kirsty,
    subject: kev,
    answers: tenantRatesTrade([5, 5, 5, YES]),
    submittedAt: d(-2, '20:00'),
    comment:
      'Booked a time that suited me, fixed it first go and was lovely to deal with. The shower is better than when I moved in.',
    wouldAgain: 'yes',
  },
]

export const RATING_FACTS: RatingFact[] = [...TENANCY_RATINGS, ...JOB_RATINGS]

/** Started and saved, not sent. Only the rater ever sees a draft. */
export interface DraftFact {
  id: RatingId
  direction: RatingDirection
  on: { job: JobId } | { tenancy: TenancyId }
  rater: PersonId
  subject: PersonId
  answers: Record<string, ScaleScore>
  savedAt: IsoDateTime
}

export const DRAFTS: DraftFact[] = [
  // Kev answered the first question in the van after the shower job, then got called away.
  {
    id: 'rating_shower_kev_kirsty',
    direction: 'trade->tenant',
    on: { job: 'job_shower_rosemount' },
    rater: kev,
    subject: kirsty,
    answers: { access_given: YES },
    savedAt: d(-3, '16:05'),
  },
]

// ─── Replies, updates, disputes, reports and passport shares ────────────────────────────────

export const REPLIES: Reply[] = [
  {
    id: 'reply_graham_union',
    ratingId: 'rating_union_rory_graham',
    authorId: graham,
    body: 'Thanks for this. Our records show the new boiler was fitted nine days after the old one failed, not three weeks, and two heaters were dropped off that first evening. We should still have kept you better informed while the part was on order, and we now have a heating engineer on a standing arrangement.',
    postedAt: on('2024-08-19', '09:30'),
    state: 'published',
  },
]

export const UPDATES: RatingUpdate[] = [
  {
    id: 'update_kirsty_sink',
    ratingId: 'rating_sink_kirsty_kev',
    authorId: kirsty,
    body: 'Update: six months on and the cupboard is still bone dry. Would book again without a second thought.',
    postedAt: on('2025-05-02', '18:00'),
    state: 'published',
  },
]

export const DISPUTES: DisputeNote[] = [
  {
    id: 'dispute_graham_union',
    ratingId: 'rating_union_rory_graham',
    authorId: graham,
    createdAt: on('2024-08-19', '09:25'),
  },
  {
    id: 'dispute_derek_victoria',
    ratingId: 'rating_victoria_sarah_derek',
    authorId: derek,
    createdAt: on('2025-06-21', '09:12'),
  },
]

const reportedAt = d(-4, '10:30')
const connorReportedAt = on('2025-06-27', '18:20')

export const REPORTS: ContentReport[] = [
  {
    id: 'report_sandy_cupboard',
    reporterId: sandy,
    target: { kind: 'rating', ratingId: 'rating_cupboard_derek_sandy' },
    route: 'defamation',
    details:
      "This review says I overcharged and left the door squint. The price was agreed in writing before I started, and the tenant confirmed the door closes properly. It's damaging my business.",
    submittedAt: reportedAt,
    status: 'in_review',
    clocks: [{ ...reportClock('defamation', reportedAt), metAt: d(-3, '09:15') }],
  },
  {
    id: 'report_connor_rosemount',
    reporterId: 'person_connor',
    target: { kind: 'rating', ratingId: 'rating_rosemount_derek_connor' },
    route: 'defamation',
    details:
      'This says I left the flat in a poor state and the carpets had to be replaced. They were already worn on the check-in inventory, and the deposit scheme gave me my whole deposit back.',
    submittedAt: connorReportedAt,
    status: 'resolved',
    clocks: [{ ...reportClock('defamation', connorReportedAt), metAt: on('2025-06-30', '09:40') }],
    outcome: {
      decidedAt: on('2025-07-07', '09:00'),
      action: 'removed',
      note: "The reviewer was told about the report on 30 June and didn't respond within five days, so the review was removed.",
    },
  },
]

/** The rating a report has restricted while it is handled. */
export const RESTRICTIONS: {
  ratingId: RatingId
  reportId: ContentReport['id']
  since: IsoDateTime
}[] = [
  { ratingId: 'rating_cupboard_derek_sandy', reportId: 'report_sandy_cupboard', since: reportedAt },
]

/** Ratings taken down after a report was upheld. Scores are worked out without them. */
export const REMOVALS: {
  ratingId: RatingId
  reportId: ContentReport['id']
  at: IsoDateTime
}[] = [
  {
    ratingId: 'rating_rosemount_derek_connor',
    reportId: 'report_connor_rosemount',
    at: on('2025-07-07', '09:00'),
  },
]

export const PASSPORT_SHARES: PassportShare[] = [
  {
    id: 'share_sarah_esslemont',
    tenantId: sarah,
    token: 'p8Kq2vRm7TzW4hXeN3sD',
    label: 'For the flat on Esslemont Avenue',
    createdAt: on('2025-05-12', '20:30'),
    expiresAt: on('2025-06-11', '20:30'),
    views: [
      {
        viewedAt: on('2025-05-13', '09:12'),
        viewerId: 'person_aileen',
        viewerLabel: 'Signed-in letting agent',
      },
      {
        viewedAt: on('2025-05-14', '16:40'),
        viewerId: 'person_aileen',
        viewerLabel: 'Signed-in letting agent',
      },
    ],
  },
  {
    id: 'share_callum_fonthill',
    tenantId: callum,
    token: 'Xr4nB8vLq2MzT6wYk9Fc',
    label: 'For the flat on Fonthill Road',
    createdAt: d(-8, '21:15'),
    expiresAt: d(22, '21:15'),
    views: [
      {
        viewedAt: d(-7, '10:02'),
        viewerId: 'person_aileen',
        viewerLabel: 'Signed-in letting agent',
      },
      {
        viewedAt: d(-7, '10:05'),
        viewerId: 'person_aileen',
        viewerLabel: 'Signed-in letting agent',
      },
      { viewedAt: d(-4, '19:48'), viewerLabel: 'Someone with the link' },
    ],
  },
]
