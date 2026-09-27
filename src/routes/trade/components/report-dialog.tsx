// The report button's sheet: the four routes (SPEC §6), what happens next on each, and a box to
// say what's wrong. Reporting never edits anything; moderation decides.

import { useState } from 'react'
import { FlagIcon } from '@phosphor-icons/react'
import { SlateError, useSlate } from '@/data'
import {
  REPORT_ROUTES,
  REPORT_ROUTE_INFO,
  type ReportRoute,
  type ReportTarget,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'

const WHAT_HAPPENS: Record<ReportRoute, string> = {
  defamation: 'We tell the person who posted it within 48 working hours, and they can respond.',
  illegal: 'We aim to review it within 24 hours.',
  fake: 'A review shows a “pending” label while we check it, usually within 5 working days.',
  data_protection: 'We acknowledge your request within 30 days.',
}

export function ReportDialog({
  target,
  what,
  open,
  onOpenChange,
}: {
  target: ReportTarget
  /** "this review", "this message" */
  what: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [route, setRoute] = useState<ReportRoute | undefined>()
  const [details, setDetails] = useState('')
  const [errors, setErrors] = useState<{ route?: string; details?: string }>({})
  const [sending, setSending] = useState(false)

  function reset() {
    setRoute(undefined)
    setDetails('')
    setErrors({})
  }

  async function send() {
    const next: typeof errors = {}
    if (!route) next.route = 'Choose why you’re reporting it.'
    if (details.trim().length < 10)
      next.details = 'Tell us what’s wrong, in at least 10 characters.'
    setErrors(next)
    if (!route || next.details) return
    setSending(true)
    try {
      await api.submitReport(viewer, { target, route, details })
      onOpenChange(false)
      reset()
      toast.success('Report sent', { description: WHAT_HAPPENS[route] })
    } catch (error) {
      if (error instanceof SlateError && error.fields.details) {
        setErrors({ details: error.fields.details })
      } else {
        toast.error('Report not sent', {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent
        title={`Report ${what}`}
        description="Tell us what’s wrong. We don’t change or take anything down until we’ve looked at it."
        footer={
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
        }
      >
        <div className="flex flex-col gap-5">
          <RadioGroup
            label="Why are you reporting it?"
            variant="cards"
            value={route}
            onValueChange={setRoute}
            error={errors.route}
            options={REPORT_ROUTES.map((value) => ({
              value,
              label: REPORT_ROUTE_INFO[value].label,
              description: WHAT_HAPPENS[value],
            }))}
          />
          <Textarea
            label="What’s wrong?"
            hint="Be as specific as you can. We never say who reported it."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={2000}
            showCount
            error={errors.details}
            rows={3}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
