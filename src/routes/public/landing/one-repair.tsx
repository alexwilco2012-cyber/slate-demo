// "One repair, from drip to done": the product in five steps. On wide screens the job's record
// stays in view on the left and fills in as each step passes the middle of the screen; on phones
// the steps stack, each with its picture. Pictures are real components with the sample story.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDownIcon, ArrowRightIcon, NotebookIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { LETTING_RULES, ROLES, type IsoDateTime, type Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { RadioGroup } from '@/components/ui/radio-group'
import { JOB_STAGES, JobTimeline, type JobStage } from '@/components/slate/job-timeline'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { canObserve, PublicReveal } from '@/components/slate/public-reveal'
import { SealedReviewCard } from '@/components/slate/review-card'
import { RoleChip } from '@/components/slate/role-chip'
import { ROLE_STORIES } from '../content/roles'
import { PEOPLE, TENANT_JOB } from '../content/samples'
import { Container } from '../layout/parts'
import { featureTitleClass, leadClass, sectionTitleClass, SectionLabel } from './parts'
import { NoticeCard, ReportPhone } from './vignettes'

// ─── Pictures ─────────────────────────────────────────────────────────────────────────────

function PictureCard({ role, chip, children }: { role: Role; chip: string; children: ReactNode }) {
  return (
    <div
      data-role-accent={role}
      className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-5 pt-6 text-ink shadow-overlay"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <RoleChip role={role} label={chip} className="self-start" />
      {children}
    </div>
  )
}

function ChooseTrade() {
  return (
    <PictureCard role="landlord" chip="Graham’s approval">
      <div className="flex flex-col gap-0.5">
        <p className="text-title leading-snug font-semibold">Who should fix it?</p>
        <p className="text-small text-muted">{TENANT_JOB.title} · Rosemount</p>
      </div>
      <RadioGroup
        label="Who should fix it"
        hideLabel
        variant="cards"
        defaultValue="kev"
        options={[
          {
            value: 'kev',
            label: 'Kev Rattray, plumber',
            description: 'From your saved trades. You’ve used him 4 times.',
          },
          {
            value: 'board',
            label: 'Post it for quotes',
            description: 'Plumbers nearby send a price and you pick one.',
          },
          {
            value: 'directory',
            label: 'Find someone in the directory',
            description: 'Checked trades who cover AB25.',
          },
        ]}
      />
      <Button fullWidth tabIndex={-1}>
        Approve and instruct Kev
      </Button>
    </PictureCard>
  )
}

function ConfirmFixed() {
  return (
    <PictureCard role="tenant" chip="Sarah’s check">
      <p className="flex items-center gap-2.5 text-small">
        <Avatar name={PEOPLE.kev.name} seed={PEOPLE.kev.seed} role="trade" size="sm" decorative />
        <span>
          <span className="font-semibold">Kev marked the job done</span>
          <span className="block text-muted">Sat 26 Sept, 2:05pm</span>
        </span>
      </p>
      <PlainWordsScale label="Is the problem fixed?" scale="yesPartlyNo" defaultValue={5} />
    </PictureCard>
  )
}

function SealedPair() {
  const context = `Repair: ${TENANT_JOB.title}`
  const revealBy = '2026-10-10T18:00:00.000Z'
  return (
    <div className="flex flex-col gap-3">
      <SealedReviewCard
        seal="double_blind"
        raterRole="tenant"
        revealAt={revealBy}
        context={context}
        className="shadow-raised"
      />
      <SealedReviewCard
        seal="double_blind"
        raterRole="trade"
        revealAt={revealBy}
        context={context}
        className="shadow-raised sm:ml-10"
      />
    </div>
  )
}

// ─── The steps ────────────────────────────────────────────────────────────────────────────

interface StoryStep {
  role: Role | 'all'
  title: string
  body: ReactNode
  picture: ReactNode
  /** The stage that is current while this step is being read: an index into JOB_STAGES. */
  next: number
}

const STEPS: StoryStep[] = [
  {
    role: 'tenant',
    title: 'Sarah reports it in about a minute.',
    body: 'One question per screen: which room, what’s wrong, a photo or two and when someone can get in. Graham sees it at once.',
    picture: <ReportPhone room="hall" problem="leak" />,
    next: 1,
  },
  {
    role: 'landlord',
    title: 'Graham approves it and chooses who fixes it.',
    body: `It’s at the top of his home screen. He picks Kev, a plumber he has used before, or posts the job for quotes. ${BRAND.name} never chooses for him.`,
    picture: <ChooseTrade />,
    next: 2,
  },
  {
    role: 'landlord',
    title: `Written notice, ${LETTING_RULES.visitNoticeHours} hours ahead.`,
    body: `Kev books a time and Sarah gets written notice in the thread, at least ${LETTING_RULES.visitNoticeHours} hours before anyone comes round. Scottish law asks for it, so ${BRAND.name} won’t book sooner.`,
    picture: <NoticeCard />,
    next: 3,
  },
  {
    role: 'trade',
    title: 'Kev fixes it, and Sarah confirms.',
    body: 'He marks the job done. Sarah confirms the leak has stopped. If it hasn’t, she says so and the job stays open.',
    picture: <ConfirmFixed />,
    next: 4,
  },
  {
    role: 'all',
    title: 'Everyone rates. Nobody peeks.',
    body: 'Sarah rates Kev, Kev rates the visit and Graham rates the work. Each rating stays sealed until the other side’s is in.',
    picture: <SealedPair />,
    next: 5,
  },
]

type StageKey = (typeof JOB_STAGES)[number]['key']

/** When each stage was reached in the sample story (London time is an hour ahead). The story
    ends with the ratings still sealed, so "Rated" never gets a date. */
