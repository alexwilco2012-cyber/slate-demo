import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Job, ScaleScore, ScoreSummary as ScoreSummaryData } from '@/domain/types'
import { jobStages } from './job-timeline'
import { PlainWordsScale } from './plain-words-scale'
import { reviewerText } from './review-card'
import { ScoreSummary } from './score-summary'
import { meanWords, scoreWords } from './score-words'

function ScaleHarness() {
  const [value, setValue] = useState<ScaleScore | undefined>()
  return (
    <>
      <PlainWordsScale
        label="Fixed problems quickly"
        scale="judgement"
        value={value}
        onValueChange={setValue}
      />
      <output>{value ?? 'none'}</output>
    </>
  )
}

describe('PlainWordsScale', () => {
  it('shows the five words, never stars, and picks with a click', async () => {
    render(<ScaleHarness />)
    const group = screen.getByRole('radiogroup', { name: 'Fixed problems quickly' })
    expect(group).toBeInTheDocument()
    const options = screen.getAllByRole('radio')
    expect(options.map((option) => option.textContent)).toEqual([
      'Well below',
      'Below',
      'What I expected',
      'Better than expected',
      'Outstanding',
    ])
    await userEvent.click(screen.getByRole('radio', { name: 'Outstanding' }))
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('moves between answers with the arrow keys', async () => {
    render(<ScaleHarness />)
    await userEvent.click(screen.getByRole('radio', { name: 'Below' }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'What I expected' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('stops at the ends instead of wrapping from the best answer to the worst', async () => {
    render(<ScaleHarness />)
    await userEvent.click(screen.getByRole('radio', { name: 'Outstanding' }))
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    expect(screen.getByText('5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Well below' }))
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}')
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('jobStages', () => {
  const job: Pick<Job, 'status' | 'timeline'> = {
    status: 'booked',
    timeline: [
      { id: 'event_1', kind: 'reported', at: '2026-09-21T08:00:00.000Z', actorId: 'person_a' },
      { id: 'event_2', kind: 'approved', at: '2026-09-21T09:00:00.000Z', actorId: 'person_b' },
      {
        id: 'event_3',
        kind: 'visit_booked',
        at: '2026-09-22T09:00:00.000Z',
        actorId: 'person_c',
        visitId: 'visit_1',
      },
    ],
  }

  it('marks done stages, the current one, and what comes next', () => {
    expect(jobStages(job).map((stage) => stage.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('names the stage that stopped a declined job', () => {
    const declined = jobStages({ status: 'declined', timeline: job.timeline.slice(0, 1) })
    expect(declined[1]).toMatchObject({ state: 'stopped', label: 'Declined' })
  })
})

describe('score words', () => {
  it('reads scores on the judgement scale and criteria on their own', () => {
    expect(scoreWords(4.46)).toBe('Outstanding')
    expect(scoreWords(3.44)).toBe('What I expected')
    expect(meanWords('frequency', 4.8)).toBe('Always')
    expect(meanWords('yesPartlyNo', 3.4)).toBe('Partly')
  })

  it('never names a reviewer', () => {
    expect(reviewerText({ role: 'tenant', postcodeDistrict: 'AB10', year: 2025 })).toBe(
      'Verified tenant · AB10 · 2025',
    )
  })
})

describe('ScoreSummary', () => {
  it('shows "New" and no number until three people have reviewed', () => {
    const summary: ScoreSummaryData = {
      score: null,
      reviewCount: 2,
      reviewerCount: 2,
      distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
      criteria: [],
      lastReviewAt: null,
      coverage: { reviewed: 2, completed: 3 },
      relativeBadge: null,
    }
    render(<ScoreSummary summary={summary} direction="landlord->trade" />)
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('2 verified reviews')).toBeInTheDocument()
    expect(screen.getByText(/Reviewed on/)).toHaveTextContent('Reviewed on 2 of 3 completed jobs')
    expect(screen.queryByText('out of 5')).not.toBeInTheDocument()
  })
})
