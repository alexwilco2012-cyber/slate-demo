// Reports: the ones the tenant made (and where each one's clock stands), and any about something
// they wrote, which they can answer once. Reports never say who made them.

import { useState } from 'react'
import {
  CheckCircleIcon,
  FlagIcon,
  HourglassMediumIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { SlateError, type ReportAboutMe } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import {
  REPORT_ROUTE_INFO,
  type ContentReport,
  type ReportClock,
  type ReportStatus,
  type ReportTarget,
} from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QueryError, ReviewPolicyLink, Section } from '../components/basics'

const TARGET_WORDS: Record<ReportTarget['kind'], string> = {
  rating: 'A review',
  reply: 'A reply to a review',
  update: 'An update to a review',
  message: 'A message',
  person: 'A profile',
}

const STATUS_META: Record<
  ReportStatus,
  { label: string; icon: typeof FlagIcon; tone: 'neutral' | 'info' | 'positive' }
> = {
  received: { label: 'Received', icon: HourglassMediumIcon, tone: 'neutral' },
  in_review: { label: 'Being looked at', icon: MagnifyingGlassIcon, tone: 'info' },
  resolved: { label: 'Resolved', icon: CheckCircleIcon, tone: 'positive' },
}

/** Each clock as a sentence: done, due, or late. "You" when the report is about the tenant. */
function clockText(clock: ReportClock, aboutMe: boolean, now: string): string {
  const met = clock.metAt ? formatDate(clock.metAt) : null
  const due = formatDate(clock.dueAt)
  if (!met && clock.dueAt < now) return `Running late. It was due by ${due}`
  switch (clock.step) {
    case 'notify_poster': {
      const whom = aboutMe ? 'you' : 'the person who posted it'
      return met ? `We told ${whom} on ${met}` : `We’ll tell ${whom} by ${due}`
    }
    case 'review':
      return met ? `We checked it on ${met}` : `We’ll check it by ${due}`
    case 'acknowledge':
      return met ? `We acknowledged it on ${met}` : `We’ll acknowledge it by ${due}`
  }
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status]
  const Glyph = meta.icon
  return (
    <Badge tone={meta.tone} size="sm" icon={<Glyph weight="bold" aria-hidden />}>
      {meta.label}
    </Badge>
  )
}

function Clocks({ clocks, aboutMe = false }: { clocks: ReportClock[]; aboutMe?: boolean }) {
  const now = useDemoNow()
  return (
    <ul className="flex flex-col gap-1 text-small text-ink">
      {clocks.map((clock) => (
        <li key={clock.step} className="flex items-start gap-2">
          {clock.metAt ? (
            <CheckCircleIcon
              weight="fill"
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-positive"
            />
          ) : (
            <HourglassMediumIcon
              weight="bold"
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted"
            />
          )}
          <span>{clockText(clock, aboutMe, now)}</span>
        </li>
      ))}
    </ul>
  )
}

export function ReportsPage() {
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [mine, aboutMe] = await Promise.all([
        api.listMyReports(viewer),
        api.listReportsAboutMe(viewer),
      ])
      return { mine, aboutMe }
    },
    [viewer],
  )

  return (
    <PortalPage title="Reports" width="narrow">
      <PageHeader
        back={{ to: '/tenant/profile', label: 'Profile' }}
        title="Reports"
        description="Reports go to our moderators. They never edit what was reported. They leave it up, limit who sees it while they check, or take it down."
      />
      {state.status === 'loading' ? (
        <LoadingRegion label="Loading reports" className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </LoadingRegion>
      ) : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your reports" onRetry={refresh} />
      ) : null}
      {state.data ? (
        <>
          <Section id="made" title="Reports you’ve made">
            {state.data.mine.length === 0 ? (
              <EmptyState
                icon={FlagIcon}
                headingLevel="h3"
                title="No reports"
                description="If a review, reply or message is untrue, illegal, fake or about your personal data, use the Report button on it."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.mine.map((report) => (
                  <MyReport key={report.id} report={report} />
                ))}
              </ul>
            )}
          </Section>
          <Section id="about-me" title="About something you wrote">
            {state.data.aboutMe.length === 0 ? (
              <p className="rounded-card border border-dashed border-line p-4 text-small text-muted">
                Nobody has reported anything you’ve written.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.aboutMe.map((report) => (
                  <AboutMe key={report.id} report={report} />
                ))}
              </ul>
            )}
          </Section>
          <ReviewPolicyLink />
        </>
      ) : null}
    </PortalPage>
  )
}

function MyReport({ report }: { report: ContentReport }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-ink">{TARGET_WORDS[report.target.kind]}</p>
          <p className="text-small text-muted">
            {REPORT_ROUTE_INFO[report.route].label} · sent {formatDate(report.submittedAt)}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <p className="rounded-control bg-surface-2 p-3 text-small text-ink">“{report.details}”</p>
      <Clocks clocks={report.clocks} />
      {report.outcome ? (
        <p className="text-small text-ink">
          <span className="font-semibold">Outcome, {formatDate(report.outcome.decidedAt)}:</span>{' '}
          {report.outcome.note}
        </p>
      ) : null}
    </li>
  )
}

function AboutMe({ report }: { report: ReportAboutMe }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function respond() {
    if (body.trim().length < 10) {
      setError('Say what happened in a sentence or two.')
      return
    }
    setBusy(true)
    try {
      await api.respondToReport(viewer, report.id, body.trim())
      toast.success('Response sent', {
        description: 'Our moderators will read it before deciding.',
      })
    } catch (caught) {
      setError(
        caught instanceof SlateError
          ? (caught.fields.body ?? caught.message)
          : 'That didn’t send. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-ink">{TARGET_WORDS[report.target.kind]} you wrote</p>
          <p className="text-small text-muted">
            {REPORT_ROUTE_INFO[report.route].label} · {formatDate(report.submittedAt)}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      {report.details ? (
        <p className="rounded-control bg-surface-2 p-3 text-small text-ink">
          <span className="font-semibold">What the complaint says:</span> “{report.details}”
        </p>
      ) : null}
      <Clocks clocks={report.clocks} aboutMe />
      {report.posterResponse ? (
        <p className="text-small text-ink">
          <span className="font-semibold">
            Your response, {formatDate(report.posterResponse.at)}:
          </span>{' '}
          “{report.posterResponse.body}”
        </p>
      ) : null}
      {report.canRespond ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Textarea
            label="Your response"
            hint="You can respond once. Stick to what happened."
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setError(undefined)
            }}
            maxLength={1000}
            showCount
            rows={3}
            error={error}
          />
          <Button className="self-start max-sm:w-full" loading={busy} onClick={respond}>
            Send response
          </Button>
        </div>
      ) : null}
    </li>
  )
}
