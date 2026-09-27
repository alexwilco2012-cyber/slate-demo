import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Menu } from '@base-ui/react/menu'
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CheckIcon,
  DesktopIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UserCircleIcon,
  UserSwitchIcon,
  type Icon,
} from '@phosphor-icons/react'
import { hrefs, useSlate } from '@/data'
import type { PersonId } from '@/domain/ids'
import { ROLE_LABELS, type Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { usePortalContainer } from '@/components/ui/portal-container'
import { RoleIcon } from '@/components/ui/role-icon'
import { useToast } from '@/components/ui/toast'
import { RoleChip } from '@/components/slate/role-chip'
import { START_PATH, usePortal, useSession } from '@/session'
import { useFocusAfterLink } from './route-effects'
import { useThemePreference, type ThemePreference } from './theme'

const THEMES: { value: ThemePreference; label: string; icon: Icon }[] = [
  { value: 'system', label: 'Match this device', icon: DesktopIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
]

const itemClass = cn(
  'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-left text-body text-ink no-underline outline-none select-none trade:min-h-13',
  'data-highlighted:bg-surface-2 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-muted',
)

const groupLabelClass =
  'px-3 pt-2 pb-1 text-caption font-semibold tracking-wide text-muted uppercase'

function RadioRow({
  value,
  icon,
  children,
}: {
  value: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Menu.RadioItem value={value} closeOnClick className={itemClass}>
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
      <Menu.RadioItemIndicator
        keepMounted
        className="flex text-accent-text data-unchecked:invisible"
      >
        <CheckIcon weight="bold" aria-hidden className="size-5" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  )
}

/** The avatar in the header and everything about who is signed in. */
export function AccountMenu() {
  const { role, person, landlords } = usePortal()
  const { session, signOut, actFor } = useSession()
  const [theme, setTheme] = useThemePreference()
  const navigate = useNavigate()
  const toast = useToast()
  const container = usePortalContainer()
  const [resetOpen, setResetOpen] = useState(false)
  const { followLink, finalFocus } = useFocusAfterLink()
  const actingFor = landlords.find((landlord) => landlord.id === session?.actingForLandlordId)
  const firstName = person.displayName.split(' ')[0]

  function switchPortal(next: Role) {
    if (next === role) return
    followLink()
    navigate(hrefs.home(next))
  }

  function workFor(landlordId: PersonId) {
    if (landlordId === actingFor?.id) return
    followLink()
    actFor(landlordId)
    navigate(hrefs.home('landlord'))
  }

  function leave() {
    followLink()
    navigate('/')
    signOut()
    toast.info('Signed out', {
      description: 'Nothing is lost: the demo data stays in this browser.',
    })
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account: ${person.displayName}`}
          className="flex min-h-11 items-center gap-2 rounded-full p-1 text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:bg-surface-2 lg:pr-3"
        >
          <Avatar
            name={person.displayName}
            seed={person.avatarSeed}
            role={role}
            size="sm"
            decorative
          />
          <span className="hidden max-w-32 truncate font-semibold lg:block">{firstName}</span>
          <CaretDownIcon weight="bold" aria-hidden className="hidden size-4 text-muted lg:block" />
        </Menu.Trigger>
        <Menu.Portal container={container}>
          <Menu.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-(--z-overlay)"
          >
            <Menu.Popup
              finalFocus={finalFocus}
              className={cn(
                'max-h-(--available-height) w-[min(21rem,calc(100vw-1.5rem))] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-card border border-line bg-surface p-1.5 text-ink shadow-overlay outline-none',
                'transition-[opacity,scale] duration-(--duration-quick) ease-out-soft data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0',
              )}
            >
              <div className="flex items-center gap-3 px-3 pt-2.5 pb-3">
                <Avatar name={person.displayName} seed={person.avatarSeed} role={role} decorative />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-semibold leading-tight">{person.displayName}</p>
                  <p className="truncate text-small text-muted">{person.contact.email}</p>
                  <RoleChip
                    role={role}
                    label={actingFor ? `Agent for ${actingFor.displayName}` : undefined}
                    className="self-start"
                  />
                </div>
              </div>

              {person.roles.length > 1 ? (
                <>
                  <Menu.Separator className="mx-1.5 my-1 h-px bg-line lg:hidden" />
                  <Menu.RadioGroup
                    value={role}
                    onValueChange={(next) => switchPortal(next as Role)}
                    className="lg:hidden"
                  >
                    <Menu.GroupLabel className={groupLabelClass}>Portal</Menu.GroupLabel>
                    {person.roles.map((option) => (
                      <RadioRow
                        key={option}
                        value={option}
                        icon={
                          <span data-role-accent={option} className="flex text-accent-text">
                            <RoleIcon role={option} weight="bold" className="size-5" />
                          </span>
                        }
                      >
                        {ROLE_LABELS[option]}
                      </RadioRow>
                    ))}
                  </Menu.RadioGroup>
                </>
              ) : null}

              {role === 'landlord' && landlords.length > 1 ? (
                <>
                  <Menu.Separator className="mx-1.5 my-1 h-px bg-line" />
                  <Menu.RadioGroup
                    value={actingFor?.id ?? ''}
                    onValueChange={(next) => workFor(next as PersonId)}
                  >
                    <Menu.GroupLabel className={groupLabelClass}>Working for</Menu.GroupLabel>
                    {landlords.map((landlord) => (
                      <RadioRow
                        key={landlord.id}
                        value={landlord.id}
                        icon={
                          <Avatar
                            name={landlord.displayName}
                            seed={landlord.avatarSeed}
                            size="xs"
                            decorative
                          />
                        }
                      >
                        {landlord.displayName}
                      </RadioRow>
                    ))}
                  </Menu.RadioGroup>
                </>
              ) : null}

              <Menu.Separator className="mx-1.5 my-1 h-px bg-line" />
              <Menu.RadioGroup
                value={theme}
                onValueChange={(next) => setTheme(next as ThemePreference)}
              >
                <Menu.GroupLabel className={groupLabelClass}>Appearance</Menu.GroupLabel>
                {THEMES.map(({ value, label, icon: Glyph }) => (
                  <RadioRow key={value} value={value} icon={<Glyph aria-hidden />}>
                    {label}
                  </RadioRow>
                ))}
              </Menu.RadioGroup>

              <Menu.Separator className="mx-1.5 my-1 h-px bg-line" />
              <Menu.LinkItem
                closeOnClick
                onClick={followLink}
                render={<Link to={hrefs.profile(role)} />}
                className={itemClass}
              >
                <UserCircleIcon aria-hidden />
                Your profile
              </Menu.LinkItem>
              <Menu.LinkItem
                closeOnClick
                onClick={followLink}
                render={<Link to={START_PATH} />}
                className={itemClass}
              >
                <UserSwitchIcon aria-hidden />
                Try as someone else
              </Menu.LinkItem>
              <Menu.Item onClick={() => setResetOpen(true)} className={itemClass}>
                <ArrowCounterClockwiseIcon aria-hidden />
                Reset demo data
              </Menu.Item>
              <Menu.Separator className="mx-1.5 my-1 h-px bg-line" />
              <Menu.Item onClick={leave} className={itemClass}>
                <SignOutIcon aria-hidden />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} name={firstName ?? ''} />
    </>
  )
}

function ResetDemoDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
}) {
  const { demo } = useSlate()
  const { role } = usePortal()
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function reset() {
    setBusy(true)
    try {
      await demo.reset()
      onOpenChange(false)
      navigate(hrefs.home(role))
      toast.success('Demo data reset', {
        description: 'Everything is back to how the demo starts.',
      })
    } catch {
      toast.error('The demo data couldn’t be reset', {
        description: 'Reload the page and try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Reset demo data?"
        description={`Every change made in the demo goes back to how it started, in all your open tabs. You stay signed in as ${name}.`}
        footer={
          <>
            <DialogClose render={<Button variant="secondary" />}>Keep my changes</DialogClose>
            <Button variant="danger-solid" loading={busy} onClick={() => void reset()}>
              Reset demo data
            </Button>
          </>
        }
      />
    </Dialog>
  )
}
