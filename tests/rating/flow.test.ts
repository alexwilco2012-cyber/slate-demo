// The demo story end to end: Sarah reports a leak, Kev fixes it, everyone rates, and the
// ratings are revealed together, while Sarah's per-repair rating of Graham stays shielded.

import {
  accessGivenForJob,
  landlordScore,
  owedForJob,
  ratingAccess,
  ratingTasksFor,
  submitRating,
  tradeScore,
  type RatingSubmission,
} from '@/domain/rating'
import type { PersonId, Rating, RatingId } from '@/domain/types'
import { JOB, PEOPLE, day, makeJob, makeTenancy, property } from './fixtures'

const owed = owedForJob(makeJob(), property, makeTenancy())

function send(
  ratings: Rating[],
  raterId: PersonId,
  submission: RatingSubmission,
  at: string,
  id: RatingId,
): { ratings: Rating[]; revealed: RatingId[] } {
  const result = submitRating(submission, { raterId, owed, ratings, now: at, newId: id })
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return { ratings: result.value.ratings, revealed: result.value.newlyRevealed }
}

describe('a repair from report to reveal', () => {
  let ratings: Rating[] = []
  const graham = { personId: PEOPLE.graham, role: 'landlord' as const }
  const view = { now: day(10), propertyLandlordId: PEOPLE.graham }

  it('collects sealed ratings from Kev and Sarah', () => {
    ;({ ratings } = send(
      ratings,
      PEOPLE.kev,
      {
        direction: 'trade->landlord',
        context: JOB,
        subjectId: PEOPLE.graham,
        answers: {
          clear_description: 5,
          paid_on_time: 5,
          arranged_access: 4,
          fair_to_deal_with: 5,
        },
      },
      day(1),
      'rating_kev_graham',
    ))
    ;({ ratings } = send(
      ratings,
      PEOPLE.kev,
      {
        direction: 'trade->tenant',
        context: JOB,
        subjectId: PEOPLE.sarah,
        answers: { access_given: 5, felt_safe: 5, clear_information: 4 },
      },
      day(1),
      'rating_kev_sarah',
    ))
    ;({ ratings } = send(
      ratings,
      PEOPLE.sarah,
      {
        direction: 'tenant->trade',
        context: JOB,
        subjectId: PEOPLE.kev,
        answers: { turned_up: 5, respectful: 5, left_tidy: 4, problem_fixed: 5 },
        comment: 'In my experience Kev was quick, careful and left the kitchen spotless.',
      },
      day(2),
      'rating_sarah_kev',
    ))
    ;({ ratings } = send(
      ratings,
      PEOPLE.sarah,
      {
        direction: 'tenant->landlord',
        context: JOB,
        subjectId: PEOPLE.graham,
        answers: { fixed_quickly: 2, kept_informed: 1 },
      },
      day(2),
      'rating_sarah_graham_repair',
    ))

    expect(ratings.every((rating) => rating.state === 'sealed')).toBe(true)
  })

  it('tells Graham that Kev has rated him, without showing what Kev said', () => {
    const [task] = ratingTasksFor(PEOPLE.graham, owed, ratings, day(2, 12))
    expect(task).toMatchObject({ direction: 'landlord->trade', counterpartHasRated: true })
    const fromKev = ratings.find((rating) => rating.id === 'rating_kev_graham')!
    expect(ratingAccess(graham, fromKev, { ...view, now: day(2, 12) })).toBe('none')
  })

  it('reveals every double-blind rating together when Graham sends his', () => {
    let revealed: RatingId[]
    ;({ ratings, revealed } = send(
      ratings,
      PEOPLE.graham,
      {
        direction: 'landlord->trade',
        context: JOB,
        subjectId: PEOPLE.kev,
        answers: {
          properly_fixed: 5,
          price_matched_quote: 5,
          on_time: 4,
          kept_updated: 4,
          right_paperwork: 5,
        },
      },
      day(3),
      'rating_graham_kev',
    ))

    expect(revealed.sort()).toEqual(
      ['rating_graham_kev', 'rating_kev_graham', 'rating_kev_sarah', 'rating_sarah_kev'].sort(),
    )
    const byId = new Map(ratings.map((rating) => [rating.id, rating]))
    for (const id of revealed) expect(byId.get(id)?.revealedAt).toBe(day(3))
    expect(byId.get('rating_sarah_graham_repair')?.state).toBe('sealed')
  })

  it('shows Graham what each party may see', () => {
    const byId = new Map(ratings.map((rating) => [rating.id, rating]))
    expect(ratingAccess(graham, byId.get('rating_kev_graham')!, view)).toBe('review')
    expect(ratingAccess(graham, byId.get('rating_kev_sarah')!, view)).toBe('access_given')
    expect(ratingAccess(graham, byId.get('rating_sarah_kev')!, view)).toBe('review')
    expect(ratingAccess(graham, byId.get('rating_sarah_graham_repair')!, view)).toBe('none')
    expect(accessGivenForJob('job_kitchen_leak', ratings, view.now)).toBe(true)
  })

  it("keeps Sarah's per-repair rating out of Graham's public score", () => {
    const score = landlordScore({
      landlordId: PEOPLE.graham,
      ratings,
      now: day(10),
      platformMean: 4,
    })
    expect(score.reviewCount).toBe(0)
  })

  it('shows Kev as new until three different people have reviewed each half', () => {
    const score = tradeScore({
      tradeId: PEOPLE.kev,
      ratings,
      now: day(10),
      platformMeans: { fromLandlords: 4, fromTenants: 4 },
    })
    expect(score).toMatchObject({
      overall: null,
      fromLandlords: { score: null, reviewCount: 1 },
      fromTenants: { score: null, reviewCount: 1 },
    })
  })
})
