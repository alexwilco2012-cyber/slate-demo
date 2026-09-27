// What the public site says to each party: the three doors, the "how it works for you" sections on
// the front page, and the longer walkthroughs at /how-it-works/:role.

import { BRAND } from '@/config/brand'
import type { PersonId } from '@/domain/ids'
import type { RatingDirection } from '@/domain/criteria'
import type { Role } from '@/domain/types'

export interface Step {
  title: string
  body: string
}

/** One way ratings touch this party: what they rate, or what is said about them and who sees it. */
export interface RatingLink {
  direction: RatingDirection
  /** Who sees it, in plain words. */
  seenBy: string
}

export interface RoleStory {
  role: Role
  /** The door on the front page: "I rent". */
  door: string
  doorLine: string
  /** Three short reasons under the door. */
  doorPoints: [string, string, string]
  /** Anchor of the front-page section, e.g. "for-tenants". */
  sectionId: string
  /** "tenants", for "How it works for tenants". */
  plural: string
  /** "a tenant", for "Sign up as a tenant". */
  singular: string
  heading: string
  intro: string
  steps: Step[]
  /** The longer walkthrough at /how-it-works/:role. */
  walkthrough: { heading: string; intro: string; steps: Step[] }
  youRate: RatingLink[]
  ratedBy: RatingLink[]
  persona: { personId: PersonId; name: string; situation: string }
}

