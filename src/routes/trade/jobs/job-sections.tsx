// The job screen's sections, top to bottom: where it is, how to get in, the problem, the work
// done and the money. The screen itself (job-page.tsx) decides which to show and owns the actions.

import type { ReactNode } from 'react'
import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  DoorOpenIcon,
  KeyIcon,
  NavigationArrowIcon,
  SealCheckIcon,
} from '@phosphor-icons/react'
import {
  ACCESS_SLOT_LABELS,
  ROOM_LABELS,
  type IsoDate,
  type Job,
  type PersonCard,
  type PersonId,
  type Photo,
  type Property,
  type Quote,
  type Visit,
} from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { formatDate, formatPence, formatTime, plural } from '@/components/slate/format'
import { credentialText } from '../board/post-card'
import { Section } from '../components/page-bits'
import { PhotoGrid, PhotoTile } from '../components/photos'
import { QuoteTable } from '../components/quote-table'
import { StatusBadge } from '../components/status-badge'
import type { TradeStatus } from '../lib/job'
import { directionsUrl } from '../lib/places'
import { formatDayIn, formatLongDay, formatShortDay } from '../lib/time'

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft">
      {children}
    </div>
  )
}

/** The address, who's involved, and one tap to directions or the conversation. */
export function JobPlace({
  property,
  tenants,
  landlord,
  agent,
  landlordName,
}: {
  property: Property
  tenants: PersonCard[]
  landlord: PersonCard | undefined
  agent: PersonCard | undefined
  landlordName: string
}) {
  return (
    <Card padding="md" className="gap-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-body-l font-bold text-ink">{property.addressLine}</p>
        <p className="text-ink">
          {property.city} {property.postcode}
        </p>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {tenants.map((tenant) => (
          <li key={tenant.id} className="flex items-center gap-2 font-semibold text-ink">
            {tenant.displayName} <RoleChip role="tenant" />
          </li>
        ))}
        {landlord ? (
          <li className="flex items-center gap-2 font-semibold text-ink">
            {landlord.displayName} <RoleChip role="landlord" />
          </li>
        ) : null}
        {agent ? (
          <li className="flex flex-wrap items-center gap-2 font-semibold text-ink">
            {agent.displayName}
            <RoleChip role="landlord" label={`Agent for ${landlordName}`} />
          </li>
        ) : null}
      </ul>
      <div className="grid grid-cols-2 gap-(--gap-touch)">
        <a
          href={directionsUrl(property)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'secondary' })}
        >
          <NavigationArrowIcon weight="bold" aria-hidden />
          Directions
          <span className="sr-only"> (opens maps)</span>
        </a>
        <a href="#chat" className={buttonVariants({ variant: 'secondary' })}>
          <ChatCircleTextIcon weight="bold" aria-hidden />
          Message
        </a>
      </div>
    </Card>
  )
}

