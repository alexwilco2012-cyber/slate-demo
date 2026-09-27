// In-app paths that notifications link to, relative to the router basename. Kept together so the
// routes can change in one place.

import type { JobId, PropertyId, RatingId, Role, TenancyId, ThreadId } from '@/domain/types'

export const hrefs = {
  home: (role: Role) => `/${role}`,
  job: (role: Role, jobId: JobId) => `/${role}/jobs/${jobId}`,
  jobBoard: () => '/trade/board',
  thread: (role: Role, threadId: ThreadId) => `/${role}/messages/${threadId}`,
  tenancy: (role: Role, tenancyId: TenancyId) => `/${role}/tenancies/${tenancyId}`,
  ratings: (role: Role) => `/${role}/ratings`,
  review: (role: Role, ratingId: RatingId) => `/${role}/reviews/${ratingId}`,
  documents: (propertyId?: PropertyId) =>
    propertyId ? `/landlord/homes/${propertyId}/documents` : '/landlord/documents',
  passport: () => '/tenant/passport',
  reports: (role: Role) => `/${role}/reports`,
  profile: (role: Role) => `/${role}/profile`,
  team: () => '/landlord/team',
} as const
