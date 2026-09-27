// Reports: ones about what the trade has written (never saying who reported it), with their one
// response, and ones the trade has made, with where each has got to.

import { useState } from 'react'
import { FlagIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery, type ReportAboutMe } from '@/data'
import { REPORT_ROUTE_INFO, type ContentReport, type ReportStatus } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { errorText, fieldError } from '../lib/errors'

const STATUS_WORDS: Record<ReportStatus, string> = {
  received: 'Received',
  in_review: 'Being looked at',
  resolved: 'Decided',
}

const TARGET_WORDS: Record<ContentReport['target']['kind'], string> = {
  rating: 'a rating',
  reply: 'a reply',
  update: 'an update',
  message: 'a message',
  person: 'a profile',
}

export default function ReportsPage() {
  const viewer = useViewer()
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

  return (
    <PortalPage title="Reports" width="narrow">
      <PageHeader
        back={{ to: '/trade/profile', label: 'Profile' }}
        title="Reports"
        description="A person checks every report. We never take anything down on a report alone."
      />
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading reports" cards={2} />
      ) : !state.data ? (
        <LoadError what="your reports" onRetry={refresh} />
      ) : state.data.aboutMe.length === 0 && state.data.mine.length === 0 ? (
        <EmptyState
          icon={ShieldCheckIcon}
          headingLevel="h2"
          title="No reports"
          description="If someone reports something you wrote, you’ll see it here and can respond. Reports you make show here too."
        />
      ) : (
        <div className="flex flex-col gap-10">
          <Section title="About what you wrote" count={state.data.aboutMe.length}>
            {state.data.aboutMe.length === 0 ? (
              <p className="text-muted">Nothing you’ve written has been reported.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {state.data.aboutMe.map((report) => (
                  <AboutMe key={report.id} report={report} />
                ))}
              </ul>
            )}
          </Section>
          <Section title="Reports you made" count={state.data.mine.length}>
            {state.data.mine.length === 0 ? (
              <p className="text-muted">You haven’t reported anything.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.mine.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-4 shadow-soft"
                  >
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        {REPORT_ROUTE_INFO[report.route].label}
                      </span>
                      <Badge tone="neutral" icon={<FlagIcon weight="bold" aria-hidden />}>
                        {STATUS_WORDS[report.status]}
                      </Badge>
                    </p>
                    <p className="text-small text-muted">
                      About {TARGET_WORDS[report.target.kind]} · sent{' '}
                      {formatDate(report.submittedAt)}
                    </p>
                    {report.outcome ? <p className="text-ink">{report.outcome.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </PortalPage>
  )
}

function AboutMe({ report }: { report: ReportAboutMe }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [sending, setSending] = useState(false)

  async function respond() {
    setSending(true)
    try {
      await api.respondToReport(viewer, report.id, body)
      setBody('')
      toast.success('Response sent', { description: 'Our moderators read it before deciding.' })
    } catch (caught) {
      setError(fieldError(caught, 'body') ?? errorText(caught))
    } finally {
      setSending(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{REPORT_ROUTE_INFO[report.route].label}</span>
        <Badge tone="neutral" icon={<FlagIcon weight="bold" aria-hidden />}>
          {STATUS_WORDS[report.status]}
        </Badge>
      </p>
      <p className="text-small text-muted">
        About {TARGET_WORDS[report.target.kind]} you wrote · reported{' '}
        {formatDate(report.submittedAt)}
      </p>
      {report.details ? (
        <blockquote className="rounded-control bg-surface-2 p-3 text-ink">
          <span className="block text-small font-semibold text-muted">What the report says</span>
          {report.details}
        </blockquote>
      ) : null}
      {report.posterResponse ? (
        <p className="text-ink">
          <span className="block text-small font-semibold text-muted">
            Your response, {formatDate(report.posterResponse.at)}
          </span>
          {report.posterResponse.body}
        </p>
      ) : null}
      {report.outcome ? <p className="text-ink">{report.outcome.note}</p> : null}
      {report.canRespond ? (
        <div className="flex flex-col gap-3">
          <Textarea
            label="Your response"
            hint="One response, up to 1,000 characters. Our moderators read it before deciding."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            error={error}
          />
          <Button
            loading={sending}
            onClick={respond}
            disabled={body.trim().length === 0}
            className="sm:self-start"
          >
            Send response
          </Button>
        </div>
      ) : null}
    </li>
  )
}
