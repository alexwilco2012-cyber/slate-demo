// "Try it": the double-blind reveal, played with the real rating input. The visitor rates Kev as
// Sarah; Kev's rating of the visit is already in but sealed; sending opens both at once.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  EyeIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
} from '@phosphor-icons/react'
import type { CriterionId, RatingDirection, Role, ScaleScore } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { RoleChip } from '@/components/slate/role-chip'
import { answerWords, criterionDef } from '@/components/slate/score-words'
import { PEOPLE } from '../content/samples'

const ASKED: { direction: RatingDirection; criterion: CriterionId } = {
  direction: 'tenant->trade',
  criterion: 'turned_up',
}

const KEVS_RATING: { criterion: CriterionId; score: ScaleScore }[] = [
  { criterion: 'access_given', score: 5 },
  { criterion: 'felt_safe', score: 5 },
  { criterion: 'clear_information', score: 4 },
]

function Answers({
  direction,
  answers,
}: {
  direction: RatingDirection
  answers: readonly { criterion: CriterionId; score: ScaleScore }[]
}) {
  return (
    <dl className="lp-reveal-in flex flex-col">
      {answers.map(({ criterion, score }) => {
        const definition = criterionDef(direction, criterion)
        if (!definition) return null
        return (
          <div
            key={criterion}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-line py-3 first:border-t-0 first:pt-0"
          >
            <dt className="text-body text-muted">{definition.label}</dt>
            <dd className="font-display text-title font-semibold text-ink">
              {answerWords(definition.scale, score)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function Side({
  role,
  chip,
  title,
  context,
  children,
}: {
  role: Role
  chip: ReactNode
  title: string
  context: string
  children: ReactNode
}) {
  return (
    <article
      data-role-accent={role}
      className="relative flex flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-5 pt-6 shadow-raised sm:p-6 sm:pt-7"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <header className="flex flex-col gap-2">
        {chip}
        <h4 className="text-title leading-snug font-semibold text-ink">{title}</h4>
        <p className="text-small text-muted">{context}</p>
      </header>
      {children}
    </article>
  )
}

/** Sarah's answer once it is out: large, and what that means for her. */
function YourAnswer({ label, words }: { label: string; words: string }) {
  return (
    <div className="lp-reveal-in flex flex-1 flex-col gap-2">
      <p className="text-body text-muted">{label}</p>
      <p className="font-display text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] leading-tight font-[560] tracking-[-0.02em] text-ink">
        {words}
      </p>
      <p className="mt-auto flex items-start gap-2 border-t border-line pt-4 text-small text-muted">
        <EyeIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        Kev saw yours at the same moment you saw his. Neither of you can change it now.
      </p>
    </div>
  )
}

/** What a sealed rating looks like: the shape of answers, none of the words. */
function SealedLines() {
  return (
    <div className="flex flex-col gap-4 rounded-control border border-dashed border-input-border bg-surface-2 p-4">
      <p className="flex items-start gap-2.5 text-body text-ink">
        <LockSimpleIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />
        Kev has rated. You’ll see what he said once yours is in.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {[72, 56, 64].map((width) => (
          <div key={width} className="flex items-center justify-between gap-4">
            <span className="h-2.5 rounded-full bg-line" style={{ width: `${width}%` }} />
            <span className="h-2.5 w-16 rounded-full bg-line" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RevealDemo({ className }: { className?: string }) {
  const titleId = useId()
  const [answer, setAnswer] = useState<ScaleScore | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  // Focus follows the visitor's action: to "Start again" after the reveal, and back after it.
  const moved = useRef(false)
  const sendRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moved.current) return
    ;(revealed ? againRef : sendRef).current?.focus()
  }, [revealed])

  const asked = criterionDef(ASKED.direction, ASKED.criterion)

  function send() {
    if (!answer) {
      setError('Choose an answer first.')
      return
    }
    moved.current = true
    setRevealed(true)
  }

  function again() {
    moved.current = true
    setAnswer(undefined)
    setError(null)
    setRevealed(false)
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'rounded-[1.75rem] bg-bg p-4 text-ink shadow-overlay [--ring:var(--brand)] sm:p-8 lg:p-10',
        className,
      )}
    >
      <header className="flex flex-col gap-2 px-1 sm:px-0">
        <p className="text-small font-semibold text-brand">Try it</p>
        <h3
          id={titleId}
          className="font-display text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] leading-[1.1] font-[560] tracking-[-0.02em] text-balance"
        >
          Kev fixed Sarah’s radiator. Now they rate each other.
        </h3>
      </header>

      <div className="relative mt-6 grid gap-4 sm:mt-8 lg:grid-cols-[1.7fr_1fr] lg:gap-5">
        <Side
          role="tenant"
          chip={<RoleChip role="tenant" label="You, as Sarah" className="self-start" />}
          title="Your rating of Kev"
          context="Kev Rattray, plumber · the radiator valve, Sat 26 Sept"
        >
          {revealed && answer && asked ? (
            <YourAnswer label={asked.label} words={answerWords(asked.scale, answer)} />
          ) : (
            <PlainWordsScale
              label={asked?.label ?? 'Turned up when agreed'}
              scale="judgement"
              value={answer}
              onValueChange={(score) => {
                setAnswer(score)
                setError(null)
              }}
              error={error}
            />
          )}
        </Side>

        {/* The lock between the two: shut until both are in. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 left-1/2 z-10 hidden size-12 -translate-1/2 items-center justify-center rounded-full border border-line shadow-raised transition-colors duration-(--duration-base) lg:flex',
            'lg:left-[calc(62.96%-3px)]',
            revealed ? 'bg-brand text-on-brand' : 'bg-surface text-ink',
          )}
        >
          {revealed ? (
            <LockSimpleOpenIcon weight="bold" className="size-5" />
          ) : (
            <LockSimpleIcon weight="bold" className="size-5" />
          )}
        </span>

        <Side
          role="trade"
          chip={
            <span className="flex items-center gap-2">
              <Avatar
                name={PEOPLE.kev.name}
                seed={PEOPLE.kev.seed}
                role="trade"
                size="xs"
                decorative
              />
              <RoleChip role="trade" label="Kev Rattray" />
            </span>
          }
          title="Kev’s rating of the visit"
          context="Private to Sarah. Graham only sees whether access was given."
        >
          {revealed ? <Answers direction="trade->tenant" answers={KEVS_RATING} /> : <SealedLines />}
        </Side>
      </div>

      <div className="mt-6 flex flex-col gap-5 px-1 sm:mt-8 sm:px-0 lg:flex-row lg:items-center lg:justify-between">
        {revealed ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircleIcon weight="fill" aria-hidden className="size-5 text-positive" />
              Revealed together, at the same moment.
            </p>
            <Button
              ref={againRef}
              variant="secondary"
              onClick={again}
              iconStart={<ArrowCounterClockwiseIcon weight="bold" aria-hidden />}
              className="self-start"
            >
              Start again
            </Button>
          </div>
        ) : (
          <Button
            ref={sendRef}
            size="lg"
            onClick={send}
            iconStart={<LockSimpleOpenIcon weight="bold" aria-hidden />}
            className="self-start"
          >
            Send and reveal both
          </Button>
        )}
        <p className="max-w-md text-small text-muted">
          In the app each side has 14 days. If one side never rates, the other’s rating is revealed
          when the time runs out. Nobody can change a rating after the reveal.
        </p>
      </div>
      <p aria-live="polite" className="sr-only">
        {revealed ? 'Both ratings revealed together.' : ''}
      </p>
    </section>
  )
}
