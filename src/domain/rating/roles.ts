// The two roles in each rating direction, e.g. 'tenant->landlord' is a tenant rating a landlord.

import type { RatingDirection } from '@/domain/criteria'
import type { Role } from '@/domain/types'

const DIRECTION_ROLES = {
  'tenant->landlord': ['tenant', 'landlord'],
  'landlord->tenant': ['landlord', 'tenant'],
  'landlord->trade': ['landlord', 'trade'],
  'trade->landlord': ['trade', 'landlord'],
  'tenant->trade': ['tenant', 'trade'],
  'trade->tenant': ['trade', 'tenant'],
} as const satisfies Record<RatingDirection, readonly [Role, Role]>

/** The role doing the rating: 'tenant' for 'tenant->landlord'. */
export function raterRole(direction: RatingDirection): Role {
  return DIRECTION_ROLES[direction][0]
}

/** The role being rated: 'landlord' for 'tenant->landlord'. */
export function subjectRole(direction: RatingDirection): Role {
  return DIRECTION_ROLES[direction][1]
}
