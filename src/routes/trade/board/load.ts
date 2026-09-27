// Reads for the job board and a single post.

import type {
  JobBoardFilter,
  JobBoardPost,
  PublicHome,
  PublicLandlordProfile,
  SlateApi,
  Viewer,
} from '@/data'
import type {
  ClientRating,
  JobId,
  Person,
  PersonCard,
  PersonId,
  PropertyType,
  Quote,
  SavedLineItem,
} from '@/domain/types'

/**
 * What kind of home a post is in. Posts carry only the area, so this matches the landlord's
 * public homes in that area, and says nothing if more than one kind of home could be meant.
 */
export function propertyTypeFor(
  post: Pick<JobBoardPost, 'neighbourhood' | 'postcodeDistrict'>,
  homes: readonly PublicHome[],
): PropertyType | undefined {
  const types = new Set(
    homes
      .filter(
        (home) =>
          home.neighbourhood === post.neighbourhood &&
          home.postcodeDistrict === post.postcodeDistrict,
      )
      .map((home) => home.type),
  )
  return types.size === 1 ? [...types][0] : undefined
}

export interface BoardData {
  posts: JobBoardPost[]
  landlords: Record<PersonId, PublicLandlordProfile>
  /** The trade's own open quote totals, by job. */
  myTotals: Record<string, number>
}

export async function loadBoard(
  api: SlateApi,
  viewer: Viewer,
  filter: JobBoardFilter,
): Promise<BoardData> {
  const posts = await api.listJobBoard(viewer, filter)
  const landlordIds = [...new Set(posts.map((post) => post.landlordId))]
  const [profiles, quotes] = await Promise.all([
    Promise.all(landlordIds.map((id) => api.getLandlordProfile(viewer, id))),
    Promise.all(
      posts.filter((post) => post.myQuoteId).map((post) => api.listQuotes(viewer, post.jobId)),
    ),
  ])
  const landlords: Record<PersonId, PublicLandlordProfile> = {}
  landlordIds.forEach((id, index) => {
    const profile = profiles[index]
    if (profile) landlords[id] = profile
  })
  const myTotals: Record<string, number> = {}
  for (const quote of quotes.flat()) {
    if (quote.status === 'submitted') myTotals[quote.jobId] = quote.totalPence
  }
  return { posts, landlords, myTotals }
}

export interface PostData {
  post: JobBoardPost
  landlord: PersonCard | undefined
  client: ClientRating | undefined
  propertyType: PropertyType | undefined
  quotes: Quote[]
  saved: SavedLineItem[]
  me: Person
}

export async function loadPost(
  api: SlateApi,
  viewer: Viewer,
  jobId: JobId,
): Promise<PostData | null> {
  const post = await api.getJobBoardPost(viewer, jobId)
  if (!post) return null
  const [profile, quotes, saved, me] = await Promise.all([
    api.getLandlordProfile(viewer, post.landlordId),
    api.listQuotes(viewer, jobId),
    api.listSavedLineItems(viewer),
    api.getMe(viewer),
  ])
  return {
    post,
    landlord: profile?.landlord,
    client: profile?.clientRating ?? undefined,
    propertyType: profile ? propertyTypeFor(post, profile.homes) : undefined,
    quotes,
    saved,
    me,
  }
}
