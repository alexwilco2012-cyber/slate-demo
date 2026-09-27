// Quotes side by side, in plain money tables, and the landlord's decision on each. Accepting can
// give the go-ahead in the same step, but both steps are recorded on the repair.

import { useState } from 'react'
import { CheckIcon, ReceiptIcon, XIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import {
  QUOTE_STATUS_LABELS,
  type Job,
  type PersonCard,
  type PersonId,
  type Quote,
  type TradeScore,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatPence } from '@/components/slate/format'
import { useViewer } from '@/session'
import { ReviewPolicyLink } from '../../components/review-item'
import { TradeScoreHalves } from '../../components/trade-card'
import { errorMessage } from '../../lib/errors'
import { firstName } from '../../lib/format'
import { useJobHeadings } from './step-card'

const KIND_WORDS = { labour: 'Labour', materials: 'Materials', callout: 'Call-out', other: 'Other' }

function QuoteStatus({ quote }: { quote: Quote }) {
  if (quote.status === 'submitted') return null
  const tone = quote.status === 'accepted' ? 'positive' : 'neutral'
  const Glyph = quote.status === 'accepted' ? CheckIcon : XIcon
  return (
    <Badge tone={tone} size="sm" icon={<Glyph weight="bold" aria-hidden />}>
      {QUOTE_STATUS_LABELS[quote.status]}
    </Badge>
  )
}

function LineItems({ quote }: { quote: Quote }) {
  return (
    <table className="w-full text-small figures">
      <caption className="sr-only">What the quote covers</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {quote.lineItems.map((item, index) => (
          <tr key={index} className="border-b border-line align-top">
            <td className="py-2 pr-3 text-ink">
              {item.description}
              <span className="block text-caption text-muted">
                {KIND_WORDS[item.kind]}
                {item.quantity !== 1 ? ` · ${item.quantity} × ${formatPence(item.unitPence)}` : ''}
              </span>
            </td>
            <td className="py-2 text-right whitespace-nowrap text-ink">
              {formatPence(item.quantity * item.unitPence)}
            </td>
          </tr>
        ))}
        <tr>
          <td className="pt-2 pr-3 text-muted">VAT</td>
          <td className="pt-2 text-right text-muted">
            {quote.vatPence > 0 ? formatPence(quote.vatPence) : 'None'}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export interface QuotesProps {
  job: Job
  quotes: Quote[]
  scores: ReadonlyMap<PersonId, TradeScore>
  people: ReadonlyMap<PersonId, PersonCard>
  /** Whether the viewer may accept quotes (agents need the permission). */
  canDecide: boolean
}

export function QuotesCompare({ job, quotes, scores, people, canDecide }: QuotesProps) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [accepting, setAccepting] = useState<Quote | null>(null)
  const [instruct, setInstruct] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const headings = useJobHeadings()
  const Item = headings.item
  const open = quotes.filter((q) => q.status === 'submitted')
  const decided = Boolean(job.acceptedQuoteId)
  const shown = decided ? quotes : [...open, ...quotes.filter((q) => q.status !== 'submitted')]

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="No quotes yet"
        description={
          job.board?.closesAt
            ? `Quotes close ${formatDate(job.board.closesAt)}. We’ll tell you as each one arrives.`
            : 'We’ll tell you as soon as one arrives.'
        }
        headingLevel={headings.item}
      />
    )
  }

  const tradeName = (id: PersonId) => people.get(id)?.displayName ?? 'The trade'
  const business = (id: PersonId) => people.get(id)?.tradeProfile?.businessName ?? tradeName(id)

  async function accept() {
    if (!accepting) return
    setBusy('accept')
    const name = firstName(tradeName(accepting.tradeId))
    try {
      await api.acceptQuote(
        viewer,
        accepting.id,
        instruct ? { instruct: true, note: note.trim() || undefined } : {},
      )
      toast.success(instruct ? `${name} has the go-ahead` : `Quote accepted`, {
        description: instruct
          ? `${name} will book a visit and the tenant gets written notice first.`
          : `Give ${name} the go-ahead when you’re ready.`,
      })
      setAccepting(null)
      setNote('')
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  async function decline(quote: Quote) {
    setBusy(quote.id)
    try {
      await api.declineQuote(viewer, quote.id)
      toast.success('Quote turned down', {
        description: `${firstName(tradeName(quote.tradeId))} has been told.`,
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  const others = accepting ? open.filter((q) => q.id !== accepting.id) : []

  return (
    <>
      <ul
        className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]"
        aria-label="Quotes"
      >
        {shown.map((quote) => {
          const score = scores.get(quote.tradeId)
          const person = people.get(quote.tradeId)
          const faded =
            quote.status === 'declined' ||
            quote.status === 'withdrawn' ||
            quote.status === 'expired'
          return (
            <li
              key={quote.id}
              className={cn(
                'row-span-5 grid grid-rows-subgrid gap-4 rounded-card border bg-surface p-4 shadow-soft sm:p-5',
                quote.status === 'accepted' ? 'border-accent-strong' : 'border-line',
                faded && 'bg-surface-2 shadow-none',
              )}
            >
              <header className="flex items-start gap-3">
                <Avatar
                  name={person?.displayName ?? 'Trade'}
                  seed={person?.avatarSeed}
                  role="trade"
                  size="sm"
                  decorative
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Item className="font-semibold leading-snug text-ink">
                    {business(quote.tradeId)}
                  </Item>
                  <p className="text-small text-muted">
                    {tradeName(quote.tradeId)} · sent {formatDate(quote.submittedAt)}
                  </p>
                </div>
                <QuoteStatus quote={quote} />
              </header>

              <div className="flex flex-col gap-1">
                <p className="text-small text-muted">Total</p>
                <p className="font-display figures text-display-l leading-none font-semibold text-ink">
                  {formatPence(quote.totalPence)}
                </p>
                <p className="text-caption text-muted">
                  {quote.vatPence > 0 ? 'Including VAT' : 'No VAT charged'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <LineItems quote={quote} />
                <dl className="grid grid-cols-2 gap-2 text-small">
                  <div>
                    <dt className="text-muted">Can start</dt>
                    <dd className="figures text-ink">
                      {quote.earliestStart ? formatDate(quote.earliestStart) : 'Not given'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Valid until</dt>
                    <dd className="figures text-ink">{formatDate(quote.validUntil)}</dd>
                  </div>
                </dl>
                {quote.notes ? (
                  <p className="rounded-control bg-surface-2 px-3 py-2.5 text-small text-ink">
                    <span className="sr-only">Notes from the trade: </span>“{quote.notes}”
                  </p>
                ) : null}
              </div>

              <div>{score ? <TradeScoreHalves score={score} /> : null}</div>

              <div className="flex flex-col gap-2 self-end">
                {quote.status === 'submitted' && canDecide && !decided ? (
                  <>
                    <Button onClick={() => setAccepting(quote)}>
                      Accept {firstName(tradeName(quote.tradeId))}’s quote
                    </Button>
                    <Button
                      variant="ghost"
                      loading={busy === quote.id}
                      onClick={() => decline(quote)}
                    >
                      Not this one
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <ReviewPolicyLink className="self-start" />

      <Dialog open={accepting !== null} onOpenChange={(next) => (next ? null : setAccepting(null))}>
        <DialogContent
          title={
            accepting ? `Accept the quote from ${business(accepting.tradeId)}?` : 'Accept quote'
          }
          description={
            accepting
              ? `${formatPence(accepting.totalPence)} for “${job.title}”.${others.length ? ` The other ${others.length === 1 ? 'quote' : `${others.length} quotes`} will be marked not chosen, and ${others.length === 1 ? 'that trade is' : 'those trades are'} told.` : ''}`
              : undefined
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setAccepting(null)}>
                Cancel
              </Button>
              <Button loading={busy === 'accept'} onClick={accept}>
                {instruct ? 'Accept and give the go-ahead' : 'Accept quote'}
              </Button>
            </>
          }
        >
          {accepting ? (
            <div className="flex flex-col gap-4">
              <Checkbox
                label={`Give ${firstName(tradeName(accepting.tradeId))} the go-ahead now`}
                description="This instructs them to do the work. They then book a visit, with at least 48 hours’ written notice to the tenant. Both steps are recorded on the repair."
                checked={instruct}
                onCheckedChange={setInstruct}
              />
              {instruct ? (
                <Textarea
                  label="Anything they should know?"
                  optional
                  hint="For example, where the key is or how to reach the tenant."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  showCount
                  rows={3}
                />
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
