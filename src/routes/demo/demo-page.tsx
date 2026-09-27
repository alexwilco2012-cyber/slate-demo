// /demo: Sarah's, Graham's and Kev's phones side by side, live on the same data, with a guided
// story beside them. This is the page the product owner shows people.

import { useCallback, useRef, useState } from 'react'
import { useSlate } from '@/data'
import { cn } from '@/components/ui/cn'
import { useToast } from '@/components/ui/toast'
import { MAIN_ID, useDocumentTitle } from '@/routes/_shell'
import { CAST, CAST_ORDER, type CastKey } from './cast'
import { DemoHeader } from './components/demo-header'
import { PhoneFrame } from './components/phone-frame'
import { PhoneTabs, panelId, tabId } from './components/phone-tabs'
import { ResetDialog } from './components/reset-dialog'
import { StoryPanel } from './components/story-panel'
import { framePath, navigateFrame, type FrameMap } from './lib/frames'
import { SIDE_BY_SIDE, STORY_RAIL, useMedia } from './lib/use-media'
import { usePings, type Ping } from './lib/use-pings'
import { loadStory, storyState, waitingOn, type StepId } from './story/model'
import { landingPaths, type FrameTarget } from './story/steps'
import { useStory } from './story/use-story'
import './demo.css'

const HOME: Record<CastKey, string> = { tenant: '/tenant', landlord: '/landlord', trade: '/trade' }

export function DemoPage() {
  useDocumentTitle('Live demo')
  const slate = useSlate()
  const toast = useToast()
  const sideBySide = useMedia(SIDE_BY_SIDE)
  const rail = useMedia(STORY_RAIL)
  const { state, busy, run } = useStory()
  const { pings, dismiss } = usePings()
  const [active, setActive] = useState<CastKey>('tenant')
  const [resetOpen, setResetOpen] = useState(false)
  const frames = useRef<FrameMap>({})
  const phones = useRef<HTMLDivElement>(null)

  const waiting = state ? waitingOn(state) : []

  const go = useCallback((key: CastKey, path: string) => {
    const frame = frames.current[key]
    if (framePath(frame) === path.split('#')[0]) return
    navigateFrame(frame, path)
  }, [])

  const show = useCallback(
    (target: FrameTarget) => {
      setActive(target.cast)
      navigateFrame(frames.current[target.cast], target.path)
      if (!sideBySide) phones.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [sideBySide],
  )

  const skip = useCallback(
    async (step: StepId) => {
      const result = await run(step)
      if (!result.ok) {
        toast.error('That step didn’t go through', { description: result.message })
        return
      }
      // Each phone moves to where the story now stands for its person.
      const next = storyState(await loadStory(slate.api, slate.demo.now()))
      const paths = landingPaths(next)
      for (const key of CAST_ORDER) {
        const path = paths[key]
        if (path) go(key, path)
      }
      const turn = waitingOn(next)[0]
      if (turn) setActive(turn)
    },
    [run, toast, slate, go],
  )

  async function reset() {
    try {
      await slate.demo.reset()
      for (const key of CAST_ORDER) navigateFrame(frames.current[key], HOME[key])
      setActive('tenant')
      toast.success('Back to the start', {
        description: 'Every phone is where the story begins.',
      })
    } catch {
      toast.error('The demo couldn’t be reset', { description: 'Reload the page and try again.' })
    }
  }

  function openPing(key: CastKey, ping: Ping) {
    dismiss(key)
    setActive(key)
    navigateFrame(frames.current[key], ping.href)
  }

  const pinged = CAST_ORDER.filter((key) => pings[key] !== undefined)

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh">
      <DemoHeader onReset={() => setResetOpen(true)} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-4 p-4 outline-none sm:gap-5 sm:p-6',
          'lg:overflow-y-auto',
          rail &&
            'grid grid-cols-[minmax(0,24rem)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-8 overflow-hidden p-8',
        )}
      >
        <div className={cn(rail && 'relative min-h-0 overflow-y-auto pr-2 pb-2')}>
          <StoryPanel
            variant={rail ? 'rail' : 'band'}
            state={state}
            busy={busy}
            onShow={show}
            onSkip={(step) => void skip(step)}
            onReset={() => setResetOpen(true)}
          />
        </div>

        <div
          ref={phones}
          className={cn(
            'scroll-mt-20',
            sideBySide
              ? 'grid min-h-[30rem] flex-1 grid-cols-3 gap-5 xl:gap-8'
              : 'flex flex-col gap-3',
            rail && 'h-full min-h-0',
          )}
        >
          {!sideBySide ? (
            <PhoneTabs active={active} onChange={setActive} waiting={waiting} pinged={pinged} />
          ) : null}
          {CAST_ORDER.map((key) => (
            <PhoneFrame
              key={key}
              member={CAST[key]}
              mode={sideBySide ? 'device' : 'fill'}
              turn={waiting.includes(key)}
              ping={pings[key]}
              onPingOpen={(ping) => openPing(key, ping)}
              onPingDismiss={() => dismiss(key)}
              onHome={() => navigateFrame(frames.current[key], HOME[key])}
              frameRef={(element) => {
                frames.current[key] = element
              }}
              hidden={!sideBySide && active !== key}
              panel={sideBySide ? undefined : { id: panelId(key), labelledBy: tabId(key) }}
              className={sideBySide ? undefined : 'h-[calc(100dvh-9rem)] min-h-[34rem]'}
            />
          ))}
        </div>
      </main>
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={reset} />
    </div>
  )
}