/** The visit and its written notice, the key, the tenant's notes and the times they gave. */
export function GettingIn({
  job,
  visit,
  tenantName,
  today,
}: {
  job: Job
  visit: Visit | undefined
  tenantName: string
  today: IsoDate
}) {
  const iconClass = 'mt-0.5 size-6 shrink-0 text-ink'
  return (
    <Section title="Getting in">
      <Panel>
        {visit ? (
          <div className="flex items-start gap-3">
            <CalendarCheckIcon weight="bold" aria-hidden className={iconClass} />
            <div className="flex flex-col">
              <p className="font-bold text-ink">
                {visit.purpose === 'quote' ? 'Visit to price it' : 'Visit'}:{' '}
                {formatLongDay(visit.startsAt)}, {formatTime(visit.startsAt)} to{' '}
                {formatTime(visit.endsAt)}
              </p>
              <p className="text-small text-muted">
                {visit.status === 'on_site' && visit.startedAt
                  ? `On site since ${formatTime(visit.startedAt)}`
                  : visit.notice.emergency
                    ? 'An emergency, so no notice was needed'
                    : `Written notice sent ${formatShortDay(visit.notice.givenAt)}, ${plural(Math.round(visit.notice.hoursGiven), 'hour')} before the visit`}
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex items-start gap-3">
          {job.access.keyAllowed ? (
            <KeyIcon weight="bold" aria-hidden className={iconClass} />
          ) : (
            <DoorOpenIcon weight="bold" aria-hidden className={iconClass} />
          )}
          <p className="text-ink">
            {job.access.keyAllowed
              ? `${tenantName} is happy for you to use a key if nobody’s in.`
              : 'Someone needs to be home to let you in.'}
          </p>
        </div>
        {job.access.notes ? (
          <blockquote className="rounded-control bg-surface-2 px-4 py-3 text-ink">
            <span className="mb-1 block text-small font-semibold text-muted">
              {tenantName}’s access notes
            </span>
            “{job.access.notes}”
          </blockquote>
        ) : null}
        {job.access.windows.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-small font-semibold text-muted">Times {tenantName} gave</p>
            <ul className="flex flex-wrap gap-2">
              {job.access.windows.map((window) => {
                const passed = window.date < today
                return (
                  <li
                    key={`${window.date}-${window.slot}`}
                    className={cn(
                      'rounded-control bg-surface-2 px-3 py-1.5 text-small font-semibold',
                      passed ? 'text-muted' : 'text-ink',
                    )}
                  >
                    {formatShortDay(window.date)} · {ACCESS_SLOT_LABELS[window.slot]}
                    {passed ? ' (passed)' : ''}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </Panel>
    </Section>
  )
}

/** What the tenant reported, its photos, and room for the trade's own. */
export function TheProblem({
  job,
  names,
  children,
}: {
  job: Job
  names: Record<PersonId, string>
  /** The upload queue and camera button. */
  children?: ReactNode
}) {
  return (
    <Section title="The problem">
      <Panel>
        <p className="text-small text-muted">
          {ROOM_LABELS[job.room]} · Reported {formatDate(job.createdAt)}
        </p>
        <p className="text-ink">{job.description}</p>
        {job.credentialNeeded ? (
          <p className="flex items-center gap-2 text-small font-semibold text-ink">
            <SealCheckIcon weight="fill" aria-hidden className="size-5 text-brand" />
            Needs {credentialText(job.credentialNeeded)}
          </p>
        ) : null}
        {job.photos.length > 0 ? (
          <PhotoGrid photos={job.photos} names={names} />
        ) : (
          <p className="text-small text-muted">No photos yet.</p>
        )}
        {children}
      </Panel>
    </Section>
  )
}

/** When it was marked done, the final price and the before-and-after photos. */
export function WorkDone({ completion }: { completion: NonNullable<Job['completion']> }) {
  return (
    <Section title="Work done">
      <Panel>
        <p className="text-small text-muted">
          Marked done {formatDate(completion.completedAt)}
          {completion.finalPricePence !== undefined
            ? ` · Final price ${formatPence(completion.finalPricePence)}`
            : ''}
        </p>
        {completion.note ? <p className="text-ink">{completion.note}</p> : null}
        {completion.photos.length > 0 ? <BeforeAfter photos={completion.photos} /> : null}
      </Panel>
    </Section>
  )
}

/** Completion photos in before-and-after pairs, from the words each was saved with. */
function BeforeAfter({ photos }: { photos: readonly Photo[] }) {
  const before = photos.filter((photo) => /^before\b/i.test(photo.alt))
  const after = photos.filter((photo) => /^after\b/i.test(photo.alt))
  const others = photos.filter((photo) => !before.includes(photo) && !after.includes(photo))
  const pairs = Math.max(before.length, after.length)
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: pairs }, (_, index) => (
        <div key={index} className="grid max-w-lg grid-cols-2 gap-3">
          {(
            [
              ['Before', before[index]],
              ['After', after[index]],
            ] as const
          ).map(([label, photo]) => (
            <figure key={label} className="flex flex-col gap-1.5">
              <figcaption className="text-small font-semibold text-ink">{label}</figcaption>
              {photo ? (
                <PhotoTile photo={photo} />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-control border border-dashed border-input-border text-small text-muted">
                  No photo
                </div>
              )}
            </figure>
          ))}
        </div>
      ))}
      {others.length > 0 ? <PhotoGrid photos={others} /> : null}
    </div>
  )
}

/** The invoice (plain table) and the quote it came from. */
export function Money({
  today,
  payment,
  paymentStatus,
  paymentLabel,
  quote,
}: {
  today: IsoDate
  payment: Job['payment']
  paymentStatus: TradeStatus
  paymentLabel: string | undefined
  quote: Quote | undefined
}) {
  return (
    <Section title="Money">
      <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-4 shadow-soft">
        {payment ? (
          <table className="slate-table">
            <caption className="mb-2 font-bold text-ink">Invoice</caption>
            <thead>
              <tr>
                <th scope="col">Amount</th>
                <th scope="col">Sent</th>
                <th scope="col">Due</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Amount" data-primary className="text-body-l font-bold">
                  {formatPence(payment.amountPence)}
                </td>
                <td data-label="Sent" className="whitespace-nowrap">
                  {formatDayIn(payment.invoicedAt, today)}
                </td>
                <td data-label="Due" className="whitespace-nowrap">
                  {formatDayIn(payment.dueOn, today)}
                </td>
                <td data-label="Status" data-full>
                  <StatusBadge status={paymentStatus} label={paymentLabel} />
                </td>
              </tr>
            </tbody>
          </table>
        ) : null}
        {quote ? (
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-baseline gap-x-2 font-bold text-ink">
              Your quote
              <span className="text-small font-normal text-muted">
                Sent {formatDayIn(quote.submittedAt, today)}
                {quote.status === 'submitted'
                  ? ` · Holds until ${formatShortDay(quote.validUntil)}`
                  : ''}
              </span>
            </p>
            <QuoteTable quote={quote} caption="Your quote" />
          </div>
        ) : null}
      </div>
    </Section>
  )
}
