import { useEffect, useEffectEvent, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRightIcon,
  BriefcaseIcon,
  FilesIcon,
  HouseLineIcon,
  HouseSimpleIcon,
  IdentificationBadgeIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { hrefs, selectToday, useSlate, useSlateQuery, useSlateStore } from '@/data'
import {
  BADGE_LABELS,
  type Role,
  type VerificationBadge,
  type VerificationClaim,
} from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { useDocumentTitle } from '@/routes/_shell'
import { useSession } from '@/session'
import { inlineLinkClass } from '../layout/parts'
import { DRAFT_KEY } from './draft'

/** What the welcome screen needs from the answers, handed over when the link is opened. */
export interface WelcomeState {
  agentEmail?: string
  insured?: boolean
}

const FIRST_CHECK_MS = 1800
const NEXT_CHECK_MS = 1400

/**
 * Counts up the checks finished, one at a time. Real checks take up to a day; the demo shows the
 * same change from "Check in progress" to "Checked" in a few seconds.
 */
function useSimulatedChecks(total: number) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    if (done >= total) return
    const timer = window.setTimeout(
      () => setDone((count) => count + 1),
      done === 0 ? FIRST_CHECK_MS : NEXT_CHECK_MS,
    )
    return () => window.clearTimeout(timer)
  }, [done, total])
  return done
}

