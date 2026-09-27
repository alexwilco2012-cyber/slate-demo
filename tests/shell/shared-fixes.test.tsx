// Fixes to shared pieces that several areas asked for: list markup and heading levels on the
// rating components, one time format, radio groups that stay controlled, checkbox errors, and
// focus landing on a page whose code loads late.

import { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import type { ScaleScore } from '@/domain/types'
import { Checkbox } from '@/components/ui/checkbox'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatTime } from '@/components/slate/format'
import { PassportCard } from '@/components/slate/passport-card'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { ReviewCard } from '@/components/slate/review-card'
import { ScoreSummary } from '@/components/slate/score-summary'
import { MAIN_ID, RouteChangeEffects } from '@/routes/_shell/route-effects'
import { landlordScore, passportLines, reviewOfTrade } from '@/routes/dev/gallery-data'

describe('ReviewCard', () => {
  it('keeps each question and answer directly inside one wrapper of the list', () => {
    const { container } = render(<ReviewCard review={reviewOfTrade} />)
    const list = container.querySelector('dl')
    expect(list).not.toBeNull()
    for (const group of Array.from(list?.children ?? [])) {
      expect(group.tagName).toBe('DIV')
      const tags = Array.from(group.children).map((child) => child.tagName)
      expect(tags[0]).toBe('DT')
      expect(tags.slice(1).every((tag) => tag === 'DD')).toBe(true)
    }
  })

  it('reads the reviewer as one phrase with a single dot', () => {
    render(<ReviewCard review={reviewOfTrade} headingLevel="h2" />)
    const heading = screen.getByRole('heading', { level: 2 })
    const spoken = Array.from(heading.querySelectorAll('span:not([aria-hidden="true"])'))
      .filter((span) => span.children.length === 0)
      .map((span) => span.textContent)
      .join('')
    expect(spoken).toContain(' · ')
    expect(heading.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('·')
  })
})

describe('heading levels', () => {
  it('gives the breakdown the title’s level when there is no title', () => {
    render(<ScoreSummary summary={landlordScore} direction="tenant->landlord" headingLevel="h4" />)
    expect(screen.getByRole('heading', { name: 'How reviews spread', level: 4 })).toBeVisible()
    expect(screen.queryByRole('heading', { level: 5 })).toBeNull()
  })

  it('lets the passport sit under a page heading as an h2', () => {
    render(<PassportCard landlordCount={2} lines={passportLines} headingLevel="h2" />)
    expect(screen.getByRole('heading', { name: 'Tenant passport', level: 2 })).toBeVisible()
  })
})

describe('formatTime', () => {
  it('writes times the same way everywhere: 9am, 12pm, 2:30pm', () => {
    expect(formatTime('2026-09-29T08:00:00.000Z')).toBe('9am')
    expect(formatTime('2026-09-29T11:00:00.000Z')).toBe('12pm')
    expect(formatTime('2026-09-29T13:30:00.000Z')).toBe('2:30pm')
    expect(formatTime('2026-12-01T00:05:00.000Z')).toBe('12:05am')
  })
})

describe('radio groups with nothing chosen yet', () => {
  function Harness() {
    const [scale, setScale] = useState<ScaleScore | undefined>()
    const [size, setSize] = useState<'small' | 'large' | undefined>()
    return (
      <>
        <PlainWordsScale
          label="Kept me updated"
          scale="judgement"
          value={scale}
          onValueChange={setScale}
        />
        <SegmentedControl
          label="Size"
          options={[
            { value: 'small', label: 'Small' },
            { value: 'large', label: 'Large' },
          ]}
          value={size}
          onValueChange={setSize}
        />
      </>
    )
  }

  it('stay controlled from the start, so the first choice logs no warning', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<Harness />)
    await userEvent.click(screen.getByRole('radio', { name: 'Outstanding' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Large' }))
    expect(screen.getByRole('radio', { name: 'Outstanding' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true')
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})

describe('Checkbox error', () => {
  function Harness() {
    const [ticked, setTicked] = useState(false)
    return (
      <Checkbox
        label="I’m 18 or over"
        checked={ticked}
        onCheckedChange={setTicked}
        error={ticked ? undefined : 'Tick the box to carry on.'}
      />
    )
  }

  it('marks the box invalid, links the message, and keeps focus as the error clears', async () => {
    render(<Harness />)
    const box = screen.getByRole('checkbox', { name: 'I’m 18 or over' })
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('Tick the box to carry on.')
    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
    expect(box).not.toHaveAttribute('aria-invalid')
    expect(box).toHaveFocus()
    expect(screen.queryByText('Tick the box to carry on.')).toBeNull()
  })
})

describe('focus after moving page', () => {
  /** Stands in for a page whose code is still downloading: its main content arrives later. */
  function LatePage() {
    const [ready, setReady] = useState(false)
    useEffect(() => {
      const timer = setTimeout(() => setReady(true), 60)
      return () => clearTimeout(timer)
    }, [])
    return ready ? (
      <main id={MAIN_ID} tabIndex={-1}>
        Arrived
      </main>
    ) : null
  }

  it('waits for a late page’s main content, then focuses it', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteChangeEffects />
        <Routes>
          <Route path="/" element={<Link to="/later">Go</Link>} />
          <Route path="/later" element={<LatePage />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('link', { name: 'Go' }))
    const main = await screen.findByRole('main')
    await waitFor(() => expect(main).toHaveFocus())
  })
})
