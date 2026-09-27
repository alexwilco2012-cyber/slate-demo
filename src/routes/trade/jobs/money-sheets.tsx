// Getting paid: sending the invoice and saying the money arrived. Slate never takes or holds the
// money; this only records what each side says.

import { useState } from 'react'
import { CheckCircleIcon, InvoiceIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import type { Job, PaymentTermsDays } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ChoiceTiles } from '../components/choice-tiles'
import { errorText, fieldError } from '../lib/errors'
import { parsePounds, poundsInput } from '../lib/money'
import { TERMS } from './complete-sheet'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
}

export function InvoiceSheet({
  open,
  onOpenChange,
  job,
  defaultPence,
  landlordName,
}: SheetProps & { defaultPence: number | undefined; landlordName: string }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [amount, setAmount] = useState(defaultPence !== undefined ? poundsInput(defaultPence) : '')
  const [terms, setTerms] = useState<`${PaymentTermsDays}`>('14')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function send() {
    const pence = parsePounds(amount)
    if (pence === null) {
      setError('Enter the amount in pounds, like 92.50.')
      return
    }
    setSaving(true)
    try {
      await api.sendInvoice(viewer, job.id, {
        amountPence: pence,
        dueInDays: Number(terms) as PaymentTermsDays,
      })
      onOpenChange(false)
      toast.success('Invoice sent', {
        description: `${landlordName} pays you directly, then marks it paid.`,
      })
    } catch (caught) {
      setError(fieldError(caught, 'amountPence') ?? errorText(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Send your invoice"
        description={`${landlordName} gets it on the job, with the date it’s due.`}
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Cancel</Button>} />
            <Button
              loading={saving}
              iconStart={<InvoiceIcon weight="bold" aria-hidden />}
              onClick={send}
            >
              Send invoice
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Amount"
            leading="£"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={error}
          />
          <ChoiceTiles
            label="Payment due"
            options={TERMS}
            value={terms}
            onValueChange={setTerms}
            columns={4}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PaymentReceivedDialog({
  open,
  onOpenChange,
  job,
  landlordName,
}: SheetProps & { landlordName: string }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const amount = job.payment ? formatPence(job.payment.amountPence) : ''

  async function confirm() {
    setSaving(true)
    try {
      await api.recordPayment(viewer, job.id)
      onOpenChange(false)
      toast.success('Marked as paid', { description: `We’ve let ${landlordName} know.` })
    } catch (error) {
      toast.error('Not marked as paid', { description: errorText(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Has ${amount} arrived?`}
        description="Only mark it paid once the money is in your account. This counts towards the landlord’s “Paid on time” record."
        size="sm"
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Not yet</Button>} />
            <Button
              loading={saving}
              iconStart={<CheckCircleIcon weight="bold" aria-hidden />}
              onClick={confirm}
            >
              Yes, it’s arrived
            </Button>
          </>
        }
      />
    </Dialog>
  )
}
