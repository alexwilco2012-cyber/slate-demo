// The engine's types line up with the data layer's, so src/data can pass results straight
// through. These checks happen at compile time (npx tsc -b); the tests just run the code.

import type { RatingInput, RatingTask, TextCheck, Viewer } from '@/data/api'
import {
  checkText,
  owedForJob,
  ratingTasksFor,
  submitRating,
  type RatingSubmission,
  type RatingViewer,
} from '@/domain/rating'
import { JOB, PEOPLE, day, makeJob, makeTenancy, property } from './fixtures'

describe('engine and data layer types', () => {
  it('returns a filter result the data layer can hand back as a TextCheck', () => {
    const check: TextCheck = checkText('Call 07700 900123.')
    expect(check.blocked).toBe(true)
  })

  it('accepts the data layer rating input and viewer as they are', () => {
    const input: RatingInput<'landlord->trade'> = {
      direction: 'landlord->trade',
      context: JOB,
      subjectId: PEOPLE.kev,
      answers: {
        properly_fixed: 4,
        price_matched_quote: 4,
        on_time: 4,
        kept_updated: 4,
        right_paperwork: 4,
      },
    }
    const submission: RatingSubmission<'landlord->trade'> = input
    const viewer: Viewer = { personId: PEOPLE.graham, role: 'landlord' }
    const asRatingViewer: RatingViewer = viewer
    const owed = owedForJob(makeJob(), property, makeTenancy())
    const result = submitRating(submission, {
      raterId: asRatingViewer.personId,
      owed,
      ratings: [],
      now: day(4),
      newId: 'rating_contract',
    })
    expect(result.ok).toBe(true)
  })

  it('produces rating tasks in the data layer shape', () => {
    const owed = owedForJob(makeJob(), property, makeTenancy())
    const tasks: RatingTask[] = ratingTasksFor(PEOPLE.graham, owed, [], day(4))
    expect(tasks).toHaveLength(1)
  })
})