function Checks({
  claims,
  already,
  today,
  onAllChecked,
}: {
  claims: VerificationClaim[]
  already: VerificationBadge[]
  today: string
  /** Makes the checks real once they've played out, so the portal shows the same badges. */
  onAllChecked: () => void
}) {
  const done = useSimulatedChecks(claims.length)
  const finished = claims.length > 0 && done >= claims.length
  const settle = useEffectEvent(onAllChecked)
  useEffect(() => {
    if (finished) settle()
  }, [finished])
  const reduced = useReducedMotion()
  const latest = done > 0 ? claims[done - 1] : undefined

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {already.map((badge) => (
          <li key={badge.kind}>
            <VerifiedBadge badge={badge} variant="detail" />
          </li>
        ))}
        {claims.map((claim, index) => {
          const checked = index < done
          return (
            <li key={claim.kind}>
              {/* A new key on the change, so the checked badge arrives with a small settle. */}
              <motion.div
                key={checked ? 'checked' : 'pending'}
                initial={
                  checked ? (reduced ? { opacity: 0.4 } : { opacity: 0.4, scale: 0.97 }) : false
                }
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {checked ? (
                  <VerifiedBadge badge={{ ...claim, checkedAt: today }} variant="detail" />
                ) : (
                  <VerifiedBadge badge={claim} pending variant="detail" />
                )}
              </motion.div>
            </li>
          )
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {latest ? `Checked: ${BADGE_LABELS[latest.kind]}` : ''}
      </p>
      <p className="text-small text-muted">
        {done < claims.length
          ? 'Real checks can take up to a day. This demo speeds them up.'
          : 'All checked. Each badge shows the date it was checked.'}
      </p>
    </div>
  )
}

interface NextStep {
  label: string
  to: string
  icon: Icon
}

const NEXT_STEPS: Record<Role, NextStep[]> = {
  tenant: [
    { label: 'Report a problem in your home', to: '/tenant', icon: WrenchIcon },
    {
      label: 'See your profile and badges',
      to: hrefs.profile('tenant'),
      icon: IdentificationBadgeIcon,
    },
  ],
  landlord: [
    { label: 'Add your first home', to: '/landlord', icon: HouseSimpleIcon },
    { label: 'Upload your certificates', to: hrefs.documents(), icon: FilesIcon },
  ],
  trade: [
    { label: 'See jobs on the board', to: hrefs.jobBoard(), icon: BriefcaseIcon },
    {
      label: 'See your profile and badges',
      to: hrefs.profile('trade'),
      icon: IdentificationBadgeIcon,
    },
  ],
}

/** The last screen of sign-up: signed in, with credentials moving from checking to checked. */
export function Welcome({ role }: { role: Role }) {
  useDocumentTitle('Welcome')
  const { viewer, session } = useSession()
  const { demo } = useSlate()
  const location = useLocation()
  const extras = (location.state as WelcomeState | null) ?? {}
  const today = useSlateStore(selectToday)
  const { state } = useSlateQuery(async (api) => (viewer ? api.getMe(viewer) : null), [viewer])

  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // Nothing saved to clear.
    }
  }, [])

  if (!session || session.activeRole !== role) return <Navigate to={`/signup/${role}`} replace />

  const person = state.data
  const claims = person?.pendingVerifications.map((pending) => pending.claim) ?? []
  const already = person?.badges ?? []
  const firstName = person?.displayName.split(' ')[0] ?? ''
  const nextSteps: NextStep[] = [
    ...NEXT_STEPS[role],
    ...(role === 'landlord' && extras.agentEmail
      ? [
          {
            label: `Invite ${extras.agentEmail} to your team`,
            to: hrefs.team(),
            icon: UserPlusIcon,
          },
        ]
      : []),
    ...(role === 'trade' && extras.insured
      ? [
          {
            label: 'Add your insurance certificate',
            to: hrefs.profile('trade'),
            icon: ShieldCheckIcon,
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-accent-tint text-accent-text"
        >
          <SealCheckIcon weight="duotone" className="size-9" />
        </span>
        <h1
          tabIndex={-1}
          className="font-display text-[clamp(2rem,1.6rem+1.8vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-ink outline-none"
        >
          {person ? `Welcome to ${BRAND.name}, ${firstName}` : `Welcome to ${BRAND.name}`}
        </h1>
        <p className="text-body-l text-muted">
          Your account is ready. In this demo it lives only in this browser.
        </p>
      </div>

      <section aria-labelledby="checks-title" className="flex flex-col gap-4">
        <h2 id="checks-title" className="text-title font-semibold text-ink">
          Your checks
        </h2>
        {state.status === 'loading' ? (
          <LoadingRegion label="Loading your checks">
            <Skeleton className="h-20 w-full rounded-control" />
          </LoadingRegion>
        ) : claims.length + already.length > 0 ? (
          <Checks
            claims={claims}
            already={already}
            today={today}
            onAllChecked={() => {
              if (viewer) void demo.completeChecks(viewer.personId)
            }}
          />
        ) : (
          <p className="rounded-control border border-dashed border-line p-4 text-body text-muted">
            Nothing to check yet. You can add{' '}
            {role === 'tenant' ? 'an ID check' : 'your credentials'} from{' '}
            <Link to={hrefs.profile(role)} className={inlineLinkClass}>
              your profile
            </Link>{' '}
            whenever you’re ready.
          </p>
        )}
      </section>

      <section aria-labelledby="next-title" className="flex flex-col gap-3">
        <h2 id="next-title" className="text-title font-semibold text-ink">
          What’s next
        </h2>
        <ul className="flex flex-col gap-2">
          {nextSteps.map((step) => (
            <li key={step.label}>
              <Link
                to={step.to}
                className="group flex min-h-12 items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-body text-ink no-underline transition-colors duration-(--duration-quick) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <step.icon
                  weight="duotone"
                  aria-hidden
                  className="size-5 shrink-0 text-accent-text"
                />
                <span className="flex-1">{step.label}</span>
                <ArrowRightIcon
                  weight="bold"
                  aria-hidden
                  className="size-4 text-muted transition-transform duration-(--duration-quick) group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        to={hrefs.home(role)}
        className={buttonVariants({ size: 'lg', className: 'self-start max-sm:w-full' })}
      >
        <HouseLineIcon weight="bold" aria-hidden />
        Go to your home
      </Link>
    </div>
  )
}
