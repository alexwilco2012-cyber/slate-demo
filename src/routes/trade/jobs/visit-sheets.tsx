// Quick sheets for the day of a visit: telling everyone you're on your way, saying you couldn't
// get in, and calling a visit off to rearrange it.

import { useState } from 'react'
import { CarProfileIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import type { Job, ThreadId, Visit } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatTime } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ChoiceTiles } from '../components/choice-tiles'
import { errorText, fieldError } from '../lib/errors'
import { formatShortDay } from '../lib/time'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ETAS = [
  { minutes: 10, label: 'About 10 minutes', message: 'On my way, there in about 10 minutes.' },
  { minutes: 20, label: 'About 20 minutes', message: 'On my way, there in about 20 minutes.' },
  { minutes: 30, label: 'About half an hour', message: 'On my way, there in about half an hour.' },
  { minutes: 60, label: 'About an hour', message: 'On my way, there in about an hour.' },
] as const

/** One tap sends "On my way" with how long, to everyone on the job. */
export function OnMyWaySheet({
  open,
  onOpenChange,
  threadId,
  tenantName,
}: SheetProps & { threadId: ThreadId | undefined; tenantName: string }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [sending, setSending] = useState<number | null>(null)

  async function send(eta: (typeof ETAS)[number]) {
    if (!threadId) return
    setSending(eta.minutes)
    try {
      await api.sendMessage(viewer, threadId, { body: eta.message })
      onOpenChange(false)
      toast.success(`${tenantName} knows you’re on your way`)
    } catch (error) {
      toast.error('Message not sent', { description: errorText(error) })
    } finally {
      setSending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="On my way"
        description={`How long until you’re there? ${tenantName} and the landlord get a message.`}
      >
        <ul className="flex flex-col gap-(--gap-touch)">
          {ETAS.map((eta) => (
            <li key={eta.minutes}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                loading={sending === eta.minutes}
                iconStart={<CarProfileIcon weight="bold" aria-hidden />}
                onClick={() => send(eta)}
                className="justify-start"
              >
                {eta.label}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

const NO_ACCESS_REASONS = [
  'Nobody was in',
  'The key didn’t work',
  'Couldn’t reach the area',
  'Something else',
] as const
type NoAccessReason = (typeof NO_ACCESS_REASONS)[number]

/** "Couldn't get in": the visit ends and the job goes back to booking another. */
export function NoAccessSheet({
  open,
  onOpenChange,
  job,
  visit,
}: SheetProps & { job: Job; visit: Visit }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [reason, setReason] = useState<NoAccessReason | undefined>()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!reason) {
      setError('Choose what happened.')
      return
    }
    setSaving(true)
    try {
      const text = [reason === 'Something else' ? null : `${reason}.`, note.trim() || null]
        .filter(Boolean)
        .join(' ')
      await api.recordNoAccess(viewer, job.id, visit.id, text || undefined)
      onOpenChange(false)
      toast.success('We’ve noted you couldn’t get in', {
        description: 'We’ve told everyone on the job. Book another visit when it suits.',
      })
    } catch (caught) {
      setError(fieldError(caught, 'note') ?? errorText(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Couldn’t get in"
        description="We’ll tell the tenant and the landlord, and the job goes back to booking a visit."
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Cancel</Button>} />
            <Button loading={saving} onClick={save}>
              Tell everyone
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <ChoiceTiles
            label="What happened?"
            options={NO_ACCESS_REASONS.map((value) => ({ value, label: value }))}
            value={reason}
            onValueChange={(value) => {
              setReason(value)
              setError(undefined)
            }}
            error={!reason ? error : undefined}
          />
          <Textarea
            label="Anything to add?"
            optional
            hint="Goes on the job, e.g. “Rang the buzzer and called. Back Tuesday.”"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={400}
            rows={2}
            error={reason ? error : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Calls off a booked visit so another time can be booked. The reason goes on the job. */
export function RearrangeSheet({
  open,
  onOpenChange,
  job,
  visit,
}: SheetProps & { job: Job; visit: Visit }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.cancelVisit(viewer, job.id, visit.id, reason)
      onOpenChange(false)
      toast.success('Visit called off', {
        description: 'We’ve told everyone on the job. Book a new time when you’re ready.',
      })
    } catch (caught) {
      setError(fieldError(caught, 'reason') ?? errorText(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Rearrange the visit"
        description={`This calls off the visit on ${formatShortDay(visit.startsAt)} at ${formatTime(visit.startsAt)}. Then you can book a new time, with fresh notice.`}
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Keep the visit</Button>} />
            <Button variant="danger" loading={saving} onClick={save}>
              Call off this visit
            </Button>
          </>
        }
      >
        <Textarea
          label="Why?"
          hint="Everyone on the job sees this."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          rows={2}
          error={error}
        />
      </DialogContent>
    </Dialog>
  )
}
