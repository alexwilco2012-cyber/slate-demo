// Quotes and invoices: every quote the trade has sent and what happened to it, and every invoice
// with whether it's paid, due or late. Plain tables, because it's money (SPEC §9).

import { Link, useSearchParams } from 'react-router'
import {
  CheckCircleIcon,
  ClockCountdownIcon,
  ReceiptIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery, type SlateApi, type Viewer } from '@/data'
import type { ClientRating, PersonCard, PersonId, Quote } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { PageHeader } from '@/components/slate/page-header'
import { formatPence, plural } from '@/components/slate/format'
import { StatTile } from '@/components/slate/stat-tile'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { PaidOnTime } from '../components/client-record'
import { LoadError, PageSkeleton, Section } from '../components/page-bits'
import { StatusBadge } from '../components/status-badge'
import { INVOICE_REMINDER_DAYS, paymentState, statusMeta, type TradeStatus } from '../lib/job'
import { loadClientRatings, loadJobs, type JobView } from '../lib/queries'
import { daysFrom, formatDayIn, ukDay } from '../lib/time'

interface QuoteRow {
  quote: Quote
  title: string
  area: string
  /** Where the row links: the job once instructed, else the board post. */
  to: string
}

interface MoneyData {
  quotes: QuoteRow[]
  views: JobView[]
  people: Record<PersonId, PersonCard>
  clients: Record<PersonId, ClientRating>
}

async function loadMoney(api: SlateApi, viewer: Viewer): Promise<MoneyData> {
  const [overview, posts] = await Promise.all([loadJobs(api, viewer), api.listJobBoard(viewer)])
  const boardQuotes = await Promise.all(posts.map((post) => api.listQuotes(viewer, post.jobId)))
  const rows = new Map<string, QuoteRow>()
  for (const view of overview.views) {
    for (const quote of view.quotes) {
      rows.set(quote.id, {
        quote,
        title: view.job.title,
        area: view.property?.neighbourhood ?? '',
        to: `/trade/jobs/${view.job.id}`,
      })
    }
  }
  posts.forEach((post, index) => {
    for (const quote of boardQuotes[index] ?? []) {
      if (rows.has(quote.id)) continue
      rows.set(quote.id, {
        quote,
        title: post.title,
        area: post.neighbourhood,
        to: `/trade/board/${post.jobId}`,
      })
    }
  })
  const clients = await loadClientRatings(
    api,
    viewer,
    overview.views.flatMap((view) =>
      view.job.payment && view.property ? [view.property.landlordId] : [],
    ),
  )
  return {
    quotes: [...rows.values()].sort((a, b) =>
      b.quote.submittedAt.localeCompare(a.quote.submittedAt),
    ),
    views: overview.views,
    people: overview.people,
    clients,
  }
}

const QUOTE_STATUS: Record<Quote['status'], TradeStatus> = {
  submitted: statusMeta('quote_sent'),
  accepted: { ...statusMeta('paid'), label: 'Accepted' },
  declined: { ...statusMeta('closed'), label: 'Not chosen' },
  withdrawn: { ...statusMeta('closed'), label: 'Withdrawn' },
  expired: { ...statusMeta('closed'), label: 'Expired' },
}

type Tab = 'quotes' | 'invoices'

export default function QuotesPage() {
  const viewer = useViewer()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'invoices' ? 'invoices' : 'quotes'
  const { state, refresh } = useSlateQuery((api) => loadMoney(api, viewer), [viewer])

  return (
    <PortalPage title="Quotes and invoices" width="wide">
      <PageHeader
        title="Quotes and invoices"
        description="What you’ve priced, what you’ve billed, and who has paid. Landlords pay you directly."
      />
      {state.status === 'loading' ? (
        <PageSkeleton label="Loading your quotes and invoices" cards={2} />
      ) : !state.data ? (
        <LoadError what="your quotes and invoices" onRetry={refresh} />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) =>
            setParams(value === 'invoices' ? { tab: 'invoices' } : {}, { replace: true })
          }
        >
          <TabsList>
            <TabsTab value="quotes">Quotes</TabsTab>
            <TabsTab value="invoices">Invoices</TabsTab>
          </TabsList>
          <TabsPanel value="quotes">
            <QuotesTab rows={state.data.quotes} />
          </TabsPanel>
          <TabsPanel value="invoices">
            <InvoicesTab data={state.data} />
          </TabsPanel>
        </Tabs>
      )}
    </PortalPage>
  )
}

