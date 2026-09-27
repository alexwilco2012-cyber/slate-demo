// Letting agents on the landlord's team. There is no fourth portal: an agent works inside the
// landlord's account, on the homes and with the permissions the landlord chose. The same page
// shows an agent their invitations to accept or decline.

import { useMemo, useState } from 'react'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CheckIcon,
  HourglassMediumIcon,
  XCircleIcon,
  type Icon,
  EnvelopeSimpleIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useSlate, useSlateQuery, useSlateStore, type TeamMember } from '@/data'
import {
  TEAM_PERMISSIONS,
  type Agency,
  type AgencyId,
  type PropertyId,
  type TeamMembershipStatus,
  type TeamPermission,
} from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { formatDate } from '@/components/slate/format'
import { BRAND } from '@/config/brand'
import { PortalPage } from '@/routes/_shell'
import { sessionHref, usePortal, useSession, useViewer } from '@/session'
import { Section } from '../components/section'
import { SelectField } from '../components/select-field'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { usePortfolio } from '../lib/data'
import { errorMessage, fieldErrors } from '../lib/errors'
import { firstName, placeOf } from '../lib/format'

export const PERMISSION_LABELS: Record<TeamPermission, string> = {
  approve_repairs: 'Approve, decline and confirm repairs',
  instruct_trades: 'Choose and instruct trades, and book visits',
  accept_quotes: 'Accept quotes and record payments',
  manage_documents: 'Upload and share certificates',
  manage_tenancies: 'Confirm and end tenancies',
  message: 'Message tenants and trades',
}

const STATUS: Record<
  TeamMembershipStatus,
  { label: string; tone: NonNullable<BadgeProps['tone']>; icon: Icon }
> = {
  invited: { label: 'Invitation sent', tone: 'caution', icon: HourglassMediumIcon },
  active: { label: 'On your team', tone: 'positive', icon: CheckCircleIcon },
  declined: { label: 'Declined', tone: 'neutral', icon: XCircleIcon },
  ended: { label: 'Removed', tone: 'neutral', icon: UserMinusIcon },
}