export const ROLE_STORIES: Record<Role, RoleStory> = {
  tenant: {
    role: 'tenant',
    door: 'I rent',
    doorLine: 'Report a repair in a minute and see who is coming, and when.',
    doorPoints: [
      'Report once, then follow every step',
      '48 hours’ notice before any visit',
      'A record that speaks for you when you move',
    ],
    sectionId: 'for-tenants',
    plural: 'tenants',
    singular: 'a tenant',
    heading: 'Report it once. Watch it get fixed.',
    intro:
      'No more chasing. Your repair, the messages about it and the visit dates live in one place your landlord sees too.',
    steps: [
      {
        title: 'Report it in a minute',
        body: 'Say which room and what’s wrong, add photos, and choose when someone can get in.',
      },
      {
        title: 'See it moving',
        body: 'Your landlord approves it, chooses a trade and books a visit. Each step shows with its date.',
      },
      {
        title: 'Proper notice, in writing',
        body: 'Visits need 48 hours’ written notice unless it’s an emergency. It sits in the thread.',
      },
      {
        title: 'Rate, and be rated fairly',
        body: 'Once it’s fixed, rate the trade. What you say about your landlord is protected while you live there.',
      },
    ],
    walkthrough: {
      heading: 'A repair, start to finish',
      intro:
        'Sarah rents a top-floor tenement flat in Rosemount. This is what happens when the radiator valve in her hall starts leaking.',
      steps: [
        {
          title: 'She reports it',
          body: 'One question per screen: the room, the problem, a photo or two, how urgent it is and when she’s in. It takes about a minute.',
        },
        {
          title: 'Her landlord approves it',
          body: 'Graham sees it at the top of his home screen and approves it. Sarah gets a note straight away, not a week later.',
        },
        {
          title: 'A plumber is booked, with notice',
          body: 'Graham chooses Kev, a plumber he trusts. The visit is booked with written notice in the thread, at least 48 hours ahead.',
        },
        {
          title: 'The work is done',
          body: 'Sarah confirms Kev came and the leak has stopped. If it hasn’t, she says so and the job stays open.',
        },
        {
          title: 'Everyone rates, then it’s revealed',
          body: 'Sarah rates Kev and Kev rates the visit. Nobody sees what the other said until both are in or the window closes.',
        },
      ],
    },
    youRate: [
      { direction: 'tenant->trade', seenBy: 'Public on the trade’s profile' },
      {
        direction: 'tenant->landlord',
        seenBy: 'Public, but held back until your tenancy ends or it can’t be traced to you',
      },
    ],
    ratedBy: [
      {
        direction: 'landlord->tenant',
        seenBy: 'Your tenant passport. Never public; you choose who sees it',
      },
      {
        direction: 'trade->tenant',
        seenBy: 'Only you. Your landlord sees only whether access was given',
      },
    ],
    persona: {
      personId: 'person_sarah',
      name: 'Sarah',
      situation: 'Rents in Rosemount, with a damp patch reported this morning',
    },
  },
  landlord: {
    role: 'landlord',
    door: 'I let',
    doorLine: 'Approve repairs, choose trades and keep every certificate on time.',
    doorPoints: [
      'What needs you, first thing',
      'You always choose the trade',
      'Certificates tracked with reminders',
    ],
    sectionId: 'for-landlords',
    plural: 'landlords',
    singular: 'a landlord',
    heading: 'Everything that needs you, in one list.',
    intro:
      'Whether you let one flat or twenty, your home screen starts with what needs a decision, then your homes.',
    steps: [
      {
        title: 'Decide in one place',
        body: 'Repairs to approve, quotes to compare and certificates due, at the top of your home screen.',
      },
      {
        title: 'You choose the trade',
        body: `Pick from your own trades, the directory, or quotes on the job board. ${BRAND.name} never assigns work.`,
      },
      {
        title: 'Certificates on time',
        body: 'Gas safety, EICR, EPC, alarms and registration in one calendar, with reminders well before they lapse.',
      },
      {
        title: 'Built for one home too',
        body: `71% of Scottish landlords let a single home. ${BRAND.name} is useful to you from the first day.`,
      },
    ],
    walkthrough: {
      heading: `A week on ${BRAND.name}`,
      intro:
        'Graham lets six homes across Aberdeen with help from his letting agent. This is how a normal week goes.',
      steps: [
        {
          title: 'He opens his home screen',
          body: 'Actions needed comes first: a damp ceiling to approve, quotes to compare and an alarm check that has lapsed.',
        },
        {
          title: 'He approves the repair',
          body: 'He reads Sarah’s report and photos and approves it. Sarah is told straight away.',
        },
        {
          title: 'He chooses who does it',
          body: 'He instructs a trade he has used before, or posts the job for quotes and compares them side by side.',
        },
        {
          title: 'His agent can help',
          body: 'Aileen, his letting agent, works inside his account with the permissions he gives her. No separate system.',
        },
        {
          title: 'His paperwork stays in date',
          body: 'The compliance calendar shows every certificate and when it runs out, with 60 days’ warning.',
        },
      ],
    },
    youRate: [
      { direction: 'landlord->trade', seenBy: 'Public on the trade’s profile' },
      {
        direction: 'landlord->tenant',
        seenBy: 'The tenant’s passport. Never public; they choose who sees it',
      },
    ],
    ratedBy: [
      { direction: 'tenant->landlord', seenBy: 'Public on your profile and your homes’ pages' },
      {
        direction: 'trade->landlord',
        seenBy: 'Trades only, on your client profile. You see your own',
      },
    ],
    persona: {
      personId: 'person_graham',
      name: 'Graham',
      situation: 'Six homes, two repairs to approve and quotes to compare',
    },
  },
  trade: {
    role: 'trade',
    door: 'I’m a trade',
    doorLine: 'Win work nearby, get access sorted, and see how a client pays.',
    doorPoints: [
      'Jobs in the areas you cover',
      'Quotes from your saved line items',
      'Rate your customers, finally',
    ],
    sectionId: 'for-trades',
    plural: 'trades',
    singular: 'a trade',
    heading: 'Know the client before you quote.',
    intro:
      'Find jobs near you, quote in a few taps, and see how a landlord treats trades before you commit a morning to them.',
    steps: [
      {
        title: 'Find work nearby',
        body: 'Jobs posted for quotes in the areas you cover. Gas and electrical work only reaches the right credentials.',
      },
      {
        title: 'Quote quickly',
        body: 'Build a quote from your saved line items. Only the landlord sees your price.',
      },
      {
        title: 'Access arranged for you',
        body: 'The landlord arranges access and tells the tenant, with 48 hours’ notice built in.',
      },
      {
        title: 'Rate your customers',
        body: 'Clear brief, paid on time, fair to deal with. Other trades see it before they quote.',
      },
    ],
    walkthrough: {
      heading: 'A day on the tools',
      intro: `Kev is a plumber and sole trader in Aberdeen. This is how ${BRAND.name} fits around a working day.`,
      steps: [
        {
          title: 'He checks the board',
          body: 'Two new plumbing jobs in the areas he covers. Each shows the client’s record with trades before he quotes.',
        },
        {
          title: 'He quotes from his phone',
          body: 'Saved line items for call-out, labour and parts. Big buttons, no dropdowns, readable in daylight.',
        },
        {
          title: 'He’s instructed, then books',
          body: 'The landlord gives the go-ahead. Kev books a time and the tenant gets written notice.',
        },
        {
          title: 'He finishes and invoices',
          body: `He marks the job done with photos and sends the invoice. ${BRAND.name} tracks whether it’s paid on time; it never handles the money.`,
        },
        {
          title: 'He rates the client',
          body: 'He rates the landlord on the brief, payment and access. It shows once the landlord’s rating of him is locked in.',
        },
      ],
    },
    youRate: [
      {
        direction: 'trade->landlord',
        seenBy: 'Other trades, on the landlord’s client profile',
      },
      {
        direction: 'trade->tenant',
        seenBy: 'Only the tenant. Safety concerns go to our moderators',
      },
    ],
    ratedBy: [
      {
        direction: 'landlord->trade',
        seenBy: 'Public, as the “From landlords” half of your score',
      },
      { direction: 'tenant->trade', seenBy: 'Public, as the “From tenants” half of your score' },
    ],
    persona: {
      personId: 'person_kev',
      name: 'Kev',
      situation: 'Plumber on a job in Torry, with new work on the board',
    },
  },
}
