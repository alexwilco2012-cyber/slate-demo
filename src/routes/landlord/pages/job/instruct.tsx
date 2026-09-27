// The explicit go-ahead. It is its own step, after the quote is accepted and before anything is
// booked, so the record always shows the landlord chose (SPEC §4 legal rule).

import { useState } from 'react'
import { PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import type { Job, PersonCard, Quote } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { errorMessage, fieldErrors } from '../../lib/errors'
import { firstName } from '../../lib/format'
import { StepCard } from './step-card'

export function InstructStep({
  job,
  trade,
  quote,
  tenantName,
}: {
  job: Job
  trade: PersonCard | undefined
  quote: Quote | undefined
  tenantName: string | undefined
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const name = trade ? firstName(trade.displayName) : 'the trade'
  const business = trade?.tradeProfile?.businessName ?? trade?.displayName ?? 'the trade'
  const withoutQuote = !quote

  async function instruct() {
    setBusy(true)
    setError(undefined)
    try {
      await api.instructTrade(viewer, job.id, note.trim() ? { note } : {})
      toast.success(`${name} has the go-ahead`, {
        description: `They’ll book a visit next${tenantName ? `, and ${tenantName} gets written notice first` : ''}.`,
      })
      setNote('')
    } catch (err) {
      setError(fieldErrors(err).note ?? errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard
      title={`Give ${name} the go-ahead`}
      description={
        withoutQuote
          ? `This is an emergency, so you can instruct ${business} without a quote. They’ll book a visit straight away.`
          : `You accepted the ${formatPence(quote.totalPence)} quote from ${business}. Instructing them is your go-ahead to do the work. After this they book a visit${tenantName ? `, and ${tenantName} gets at least 48 hours’ written notice` : ''}.`
      }
      actions={
        <Button
          loading={busy}
          iconStart={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
          onClick={instruct}
        >
          Instruct {business}
        </Button>
      }
    >
      <Textarea
        label={`Anything ${name} should know?`}
        optional
        hint="For example, where the key is kept or the best way to reach the tenant."
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
          setError(undefined)
        }}
        maxLength={500}
        showCount
        rows={2}
        error={error}
      />
    </StepCard>
  )
}
