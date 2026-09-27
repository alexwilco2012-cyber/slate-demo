// Tenant passports shared with the landlord. A tenant shares all of it or none of it, through a
// link that lasts 30 days and logs every view. There is no single score, and Slate never sorts,
// filters or turns down tenants by their ratings (SPEC §5 rule 11), so this page doesn't either.

import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  ProhibitIcon,
} from '@phosphor-icons/react'
import { useSlate, useSlateQuery, type SharedPassport } from '@/data'
import type { PersonId } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/slate/page-header'
import { PassportCard } from '@/components/slate/passport-card'
import { formatDate } from '@/components/slate/format'
import { BRAND } from '@/config/brand'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ReviewItem, ReviewPolicyLink } from '../components/review-item'
import { Section } from '../components/section'
import { ErrorPanel, ListSkeleton, PageSkeleton } from '../components/states'
import { firstName } from '../lib/format'

const TOKEN = /passport\/([A-Za-z0-9_-]{12,})/

/** The token from a pasted link ("…/passport/Xr4n…") or the code on its own. */
export function tokenFrom(text: string): string | null {
  const trimmed = text.trim()
  const match = TOKEN.exec(trimmed)
  if (match) return match[1]!
  return /^[A-Za-z0-9_-]{12,}$/.test(trimmed) ? trimmed : null
}

// Opening a passport logs a view the tenant can see. Each link is opened once per visit, even
// if the page draws twice.
const opened = new WeakMap<object, Map<string, Promise<SharedPassport>>>()

function useOpenedPassport(token: string, viewerId: PersonId) {
  const { api } = useSlate()
  const [result, setResult] = useState<SharedPassport | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    let live = true
    const key = `${viewerId}|${token}`
    const mine = opened.get(api) ?? new Map<string, Promise<SharedPassport>>()
    opened.set(api, mine)
    let pending = mine.get(key)
    if (!pending) {
      pending = api.openPassportShare(token, viewerId)
      mine.set(key, pending)
    }
    pending.then((r) => live && setResult(r)).catch((e: unknown) => live && setError(e))
    return () => {
      live = false
    }
  }, [api, token, viewerId])
  return { result, error }
}

const RULES = [
  {
    icon: IdentificationCardIcon,
    title: 'All or nothing',
    body: 'Tenants can’t pick and choose. A passport shows every landlord rating they’ve had.',
  },
  {
    icon: ClockIcon,
    title: 'Links last 30 days',
    body: 'And the tenant can switch a link off at any time.',
  },
  {
    icon: EyeIcon,
    title: 'Views are logged',
    body: 'The tenant sees when a signed-in landlord or agent opened it. Not your name.',
  },
  {
    icon: ProhibitIcon,
    title: 'No score, no ranking',
    body: `There’s no single number, and ${BRAND.name} never sorts, filters or turns anyone down by their ratings. Read it in full and talk to them. Decisions about people stay with people.`,
  },
]

/** Passport links a tenant has sent in a message on one of the landlord's conversations. */
function useLinksInMessages() {
  const viewer = useViewer()
  return useSlateQuery(
    async (api) => {
      const threads = await api.listThreads(viewer)
      const found: { token: string; from: PersonId | null; sentAt: string; threadTitle: string }[] =
        []
      for (const summary of threads.filter((t) => t.thread.context.kind === 'tenancy')) {
        const messages = await api.listMessages(viewer, summary.thread.id)
        for (const message of messages) {
          const token = TOKEN.exec(message.body)?.[1]
          if (token && !found.some((f) => f.token === token)) {
            found.push({
              token,
              from: message.author?.personId ?? null,
              sentAt: message.sentAt,
              threadTitle: summary.thread.title,
            })
          }
        }
      }
      return found
    },
    [viewer],
  )
}

/** Paste a link or code a tenant sent, and open their passport. */
function OpenPassportLink() {
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | undefined>()

  function open(event: FormEvent) {
    event.preventDefault()
    const token = tokenFrom(link)
    if (!token)
      return setError('Paste the whole link the tenant sent you. It has “passport” in it.')
    navigate(`/landlord/passports/${token}`)
  }

  return (
    <Section title="Open a passport link" headingLevel="h2">
      <form onSubmit={open} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Link or code"
          hint="Tenants usually send it in a message or an email when they apply."
          fieldClassName="flex-1"
          leading={<LinkSimpleIcon weight="bold" aria-hidden />}
          value={link}
          onChange={(event) => {
            setLink(event.target.value)
            setError(undefined)
          }}
          error={error}
          autoComplete="off"
        />
        <Button type="submit" className="sm:mb-[1.625rem]">
          Open passport
        </Button>
      </form>
    </Section>
  )
}

