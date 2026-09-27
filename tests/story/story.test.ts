// The guided story on /demo: where it stands is read from the data alone, and "Skip ahead" can
// tell the whole story through SlateApi, ending with every rating revealed together.

import { createLocalSlate, memoryStorage } from '@/data/local'
import { CAST } from '@/routes/demo/cast'
import { skipAhead } from '@/routes/demo/story/autopilot'
import {
  STEP_IDS,
  loadStory,
  storyState,
  waitingOn,
  type StoryState,
} from '@/routes/demo/story/model'
import { landingPaths, stepTarget } from '@/routes/demo/story/steps'

function fresh() {
  return createLocalSlate({ storage: memoryStorage(), channel: null })
}

async function read(slate: ReturnType<typeof fresh>): Promise<StoryState> {
  return storyState(await loadStory(slate.api, slate.demo.now()))
}

describe('the demo story', () => {
  test('starts at Sarah reporting a leak, whatever the seed already holds', async () => {
    const state = await read(fresh())
    expect(state.current).toBe('report')
    expect(state.doneCount).toBe(0)
    expect(waitingOn(state)).toEqual(['tenant'])
    expect(stepTarget('report', state)).toEqual({ cast: 'tenant', path: '/tenant/report' })
  })

  test('Skip ahead tells the whole story, one step at a time, in order', async () => {
    const slate = fresh()
    const seen: string[] = []
    let state = await read(slate)
    for (let guard = 0; state.current && guard < STEP_IDS.length + 2; guard += 1) {
      seen.push(state.current)
      await skipAhead(slate, state.current, state)
      state = await read(slate)
    }
    expect(state.current).toBeNull()
    // The last rating in reveals them all at once, so the reveal needs no step of its own.
    expect(seen).toEqual(STEP_IDS.filter((id) => id !== 'reveal'))

    const job = state.snapshot.job
    expect(job?.status).toBe('confirmed')
    expect(job?.tradeId).toBe(CAST.trade.personId)
    expect(job?.timeline.map((e) => e.kind)).toContain('ratings_revealed')
    expect(state.ratings.every((r) => r.status === 'submitted')).toBe(true)

    // The visit was booked with at least 48 hours' written notice.
    const visit = job?.visits.find((v) => v.purpose === 'repair')
    expect(visit?.notice.hoursGiven).toBeGreaterThanOrEqual(48)
    expect(visit?.notice.emergency).toBe(false)

    // Kev's new reviews are revealed and public; Sarah's rating of Graham stays sealed.
    const fromTenant = await slate.api.listReviews(CAST.landlord.viewer, {
      direction: 'tenant->trade',
      subjectId: CAST.trade.personId,
    })
    expect(
      fromTenant.some((r) => r.comment?.startsWith('In my experience a careful plumber')),
    ).toBe(true)
    const mine = await slate.api.listMyRatings(CAST.tenant.viewer)
    const shielded = mine.find(
      (r) =>
        r.direction === 'tenant->landlord' &&
        r.context.kind === 'job' &&
        r.context.jobId === job?.id,
    )
    expect(shielded?.state).toBe('sealed')
  })

  test('the rating step waits on each person who still owes one', async () => {
    const slate = fresh()
    let state = await read(slate)
    while (state.current && state.current !== 'rate') {
      await skipAhead(slate, state.current, state)
      state = await read(slate)
    }
    expect(waitingOn(state).sort()).toEqual(['landlord', 'tenant', 'trade'])
    expect(stepTarget('rate', state)?.path).toMatch(/\/rate\//)
    const jobId = state.snapshot.job?.id
    expect(landingPaths(state)).toEqual({
      tenant: `/tenant/jobs/${jobId}/rate/trade`,
      landlord: `/landlord/ratings/rate/job/${jobId}/person_kev`,
      trade: `/trade/jobs/${jobId}/rate/tenant`,
    })
  })

  test("if someone never rates, the clock moves to the window's end and reveals the rest", async () => {
    const slate = fresh()
    let state = await read(slate)
    while (state.current && state.current !== 'rate') {
      await skipAhead(slate, state.current, state)
      state = await read(slate)
    }
    // Everyone but Kev rates.
    await skipAhead(slate, 'rate', {
      ...state,
      ratings: state.ratings.filter((r) => r.rater !== 'trade'),
    })
    state = await read(slate)
    expect(state.current).toBe('rate')
    expect(waitingOn(state)).toEqual(['trade'])
    expect(state.status.reveal).toBe('upcoming')

    await skipAhead(slate, 'reveal', state)
    state = await read(slate)
    expect(state.status.reveal).toBe('done')
    expect(state.current).toBeNull()
  })

  test('a declined repair takes the story off track', async () => {
    const slate = fresh()
    let state = await read(slate)
    await skipAhead(slate, 'report', state)
    state = await read(slate)
    const jobId = state.snapshot.job?.id
    if (!jobId) throw new Error('No job')
    await slate.api.declineJob(
      CAST.landlord.viewer,
      jobId,
      'The building factor is sending someone',
    )
    state = await read(slate)
    expect(state.derailed).toBe('declined')
  })

  test('choosing a trade other than Kev stops the story, since only Kev has a phone here', async () => {
    const slate = fresh()
    let state = await read(slate)
    await skipAhead(slate, 'report', state)
    state = await read(slate)
    await skipAhead(slate, 'approve', state)
    const jobId = state.snapshot.job?.id
    if (!jobId) throw new Error('No job')
    await slate.api.chooseTrade(CAST.landlord.viewer, jobId, {
      tradeId: 'person_mhairi',
      route: 'saved_trades',
    })
    state = await read(slate)
    expect(state.derailed).toBe('other_trade')
  })
})
