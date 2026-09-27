// The product cards beside the hero film, one set per chapter. Real components with the sample
// story (Sarah's radiator valve in Rosemount), so the words on screen are the product's own.
// They are a picture of the story the film tells, so they are inert and hidden from screen
// readers; the film's description carries the same story in words.

import type { ReactNode } from 'react'
import {
  CalendarCheckIcon,
  CameraIcon,
  DropIcon,
  EyeSlashIcon,
  LockSimpleOpenIcon,
  NotebookIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { CriterionId, RatingDirection, Role, ScaleScore } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/components/ui/cn'
import { JOB_STAGES, JobTimeline, type JobStage } from '@/components/slate/job-timeline'
import { RoleChip } from '@/components/slate/role-chip'
import { answerWords, criterionDef } from '@/components/slate/score-words'
import { PEOPLE, TENANT_JOB } from '../content/samples'

/** A card as it looks in the app: surface, a 4px accent bar, a chip naming whose view it is. */
function Card({
  role,
  chip,
  meta,
  children,
  className,
}: {
  role?: Role
  chip: ReactNode
  meta?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-role-accent={role}
      className={cn(
        'relative flex flex-col gap-3.5 overflow-hidden rounded-card border border-line bg-surface p-4 pt-5 text-ink shadow-overlay sm:p-5 sm:pt-6',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="flex items-center justify-between gap-3">
        {chip}
        {meta ? <span className="figures text-caption text-muted">{meta}</span> : null}
      </div>
      {children}
    </div>
  )
}

/** A small note resting on the card's corner: what has happened, in a few words. */
function Note({
  icon: Glyph,
  avatar,
  children,
}: {
  icon?: Icon
  avatar?: ReactNode
  children: ReactNode
}) {
  return (
    <p className="relative z-10 -mb-3 ml-3 inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 text-small font-semibold text-ink shadow-raised lg:-ml-6">
      {avatar ?? (
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-brand">
          {Glyph ? <Glyph weight="bold" className="size-4" /> : null}
        </span>
      )}
      {children}
    </p>
  )
}

function BrandChip({ icon: Glyph, children }: { icon: Icon; children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-tint px-2 text-caption leading-none font-semibold whitespace-nowrap text-brand">
      <Glyph weight="bold" className="size-3.5" />
      {children}
    </span>
  )
}

/** The six stages with everything before `current` done. */
function stagesAt(current: number, detail?: ReactNode): JobStage[] {
  return JOB_STAGES.map(({ key, label }, index) => ({
    key,
    label,
    state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
    detail: index === current ? detail : undefined,
  }))
}

// ─── Chapter 1: a drip in Rosemount ───────────────────────────────────────────────────────

function ReportCard() {
  const facts = [
    ['Room', 'Hall'],
    ['Urgency', 'This week'],
    ['Access', 'Weekdays'],
  ] as const
  return (
    <div className="flex flex-1 flex-col">
      <Note
        avatar={
          <Avatar
            name={PEOPLE.graham.name}
            seed={PEOPLE.graham.seed}
            role="landlord"
            size="xs"
            decorative
          />
        }
      >
        Graham sees it at once
      </Note>
      <Card
        role="tenant"
        chip={<RoleChip role="tenant" label="Sarah’s report" />}
        meta="Mon 8:52am"
        className="flex-1"
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-title leading-snug font-semibold">{TENANT_JOB.title}</p>
          <p className="text-small text-muted">{TENANT_JOB.home}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 rounded-control bg-surface-2 px-3 py-2">
          {facts.map(([term, value]) => (
            <div key={term} className="flex min-w-0 flex-col">
              <dt className="truncate text-caption text-muted">{term}</dt>
              <dd className="truncate text-small font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {/* Her two photos, as the app shows them before they load. */}
        <div className="flex items-center gap-2">
          {[DropIcon, CameraIcon].map((Glyph, index) => (
            <span
              key={index}
              className="flex h-12 w-16 items-center justify-center rounded-lg bg-accent-tint text-accent-text"
            >
              <Glyph weight="duotone" className="size-6" />
            </span>
          ))}
          <span className="ml-1 text-caption text-muted">2 photos</span>
        </div>
        <JobTimeline
          stages={stagesAt(1, 'Waiting for Graham')}
          variant="compact"
          className="mt-auto"
        />
      </Card>
    </div>
  )
}

// ─── Chapter 2: three people, one record ──────────────────────────────────────────────────

const RECORD_ROWS: { person: keyof typeof PEOPLE; role: Role; did: string; when: string }[] = [
  { person: 'sarah', role: 'tenant', did: 'Reported it, with 2 photos', when: 'Mon 8:52am' },
  { person: 'graham', role: 'landlord', did: 'Approved it and chose Kev', when: 'Mon 10:15am' },
  { person: 'kev', role: 'trade', did: 'Booked Saturday, 1:30pm', when: 'Tue 9:20am' },
]

function RecordCard() {
  return (
    <div className="flex flex-1 flex-col">
      <Note icon={CalendarCheckIcon}>Written notice sent 4 days ahead</Note>
      <Card
        chip={<BrandChip icon={NotebookIcon}>One record</BrandChip>}
        meta="3 people"
        className="flex-1"
      >
        <p className="text-title leading-snug font-semibold">{TENANT_JOB.title}</p>
        <ol className="flex flex-col">
          {RECORD_ROWS.map((row) => {
            const person = PEOPLE[row.person]
            return (
              <li
                key={row.person}
                className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0.5 last:pb-0"
              >
                <Avatar
                  name={person.name}
                  seed={person.seed}
                  role={row.role}
                  size="sm"
                  decorative
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small">
                    <span className="font-semibold">{person.name.split(' ')[0]}</span>
                    <RoleChip role={row.role} />
                  </span>
                  <span className="text-small text-ink">{row.did}</span>
                </span>
                <span className="figures shrink-0 self-start pt-0.5 text-caption text-muted max-sm:hidden">
                  {row.when}
                </span>
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}

// ─── Chapter 3: rated fairly, revealed together ───────────────────────────────────────────

interface Answer {
  direction: RatingDirection
  criterion: CriterionId
  score: ScaleScore
}

function AnswerList({ answers }: { answers: readonly Answer[] }) {
  return (
    <dl className="flex flex-col gap-1.5">
      {answers.map(({ direction, criterion, score }, index) => {
        const definition = criterionDef(direction, criterion)
        if (!definition) return null
        return (
          // Phones show each side's first answer, so this card is no taller than the others.
          <div
            key={criterion}
            className={cn(
              'flex items-baseline justify-between gap-3 text-small',
              index > 0 && 'max-sm:hidden',
            )}
          >
            <dt className="min-w-0 text-muted">{definition.label}</dt>
            <dd className="shrink-0 text-right font-semibold whitespace-nowrap text-ink">
              {answerWords(definition.scale, score)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

const SARAH_ON_KEV: Answer[] = [
  { direction: 'tenant->trade', criterion: 'turned_up', score: 5 },
  { direction: 'tenant->trade', criterion: 'problem_fixed', score: 5 },
]

const KEV_ON_VISIT: Answer[] = [
  { direction: 'trade->tenant', criterion: 'access_given', score: 5 },
  { direction: 'trade->tenant', criterion: 'clear_information', score: 4 },
]

function Side({
  role,
  who,
  about,
  answers,
}: {
  role: Role
  who: keyof typeof PEOPLE
  about: string
  answers: readonly Answer[]
}) {
  const person = PEOPLE[who]
  return (
    <div data-role-accent={role} className="flex flex-col gap-2.5 rounded-control bg-surface-2 p-3">
      <p className="flex items-center gap-2 text-small font-semibold">
        <Avatar name={person.name} seed={person.seed} role={role} size="xs" decorative />
        {person.name.split(' ')[0]} on {about}
      </p>
      <AnswerList answers={answers} />
    </div>
  )
}

function RevealCard() {
  return (
    <div className="flex flex-1 flex-col">
      <Note icon={EyeSlashIcon}>Neither saw the other’s first</Note>
      <Card
        chip={<BrandChip icon={LockSimpleOpenIcon}>Revealed together</BrandChip>}
        meta="Sun 27 Sept"
        className="flex-1"
      >
        <Side role="tenant" who="sarah" about="Kev" answers={SARAH_ON_KEV} />
        <Side role="trade" who="kev" about="the visit" answers={KEV_ON_VISIT} />
      </Card>
    </div>
  )
}

export const CHAPTER_CARDS = [ReportCard, RecordCard, RevealCard] as const