function QuotesTab({ rows }: { rows: QuoteRow[] }) {
  const today = ukDay(useDemoNow())
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        headingLevel="h2"
        title="No quotes yet"
        description="Quotes you send from the job board, or for jobs landlords choose you for, show here."
        action={
          <Link to="/trade/board" className={buttonVariants({ variant: 'primary' })}>
            Find work on the job board
          </Link>
        }
      />
    )
  }
  const waiting = rows.filter((row) => row.quote.status === 'submitted')
  // Empty groups are left out, except "waiting", which says where the next quote comes from.
  const groups: { title: string; rows: QuoteRow[] }[] = [
    { title: 'Waiting for an answer', rows: waiting },
    { title: 'Accepted', rows: rows.filter((row) => row.quote.status === 'accepted') },
    {
      title: 'Didn’t go ahead',
      rows: rows.filter((row) => !['submitted', 'accepted'].includes(row.quote.status)),
    },
  ].filter((group) => group.rows.length > 0 || group.rows === waiting)
  return (
    <div className="flex flex-col gap-10 pt-2">
      {groups.map((group) => (
        <Section key={group.title} title={group.title} count={group.rows.length}>
          {group.rows.length === 0 ? (
            <p className="flex flex-wrap items-center gap-x-1 rounded-card border border-dashed border-input-border px-4 py-3 text-ink">
              Nothing waiting on a landlord.
              <Link to="/trade/board" className="font-semibold text-accent-text underline">
                See what’s on the job board
              </Link>
            </p>
          ) : (
            <div className="rounded-card border border-line bg-surface px-4 shadow-soft">
              <table className="slate-table">
                <caption className="sr-only">{group.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Sent</th>
                    <th scope="col" data-align="end">
                      Total
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.quote.id}>
                      <td data-primary>
                        <Link
                          to={row.to}
                          className="-my-2.5 block py-2.5 font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {row.title}
                        </Link>
                        <span className="block text-small text-muted">{row.area}</span>
                      </td>
                      <td data-label="Sent" className="whitespace-nowrap">
                        {formatDayIn(row.quote.submittedAt, today)}
                      </td>
                      <td data-label="Total" data-align="end" className="font-bold">
                        {formatPence(row.quote.totalPence)}
                      </td>
                      <td data-label="Status" data-full>
                        <StatusBadge status={QUOTE_STATUS[row.quote.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ))}
    </div>
  )
}

function InvoicesTab({ data }: { data: MoneyData }) {
  const now = useDemoNow()
  const today = ukDay(now)
  const invoiced = data.views.filter((view) => view.job.payment)
  // Recent work only, as with the reminder on the home screen: older jobs were settled before
  // invoices were tracked here.
  const toSend = data.views.filter(
    (view) =>
      (view.job.status === 'completed' || view.job.status === 'confirmed') &&
      !view.job.payment &&
      view.job.completion !== undefined &&
      daysFrom(ukDay(view.job.completion.completedAt), today) <= INVOICE_REMINDER_DAYS,
  )
  const rank = (view: JobView) => {
    const state = paymentState(view.job.payment, today)
    return state.kind === 'late' ? 0 : state.kind === 'due' ? 1 : 2
  }
  const rows = [...invoiced].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (b.job.payment?.invoicedAt ?? '').localeCompare(a.job.payment?.invoicedAt ?? ''),
  )
  const sum = (views: JobView[]) =>
    views.reduce((total, view) => total + (view.job.payment?.amountPence ?? 0), 0)
  const late = rows.filter((view) => paymentState(view.job.payment, today).kind === 'late')
  const due = rows.filter((view) => paymentState(view.job.payment, today).kind === 'due')
  const paid = rows.filter((view) => paymentState(view.job.payment, today).kind === 'paid')

  if (rows.length === 0 && toSend.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        headingLevel="h2"
        title="No invoices yet"
        description="When you mark a job done you can send the invoice in the same step. It shows here until it’s paid."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Owed to you"
          value={formatPence(sum([...late, ...due]))}
          hint={plural(late.length + due.length, 'invoice')}
          icon={ClockCountdownIcon}
        />
        <StatTile
          label="Late"
          value={formatPence(sum(late))}
          hint={late.length > 0 ? `${plural(late.length, 'invoice')} past due` : 'Nothing late'}
          icon={WarningCircleIcon}
        />
        <StatTile
          label="Paid"
          value={formatPence(sum(paid))}
          hint={paid.length > 0 ? plural(paid.length, 'invoice') : 'None marked paid yet'}
          icon={CheckCircleIcon}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {toSend.length > 0 ? (
        <Section title="Not sent yet" count={toSend.length}>
          <ul className="flex flex-col gap-3">
            {toSend.map((view) => (
              <li
                key={view.job.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-ink">{view.job.title}</span>
                  <span className="text-small text-muted">
                    Done{' '}
                    {view.job.completion ? formatDayIn(view.job.completion.completedAt, today) : ''}
                  </span>
                </div>
                <Link
                  to={`/trade/jobs/${view.job.id}?invoice=1`}
                  className={buttonVariants({ variant: 'soft' })}
                >
                  Send invoice
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Invoices" count={rows.length}>
        <div className="rounded-card border border-line bg-surface px-4 shadow-soft">
          <table className="slate-table">
            <caption className="sr-only">Invoices, late ones first</caption>
            <thead>
              <tr>
                <th scope="col">Job and client</th>
                <th scope="col" data-align="end">
                  Amount
                </th>
                <th scope="col">Due</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((view) => {
                const payment = view.job.payment
                if (!payment) return null
                const state = paymentState(payment, today)
                const landlordId = view.property?.landlordId
                const landlord = landlordId ? data.people[landlordId] : undefined
                const client = landlordId ? data.clients[landlordId] : undefined
                const status =
                  state.kind === 'late'
                    ? {
                        meta: statusMeta('payment_late'),
                        words: `${plural(state.daysLate, 'day')} late`,
                      }
                    : state.kind === 'due'
                      ? {
                          meta: statusMeta('awaiting_payment'),
                          words:
                            state.daysLeft === 0
                              ? 'Due today'
                              : `Due in ${plural(state.daysLeft, 'day')}`,
                        }
                      : {
                          meta: statusMeta('paid'),
                          words: payment.paidAt
                            ? `Paid ${formatDayIn(payment.paidAt, today)}`
                            : 'Paid',
                        }
                return (
                  <tr key={view.job.id}>
                    <td data-primary>
                      <Link
                        to={`/trade/jobs/${view.job.id}`}
                        className="-my-2.5 block py-2.5 font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {view.job.title}
                      </Link>
                      <span className="block text-small text-muted">
                        {landlord?.displayName ?? 'Landlord'}
                      </span>
                      {state.kind === 'late' && client ? (
                        <PaidOnTime rating={client} className="mt-1 text-small" />
                      ) : null}
                    </td>
                    <td data-label="Amount" data-align="end" className="font-bold">
                      {formatPence(payment.amountPence)}
                    </td>
                    <td data-label="Due" className="whitespace-nowrap">
                      {formatDayIn(payment.dueOn, today)}
                      <span className="block text-small text-muted">
                        Sent {formatDayIn(payment.invoicedAt, today)}
                      </span>
                    </td>
                    <td data-label="Status" data-full>
                      <StatusBadge status={status.meta} label={status.words} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