export function PassportsPanel() {
  const links = useLinksInMessages()

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-3 sm:grid-cols-2">
        {RULES.map(({ icon: Glyph, title, body }) => (
          <li key={title} className="flex items-start gap-3 rounded-card bg-surface-2 p-4">
            <Glyph
              weight="duotone"
              aria-hidden
              className="mt-0.5 size-6 shrink-0 text-accent-text"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-ink">{title}</span>
              <span className="text-small text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <OpenPassportLink />

      <Section title="Sent to you in messages" headingLevel="h2">
        {links.state.status === 'error' && !links.state.data ? (
          <ErrorPanel error={links.state.error} onRetry={links.refresh} />
        ) : !links.state.data ? (
          <ListSkeleton rows={1} label="Looking for passport links" />
        ) : links.state.data.length === 0 ? (
          <EmptyState
            icon={IdentificationCardIcon}
            title="No passports shared with you yet"
            description="When a tenant sends you their passport link in a message, it appears here. You can also paste a link above."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {links.state.data.map((found) => (
              <li key={found.token}>
                <Link
                  to={`/landlord/passports/${found.token}`}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 no-underline shadow-soft hover:shadow-raised"
                >
                  <IdentificationCardIcon
                    weight="duotone"
                    aria-hidden
                    className="size-6 shrink-0 text-accent-text"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-ink">
                      Passport link in “{found.threadTitle}”
                    </span>
                    <span className="text-small text-muted">Sent {formatDate(found.sentAt)}</span>
                  </span>
                  <ArrowRightIcon weight="bold" aria-hidden className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function OpenedPassport({ token }: { token: string }) {
  const viewer = useViewer()
  const { result, error } = useOpenedPassport(token, viewer.personId)
  if (error) return <ErrorPanel error={error} />
  if (!result) return <PageSkeleton label="Opening the passport" />
  if (result.status !== 'ok') {
    const words = {
      expired: [
        'This link has expired',
        'Passport links work for 30 days. Ask the tenant to send you a fresh one.',
      ],
      revoked: ['The tenant switched this link off', 'Ask them if they’d like to share a new one.'],
      not_found: ['We couldn’t find that passport', 'Check the link was copied in full.'],
    }[result.status]
    // The next step is a fresh link from the tenant, so the box to paste it in is right here.
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          back={{ to: '/landlord/passports', label: 'Tenant passports' }}
          eyebrow="Tenant passport"
          title={words[0]}
          description={words[1]}
        />
        <OpenPassportLink />
      </div>
    )
  }
  const { tenant, passport, expiresAt } = result
  const name = firstName(tenant.displayName)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/landlord/passports', label: 'Tenant passports' }}
        eyebrow="Shared with you"
        title={`${tenant.displayName}’s tenant passport`}
        description={`${name} shared everything past landlords said. ${name} can see that a signed-in landlord opened it.`}
        meta={
          <span className="flex items-center gap-1.5 text-small text-muted">
            <ClockIcon weight="bold" aria-hidden className="size-4" />
            Link works until {formatDate(expiresAt)}
          </span>
        }
      />
      <section aria-labelledby="passport-answers">
        <h2 id="passport-answers" className="sr-only">
          Answers, question by question
        </h2>
        <PassportCard
          landlordCount={passport.landlordCount}
          lines={passport.lines}
          tenantName={tenant.displayName}
        />
      </section>
      <Section
        title="What landlords wrote"
        headingLevel="h2"
        description={`In full, with ${name}’s replies. Each one is a single landlord’s experience, so read them alongside a conversation with ${name}.`}
      >
        {passport.reviews.length === 0 ? (
          <EmptyState
            icon={IdentificationCardIcon}
            title="No written reviews"
            description="Landlords answered the questions but didn’t add comments."
          />
        ) : (
          passport.reviews.map((review) => <ReviewItem key={review.ratingId} review={review} />)
        )}
        {passport.reviews.length === 0 ? <ReviewPolicyLink /> : null}
      </Section>
    </div>
  )
}

export default function PassportsPage() {
  const { token } = useParams()
  return (
    <PortalPage title="Tenant passports">
      {token ? (
        <OpenedPassport key={token} token={token} />
      ) : (
        <>
          <PageHeader
            title="Tenant passports"
            description="What past landlords said about a tenant, shared by the tenant when they apply. Never public."
          />
          <PassportsPanel />
        </>
      )}
    </PortalPage>
  )
}
