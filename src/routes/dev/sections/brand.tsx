import { useState } from 'react'
import { ROLES, type Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Logo } from '@/components/slate/logo'
import { RoleAccentBar } from '@/components/slate/role-accent-bar'
import { RoleChip } from '@/components/slate/role-chip'
import { RoleSwitcher } from '@/components/slate/role-switcher'
import { HOMES, PEOPLE } from '../gallery-data'
import { Section, Specimen, Specimens } from '../gallery-frame'

function SwitcherDemo({ role }: { role: Role }) {
  const [value, setValue] = useState<Role>(role === 'trade' ? 'trade' : 'landlord')
  const roles =
    role === 'trade'
      ? [
          { role: 'trade' as const, description: 'Granite Tap Plumbing' },
          { role: 'tenant' as const, description: HOMES.rosemount },
        ]
      : [
          { role: 'landlord' as const, description: '3 homes in Ferryhill and Old Aberdeen' },
          { role: 'tenant' as const, description: HOMES.rosemount },
        ]
  return (
    <>
      <RoleSwitcher roles={roles} value={value} onValueChange={setValue} />
      <RoleSwitcher
        roles={roles}
        value={value}
        onValueChange={setValue}
        variant="compact"
        label="Portal"
      />
    </>
  )
}

export function BrandSection() {
  return (
    <Section
      id="brand"
      title="Brand and roles"
      description="The role is always said in words and shown with an icon, never by colour alone: the lockup names the portal, chips name the writer, avatars carry a key, buildings or wrench."
    >
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Lockup">
              <div className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-soft">
                <Logo role={role} size="lg" />
                <div className="flex flex-wrap items-center gap-5">
                  <Logo role={role} size="md" />
                  <Logo size="sm" />
                  <Logo role={role} size="sm" markOnly />
                </div>
              </div>
            </Specimen>
            <Specimen label="Accent bar">
              <div className="overflow-hidden rounded-card border border-line bg-surface">
                <RoleAccentBar />
                <p className="p-4 text-small text-muted">
                  4px along the top of every portal screen and its cards.
                </p>
              </div>
            </Specimen>
            <Specimen label="Role chips">
              <div className="flex flex-wrap gap-2">
                {ROLES.map((chipRole) => (
                  <RoleChip key={chipRole} role={chipRole} />
                ))}
                <RoleChip role="landlord" label="Agent for Graham" />
                {ROLES.map((chipRole) => (
                  <RoleChip key={`${chipRole}-md`} role={chipRole} size="md" />
                ))}
              </div>
            </Specimen>
            <Specimen label="Avatars">
              <div className="flex flex-wrap items-end gap-4">
                <Avatar name={PEOPLE.sarah.name} seed={PEOPLE.sarah.seed} role="tenant" size="xl" />
                <Avatar
                  name={PEOPLE.graham.name}
                  seed={PEOPLE.graham.seed}
                  role="landlord"
                  size="lg"
                />
                <Avatar name={PEOPLE.kev.name} seed={PEOPLE.kev.seed} role="trade" size="md" />
                <Avatar
                  name={PEOPLE.aileen.name}
                  seed={PEOPLE.aileen.seed}
                  role="landlord"
                  size="sm"
                />
                <Avatar name="Morag Clark" role="tenant" size="xs" />
                <Avatar name="Euan Gray" size="md" />
              </div>
            </Specimen>
            <Specimen label="Role switcher">
              <SwitcherDemo role={role} />
            </Specimen>
          </>
        )}
      </Specimens>
    </Section>
  )
}
