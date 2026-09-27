// The report sheet behind every Report button: the four routes the law sets out (SPEC §6), what
// happens next on each, and a box to say what's wrong.

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FlagIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import {
  REPORT_ROUTE_INFO,
  REPORT_ROUTES,
  type ClockRule,
  type ReportRoute,
  type ReportTarget,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'
import { errorMessage, fieldErrors } from '../lib/errors'

const UNIT_WORDS: Record<ClockRule['unit'], string> = {
  hours: 'hours',
  working_hours: 'working hours',
  days: 'days',
  working_days: 'working days',
}

const STEP_WORDS: Record<ClockRule['step'], string> = {
  notify_poster: 'We tell the person who posted it within',
  review: 'We look at it within',
  acknowledge: 'We reply to you within',
}

/** "We tell the person who posted it within 48 working hours." */
export function clockText(route: ReportRoute): string {
  const { clock } = REPORT_ROUTE_INFO[route]
  return `${STEP_WORDS[clock.step]} ${clock.amount} ${UNIT_WORDS[clock.unit]}.`
}

const ROUTE_NOTES: Partial<Record<ReportRoute, string>> = {
  defamation: ' They can answer before we decide.',
  fake: ' Until then it shows as “pending check”.',
}

export interface ReportDialogProps {
  target: ReportTarget
  /** What is being reported, for the title: "this review", "this message". */
  what: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDialog({ target, what, open, onOpenChange }: ReportDialogProps) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [route, setRoute] = useState<ReportRoute | undefined>()
  const [details, setDetails] = useState('')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [sending, setSending] = useState(false)

  function reset() {
    setRoute(undefined)
    setDetails('')
    setErrors({})
  }

  async function send() {
    if (!route) {
      setErrors({ route: 'Choose why you are reporting this.' })
      return
    }
    if (details.trim().length < 10) {
      setErrors({ details: 'Say what is wrong in a sentence or two (10 characters or more).' })
      return
    }
    setSending(true)
    try {
      await api.submitReport(viewer, { target, route, details })
      toast.success('Report sent', {
        description: `${clockText(route)} You can follow it under Reports.`,
      })
      onOpenChange(false)
      reset()
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { details: errorMessage(error) })
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
        description="Choose the reason that fits best. A person checks every report. Nothing comes down automatically."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
            onValueChange={(next) => {
              setRoute(next)
              setErrors((current) => ({ ...current, route: undefined }))
            }}
            error={errors.route}
            options={REPORT_ROUTES.map((value) => ({
              value,
              label: REPORT_ROUTE_INFO[value].label,
              description: (
                <>
                  {clockText(value)}
                  {ROUTE_NOTES[value] ?? ''}{' '}
                  <span className="text-caption">({REPORT_ROUTE_INFO[value].basis})</span>
                </>
              ),
            }))}
          />
          <Textarea
            label="What’s wrong?"
            hint="Stick to facts. The person who posted it may see this if it’s a defamation report."
            value={details}
            onChange={(event) => {
              setDetails(event.target.value)
              setErrors((current) => ({ ...current, details: undefined }))
            }}
            maxLength={2000}
            showCount
            rows={4}
            error={errors.details}
          />
          <p className="text-small text-muted">
            Reports you make, and reports about what you’ve written, are under{' '}
            <Link to="/landlord/reports" className="font-semibold text-accent-text underline">
              Reports
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A Report button that opens the sheet. */
export function ReportButton({
  target,
  what,
  children = 'Report',
  className,
}: {
  target: ReportTarget
  what: string
  children?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        iconStart={<FlagIcon weight="bold" aria-hidden />}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </Button>
      <ReportDialog target={target} what={what} open={open} onOpenChange={setOpen} />
    </>
  )
}
