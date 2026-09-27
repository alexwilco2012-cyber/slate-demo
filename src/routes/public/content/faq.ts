// Questions people ask before signing up. Answers are short; the policies hold the detail.

import { BRAND } from '@/config/brand'
import { RATING_RULES } from '@/domain/criteria'

export interface Faq {
  id: string
  question: string
  answer: string
  /** A page with the full story. */
  more?: { to: string; label: string }
}

export const FAQS: Faq[] = [
  {
    id: 'cost',
    question: 'What does it cost?',
    answer:
      'Nothing during launch, for anyone. Tenants never pay. After launch, landlords pay per home they let, and trades choose a monthly subscription or pay per job won. We’ll tell you well before anything changes.',
  },
  {
    id: 'who-rates',
    question: 'Who can leave a rating?',
    answer: `Only people who have worked together on ${BRAND.name}: after a repair is finished, or when a tenancy both sides confirmed comes to an end. Nobody can rate someone they haven’t dealt with.`,
    more: { to: '/policies/reviews#who-can-review', label: 'Who can review' },
  },
  {
    id: 'retaliation',
    question: 'Could my landlord hold a bad rating against me?',
    answer: `What you say about your current landlord after a repair is held back. It’s only released at the end of your tenancy, or in a batch with other tenants’ ratings once they have ${RATING_RULES.shieldReleaseTenantRaters} or more, so nobody can pick yours out.`,
    more: { to: '/policies/reviews#tenants-protected', label: 'How tenants are protected' },
  },
  {
    id: 'unfair',
    question: 'What if a review about me is unfair?',
    answer: `You can post one public reply within ${RATING_RULES.reply.withinDays} days, add a note saying you dispute it, and report it. We never edit reviews to suit either side, and we remove them only for the reasons in our policy.`,
    more: { to: '/policies/reporting', label: 'How reporting works' },
  },
  {
    id: 'who-chooses',
    question: `Does ${BRAND.name} choose which trade does the work?`,
    answer: `No. The landlord or their letting agent always chooses and instructs the trade: from their own list, from the directory, or from quotes on the job board. ${BRAND.name} never assigns or matches work.`,
  },
  {
    id: 'money',
    question: `Does ${BRAND.name} take rent or hold deposits?`,
    answer: `No. ${BRAND.name} never collects rent, holds deposits or pays trades. Deposits stay with one of Scotland’s three approved schemes, and the tenancy shows which one.`,
  },
  {
    id: 'agents',
    question: 'I’m a letting agent. Where do I fit?',
    answer:
      'Letting agents work inside a landlord’s account as part of their team, with the permissions the landlord gives them. There is no separate agent app.',
  },
  {
    id: 'where',
    question: 'Where can I use it?',
    answer:
      'We’re starting in Aberdeen, then the rest of Scotland. England and Wales follow, with their own rules.',
  },
  {
    id: 'demo-data',
    question: 'What happens to what I type in this demo?',
    answer:
      'It stays in your browser. Nothing is sent to a server, the people and places are made up, and “Reset demo data” in the account menu puts everything back.',
    more: { to: '/policies/privacy', label: 'Privacy in the demo' },
  },
]
