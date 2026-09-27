// The tenant passport: what past landlords said, counted question by question with no single
// number. Never public. The tenant shares it all or nothing, with a link that works for 30 days,
// sees every time it's opened, and can switch a link off at any time.

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  IdentificationCardIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  ProhibitIcon,
  ClockCountdownIcon,
} from '@phosphor-icons/react'
import { SlateError } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { LETTING_RULES, type PassportShare } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { daysBetween, formatDate, plural } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { PassportCard } from '@/components/slate/passport-card'
import { ReviewCard } from '@/components/slate/review-card'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { Explainer, QueryError, ReviewPolicyLink, Section } from '../components/basics'
import { clock } from '../lib/format'

/** The public address a landlord opens. The public site serves /passport/:token. */
export function shareUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}passport/${token}`
}

type ShareState = 'active' | 'expired' | 'revoked'

function shareState(share: PassportShare, now: string): ShareState {
  if (share.revokedAt) return 'revoked'
  if (share.expiresAt <= now) return 'expired'
  return 'active'
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function PassportPage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const [previewOpen, setPreviewOpen] = useState(false)
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [passport, shares] = await Promise.all([
        api.getMyPassport(viewer),
        api.listPassportShares(viewer),
      ])
      return { passport, shares }
    },
    [viewer],
  )

  return (
    <PortalPage title="Tenant passport">
      <PageHeader
        title="Your tenant passport"
        description="Your past landlords’ ratings of you, in one place. It’s never public. Nobody sees it unless you send them a link."
      />
      {state.status === 'loading' ? (
        <LoadingRegion label="Loading your passport" className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-card" />
          <Skeleton className="h-72 w-full rounded-card" />
        </LoadingRegion>
      ) : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your passport" onRetry={refresh} />
      ) : null}
      {state.data ? (
        state.data.passport.landlordCount === 0 ? (
          <EmptyState
            icon={IdentificationCardIcon}
            headingLevel="h2"
            title="Nothing in your passport yet"
            description="When a tenancy you’ve confirmed here ends, your landlord can rate you. Their answers build up here for you to share when you apply for your next home."
          />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-10">
            <Section id="passport" title="What your landlords said">
              <PassportCard
                tenantName={person.displayName}
                landlordCount={state.data.passport.landlordCount}
                lines={state.data.passport.lines}
                footer={
                  <Button
                    variant="soft"
                    iconStart={<EyeIcon weight="bold" aria-hidden />}
                    onClick={() => setPreviewOpen(true)}
                    className="self-start max-sm:w-full"
                  >
                    See what a landlord sees
                  </Button>
                }
              />
              <ReviewPolicyLink />
            </Section>
            <Sharing shares={state.data.shares} />
          </div>
        )
      ) : null}
      {state.data ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            size="lg"
            title="What a landlord sees"
            description={`This is exactly what a link shows: the counts and all ${plural(state.data.passport.reviews.length, 'review')}. You can’t leave any out.`}
          >
            <div className="flex flex-col gap-4">
              <PassportCard
                tenantName={person.displayName}
                landlordCount={state.data.passport.landlordCount}
                lines={state.data.passport.lines}
              />
              {state.data.passport.reviews.map((review) => (
                <ReviewCard key={review.ratingId} review={review} headingLevel="h4" />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </PortalPage>
  )
}

function Sharing({ shares }: { shares: PassportShare[] }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [labelError, setLabelError] = useState<string>()
  const [fresh, setFresh] = useState<PassportShare | null>(null)
  const [revoking, setRevoking] = useState<PassportShare | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  // Revoked straight away on screen; put back if the change doesn't save.
  const [optimisticRevoked, setOptimisticRevoked] = useState<Set<string>>(new Set())

  const sorted = [...shares].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function create() {
    setCreating(true)
    setLabelError(undefined)
    try {
      const share = await api.createPassportShare(viewer, label.trim() || undefined)
      setFresh(share)
      setLabel('')
      const copied = await copy(shareUrl(share.token))
      toast.success(copied ? 'Link made and copied' : 'Link made', {
        description: `It works until ${formatDate(share.expiresAt)}. Paste it into your application.`,
      })
    } catch (caught) {
      setLabelError(
        caught instanceof SlateError
          ? (caught.fields.label ?? caught.message)
          : 'That didn’t work. Try again.',
      )
    } finally {
      setCreating(false)
    }
  }

  async function revoke(share: PassportShare) {
    setRevokeOpen(false)
    setOptimisticRevoked((current) => new Set(current).add(share.id))
    try {
      await api.revokePassportShare(viewer, share.id)
      toast.success('Link switched off', {
        description: 'Anyone who opens it now sees that it’s been switched off.',
      })
    } catch {
      setOptimisticRevoked((current) => {
        const next = new Set(current)
        next.delete(share.id)
        return next
      })
      toast.error('That link is still on', { description: 'Try again in a moment.' })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Section id="share" title="Share it when you apply">
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
          <ul className="flex flex-col gap-2 text-small text-ink">
            <li className="flex items-start gap-2">
              <CheckIcon
                weight="bold"
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-positive"
              />
              All or nothing. A link always shows everything, so nobody can say you hid a review.
            </li>
            <li className="flex items-start gap-2">
              <ClockCountdownIcon
                weight="bold"
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent-text"
              />
              Each link works for {LETTING_RULES.passportShareDays} days, and you can switch it off
              sooner.
            </li>
            <li className="flex items-start gap-2">
              <EyeIcon
                weight="bold"
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent-text"
              />
              You see every time it’s opened.
            </li>
          </ul>
          <Input
            label="Who’s it for?"
            optional
            hint="A reminder for you, such as the address you’re applying for."
            placeholder="For the flat on Union Grove"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
            error={labelError}
          />
          <Button
            loading={creating}
            onClick={create}
            iconStart={<LinkSimpleIcon weight="bold" aria-hidden />}
            className="self-start max-sm:w-full"
          >
            Make a share link
          </Button>
          <AnimatePresence initial={false}>
            {fresh ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2 rounded-control bg-accent-tint p-3"
              >
                <p className="text-small font-semibold text-ink">
                  Your new link{fresh.label ? `: ${fresh.label}` : ''}
                </p>
                <CopyField url={shareUrl(fresh.token)} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Section>

      <Section id="links" title="Your links" description="Who’s opened each one, and when.">
        {sorted.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-4 text-small text-muted">
            No links yet. Make one above when you apply for a home.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((share) => {
              const status = optimisticRevoked.has(share.id) ? 'revoked' : shareState(share, now)
              return (
                <li
                  key={share.id}
                  className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="font-semibold text-ink">{share.label ?? 'Share link'}</p>
                      <p className="text-small text-muted">
                        Made {formatDate(share.createdAt)} ·{' '}
                        {status === 'active'
                          ? `works for ${plural(Math.max(daysBetween(now, share.expiresAt), 0), 'more day')}`
                          : status === 'expired'
                            ? `ran out ${formatDate(share.expiresAt)}`
                            : `switched off${share.revokedAt ? ` ${formatDate(share.revokedAt)}` : ''}`}
                      </p>
                    </div>
                    {status === 'active' ? (
                      <Badge
                        tone="positive"
                        size="sm"
                        icon={<LinkSimpleIcon weight="bold" aria-hidden />}
                      >
                        Working
                      </Badge>
                    ) : status === 'expired' ? (
                      <Badge
                        tone="neutral"
                        size="sm"
                        icon={<ClockCountdownIcon weight="bold" aria-hidden />}
                      >
                        Expired
                      </Badge>
                    ) : (
                      <Badge
                        tone="neutral"
                        size="sm"
                        icon={<LinkBreakIcon weight="bold" aria-hidden />}
                      >
                        Switched off
                      </Badge>
                    )}
                  </div>
                  {status === 'active' ? <CopyField url={shareUrl(share.token)} /> : null}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-small font-semibold text-ink">
                      {share.views.length === 0
                        ? 'Not opened yet'
                        : `Opened ${plural(share.views.length, 'time')}`}
                    </p>
                    {share.views.length > 0 ? (
                      <ol className="flex flex-col gap-1 border-l-2 border-line pl-3">
                        {[...share.views].reverse().map((view) => (
                          <li key={view.viewedAt} className="text-small text-muted">
                            <span className="text-ink">{view.viewerLabel}</span> ·{' '}
                            {formatDate(view.viewedAt)} at {clock(view.viewedAt)}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                  {status === 'active' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      className="self-start"
                      iconStart={<ProhibitIcon weight="bold" aria-hidden />}
                      onClick={() => {
                        setRevoking(share)
                        setRevokeOpen(true)
                      }}
                    >
                      Switch off this link
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Explainer icon={<IdentificationCardIcon weight="bold" />}>
        <p>
          Landlords can’t search for you or see your passport any other way. Nobody can use it to
          sort, filter or turn down applicants automatically.
        </p>
      </Explainer>

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent
          size="sm"
          title="Switch off this link?"
          description="Anyone who opens it will see it’s been switched off. You can always make a new one."
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Keep it</Button>} />
              <Button variant="danger" onClick={() => revoking && revoke(revoking)}>
                Switch it off
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  )
}

function CopyField({ url }: { url: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-stretch gap-2">
      <Input
        label="Share link"
        hideLabel
        value={url}
        readOnly
        onFocus={(event) => event.target.select()}
        fieldClassName="min-w-0 flex-1"
        className="figures text-small"
      />
      <Button
        variant="secondary"
        iconStart={
          copied ? <CheckIcon weight="bold" aria-hidden /> : <CopyIcon weight="bold" aria-hidden />
        }
        onClick={async () => {
          const ok = await copy(url)
          setCopied(ok)
          if (ok) window.setTimeout(() => setCopied(false), 2000)
          else
            toast.info('Select the link and copy it', {
              description: 'Your browser didn’t let us copy it for you.',
            })
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
