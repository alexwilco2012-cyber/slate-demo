// One tenancy: who, rent, deposit and documents; confirming a new one (ratings only unlock for a
// tenancy both sides confirmed), recording its end, and the ratings it opens.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ChatsCircleIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  HouseLineIcon,
  IdentificationCardIcon,
  VaultIcon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { BRAND } from '@/config/brand'
import {
  DEPOSIT_SCHEME_LABELS,
  DOCUMENT_TYPE_INFO,
  type PersonId,
  type TenancyId,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { Section } from '../components/section'
import { ErrorPanel, PageSkeleton } from '../components/states'
import { StepCard } from './job/step-card'
import { rateHref } from '../lib/actions'
import { useAccountId, usePeople, usePermissions } from '../lib/data'
import { errorMessage, fieldErrors, isMissing } from '../lib/errors'
import { firstName, formatPounds, joinNames, ordinal, placeOf, streetOf } from '../lib/format'
import { ukDate } from '../lib/time'

const STATUS = {
  proposed: { label: 'Waiting to be confirmed', tone: 'caution', icon: CircleDashedIcon },
  confirmed: { label: 'Confirmed', tone: 'positive', icon: CheckCircleIcon },
  ended: { label: 'Ended', tone: 'neutral', icon: HouseLineIcon },
} as const

export default function TenancyPage() {
  const { tenancyId } = useParams()
  const id = tenancyId as TenancyId
  const viewer = useViewer()
  const accountId = useAccountId()
  const can = usePermissions()
  const { api } = useSlate()
  const toast = useToast()
  const now = useDemoNow()
  const [busy, setBusy] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endDate, setEndDate] = useState(ukDate(now))
  const [endError, setEndError] = useState<string | undefined>()

  const { state, refresh } = useSlateQuery(
    async (api) => {
      const tenancy = await api.getTenancy(viewer, id)
      if (!tenancy) return null
      const [property, documents, tasks, threads] = await Promise.all([
        api.getProperty(viewer, tenancy.propertyId),
        api.listDocuments(viewer, { tenancyId: id }),
        api.listRatingTasks(viewer),
        api.listThreads(viewer),
      ])
      return {
        tenancy,
        property,
        documents,
        tasks: tasks.filter((t) => t.context.kind === 'tenancy' && t.context.tenancyId === id),
        thread: threads.find(
          (t) => t.thread.context.kind === 'tenancy' && t.thread.context.tenancyId === id,
        ),
      }
    },
    [viewer, id],
  )
  const data = state.data
  const people = usePeople([
    ...(data?.tenancy.tenantIds ?? []),
    ...(data?.tenancy.confirmations.map((c) => c.personId) ?? []),
  ])

  const missing = data === null || (state.status === 'error' && !data && isMissing(state.error))
  if (state.status === 'error' && !data && !missing) {
    return (
      <PortalPage title="Tenancy">
        <ErrorPanel error={state.error} onRetry={refresh} />
      </PortalPage>
    )
  }
  if (missing) {
    return (
      <PortalPage title="Tenancy">
        <PageHeader
          back={{ to: '/landlord/homes', label: 'Homes' }}
          title="We couldn’t find that tenancy"
          description="It isn’t at one of the homes in this account."
        />
      </PortalPage>
    )
  }
  if (!data || !people.state.data) {
    return (
      <PortalPage title="Tenancy">
        <PageSkeleton label="Loading the tenancy" />
      </PortalPage>
    )
  }

  const { tenancy, property, documents, tasks, thread } = data
  const known = people.state.data
  const nameOf = (pid: PersonId) => known.get(pid)?.displayName ?? 'Tenant'
  const names = joinNames(tenancy.tenantIds.map((pid) => firstName(nameOf(pid))))
  const landlordConfirmed = tenancy.confirmations.some((c) => c.side === 'landlord')
  const status = STATUS[tenancy.status]
  const StatusIcon = status.icon

  async function confirm() {
    setBusy(true)
    try {
      await api.confirmTenancy(viewer, id)
      toast.success('Tenancy confirmed', {
        description:
          'Once every tenant confirms too, it’s on the record and ratings can unlock at the end.',
      })
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  async function end() {
    setBusy(true)
    try {
      await api.endTenancy(viewer, id, endDate)
      toast.success('Tenancy ended', {
        description:
          'You and your tenants now have 28 days to rate each other. Both sides are revealed together.',
      })
      setEnding(false)
    } catch (error) {
      setEndError(fieldErrors(error).endDate ?? errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalPage title="Tenancy" width="wide">
      <PageHeader
        back={
          property
            ? { to: `/landlord/homes/${property.id}`, label: streetOf(property) }
            : { to: '/landlord/homes', label: 'Homes' }
        }
        eyebrow={property ? placeOf(property) : undefined}
        title={`${names}’s tenancy`}
        meta={
          <>
            <Badge tone={status.tone} icon={<StatusIcon weight="bold" aria-hidden />}>
              {status.label}
            </Badge>
            <span className="text-small text-muted">Scottish private residential tenancy</span>
          </>
        }
      />

      {tenancy.status === 'proposed' ? (
        <StepCard
          tone={landlordConfirmed ? 'waiting' : 'now'}
          title={landlordConfirmed ? `Waiting for ${names} to confirm` : 'Confirm this tenancy'}
          description="A tenancy counts once you and every tenant have confirmed it here. Only then can you rate each other when it ends."
          actions={
            !landlordConfirmed && can('manage_tenancies') ? (
              <Button loading={busy} onClick={confirm}>
                Confirm tenancy
              </Button>
            ) : null
          }
        >
          <ul className="flex flex-col gap-2">
            {[
              { id: accountId, side: 'landlord' as const },
              ...tenancy.tenantIds.map((pid) => ({ id: pid, side: 'tenant' as const })),
            ].map((party) => {
              const done = tenancy.confirmations.find(
                (c) =>
                  c.personId === party.id || (party.side === 'landlord' && c.side === 'landlord'),
              )
              return (
                <li key={party.id} className="flex items-center gap-2 text-body text-ink">
                  {done ? (
                    <CheckCircleIcon weight="fill" aria-hidden className="size-5 text-positive" />
                  ) : (
                    <CircleDashedIcon weight="bold" aria-hidden className="size-5 text-muted" />
                  )}
                  <span>
                    {party.side === 'landlord' ? 'You' : nameOf(party.id)}:{' '}
                    {done ? `confirmed ${formatDate(done.confirmedAt)}` : 'not yet'}
                  </span>
                </li>
              )
            })}
          </ul>
        </StepCard>
      ) : null}

      {tenancy.status === 'proposed' ? (
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
          <IdentificationCardIcon
            weight="duotone"
            aria-hidden
            className="mt-0.5 size-6 shrink-0 text-accent-text"
          />
          <p className="text-body text-ink">
            Tenants can share their tenant passport with you: what past landlords said, counted per
            question, never a single score. If {names} sent you a link, open it under{' '}
            <Link to="/landlord/passports" className="font-semibold text-accent-text underline">
              Tenant passports
            </Link>
            .
          </p>
        </div>
      ) : null}

      {tasks.some((t) => t.status !== 'submitted') ? (
        <StepCard
          title="Rate your tenants"
          description="The tenancy has ended. Each side rates the other and both are revealed together, so nobody can react to the other’s."
        >
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.subjectId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface p-3"
              >
                <span className="text-ink">
                  <span className="font-semibold">{nameOf(task.subjectId)}</span>
                  <span className="block text-small text-muted">
                    {task.status === 'submitted' ? 'Sent' : `Closes ${formatDate(task.closesAt)}`}
                    {task.counterpartHasRated && task.status !== 'submitted'
                      ? ` · ${firstName(nameOf(task.subjectId))} has rated you`
                      : ''}
                  </span>
                </span>
                {task.status !== 'submitted' ? (
                  <Link
                    to={rateHref(id, 'tenancy', task.subjectId)}
                    className={buttonVariants({ size: 'sm' })}
                  >
                    {task.status === 'draft' ? 'Finish rating' : 'Rate'}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </StepCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Who and what" headingLevel="h2">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
            <ul className="flex flex-wrap gap-4">
              {tenancy.tenantIds.map((pid) => (
                <li key={pid} className="flex items-center gap-2.5">
                  <Avatar
                    name={nameOf(pid)}
                    seed={known.get(pid)?.avatarSeed}
                    role="tenant"
                    size="md"
                    decorative
                  />
                  <span className="font-semibold text-ink">{nameOf(pid)}</span>
                </li>
              ))}
            </ul>
            {/* Four short rows that always fit side by side, so this table never stacks. */}
            <table className="figures w-full border-collapse text-body [&_td]:py-3 [&_td]:text-right [&_th]:py-3 [&_th]:pr-4 [&_th]:text-left [&_th]:text-small [&_th]:font-semibold [&_th]:text-muted [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-b-0">
              <caption className="sr-only">Tenancy terms</caption>
              <tbody>
                <tr>
                  <th scope="row">Rent</th>
                  <td data-align="end" className="font-semibold text-ink">
                    {formatPounds(tenancy.rentPencePerMonth)} a month
                  </td>
                </tr>
                <tr>
                  <th scope="row">Rent due</th>
                  <td data-align="end">The {ordinal(tenancy.rentDueDay)} of each month</td>
                </tr>
                <tr>
                  <th scope="row">Start</th>
                  <td data-align="end">{formatDate(tenancy.startDate)}</td>
                </tr>
                <tr>
                  <th scope="row">End</th>
                  <td data-align="end">
                    {tenancy.endDate ? formatDate(tenancy.endDate) : 'Open-ended'}
                  </td>
                </tr>
              </tbody>
            </table>
            {tenancy.status === 'confirmed' && can('manage_tenancies') ? (
              <Button variant="secondary" className="self-start" onClick={() => setEnding(true)}>
                Record the end of the tenancy
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="Deposit" headingLevel="h2">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
            {tenancy.deposit ? (
              <>
                <p className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-accent-tint text-accent-text"
                  >
                    <VaultIcon weight="duotone" className="size-6" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display figures text-display-m font-semibold text-ink">
                      {formatPounds(tenancy.deposit.amountPence)}
                    </span>
                    <span className="text-small text-muted">
                      Lodged {formatDate(tenancy.deposit.lodgedOn)}
                    </span>
                  </span>
                </p>
                <p className="text-body text-ink">
                  Held by{' '}
                  <span className="font-semibold">
                    {DEPOSIT_SCHEME_LABELS[tenancy.deposit.scheme]}
                  </span>
                  , one of Scotland’s three approved schemes. {BRAND.name} never holds deposits.
                </p>
              </>
            ) : (
              <p className="text-body text-muted">
                No deposit recorded. You must lodge it with an approved scheme within 30 working
                days of the tenancy starting.
              </p>
            )}
          </div>
        </Section>
      </div>

      <Section title="Documents" headingLevel="h2">
        {documents.length === 0 ? (
          <p className="text-body text-muted">
            No tenancy documents on file yet. Add them from the home’s certificates.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5"
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">
                    {DOCUMENT_TYPE_INFO[doc.type].label}
                  </span>
                  <span className="text-small text-muted">
                    {doc.file.name} ·{' '}
                    {doc.sharedWithTenant ? 'shared with the tenant' : 'not shared'}
                  </span>
                </span>
                <span className="figures text-small text-muted">
                  Issued {formatDate(doc.issuedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {thread ? (
        <Link
          to={`/landlord/messages/${thread.thread.id}`}
          className={buttonVariants({ variant: 'secondary', className: 'self-start' })}
        >
          <ChatsCircleIcon weight="bold" aria-hidden />
          Messages with {names}
          {thread.unreadCount > 0 ? ` (${thread.unreadCount} new)` : ''}
        </Link>
      ) : null}

      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent
          title="Record the end of the tenancy"
          description="Once it’s ended, you and your tenants have 28 days to rate each other. Both ratings are revealed together."
          footer={
            <>
              <Button variant="secondary" onClick={() => setEnding(false)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={end}>
                End tenancy
              </Button>
            </>
          }
        >
          <Input
            label="Last day of the tenancy"
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value)
              setEndError(undefined)
            }}
            error={endError}
          />
        </DialogContent>
      </Dialog>
    </PortalPage>
  )
}
