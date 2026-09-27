import type { Role } from '@/domain/types'

export interface Plan {
  role: Role
  name: string
  /** What it costs now, during launch. */
  now: string
  nowNote: string
  /** What we intend to charge afterwards, or null for never. */
  later: string | null
  features: string[]
}

/** Intended prices after launch. Nothing is charged during launch (SPEC §7). */
export const PLANS: Plan[] = [
  {
    role: 'tenant',
    name: 'Tenants',
    now: '£0',
    nowNote: 'always',
    later: null,
    features: [
      'Report and follow repairs',
      'Messages, notices and documents',
      'Your tenant passport, shared on your terms',
    ],
  },
  {
    role: 'landlord',
    name: 'Landlords',
    now: '£0',
    nowNote: 'during launch',
    later: 'Then from £4 per home a month',
    features: [
      'Repairs, trades and quotes in one place',
      'Compliance calendar with reminders',
      'Team access for your letting agent',
    ],
  },
  {
    role: 'trade',
    name: 'Trades',
    now: '£0',
    nowNote: 'during launch',
    later: 'Then from £15 a month, or from £6 per job won',
    features: [
      'Jobs posted in the areas you cover',
      'Quotes from your saved line items',
      'Rate your customers',
    ],
  },
]

export function planFor(role: Role): Plan {
  const plan = PLANS.find((candidate) => candidate.role === role)
  if (!plan) throw new Error(`No plan for ${role}`)
  return plan
}