function PermissionList({ permissions }: { permissions: readonly TeamPermission[] }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {TEAM_PERMISSIONS.map((permission) => {
        const allowed = permissions.includes(permission)
        return (
          <li key={permission} className="flex items-start gap-2 text-small">
            {allowed ? (
              <CheckIcon
                weight="bold"
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-positive"
              />
            ) : (
              <XIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            )}
            <span className={allowed ? 'text-ink' : 'text-muted line-through decoration-muted/40'}>
              <span className="sr-only">{allowed ? 'Can: ' : 'Can’t: '}</span>
              {PERMISSION_LABELS[permission]}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function useAgencies(team: readonly TeamMember[] | undefined): Agency[] {
  // Letting agencies are public reference data; the store holds the register.
  const register = useSlateStore((state) => state.data.tables.agencies)
  return useMemo(() => {
    const all = new Map<AgencyId, Agency>()
    for (const agency of Object.values(register)) if (agency) all.set(agency.id, agency)
    for (const member of team ?? []) all.set(member.agency.id, member.agency)
    return [...all.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
  }, [register, team])
}

function LandlordTeam({ team }: { team: TeamMember[] }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const portfolio = usePortfolio()
  const agencies = useAgencies(team)
  const properties = portfolio.state.data?.properties ?? []
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [busy, setBusy] = useState(false)
  const mine = team.filter((m) => m.landlord.id === viewer.personId)

  async function remove() {
    if (!removing) return
    setBusy(true)
    try {
      await api.endTeamMembership(viewer, removing.membership.id)
      toast.success(`${firstName(removing.agent.displayName)} is off your team`, {
        description: 'They can no longer see or act on your homes.',
      })
      setRemoving(null)
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Letting agents can work inside your account on the homes you choose, with only the permissions you give them."
        actions={
          <Button
            iconStart={<UserPlusIcon weight="bold" aria-hidden />}
            onClick={() => setInviting(true)}
          >
            Invite a letting agent
          </Button>
        }
      />
      <Invitations team={team} />
      <Section title="People on your team">
        {/* Each card lists the agent's homes, so it waits for them rather than filling in late. */}
        {!portfolio.state.data && mine.length > 0 ? (
          <ListSkeleton rows={1} label="Loading your team" />
        ) : mine.length === 0 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title="Nobody else on your team yet"
            description="Invite your letting agent and they can approve repairs, instruct trades and keep certificates up to date for you."
            action={
              <Button
                onClick={() => setInviting(true)}
                iconStart={<UserPlusIcon weight="bold" aria-hidden />}
              >
                Invite a letting agent
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {mine.map((member) => {
              const { membership, agent, agency } = member
              const status = STATUS[membership.status]
              const homes = properties.filter((p) => p.agentIds.includes(agent.id))
              return (
                <li
                  key={membership.id}
                  className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar
                      name={agent.displayName}
                      seed={agent.avatarSeed}
                      role="landlord"
                      size="lg"
                      decorative
                    />
                    {/* Wide enough to read; the status badge drops underneath on a phone. */}
                    <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                      <h3 className="text-title font-semibold text-ink">{agent.displayName}</h3>
                      <p className="text-small text-muted">
                        {agency.name} · letting agent registration {agency.registrationNumber}
                      </p>
                      <p className="text-small text-muted">
                        {membership.status === 'active' && membership.acceptedAt
                          ? `Joined ${formatDate(membership.acceptedAt)}`
                          : membership.status === 'invited'
                            ? `Invited ${formatDate(membership.invitedAt)}. Waiting for ${firstName(agent.displayName)} to accept.`
                            : membership.status === 'declined' && membership.declinedAt
                              ? `Declined ${formatDate(membership.declinedAt)}`
                              : membership.endedAt
                                ? `Removed ${formatDate(membership.endedAt)}`
                                : null}
                      </p>
                    </div>
                    <Badge tone={status.tone} icon={<status.icon weight="bold" aria-hidden />}>
                      {status.label}
                    </Badge>
                  </div>
                  {membership.status === 'active' || membership.status === 'invited' ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <p className="text-small font-semibold text-ink">What they can do</p>
                        <PermissionList permissions={membership.permissions} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-small font-semibold text-ink">Homes</p>
                        <p className="text-small text-ink">
                          {homes.length === 0
                            ? 'None yet'
                            : homes.map((p) => placeOf(p)).join(' · ')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-line pt-3.5">
                        <a
                          href={sessionHref(`${import.meta.env.BASE_URL}landlord/team`, {
                            personId: agent.id,
                            activeRole: 'landlord',
                          })}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          <ArrowSquareOutIcon weight="bold" aria-hidden />
                          See it as {firstName(agent.displayName)} (new tab)
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconStart={<UserMinusIcon weight="bold" aria-hidden />}
                          onClick={() => setRemoving(member)}
                        >
                          {membership.status === 'invited'
                            ? 'Withdraw invitation'
                            : 'Remove from team'}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section
        title="How agents work in your account"
        description={`There’s no separate agent app. An agent signs in to ${BRAND.name} and works inside your account.`}
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            [
              'They act as your team',
              'Tenants and trades see their name marked as your agent, so everyone knows who they’re dealing with.',
            ],
            [
              'Only the homes you share',
              'They see the homes you pick, and only do what you allow. You can change it or remove them at any time.',
            ],
            [
              'You still decide',
              'Trades are only ever chosen by you or your agent, never by us. Everything they do is on the record.',
            ],
          ].map(([title, body]) => (
            <li key={title} className="flex flex-col gap-1 rounded-card bg-surface-2 p-4">
              <p className="font-semibold text-ink">{title}</p>
              <p className="text-small text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <InviteDialog
        open={inviting}
        onOpenChange={setInviting}
        agencies={agencies}
        homes={properties.map((p) => ({ id: p.id, label: placeOf(p) }))}
      />
      <Dialog open={removing !== null} onOpenChange={(open) => (open ? null : setRemoving(null))}>
        <DialogContent
          title={removing ? `Remove ${removing.agent.displayName}?` : 'Remove'}
          description="They’re taken off all your homes straight away. Everything they did stays on the record."
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Keep them
              </Button>
              <Button variant="danger-solid" loading={busy} onClick={remove}>
                Remove
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  agencies,
  homes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agencies: Agency[]
  homes: { id: PropertyId; label: string }[]
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [agencyId, setAgencyId] = useState<AgencyId | ''>('')
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<TeamPermission[]>([...TEAM_PERMISSIONS])
  const [homeIds, setHomeIds] = useState<PropertyId[] | null>(null)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)
  const chosenHomes = homeIds ?? homes.map((h) => h.id)
  const agency = agencyId || agencies[0]?.id || ''
  const chosenAgency = agencies.find((a) => a.id === agency)

  function toggle<T>(list: T[], item: T, on: boolean) {
    return on ? [...new Set([...list, item])] : list.filter((x) => x !== item)
  }

  async function invite() {
    if (!email.includes('@'))
      return setErrors({ email: 'Enter their email address, like name@example.com.' })
    setBusy(true)
    try {
      await api.inviteAgent(viewer, {
        agencyId: agency as AgencyId,
        email,
        permissions,
        propertyIds: chosenHomes,
      })
      toast.success('Invitation sent', {
        description: 'They’ll see it when they next sign in, and can accept or decline.',
      })
      onOpenChange(false)
      setEmail('')
      setErrors({})
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { email: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Invite a letting agent"
        description={`They need a ${BRAND.name} account first. They’ll be asked to accept before they can see anything.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              iconStart={<EnvelopeSimpleIcon weight="bold" aria-hidden />}
              onClick={invite}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <SelectField
            label="Letting agency"
            hint={
              chosenAgency
                ? `On the Scottish letting agent register as ${chosenAgency.registrationNumber}.`
                : 'Agencies on the Scottish letting agent register.'
            }
            value={agency}
            onValueChange={(value) => setAgencyId(value as AgencyId)}
            options={agencies.map((a) => ({ value: a.id, label: a.name }))}
            error={errors.agencyId}
          />
          <Input
            label="Their email"
            hint={`The email they sign in to ${BRAND.name} with.`}
            type="email"
            autoComplete="off"
            inputMode="email"
            placeholder="name@example.co.uk"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors({})
            }}
            error={errors.email}
          />
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-body font-semibold text-ink">What they can do</legend>
            {TEAM_PERMISSIONS.map((permission) => (
              <Checkbox
                key={permission}
                label={PERMISSION_LABELS[permission]}
                checked={permissions.includes(permission)}
                onCheckedChange={(on) => setPermissions((list) => toggle(list, permission, on))}
              />
            ))}
            {errors.permissions ? (
              <p className="text-small font-semibold text-critical">{errors.permissions}</p>
            ) : null}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-body font-semibold text-ink">Which homes</legend>
            {homes.map((home) => (
              <Checkbox
                key={home.id}
                label={home.label}
                checked={chosenHomes.includes(home.id)}
                onCheckedChange={(on) => setHomeIds(toggle(chosenHomes, home.id, on))}
              />
            ))}
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Invitations for the signed-in person to join a landlord's team, with accept and decline. */
function Invitations({ team }: { team: TeamMember[] }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const invites = team.filter(
    (m) => m.agent.id === viewer.personId && m.membership.status === 'invited',
  )
  if (invites.length === 0) return null

  async function answer(member: TeamMember, accept: boolean) {
    setBusy(member.membership.id)
    try {
      if (accept) {
        await api.acceptTeamInvite(viewer, member.membership.id)
        toast.success(`You’re on ${firstName(member.landlord.displayName)}’s team`, {
          description:
            'You can now work in their account. Switch to it from the list below or the account menu.',
        })
      } else {
        await api.declineTeamInvite(viewer, member.membership.id)
        toast.success('Invitation declined', {
          description: `${firstName(member.landlord.displayName)} has been told.`,
        })
      }
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section title="Invitations">
      <ul className="flex flex-col gap-4">
        {invites.map((member) => (
          <li
            key={member.membership.id}
            className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-[color-mix(in_oklab,var(--accent),transparent_65%)] bg-accent-tint p-4 sm:p-5"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
            <div className="flex items-start gap-3">
              <Avatar
                name={member.landlord.displayName}
                seed={member.landlord.avatarSeed}
                role="landlord"
                size="lg"
                decorative
              />
              <div className="flex flex-col gap-0.5">
                <h3 className="text-title font-semibold text-ink">
                  {member.landlord.displayName} invited you to their team
                </h3>
                <p className="text-small text-muted">
                  As {member.agency.name} · sent {formatDate(member.membership.invitedAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-small font-semibold text-ink">What you’d be able to do</p>
              <PermissionList permissions={member.membership.permissions} />
            </div>
            <p className="text-small text-ink">
              You’d work inside {firstName(member.landlord.displayName)}’s account, marked as their
              agent. They can change what you can do, or remove you, at any time.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                loading={busy === member.membership.id}
                disabled={busy !== null && busy !== member.membership.id}
                onClick={() => answer(member, false)}
              >
                Decline
              </Button>
              <Button
                loading={busy === member.membership.id}
                disabled={busy !== null && busy !== member.membership.id}
                onClick={() => answer(member, true)}
              >
                Accept and join
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** What an agent sees: invitations to answer, and the landlords they work for. */
function AgentTeam({ team }: { team: TeamMember[] }) {
  const viewer = useViewer()
  const { actFor } = useSession()
  const mine = team.filter((m) => m.agent.id === viewer.personId)
  const active = mine.filter((m) => m.membership.status === 'active')

  return (
    <>
      <PageHeader
        title="Your landlords"
        description="As a letting agent you work inside each landlord’s account, on the homes and with the permissions they gave you."
      />
      <Invitations team={team} />
      <Section title="Landlords you work for">
        {active.length === 0 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title="No landlords yet"
            description="When a landlord invites you, the invitation appears here for you to accept."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((member) => {
              const current = viewer.actingForId === member.landlord.id
              return (
                <li
                  key={member.membership.id}
                  className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      name={member.landlord.displayName}
                      seed={member.landlord.avatarSeed}
                      role="landlord"
                      size="md"
                      decorative
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-ink">{member.landlord.displayName}</span>
                      <span className="text-small text-muted">
                        Since{' '}
                        {member.membership.acceptedAt
                          ? formatDate(member.membership.acceptedAt)
                          : '—'}{' '}
                        · {member.membership.permissions.length} of {TEAM_PERMISSIONS.length}{' '}
                        permissions
                      </span>
                    </div>
                  </div>
                  {current ? (
                    <Badge tone="positive" icon={<CheckIcon weight="bold" aria-hidden />}>
                      Working in this account
                    </Badge>
                  ) : (
                    <Button variant="secondary" onClick={() => actFor(member.landlord.id)}>
                      Work in this account
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>
    </>
  )
}

export default function TeamPage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const { state, refresh } = useSlateQuery(
    (api) => api.listTeam({ personId: viewer.personId, role: 'landlord' }),
    [viewer.personId],
  )
  const team = state.data
  // A landlord who has been invited onto someone else's team still sees their own team, with the
  // invitation above it.
  const isAgent = Boolean(viewer.actingForId) || person.badges.some((b) => b.kind === 'agent_team')

  return (
    <PortalPage title="Team">
      {state.status === 'error' && !team ? (
        <ErrorPanel error={state.error} onRetry={refresh} />
      ) : !team ? (
        <ListSkeleton rows={2} label="Loading your team" />
      ) : isAgent ? (
        <AgentTeam team={team} />
      ) : (
        <LandlordTeam team={team} />
      )}
    </PortalPage>
  )
}
