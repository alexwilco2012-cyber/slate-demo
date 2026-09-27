import { useCallback, useMemo, useState } from 'react'
import { SlateError } from '@/data/api'
import { useSlate, useSlateQuery } from '@/data'
import { skipAhead } from './autopilot'
import { loadStory, storyState, type StepId, type StoryState } from './model'

export interface StoryControls {
  /** Null until the first read has finished. */
  state: StoryState | null
  /** A step is being done by "Skip ahead" or a clock move. */
  busy: boolean
  /** Does `step` for whoever's turn it is. Resolves false, with the reason, if a rule said no. */
  run: (step: StepId) => Promise<{ ok: true } | { ok: false; message: string }>
}

/** The story, kept up to date as anyone in any phone (or this page) changes anything. */
export function useStory(): StoryControls {
  const slate = useSlate()
  const { state: query } = useSlateQuery((api) => loadStory(api, slate.demo.now()), [slate])
  const [busy, setBusy] = useState(false)
  const snapshot = query.data
  const state = useMemo(() => (snapshot ? storyState(snapshot) : null), [snapshot])

  const run = useCallback(
    async (step: StepId) => {
      if (!state) return { ok: false as const, message: 'The story is still loading.' }
      setBusy(true)
      try {
        await skipAhead(slate, step, state)
        return { ok: true as const }
      } catch (error) {
        const message =
          error instanceof SlateError || error instanceof Error
            ? error.message
            : 'That step didn’t go through.'
        return { ok: false as const, message }
      } finally {
        setBusy(false)
      }
    },
    [slate, state],
  )

  return { state, busy, run }
}
