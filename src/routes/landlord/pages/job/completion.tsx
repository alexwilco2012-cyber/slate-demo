// The end of a repair: confirming the work is done, what it cost against the quote, and the
// invoice. Slate records payments but never handles the money.

import { useState } from 'react'
import { CheckCircleIcon, CurrencyGbpIcon, InfoIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlate } from '@/data'
import type { Job, PersonCard, Quote } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatPence } from '@/components/slate/format'
import { BRAND } from '@/config/brand'
import { useViewer } from '@/session'
import { PhotoTile } from '../../components/photo-tile'
import { errorMessage } from '../../lib/errors'
import { firstName } from '../../lib/format'
import { daysUntil } from '../../lib/time'
import { StepCard } from './step-card'

/** Quote against final price, in a plain table. */
export function PriceCheck({ job, quote }: { job: Job; quote: Quote | undefined }) {
  const final = job.completion?.finalPricePence
  if (!quote && final === undefined) return null
  const difference = quote && final !== undefined ? final - quote.totalPence : null
  return (
    <table className="slate-table">
      <caption className="sr-only">Price against the quote</caption>
      <thead>
        <tr>
          <th scope="col">Quoted</th>
          <th scope="col">Final price</th>
          <th scope="col" data-align="end">
            Difference
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Quoted">{quote ? formatPence(quote.totalPence) : 'No quote'}</td>
          <td data-label="Final price">{final !== undefined ? formatPence(final) : 'Not given'}</td>
          <td data-label="Difference" data-align="end">
            {difference === null
              ? '—'
              : difference === 0
                ? 'Same as quoted'
                : `${difference > 0 ? 'More' : 'Less'} by ${formatPence(Math.abs(difference))}`}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function ConfirmStep({
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
  const [busy, setBusy] = useState(false)
  const name = trade ? firstName(trade.displayName) : 'The trade'

  async function confirm() {
    setBusy(true)
    try {
      await api.confirmJob(viewer, job.id)
      toast.success('Confirmed as done', {
        description: `You can now rate ${name}. You have 14 days.`,
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard
      title="Is the work done?"
      description={`${name} marked it done${job.completion ? ` on ${formatDate(job.completion.completedAt)}` : ''}. ${tenantName ? `Check with ${tenantName} if you can, then` : 'Then'} confirm it. Confirming opens your rating of ${name}.`}
      actions={
        <Button
          loading={busy}
          iconStart={<CheckCircleIcon weight="bold" aria-hidden />}
          onClick={confirm}
        >
          Confirm it’s done
        </Button>
      }
    >
      {job.completion?.note ? (
        <blockquote className="rounded-control bg-surface px-4 py-3 text-body text-ink">
          <span className="block text-small font-semibold text-muted">{name}’s note</span>“
          {job.completion.note}”
        </blockquote>
      ) : null}
      <PriceCheck job={job} quote={quote} />
      {job.completion && job.completion.photos.length > 0 ? (
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          aria-label="Photos of the finished work"
        >
          {job.completion.photos.map((photo) => (
            <li key={photo.id}>
              <PhotoTile image={photo} />
            </li>
          ))}
        </ul>
      ) : null}
    </StepCard>
  )
}

/** The invoice: amount, when it's due and whether it's paid, with "I've paid" for the landlord. */
export function PaymentCard({ job, trade }: { job: Job; trade: PersonCard | undefined }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const [busy, setBusy] = useState(false)
  const payment = job.payment
  if (!payment) return null
  const name = trade ? firstName(trade.displayName) : 'the trade'
  const days = daysUntil(now, payment.dueOn)
  const overdue = !payment.paidAt && days < 0

  async function paid() {
    setBusy(true)
    try {
      await api.recordPayment(viewer, job.id)
      toast.success('Marked as paid', {
        description: `${firstName(name)} has been told to check it’s arrived.`,
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <table className="slate-table">
        <caption className="sr-only">Invoice</caption>
        <thead>
          <tr>
            <th scope="col">Amount</th>
            <th scope="col">Sent</th>
            <th scope="col">Due</th>
            <th scope="col" data-align="end">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Amount" className="font-semibold text-ink">
              {formatPence(payment.amountPence)}
            </td>
            <td data-label="Sent">{formatDate(payment.invoicedAt)}</td>
            <td data-label="Due">{formatDate(payment.dueOn)}</td>
            <td data-label="Status" data-align="end">
              {payment.paidAt ? (
                <Badge
                  tone="positive"
                  size="sm"
                  icon={<CheckCircleIcon weight="bold" aria-hidden />}
                >
                  Paid {formatDate(payment.paidAt)}
                </Badge>
              ) : overdue ? (
                <Badge
                  tone="critical"
                  size="sm"
                  icon={<CurrencyGbpIcon weight="bold" aria-hidden />}
                >
                  Overdue by {-days} {days === -1 ? 'day' : 'days'}
                </Badge>
              ) : (
                <Badge
                  tone="caution"
                  size="sm"
                  icon={<CurrencyGbpIcon weight="bold" aria-hidden />}
                >
                  {days === 0 ? 'Due today' : `Due in ${days} ${days === 1 ? 'day' : 'days'}`}
                </Badge>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="flex items-start gap-2 text-small text-muted">
        <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        {BRAND.name} never handles the money. Pay {name} directly, then mark it paid here so they
        know. Paying on time shows on your record with trades.
      </p>
      {!payment.paidAt ? (
        <Button
          variant={overdue ? 'primary' : 'secondary'}
          loading={busy}
          className="self-start"
          onClick={paid}
        >
          I’ve paid {name}
        </Button>
      ) : null}
    </div>
  )
}
