// Small pictures of each portal, built from the real components with sample records. They are
// pictures, so they are inert: nothing inside takes focus or clicks, and each has a caption.

import type { ReactNode } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  NavigationArrowIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { RadioGroup } from '@/components/ui/radio-group'
import { ComplianceCalendarRow, ComplianceTable } from '@/components/slate/compliance-calendar'
import { formatScore } from '@/components/slate/format'
import { MessageBubble } from '@/components/slate/message-thread'
import { ScoreBar } from '@/components/slate/score-bar'
import { scoreWords } from '@/components/slate/score-words'
import { BOARD_POST, CLIENT_RATING, COMPLIANCE_ROWS, PEOPLE, TENANT_JOB } from '../content/samples'

/** A picture of a screen: inert, with its words given to screen readers once, in the caption. */
export function Picture({
  caption,
  children,
  className,
}: {
  caption: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <div inert className="select-none">
        {children}
      </div>
      <figcaption className="text-center text-small text-balance text-muted">{caption}</figcaption>
    </figure>
  )
}

/** A phone, drawn lightly: the tenant portal is designed for one. */
function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[21rem] rounded-[2.4rem] border border-line bg-surface p-2.5 shadow-overlay',
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[1.9rem] bg-bg px-4 pt-9 pb-5">
        <span
          aria-hidden="true"
          className="absolute top-3 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-line"
        />
        {children}
      </div>
    </div>
  )
}

const PROBLEMS = [
  { value: 'leak', label: 'A leak or drip' },
  { value: 'heating', label: 'No heating or hot water' },
  { value: 'damp', label: 'Damp or mould' },
  { value: 'broken', label: 'Something broken' },
] as const

/** The second question of a report. Sarah's damp bedroom by default; her leaking hall valve too. */
export function ReportPhone({
  room = 'bedroom',
  problem = 'damp',
  className,
}: {
  room?: string
  problem?: (typeof PROBLEMS)[number]['value']
  className?: string
}) {
  return (
    <div data-role-accent="tenant" className={className}>
      <Phone>
        <div className="flex flex-col gap-5">
          <ProgressSteps
            steps={['Room', 'Problem', 'Photos', 'Urgency', 'Access', 'Check answers']}
            current={1}
          />
          <p className="font-display text-display-m leading-tight font-semibold text-ink">
            What’s wrong in the {room}?
          </p>
          <RadioGroup
            label="What’s wrong"
            hideLabel
            variant="cards"
            options={PROBLEMS}
            defaultValue={problem}
          />
          <Button fullWidth size="lg" tabIndex={-1}>
            Continue
          </Button>
        </div>
      </Phone>
    </div>
  )
}

export function NoticeCard() {
  return (
    <MessageBubble
      message={{
        id: 'sample_notice',
        kind: 'notice',
        body: 'Kev Rattray, plumber, will visit on Saturday 26 September between 1:30pm and 2:30pm to repair the radiator valve in the hall.',
        sentAt: TENANT_JOB.timeline[3]?.at ?? TENANT_JOB.visitAt,
        author: {
          name: PEOPLE.graham.name,
          role: 'landlord',
          avatarSeed: PEOPLE.graham.seed,
        },
      }}
    />
  )
}

export function TenantReportPicture() {
  return (
    <Picture caption="Reporting a problem takes about a minute, one question per screen.">
      <ReportPhone />
    </Picture>
  )
}

export function TenantNoticePicture() {
  return (
    <Picture caption="Written notice of every visit, at least 48 hours ahead.">
      <NoticeCard />
    </Picture>
  )
}

export function LandlordCompliancePicture() {
  return (
    <Picture caption="Every certificate for a home, its expiry date and the days left.">
      <div
        data-role-accent="landlord"
        className="rounded-card border border-line bg-surface p-4 shadow-overlay sm:p-5"
      >
        <ComplianceTable caption="Certificates · Flat 4, 118 King Street">
          {COMPLIANCE_ROWS.map((item) => (
            <ComplianceCalendarRow key={item.type} item={item} />
          ))}
        </ComplianceTable>
      </div>
    </Picture>
  )
}

export function TradeBoardPicture() {
  const { summary, paidOnTime } = CLIENT_RATING
  const graham = PEOPLE.graham
  return (
    <Picture caption="A job on the board, with the client’s record from other trades.">
      <div
        data-role="trade"
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-overlay"
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-title leading-snug font-bold text-ink">{BOARD_POST.title}</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-small text-muted">
            <li className="flex items-center gap-1.5">
              <MapPinIcon weight="bold" aria-hidden className="size-4" />
              {BOARD_POST.area}
            </li>
            <li className="flex items-center gap-1.5">
              <NavigationArrowIcon weight="bold" aria-hidden className="size-4" />
              {BOARD_POST.distance}
            </li>
            <li className="flex items-center gap-1.5">
              <UsersThreeIcon weight="bold" aria-hidden className="size-4" />
              {BOARD_POST.quotes}
            </li>
            <li className="flex items-center gap-1.5">
              <ClockIcon weight="bold" aria-hidden className="size-4" />
              {BOARD_POST.closes}
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-control bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={graham.name} seed={graham.seed} role="landlord" size="sm" decorative />
            <div className="flex min-w-0 flex-col">
              <span className="text-small font-bold text-ink">{graham.name}</span>
              <span className="text-caption text-muted">Client rating from trades</span>
            </div>
          </div>
          {summary.score !== null ? (
            <div className="flex flex-col gap-1.5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="figures text-display-m leading-none font-bold text-ink">
                  {formatScore(summary.score)}
                </span>
                <span className="text-small text-ink">{scoreWords(summary.score)}</span>
              </p>
              <ScoreBar value={summary.score} max={5} size="sm" className="max-w-48" />
            </div>
          ) : null}
          <p className="flex items-center gap-2 text-small text-ink">
            <CheckCircleIcon weight="fill" aria-hidden className="size-5 shrink-0 text-positive" />
            <span>
              Paid on time on{' '}
              <span className="figures font-bold">
                {paidOnTime.onTime} of {paidOnTime.jobs}
              </span>{' '}
              jobs
            </span>
          </p>
        </div>
        <Button size="trade" tabIndex={-1}>
          Send a quote
        </Button>
      </div>
    </Picture>
  )
}
