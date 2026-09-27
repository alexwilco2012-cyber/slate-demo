import type { ReactNode } from 'react'
import { motion, useReducedMotion, type MotionProps } from 'motion/react'
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ScalesIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import { formatTime } from '@/components/slate/format'
import { JobTimeline, jobStages } from '@/components/slate/job-timeline'
import { RoleChip } from '@/components/slate/role-chip'
import { ScoreHeadline } from '@/components/slate/score-summary'
import {
  CLIENT_RATING,
  LANDLORD_ACTIONS,
  PEOPLE,
  TENANT_JOB,
  type SampleAction,
} from '../content/samples'
import { Tenements } from '../illustrations/tenements'

/** A product card in the picture: surface, role accent bar along the top, soft lift. */
function Shot({
  role,
  label,
  children,
  className,
}: {
  role: Role
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure
      data-role-accent={role}
      className={cn(
        'relative flex flex-col gap-3.5 overflow-hidden rounded-card border border-line bg-surface p-4 pt-5 text-ink shadow-overlay sm:p-5 sm:pt-6',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <figcaption className="flex flex-wrap items-center gap-2">
        <RoleChip role={role} label={label} />
      </figcaption>
      {children}
    </figure>
  )
}

export function TenantShot({ className }: { className?: string }) {
  const kev = PEOPLE.kev
  const stages = jobStages(TENANT_JOB, {
    booked: 'Kev Rattray, plumber',
    visit: `Today, ${formatTime(TENANT_JOB.visitAt)}`,
  })
  return (
    <Shot role="tenant" label="Sarah’s repair" className={className}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-title leading-snug font-semibold">{TENANT_JOB.title}</h3>
        <p className="text-small text-muted">{TENANT_JOB.home}</p>
      </div>
      {/* Phones get the one-line strip; wider cards the full timeline. */}
      <JobTimeline stages={stages} variant="compact" className="sm:hidden" />
      <JobTimeline stages={stages} className="hidden sm:flex" />
      <div className="flex items-center gap-3 rounded-control bg-surface-2 p-3">
        <Avatar name={kev.name} seed={kev.seed} role="trade" size="sm" decorative />
        <div className="flex min-w-0 flex-col">
          <span className="text-small font-semibold">Kev is coming today</span>
          <span className="flex items-center gap-1.5 text-caption text-muted">
            <CalendarCheckIcon weight="bold" aria-hidden className="size-3.5 shrink-0" />
            <span>
              Notice sent <span className="whitespace-nowrap">Tue 22 Sept</span>
            </span>
          </span>
        </div>
      </div>
    </Shot>
  )
}

const ACTION_ICONS: Record<SampleAction['kind'], Icon> = {
  approve: ClipboardTextIcon,
  quotes: ScalesIcon,
  expired: WarningIcon,
}

export function LandlordShot({ className }: { className?: string }) {
  return (
    <Shot role="landlord" label="Graham’s home screen" className={className}>
      <h3 className="flex items-baseline gap-2 text-title font-semibold">
        Actions needed
        <span className="figures text-small font-semibold text-muted">
          {LANDLORD_ACTIONS.length}
        </span>
      </h3>
      <ul className="-mx-1 flex flex-col">
        {LANDLORD_ACTIONS.map((action) => {
          const Glyph = ACTION_ICONS[action.kind]
          const expired = action.kind === 'expired'
          return (
            <li
              key={action.title}
              className="flex items-start gap-3 border-t border-line px-1 py-2.5 first:border-t-0 first:pt-0.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                  expired ? 'bg-critical-tint text-critical' : 'bg-accent-tint text-accent-text',
                )}
              >
                <Glyph weight="bold" className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small font-semibold">
                  {action.title}
                  {expired ? (
                    <Badge
                      tone="critical"
                      size="sm"
                      icon={<WarningIcon weight="bold" aria-hidden />}
                    >
                      Expired
                    </Badge>
                  ) : null}
                </span>
                <span className="text-caption text-muted">{action.detail}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Shot>
  )
}

export function TradeShot({ className }: { className?: string }) {
  const graham = PEOPLE.graham
  const { summary, paidOnTime } = CLIENT_RATING
  return (
    <Shot role="trade" label="Before Kev quotes" className={className}>
      <div className="flex items-center gap-3">
        <Avatar name={graham.name} seed={graham.seed} role="landlord" size="sm" decorative />
        <div className="flex min-w-0 flex-col">
          <h3 className="text-small font-semibold">{graham.name}</h3>
          <p className="text-caption text-muted">Client rating from trades</p>
        </div>
      </div>
      {summary.score !== null ? <ScoreHeadline score={summary.score} size="md" /> : null}
      <p className="flex items-start gap-2 text-small">
        <CheckCircleIcon
          weight="fill"
          aria-hidden
          className="mt-0.5 size-4.5 shrink-0 text-positive"
        />
        <span>
          Paid on time on{' '}
          <span className="figures font-semibold">
            {paidOnTime.onTime} of {paidOnTime.jobs}
          </span>{' '}
          jobs
        </span>
      </p>
    </Shot>
  )
}

/**
 * The front page's product picture: three real Slate components, one per party, layered over a
 * drawn Aberdeen street. It is a sample, so it reads the same however the demo has been played.
 */
export function HeroVisual({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const rise = (index: number): MotionProps =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: 0.1 + index * 0.08, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <div
      role="img"
      aria-label="Three screens from the demo. Sarah’s repair, with the plumber booked for today. Graham’s list of actions needed. What trades say about Graham as a client, who paid on time on 9 of 9 jobs."
      className={cn(
        'relative isolate overflow-hidden rounded-[1.75rem] bg-brand-tint',
        'bg-[radial-gradient(120%_80%_at_85%_0%,color-mix(in_oklab,var(--trade)_22%,transparent),transparent_60%)]',
        className,
      )}
    >
      <Tenements className="absolute inset-x-0 bottom-0 -z-10 h-44 w-full opacity-90 sm:h-56" />
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-3 p-4 pb-28 sm:grid-cols-2 sm:gap-4 sm:p-6 sm:pb-40 lg:p-7 lg:pb-36"
      >
        <motion.div {...rise(0)} className="z-20 sm:row-span-2 sm:mt-10">
          <TenantShot />
        </motion.div>
        <motion.div {...rise(1)} className="z-10 max-sm:ml-6">
          <LandlordShot />
        </motion.div>
        <motion.div {...rise(2)} className="z-30 max-sm:mr-6 sm:-ml-10">
          <TradeShot />
        </motion.div>
      </div>
    </div>
  )
}
