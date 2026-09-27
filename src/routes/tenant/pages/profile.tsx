// Profile: who you are here, the checks behind your badges, your roles, your contact details
// (only you see them) and which updates reach you.

import { useState } from 'react'
import { Link } from 'react-router'
import {
  BellIcon,
  CaretRightIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  ExportIcon,
  FlagIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  PhoneIcon,
  PlusSquareIcon,
  ScrollIcon,
} from '@phosphor-icons/react'
import { useSlate, useSlateQuery } from '@/data'
import { ROLE_LABELS, ROLES, type PersonId } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { formatMonthYear } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { RoleChip } from '@/components/slate/role-chip'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { BRAND } from '@/config/brand'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { QueryError, REVIEW_POLICY_PATH, Section } from '../components/basics'

const PREFS = [
  {
    id: 'repairs',
    label: 'Repair updates',
    description: 'Approvals, bookings and when the work is done.',
  },
  { id: 'messages', label: 'New messages', description: 'On your repairs and your tenancy.' },
  {
    id: 'ratings',
    label: 'Rating reminders',
    description: 'When a rating opens, and a reminder before it closes.',
  },
  {
    id: 'passport',
    label: 'Passport views',
    description: 'Each time someone opens a link you’ve shared.',
  },
] as const

type PrefId = (typeof PREFS)[number]['id']
type Prefs = Record<PrefId, boolean> & { email: boolean; push: boolean }

const DEFAULT_PREFS: Prefs = {
  repairs: true,
  messages: true,
  ratings: true,
  passport: true,
  email: true,
  push: false,
}

function prefsKey(personId: PersonId) {
  return `slate-tenant-notification-prefs:${personId}`
}

/** Kept on this device: the demo has no server to hold them. */
function usePrefs(personId: PersonId) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return {
        ...DEFAULT_PREFS,
        ...(JSON.parse(window.localStorage.getItem(prefsKey(personId)) ?? '{}') as Partial<Prefs>),
      }
    } catch {
      return DEFAULT_PREFS
    }
  })
  const set = (patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      try {
        window.localStorage.setItem(prefsKey(personId), JSON.stringify(next))
      } catch {
        // Not saved on this device; the choice still applies until the page closes.
      }
      return next
    })
  }
  return [prefs, set] as const
}

function isStandalone() {
  return typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
}

