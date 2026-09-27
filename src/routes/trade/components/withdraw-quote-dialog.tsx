import { useState } from 'react'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import type { Quote } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { errorText, fieldError } from '../lib/errors'
import { ChoiceTiles } from './choice-tiles'

const REASONS = [
  'I can’t fit it in',
  'I priced it wrong',
  'It’s not work I do',
  'Something else',
] as const
type Reason = (typeof REASONS)[number]

/** Takes back a quote still waiting for an answer. The landlord is told, with the reason. */
export function WithdrawQuoteDialog({
  quote,
  landlordName,
  open,
  onOpenChange,
}: {
  quote: Quote
  landlordName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [reason, setReason] = useState<Reason | undefined>()
  const [more, setMore] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function withdraw() {
    setSaving(true)
    try {
      const text = [
        reason && reason !== 'Something else' ? `${reason}.` : null,
        more.trim() || null,
      ]
        .filter(Boolean)
        .join(' ')
      await api.withdrawQuote(viewer, quote.id, text || undefined)
      onOpenChange(false)
      toast.success('Quote withdrawn', {
        description: `${landlordName} has been told. You can send a new one while the job is open.`,
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
        title={`Withdraw your ${formatPence(quote.totalPence)} quote?`}
        description={`${landlordName} is told straight away, so they can choose someone else.`}
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Keep my quote</Button>} />
            <Button
              variant="danger"
              loading={saving}
              iconStart={<ArrowUUpLeftIcon weight="bold" aria-hidden />}
              onClick={withdraw}
            >
              Withdraw quote
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <ChoiceTiles
            label="Why?"
            hint={`Optional. ${landlordName} sees the reason.`}
            options={REASONS.map((value) => ({ value, label: value }))}
            value={reason}
            onValueChange={setReason}
          />
          <Textarea
            label="Anything to add?"
            optional
            value={more}
            onChange={(event) => setMore(event.target.value)}
            maxLength={250}
            rows={2}
            error={error}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
