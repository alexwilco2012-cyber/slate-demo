// The Report button's sheet (SPEC §6): four routes, each with its own clock, a box to say what's
// wrong, and a plain account of what happens next once it's sent.

import { useState } from 'react'
import { CheckCircleIcon, FlagIcon } from '@phosphor-icons/react'
import { SlateError } from '@/data/api'
import { useSlate } from '@/data'
import {
  REPORT_ROUTES,
  REPORT_ROUTE_INFO,
  type ContentReport,
  type ReportRoute,
  type ReportTarget,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ReviewPolicyLink } from './basics'

const WHAT_HAPPENS: Record<ReportRoute, string> = {
  defamation:
    'We tell the person who posted it within 48 working hours and share what you wrote, so they can respond. We never say who reported it.',
  illegal: 'We aim to look at it within 24 hours, and take it down if it breaks the law.',
  fake: 'While we check, it shows a “pending” label. Checks usually take up to 5 working days.',
  data_protection: 'We acknowledge your request within 30 days and tell you what we’ve done.',
}

const DUE_WORDS: Record<ReportRoute, string> = {
  defamation: 'We’ll tell them by',
  illegal: 'We’ll look at it by',
  fake: 'We aim to finish checking by',
  data_protection: 'We’ll acknowledge it by',
}

export interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ReportTarget
  /** e.g. "this review", "this message". */
  what: string
  onReported?: (report: ContentReport) => void
}

export function ReportDialog({ open, onOpenChange, target, what, onReported }: ReportDialogProps) {
  const { api } = useSlate()
  const viewer = useViewer()
  const [route, setRoute] = useState<ReportRoute | undefined>()
  const [details, setDetails] = useState('')
  const [errors, setErrors] = useState<{ route?: string; details?: string; form?: string }>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<ContentReport | null>(null)

  // The fake-review route only makes sense for a review.
  const routes = REPORT_ROUTES.filter((option) => option !== 'fake' || target.kind === 'rating')

  function reset() {
    setRoute(undefined)
    setDetails('')
    setErrors({})
    setSent(null)
  }

  async function send() {
    const next: typeof errors = {}
    if (!route) next.route = 'Choose why you’re reporting it.'
    if (details.trim().length < 10) next.details = 'Say what’s wrong in a sentence or two.'
    setErrors(next)
    if (!route || next.details) return
    setSending(true)
    try {
      const report = await api.submitReport(viewer, { target, route, details: details.trim() })
      setSent(report)
      onReported?.(report)
    } catch (error) {
      if (error instanceof SlateError) {
        setErrors({
          ...(error.fields.details ? { details: error.fields.details } : {}),
          ...(error.fields.route ? { route: error.fields.route } : {}),
          ...(!error.fields.details && !error.fields.route ? { form: error.message } : {}),
        })
      } else {
        setErrors({ form: 'Your report didn’t send. Try again in a moment.' })
      }
    } finally {
      setSending(false)
    }
  }

  const due = sent?.clocks[0]?.dueAt

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) window.setTimeout(reset, 300)
      }}
    >
      <DialogContent
        title={sent ? 'Report sent' : `Report ${what}`}
        description={
          sent
            ? undefined
            : 'Tell us what’s wrong. We don’t take anything down or change it until we’ve looked.'
        }
        footer={
          sent ? (
            <DialogClose render={<Button>Done</Button>} />
          ) : (
            <>
              <DialogClose render={<Button variant="secondary">Cancel</Button>} />
              <Button
                loading={sending}
                iconStart={<FlagIcon weight="bold" aria-hidden />}
                onClick={send}
              >
                Send report
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col gap-4" role="status">
            <p className="flex items-start gap-3 text-body text-ink">
              <CheckCircleIcon
                weight="fill"
                aria-hidden
                className="mt-0.5 size-6 shrink-0 text-positive"
              />
              <span>{WHAT_HAPPENS[sent.route]}</span>
            </p>
            {due ? (
              <p className="rounded-control bg-surface-2 p-4 text-small text-ink">
                <span className="font-semibold">
                  {DUE_WORDS[sent.route]} {formatDate(due)}.
                </span>{' '}
                You can follow it under Reports in your profile.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <RadioGroup
              label="Why are you reporting it?"
              variant="cards"
              value={route}
              onValueChange={(value) => {
                setRoute(value)
                setErrors((current) => ({ ...current, route: undefined }))
              }}
              error={errors.route}
              options={routes.map((option) => ({
                value: option,
                label: REPORT_ROUTE_INFO[option].label,
                description: `${WHAT_HAPPENS[option]} (${REPORT_ROUTE_INFO[option].basis})`,
              }))}
            />
            <Textarea
              label="What’s wrong?"
              hint="Say what’s untrue, harmful or yours, and why. Keep it to the facts."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
              showCount
              rows={3}
              error={errors.details}
            />
            {errors.form ? (
              <p role="alert" className="text-small font-semibold text-critical">
                {errors.form}
              </p>
            ) : null}
            <ReviewPolicyLink />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