export function ProfilePage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const { api } = useSlate()
  const toast = useToast()
  const [prefs, setPrefs] = usePrefs(person.id)
  const [addRole, setAddRole] = useState<'landlord' | 'trade' | null>(null)
  const [adding, setAdding] = useState(false)
  const { state, refresh } = useSlateQuery((a) => a.getMe(viewer), [viewer])
  const me = state.data

  async function confirmAddRole() {
    if (!addRole) return
    setAdding(true)
    try {
      await api.addRole(viewer, addRole)
      toast.success(`${ROLE_LABELS[addRole]} portal added`, {
        description: 'Switch to it from your account menu, top right.',
      })
      setAddRole(null)
    } catch (error) {
      toast.error('That didn’t work', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setAdding(false)
    }
  }

  const standalone = isStandalone()
  const missingRoles = ROLES.filter(
    (role) => role !== 'tenant' && !person.roles.includes(role),
  ) as ('landlord' | 'trade')[]

  return (
    <PortalPage title="Profile">
      <PageHeader title="Profile" />
      <header className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-6">
        <Avatar
          name={person.displayName}
          seed={person.avatarSeed}
          role="tenant"
          size="xl"
          decorative
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-display-m font-semibold text-ink">{person.displayName}</p>
          <p className="text-small text-muted">
            {person.postcodeDistrict} · On {BRAND.name} since {formatMonthYear(person.joinedAt)}
          </p>
          <p className="text-small text-muted">
            Reviews of you never show your name, only “Verified tenant · {person.postcodeDistrict}”.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="flex flex-col gap-8">
          <Section
            id="badges"
            title="Checks and badges"
            description="A badge only shows once we’ve checked it, with the date we did."
          >
            {person.badges.length === 0 && person.pendingVerifications.length === 0 ? (
              <p className="text-small text-muted">No checks yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {person.badges.map((badge) => (
                  <li key={badge.kind}>
                    <VerifiedBadge badge={badge} variant="detail" />
                  </li>
                ))}
                {person.pendingVerifications.map((pending) => (
                  <li key={pending.claim.kind}>
                    <VerifiedBadge badge={pending.claim} pending variant="detail" />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="roles" title="Your roles">
            <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
              <ul className="flex flex-wrap gap-2">
                {person.roles.map((role) => (
                  <li key={role}>
                    <RoleChip
                      role={role}
                      size="md"
                      label={role === 'tenant' ? 'Tenant (this portal)' : undefined}
                    />
                  </li>
                ))}
              </ul>
              {person.roles.length > 1 ? (
                <p className="text-small text-muted">
                  Switch portals from your account menu, top right.
                </p>
              ) : null}
              {missingRoles.length > 0 ? (
                <div className="flex flex-col gap-2 border-t border-line pt-4">
                  <p className="text-small text-ink">
                    Also let a home, or work as a trade? One account covers both.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingRoles.map((role) => (
                      <Button
                        key={role}
                        variant="secondary"
                        size="sm"
                        onClick={() => setAddRole(role)}
                        iconStart={<PlusSquareIcon weight="bold" aria-hidden />}
                      >
                        Add the {ROLE_LABELS[role].toLowerCase()} portal
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section id="contact" title="Contact details">
            {state.status === 'loading' ? (
              <LoadingRegion label="Loading your details">
                <Skeleton className="h-28 w-full rounded-card" />
              </LoadingRegion>
            ) : !me ? (
              <QueryError what="your details" onRetry={refresh} />
            ) : (
              <dl className="flex flex-col rounded-card border border-line bg-surface px-4 shadow-soft sm:px-5">
                <div className="flex flex-col gap-0.5 border-b border-line py-3.5">
                  <dt className="flex items-center gap-2 text-small text-muted">
                    <EnvelopeSimpleIcon weight="bold" aria-hidden className="size-4 shrink-0" />
                    Email
                  </dt>
                  <dd className="pl-6 break-all text-ink">{me.contact.email}</dd>
                </div>
                <div className="flex flex-col gap-0.5 py-3.5">
                  <dt className="flex items-center gap-2 text-small text-muted">
                    <PhoneIcon weight="bold" aria-hidden className="size-4 shrink-0" />
                    Phone
                  </dt>
                  <dd className="figures pl-6 text-ink">{me.contact.phone ?? 'Not added'}</dd>
                </div>
              </dl>
            )}
            <p className="flex items-center gap-2 text-small text-muted">
              <LockKeyIcon weight="bold" aria-hidden className="size-4 shrink-0" />
              Only you see these. Landlords and trades reach you through messages here.
            </p>
          </Section>
        </div>

        <div className="flex flex-col gap-8">
          <Section
            id="notification-settings"
            title="Notification settings"
            description="Saved on this device."
          >
            <div className="flex flex-col rounded-card border border-line bg-surface px-4 py-1 shadow-soft sm:px-5">
              {PREFS.map((pref) => (
                <Switch
                  key={pref.id}
                  label={pref.label}
                  description={pref.description}
                  checked={prefs[pref.id]}
                  onCheckedChange={(checked) => setPrefs({ [pref.id]: checked })}
                  className="border-b border-line last:border-b-0"
                />
              ))}
              <div className="flex items-start justify-between gap-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-ink">Written notice of visits</span>
                  <span className="text-small text-muted">
                    Always on. It’s your legal record of the 48 hours’ notice.
                  </span>
                </span>
                <LockKeyIcon
                  weight="bold"
                  aria-hidden
                  className="mt-1 size-5 shrink-0 text-muted"
                />
              </div>
            </div>
            <div className="flex flex-col rounded-card border border-line bg-surface px-4 py-1 shadow-soft sm:px-5">
              <Switch
                label={
                  <span className="flex items-center gap-2">
                    <EnvelopeSimpleIcon weight="bold" aria-hidden className="size-4.5" /> By email
                  </span>
                }
                checked={prefs.email}
                onCheckedChange={(email) => setPrefs({ email })}
                className="border-b border-line"
              />
              <Switch
                label={
                  <span className="flex items-center gap-2">
                    <BellIcon weight="bold" aria-hidden className="size-4.5" /> On this phone
                  </span>
                }
                description={
                  standalone
                    ? 'Alerts from the app on your home screen.'
                    : 'Add the app to your home screen first. Here’s how.'
                }
                // iPhones only send alerts to an installed app, so the guide comes before the ask.
                disabled={!standalone}
                checked={standalone && prefs.push}
                onCheckedChange={(push) => setPrefs({ push })}
              />
            </div>
            {!standalone ? <HomeScreenGuide /> : null}
          </Section>

          <Section id="more" title="More">
            <ul className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft">
              {[
                {
                  to: '/tenant/passport',
                  label: 'Your tenant passport',
                  icon: IdentificationCardIcon,
                },
                {
                  to: '/tenant/reports',
                  label: 'Reports you’ve made, and about you',
                  icon: FlagIcon,
                },
                { to: REVIEW_POLICY_PATH, label: 'Our review policy', icon: ScrollIcon },
              ].map(({ to, label, icon: Glyph }) => (
                <li key={to} className="border-b border-line last:border-b-0">
                  <Link
                    to={to}
                    className="flex min-h-13 items-center gap-3 px-4 text-ink no-underline hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                  >
                    <Glyph weight="bold" aria-hidden className="size-5 shrink-0 text-muted" />
                    <span className="flex-1 font-semibold">{label}</span>
                    <CaretRightIcon weight="bold" aria-hidden className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Dialog open={addRole !== null} onOpenChange={(open) => !open && setAddRole(null)}>
        <DialogContent
          size="sm"
          title={addRole ? `Add the ${ROLE_LABELS[addRole].toLowerCase()} portal?` : ''}
          description={
            addRole === 'landlord'
              ? 'You’ll get a landlord portal alongside this one, with its own home screen. Your tenant ratings stay separate.'
              : 'You’ll get a trade portal alongside this one. Badges like Gas Safe only show once we’ve checked them.'
          }
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Not now</Button>} />
              <Button loading={adding} onClick={confirmAddRole}>
                Add it
              </Button>
            </>
          }
        />
      </Dialog>
    </PortalPage>
  )
}

/** iPhones only allow alerts from web apps added to the home screen, so say how first. */
function HomeScreenGuide() {
  return (
    <details className="group rounded-card border border-line bg-surface p-4 shadow-soft sm:px-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <DeviceMobileIcon weight="bold" aria-hidden className="size-5 text-accent-text" />
        Get alerts on your phone
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="ml-auto size-4 text-muted transition-transform duration-(--duration-quick) group-open:rotate-90"
        />
      </summary>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-small text-ink marker:font-semibold">
        <li>
          On an iPhone, open {BRAND.name} in Safari. Tap Share{' '}
          <ExportIcon weight="bold" aria-hidden className="inline size-4 align-text-bottom" />, then
          Add to Home Screen.
        </li>
        <li>On Android, open it in Chrome. Tap the menu, then Add to Home screen.</li>
        <li>
          Open {BRAND.name} from your home screen, come back here and turn on “On this phone”.
        </li>
      </ol>
    </details>
  )
}
