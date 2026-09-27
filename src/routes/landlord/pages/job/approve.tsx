// Step one for a reported repair: approve it (optionally with a note to the tenant) or decline it
// with a reason the tenant will read.

import { useState } from 'react'
import { CheckIcon, ProhibitIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import { GAS_APPLIANCE_LABELS, type CredentialRequirement, type Job } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'
import { errorMessage, fieldErrors } from '../../lib/errors'
import { firstName, lowerFirst } from '../../lib/format'
import { StepCard } from './step-card'

/** "a Gas Safe engineer registered for boilers and central heating". */
export function credentialText(credential: CredentialRequirement): string {
  return credential.kind === 'gas_safe'
    ? `a Gas Safe engineer registered for ${lowerFirst(GAS_APPLIANCE_LABELS[credential.applianceCategory])}`
    : 'an electrician who is a SELECT, NICEIC or NAPIT member, or has evidenced the competence checklist'
}

export function CredentialNote({ credential }: { credential: CredentialRequirement }) {
  return (
    <p className="flex items-start gap-2 rounded-control bg-brand-tint px-3.5 py-3 text-small text-brand">
      <ShieldCheckIcon weight="fill" aria-hidden className="mt-0.5 size-4.5 shrink-0" />
      <span>
        This work needs {credentialText(credential)}. Only trades with that credential checked can
        be chosen.
      </span>
    </p>
  )
}

export function ApproveStep({ job, reporterName }: { job: Job; reporterName: string }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [open, setOpen] = useState<'approve' | 'decline' | null>(null)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const tenant = firstName(reporterName)

  function close() {
    setOpen(null)
    setError(undefined)
  }

  async function approve() {
    setBusy(true)
    try {
      await api.approveJob(viewer, job.id, note.trim() ? { note } : {})
      toast.success('Repair approved', {
        description: `${tenant} has been told. Next, choose how to find a trade.`,
      })
      close()
      setNote('')
    } catch (err) {
      setError(fieldErrors(err).note ?? errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function decline() {
    if (reason.trim().length < 5) {
      setError(`Give ${tenant} a reason, in a sentence.`)
      return
    }
    setBusy(true)
    try {
      await api.declineJob(viewer, job.id, reason)
      toast.success('Repair declined', { description: `${tenant} can see your reason.` })
      close()
      setReason('')
    } catch (err) {
      setError(fieldErrors(err).reason ?? errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard
      title="Approve this repair?"
      description={`${tenant} reported this. Approve it to choose a trade, or decline it with a reason ${tenant} will see.`}
      actions={
        <>
          <Button
            variant="secondary"
            iconStart={<ProhibitIcon weight="bold" aria-hidden />}
            onClick={() => setOpen('decline')}
          >
            Decline
          </Button>
          <Button
            iconStart={<CheckIcon weight="bold" aria-hidden />}
            onClick={() => setOpen('approve')}
          >
            Approve
          </Button>
        </>
      }
    >
      <Dialog open={open === 'approve'} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent
          title="Approve the repair"
          description={`${tenant} is told straight away. Then you choose who does the work.`}
          footer={
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button loading={busy} onClick={approve}>
                Approve repair
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {job.credentialNeeded ? <CredentialNote credential={job.credentialNeeded} /> : null}
            <Textarea
              label={`A note for ${tenant}`}
              optional
              hint="For example, when you expect someone to be in touch."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              showCount
              rows={3}
              error={error}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'decline'} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent
          title="Decline the repair"
          description={`${tenant} will see your reason on the repair. If it’s something you’ll fix another way, say so.`}
          footer={
            <>
              <Button variant="secondary" onClick={close}>
                Keep it open
              </Button>
              <Button variant="danger" loading={busy} onClick={decline}>
                Decline repair
              </Button>
            </>
          }
        >
          <Textarea
            label="Reason"
            hint="Plain and polite. For example: “The boiler is under warranty; the installer is coming on Tuesday.”"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(undefined)
            }}
            maxLength={500}
            showCount
            rows={4}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </StepCard>
  )
}