const STAGE_AT: Partial<Record<StageKey, IsoDateTime>> = {
  reported: '2026-09-21T07:52:00.000Z',
  approved: '2026-09-21T09:15:00.000Z',
  booked: '2026-09-22T08:20:00.000Z',
  visit: '2026-09-26T12:30:00.000Z',
  fixed: '2026-09-26T13:05:00.000Z',
}

/** The line under the stage that is current. */
const STAGE_DETAIL: Partial<Record<StageKey, string>> = {
  approved: 'Waiting for Graham',
  booked: 'Graham chooses who',
  visit: 'Sat 26 Sept, 1:30pm',
  fixed: 'Sarah confirms it',
  rated: 'Sealed until both sides are in',
}

function stagesFor(next: number): JobStage[] {
  return JOB_STAGES.map(({ key, label }, index) => {
    const state = index < next ? 'done' : index === next ? 'current' : 'upcoming'
    return {
      key,
      label,
      state,
      at: state === 'done' ? STAGE_AT[key] : undefined,
      detail:
        state === 'current'
          ? STAGE_DETAIL[key]
          : state === 'done' && key === 'booked'
            ? 'Kev Rattray, plumber'
            : undefined,
    }
  })
}

/** Which step is crossing the middle of the screen. */
function useActiveStep(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!canObserve()) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = refs.current.indexOf(entry.target as HTMLElement)
          if (index >= 0) setActive(index)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const element of refs.current.slice(0, count)) if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [count])
  return { active, refs }
}

/** The job's record: who is on it and how far it has got. Stays in view on wide screens. */
function RecordCard({ next }: { next: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-5 rounded-[1.5rem] border border-line bg-surface p-6 shadow-raised"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-tint px-2 text-caption font-semibold text-brand">
          <NotebookIcon weight="bold" className="size-3.5" />
          The record
        </span>
        <span className="figures text-caption text-muted">AB25</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-display-m leading-tight font-[560] tracking-[-0.01em] text-ink">
          {TENANT_JOB.title}
        </p>
        <p className="text-small text-muted">{TENANT_JOB.home}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {ROLES.map((role) => (
          <li key={role}>
            <RoleChip role={role} label={ROLE_STORIES[role].persona.name} />
          </li>
        ))}
      </ul>
      <div className="border-t border-line pt-5">
        <JobTimeline stages={stagesFor(next)} />
      </div>
    </div>
  )
}

function StepMeta({ index, role }: { index: number; role: StoryStep['role'] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="figures font-display text-[1.75rem] leading-none font-[460] text-muted">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span aria-hidden="true" className="h-px w-8 bg-line" />
      {role === 'all' ? (
        <span className="flex gap-1">
          {ROLES.map((each) => (
            <RoleChip key={each} role={each} />
          ))}
        </span>
      ) : (
        <RoleChip role={role} size="md" />
      )}
    </div>
  )
}

export function OneRepair() {
  const { active, refs } = useActiveStep(STEPS.length)
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="border-t border-line bg-surface py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container>
        <PublicReveal className="flex max-w-3xl flex-col gap-5">
          <SectionLabel>How it works</SectionLabel>
          <h2 id="how-title" className={cn(sectionTitleClass, 'text-ink')}>
            One repair, from drip to done.
          </h2>
          <p className={cn(leadClass, 'max-w-2xl text-muted')}>
            Follow Sarah’s leaking radiator valve. Every step lands on the same record, so nobody
            has to chase anyone.
          </p>
        </PublicReveal>

        <div className="mt-14 grid gap-x-16 sm:mt-20 lg:grid-cols-12">
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-24">
              <RecordCard next={STEPS[active]?.next ?? 1} />
            </div>
          </div>

          <ol className="flex flex-col gap-20 sm:gap-24 lg:col-span-7 lg:gap-0">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                ref={(element) => {
                  refs.current[index] = element
                }}
                className="flex flex-col gap-8 lg:min-h-[76vh] lg:justify-center lg:py-12"
              >
                <div className="flex flex-col gap-4">
                  <StepMeta index={index} role={step.role} />
                  <h3
                    className={cn(
                      featureTitleClass,
                      'text-ink transition-colors duration-(--duration-slow)',
                      // On wide screens the step being read is the one in full ink.
                      index !== active && 'lg:text-muted',
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="max-w-xl text-body-l text-muted">{step.body}</p>
                  {index === STEPS.length - 1 ? (
                    <Link
                      to={{ hash: 'fair-ratings' }}
                      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-control font-semibold text-brand underline decoration-[1.5px] underline-offset-[0.25em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      How ratings stay fair
                      <ArrowDownIcon weight="bold" aria-hidden className="size-4" />
                    </Link>
                  ) : null}
                </div>
                <PublicReveal>
                  <div inert className="max-w-md select-none">
                    {step.picture}
                  </div>
                </PublicReveal>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-line pt-10 sm:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-lg text-body-l text-ink">
            That was one repair. The demo lets you play all three parts, with the phones side by
            side.
          </p>
          <div className="flex flex-col gap-(--gap-touch) sm:flex-row sm:items-center">
            <Link to="/demo" className={buttonVariants({ size: 'lg' })}>
              Try the demo
              <ArrowRightIcon weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
        <nav
          aria-label="Walkthroughs"
          className="mt-6 flex flex-wrap items-center gap-x-5 text-small"
        >
          <span className="basis-full text-muted sm:basis-auto">The full walkthrough for</span>
          {ROLES.map((role) => (
            <Link
              key={role}
              to={`/how-it-works/${role}`}
              data-role-accent={role}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control font-semibold text-accent-text underline decoration-[1.5px] underline-offset-[0.25em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {ROLE_STORIES[role].plural}
            </Link>
          ))}
        </nav>
      </Container>
    </section>
  )
}
