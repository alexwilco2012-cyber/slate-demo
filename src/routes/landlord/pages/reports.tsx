// Reports: ones about what you wrote (never saying who made them), with your one response, and
// ones you made, with each route's clock.

import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircleIcon, ClockIcon, FlagIcon, HourglassMediumIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery, type ReportAboutMe } from '@/data'
import {
  REPORT_ROUTE_INFO,
  type ContentReport,
  type ReportClock,
  type ReportStatus,
  type ReportTarget,
} from '@/domain/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { clockText } from '../components/report-dialog'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { errorMessage, fieldErrors } from '../lib/errors'

const STATUS: Record<ReportStatus, { label: string; tone: NonNullable<BadgeProps['tone']> }> = {
  received: { label: 'Received', tone: 'info' },
  in_review: { label: 'Being looked at', tone: 'caution' },
  resolved: { label: 'Decided', tone: 'positive' },
}

const TARGET_WORDS: Record<ReportTarget['kind'], string> = {
  rating: 'A review',
  reply: 'A reply to a review',
  update: 'An update on a review',
  message: 'A message',
  person: 'A profile',
}

const STEP_WORDS = {
  notify_poster: 'Poster told',
  review: 'Looked at',
  acknowledge: 'Acknowledged',
}

function Clocks({ clocks }: { clocks: ReportClock[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {clocks.map((clock) => (
        <li key={clock.step} className="flex items-center gap-1.5 text-small text-ink">
          {clock.metAt ? (
            <CheckCircleIcon weight="fill" aria-hidden className="size-4 text-positive" />
          ) : (
            <ClockIcon weight="bold" aria-hidden className="size-4 text-muted" />
          )}
          {STEP_WORDS[clock.step]}:{' '}
          {clock.metAt ? `done ${formatDate(clock.metAt)}` : `due by ${formatDate(clock.dueAt)}`}
        </li>
      ))}
    </ul>
  )
}

function ReportShell({
  report,
  children,
}: {
  report: Pick<ContentReport, 'route' | 'status' | 'submittedAt' | 'target'> & {
    clocks: ReportClock[]
  }
  children?: ReactNode
}) {
  const status = STATUS[report.status]
  const info = REPORT_ROUTE_INFO[report.route]
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-small font-semibold text-muted">
            {TARGET_WORDS[report.target.kind]} · {formatDate(report.submittedAt)}
          </p>
          <p className="font-semibold text-ink">{info.label}</p>
          <p className="text-caption text-muted">{info.basis}</p>
        </div>
        <Badge tone={status.tone} icon={<HourglassMediumIcon weight="bold" aria-hidden />}>
          {status.label}
        </Badge>
      </div>
      <Clocks clocks={report.clocks} />
      {children}
    </li>
  )
}

function AboutMe({ report }: { report: ReportAboutMe }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function respond() {
    if (body.trim().length < 10) return setError('Say what happened in a sentence or two.')
    setBusy(true)
    try {
      await api.respondToReport(viewer, report.id, body)
      toast.success('Response sent', {
        description: 'The person deciding will read it before they do.',
      })
      setBody('')
    } catch (err) {
      setError(fieldErrors(err).body ?? errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ReportShell report={report}>
      {report.details ? (
        <blockquote className="rounded-control bg-surface-2 px-4 py-3 text-body text-ink">
          <span className="block text-small font-semibold text-muted">What the complaint says</span>
          “{report.details}”
        </blockquote>
      ) : (
        <p className="text-small text-muted">
          We don’t share who reported it, or their reasons for this kind of report.
        </p>
      )}
      {report.posterResponse ? (
        <p className="text-body text-ink">
          <span className="font-semibold">
            Your response ({formatDate(report.posterResponse.at)}):
          </span>{' '}
          {report.posterResponse.body}
        </p>
      ) : null}
      {report.outcome ? (
        <p className="rounded-control bg-positive-tint px-4 py-3 text-body text-positive">
          <span className="font-semibold">Decision, {formatDate(report.outcome.decidedAt)}:</span>{' '}
          {report.outcome.note}
        </p>
      ) : null}
      {report.canRespond ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3.5">
          <Textarea
            label="Your response"
            hint="You can respond once. Stick to the facts. The person deciding reads it."
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setError(undefined)
            }}
            maxLength={1000}
            showCount
            rows={4}
            error={error}
          />
          <Button className="self-end" loading={busy} onClick={respond}>
            Send response
          </Button>
        </div>
      ) : null}
    </ReportShell>
  )
}

export default function ReportsPage() {
  const viewer = useViewer()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'mine' ? 'mine' : 'about'
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [aboutMe, mine] = await Promise.all([
        api.listReportsAboutMe(viewer),
        api.listMyReports(viewer),
      ])
      return { aboutMe, mine }
    },
    [viewer],
  )
  const data = state.data

  return (
    <PortalPage title="Reports">
      <PageHeader
        title="Reports"
        description="Reports about what you’ve written, and the reports you’ve made. A person checks every one. Nothing comes down automatically."
      />
      {state.status === 'error' && !data ? (
        <ErrorPanel error={state.error} onRetry={refresh} />
      ) : !data ? (
        <ListSkeleton rows={2} label="Loading reports" />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) =>
            setParams(value === 'mine' ? { tab: 'mine' } : {}, { replace: true })
          }
        >
          <TabsList>
            <TabsTab value="about">About what you wrote ({data.aboutMe.length})</TabsTab>
            <TabsTab value="mine">Reports you made ({data.mine.length})</TabsTab>
          </TabsList>
          <TabsPanel value="about">
            {data.aboutMe.length === 0 ? (
              <EmptyState
                icon={FlagIcon}
                title="No reports about you"
                description="If someone reports a review, reply or message you wrote, you’ll see it here and can respond."
                headingLevel="h2"
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {data.aboutMe.map((report) => (
                  <AboutMe key={report.id} report={report} />
                ))}
              </ul>
            )}
          </TabsPanel>
          <TabsPanel value="mine">
            {data.mine.length === 0 ? (
              <EmptyState
                icon={FlagIcon}
                title="You haven’t reported anything"
                description="Every review and message has a Report button with four routes: untrue and damaging, illegal, a fake review, or your personal data."
                headingLevel="h2"
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {data.mine.map((report) => (
                  <ReportShell key={report.id} report={report}>
                    <p className="text-small text-muted">{clockText(report.route)}</p>
                    {report.outcome ? (
                      <p className="text-body text-ink">
                        <span className="font-semibold">Decision:</span> {report.outcome.note}
                      </p>
                    ) : null}
                  </ReportShell>
                ))}
              </ul>
            )}
          </TabsPanel>
        </Tabs>
      )}
    </PortalPage>
  )
}
