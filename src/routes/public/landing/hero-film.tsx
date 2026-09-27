// The hero's film: fifteen seconds in three chapters (docs/LANDING_BRIEF.md §3). It plays the
// real video when public/media/hero.mp4 exists, and a drawn Aberdeen terrace until then. Either
// way the chapter titles are real text on a solid plate, the product cards change with them, and
// a Pause button stops everything (WCAG 2.2.2).

import { useEffect, useRef, useState, type RefObject } from 'react'
import { preload } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { PauseIcon, PlayIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { CHAPTER_CARDS } from './hero-cards'
import { HeroScene } from './hero-scene'
import {
  CHAPTER_SECONDS,
  FILM_SECONDS,
  HERO_POSTER,
  HERO_VIDEO,
  prefersSaveData,
  useMediaExists,
} from './media'

const CHAPTERS = [
  'A drip in Rosemount',
  'Three people, one record',
  'Rated fairly, revealed together',
] as const

const FILM_DESCRIPTION =
  'A short film in three chapters. Sarah reports a leaking radiator valve in her flat in Rosemount, Aberdeen. Graham, her landlord, approves it and chooses Kev, a plumber, who books a visit with written notice and fixes it. Then Sarah and Kev rate each other in plain words, and both ratings are revealed together.'

/** Whether an element is at least partly on screen. Assumes it is where that can't be observed. */
function useOnScreen(ref: RefObject<Element | null>) {
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      {
        threshold: 0.15,
      },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return onScreen
}

function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

type LayerState = 'before' | 'active' | 'after'

function layerState(index: number, chapter: number): LayerState {
  if (index === chapter) return 'active'
  return index < chapter ? 'after' : 'before'
}

export function HeroFilm({ className }: { className?: string }) {
  // Kick the poster off with the page's first request wave, ahead of lazy images.
  preload(HERO_POSTER, { as: 'image', fetchPriority: 'high' })

  const reduced = useReducedMotion() ?? false
  const [saveData] = useState(() => typeof navigator !== 'undefined' && prefersSaveData())
  const autoplay = !reduced && !saveData
  // null: follow the visitor's settings; true or false once they press Pause or Play.
  const [choice, setChoice] = useState<boolean | null>(null)
  const paused = choice ?? !autoplay

  const figureRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clock = useRef(0)
  const onScreen = useOnScreen(figureRef)
  const pageVisible = usePageVisible()
  const running = !paused && onScreen && pageVisible

  const videoFound = useMediaExists(HERO_VIDEO, 'video', !saveData)
  const [videoFailed, setVideoFailed] = useState(false)
  const useVideo = videoFound && !videoFailed
  const [videoShown, setVideoShown] = useState(false)
  const [posterState, setPosterState] = useState<'loading' | 'loaded' | 'failed'>('loading')

  const [chapter, setChapter] = useState(0)

  // Play and pause the film with everything else.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (running) {
      // Older browsers return nothing from play(); current ones a promise.
      void video.play()?.catch((error: unknown) => {
        // Autoplay refused (a browser setting or Low Power Mode): stay on the poster, paused. Any
        // other failure is a broken file, which onError below swaps for the drawing.
        if (error instanceof DOMException && error.name === 'NotAllowedError') setChoice(true)
      })
    } else video.pause()
  }, [running, useVideo])

  // One animation-frame loop: the time into the story sets the chapter, and the line under the
  // chapter fills through a CSS variable, so React only re-renders when a chapter changes.
  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const video = videoRef.current
      // The film keeps time once it is actually playing; until then (and without it) the story
      // keeps its own clock, which the film then starts from.
      if (videoShown && video) clock.current = video.currentTime
      else clock.current = (clock.current + (now - last) / 1000) % FILM_SECONDS
      last = now
      const t = clock.current
      const index = Math.min(CHAPTERS.length - 1, Math.floor(t / CHAPTER_SECONDS))
      figureRef.current?.style.setProperty(
        '--chapter-progress',
        String((t - index * CHAPTER_SECONDS) / CHAPTER_SECONDS),
      )
      setChapter((current) => (current === index ? current : index))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, videoShown])

  function jumpTo(index: number) {
    clock.current = index * CHAPTER_SECONDS
    const video = videoRef.current
    if (video && useVideo) video.currentTime = clock.current
    figureRef.current?.style.setProperty('--chapter-progress', paused ? '1' : '0')
    setChapter(index)
  }

  // Once the poster or film covers the drawing, its loops have no reason to run.
  const covered = videoShown || posterState === 'loaded'

  return (
    <figure
      ref={figureRef}
      data-paused={running ? undefined : ''}
      data-covered={covered ? '' : undefined}
      // Standing still, the chapter shown is marked as seen in full.
      style={{ ['--chapter-progress' as string]: autoplay ? 0 : 1 }}
      className={cn('lp-film relative', className)}
    >
      <div
        role="img"
        aria-label={FILM_DESCRIPTION}
        className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-surface-2 shadow-overlay sm:aspect-video sm:rounded-[2rem] lg:aspect-[19/10]"
      >
        <HeroScene />
        {posterState === 'failed' ? null : (
          <img
            src={HERO_POSTER}
            alt=""
            fetchPriority="high"
            decoding="async"
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 0) setPosterState('loaded')
            }}
            onError={() => setPosterState('failed')}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out-soft',
              posterState === 'loaded' ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}
        {useVideo ? (
          <video
            ref={(video) => {
              videoRef.current = video
              // React sets `muted` as a property only; iOS wants the attribute before playing.
              if (video) {
                video.muted = true
                video.defaultMuted = true
                video.setAttribute('muted', '')
              }
            }}
            src={HERO_VIDEO}
            poster={posterState === 'loaded' ? HERO_POSTER : undefined}
            muted
            loop
            playsInline
            autoPlay={autoplay}
            preload={autoplay ? 'auto' : 'metadata'}
            tabIndex={-1}
            aria-hidden="true"
            onLoadedMetadata={(event) => {
              // Pick up where the drawn version had got to, so the chapters don't jump back.
              if (clock.current > 0) event.currentTarget.currentTime = clock.current
            }}
            onPlaying={() => setVideoShown(true)}
            onError={() => setVideoFailed(true)}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out-soft',
              videoShown ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : null}
      </div>

      {/* The chapter cards: inside the frame on wide screens, overlapping its foot on phones. */}
      <div
        aria-hidden="true"
        inert
        className="relative z-10 mx-3 -mt-10 sm:mx-auto sm:-mt-16 sm:max-w-md lg:absolute lg:top-24 lg:right-8 lg:bottom-8 lg:mx-0 lg:mt-0 lg:flex lg:w-[23rem] lg:max-w-none lg:items-center"
      >
        <div className="lp-stack lp-breathe w-full">
          {CHAPTER_CARDS.map((ChapterCard, index) => (
            <div
              key={CHAPTERS[index]}
              data-state={layerState(index, chapter)}
              className="flex flex-col"
            >
              <ChapterCard />
            </div>
          ))}
        </div>
      </div>

      {/* The caption plate: solid, so its words never depend on what the film shows behind, and at
          the top, so it is in view with the headline. Up to tablet width only the chapter playing
          is named; the others show their number. */}
      <figcaption className="absolute inset-x-2 top-2 z-20 sm:inset-x-3 sm:top-3 lg:inset-x-auto lg:top-5 lg:left-5">
        <div className="flex items-stretch gap-1 rounded-[1.1rem] border border-line bg-surface p-1 shadow-raised">
          <ol aria-label="Chapters" className="flex min-w-0 flex-1 items-stretch gap-1">
            {CHAPTERS.map((title, index) => {
              const state = layerState(index, chapter)
              const active = state === 'active'
              return (
                <li
                  key={title}
                  className={cn(
                    'flex',
                    active ? 'min-w-0 flex-1' : 'max-lg:shrink-0',
                    'lg:flex-none',
                  )}
                >
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => jumpTo(index)}
                    className="flex min-h-11 w-full min-w-11 flex-col justify-center gap-1.5 rounded-[0.8rem] px-2.5 py-1.5 text-left transition-colors duration-(--duration-quick) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring lg:px-3"
                  >
                    <span className="flex min-w-0 items-baseline gap-2 text-small leading-tight">
                      <span
                        aria-hidden="true"
                        className="figures font-display text-caption font-semibold text-muted"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={cn(
                          'min-w-0',
                          active ? 'font-semibold text-ink' : 'text-muted max-lg:sr-only',
                        )}
                      >
                        <span className="sr-only">Chapter {index + 1}:</span> {title}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative block h-0.5 w-full overflow-hidden rounded-full bg-line lg:min-w-16"
                    >
                      <span
                        className="lp-chapter-fill absolute inset-0 rounded-full bg-ink"
                        style={state === 'after' ? { ['--fill' as string]: 1 } : undefined}
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            onClick={() => setChoice(!paused)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-[0.8rem] px-3 text-small font-semibold text-ink transition-colors duration-(--duration-quick) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
          >
            {paused ? (
              <PlayIcon weight="fill" aria-hidden className="size-4" />
            ) : (
              <PauseIcon weight="fill" aria-hidden className="size-4" />
            )}
            <span className="max-sm:sr-only">{paused ? 'Play' : 'Pause'}</span>{' '}
            <span className="sr-only">the story</span>
          </button>
        </div>
      </figcaption>
    </figure>
  )
}
