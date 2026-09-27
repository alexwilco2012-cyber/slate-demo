import { useState } from 'react'
import {
  BriefcaseIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  ClockCountdownIcon,
  FilesIcon,
  HouseIcon,
  HouseLineIcon,
  PlusIcon,
  QuestionIcon,
  ReceiptIcon,
  UserCircleIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BottomNav, SideNav, type NavAction, type NavItem } from '@/components/slate/app-nav'
import { PageHeader } from '@/components/slate/page-header'
import { RoleSwitcher } from '@/components/slate/role-switcher'
import { Section, Specimen, Specimens } from '../gallery-frame'

const BASE = '/dev/gallery'

const NAV: Record<Role, { items: NavItem[]; action?: NavAction }> = {
  tenant: {
    items: [
      { to: BASE, label: 'Home', icon: HouseIcon, end: true },
      { to: `${BASE}/repairs`, label: 'Repairs', icon: WrenchIcon },
      { to: `${BASE}/messages`, label: 'Messages', icon: ChatsCircleIcon, count: 2 },
      { to: `${BASE}/documents`, label: 'Documents', icon: FilesIcon },
    ],
    action: { to: `${BASE}/report`, label: 'Report', icon: PlusIcon },
  },
  landlord: {
    items: [
      { to: BASE, label: 'Home', icon: HouseIcon, end: true },
      { to: `${BASE}/homes`, label: 'Homes', icon: HouseLineIcon },
      { to: `${BASE}/repairs`, label: 'Repairs', icon: WrenchIcon, count: 3 },
      { to: `${BASE}/messages`, label: 'Messages', icon: ChatsCircleIcon },
      { to: `${BASE}/documents`, label: 'Documents', icon: FilesIcon },
    ],
  },
  trade: {
    items: [
      { to: BASE, label: 'Jobs', icon: WrenchIcon, end: true },
      { to: `${BASE}/board`, label: 'Job board', icon: ClipboardTextIcon },
      { to: `${BASE}/messages`, label: 'Messages', icon: ChatsCircleIcon, count: 1 },
      { to: `${BASE}/quotes`, label: 'Quotes', icon: ReceiptIcon },
      { to: `${BASE}/profile`, label: 'Profile', icon: UserCircleIcon },
    ],
  },
}

const HEADERS: Record<Role, { eyebrow: string; title: string; description: string }> = {
  tenant: {
    eyebrow: 'Flat 2, 41 Rosemount Place',
    title: 'Leak under the kitchen sink',
    description: 'Kev visits on Monday between 9am and 11am.',
  },
  landlord: {
    eyebrow: '17 Fonthill Road, Ferryhill',
    title: 'Repairs',
    description: '3 need you: 1 to approve, 2 quotes to compare.',
  },
  trade: {
    eyebrow: 'Granite Tap Plumbing',
    title: 'Monday 28 September',
    description: '2 jobs today. First at 9am in Rosemount.',
  },
}

function SideNavDemo({ role }: { role: Role }) {
  const [portal, setPortal] = useState<Role>(role)
  return (
    <div className="flex h-[42rem] overflow-hidden rounded-card border border-line">
      <SideNav
        role={role}
        items={NAV[role].items}
        primaryAction={
          role === 'tenant'
            ? { to: `${BASE}/report`, label: 'Report a problem', icon: PlusIcon }
            : role === 'landlord'
              ? { to: `${BASE}/homes/new`, label: 'Add a home', icon: PlusIcon }
              : { to: `${BASE}/board`, label: 'Find work', icon: BriefcaseIcon }
        }
        footer={
          <>
            <RoleSwitcher
              variant="compact"
              label="Portal"
              roles={
                role === 'landlord'
                  ? [{ role: 'landlord' }, { role: 'tenant' }]
                  : [{ role }, { role: role === 'tenant' ? 'landlord' : 'tenant' }]
              }
              value={portal}
              onValueChange={setPortal}
            />
            <Button
              variant="ghost"
              fullWidth
              iconStart={<QuestionIcon weight="bold" aria-hidden />}
              className="justify-start"
            >
              Help
            </Button>
          </>
        }
        className="w-64 max-w-full shrink-0"
      />
      <div className="min-w-0 flex-1 bg-bg p-5 max-sm:hidden">
        <p className="text-small text-muted">Page content</p>
      </div>
    </div>
  )
}

export function NavigationSection() {
  return (
    <Section
      id="navigation"
      title="Navigation"
      description="Bottom bar on phones, side bar from 1024px. The current page gets a filled icon in a pill (or a bar) as well as colour. The tenant’s main action sits raised in the middle."
    >
      <Specimens>
        {(role) => {
          const header = HEADERS[role]
          return (
            <>
              <Specimen label="Page header">
                <PageHeader
                  back={{ to: BASE, label: role === 'trade' ? 'Jobs' : 'Repairs' }}
                  eyebrow={header.eyebrow}
                  title={header.title}
                  description={header.description}
                  meta={
                    <Badge tone="caution" icon={<ClockCountdownIcon weight="bold" aria-hidden />}>
                      Urgent
                    </Badge>
                  }
                  actions={
                    <>
                      <Button variant="secondary">Message</Button>
                      <Button>
                        {role === 'landlord'
                          ? 'Approve'
                          : role === 'trade'
                            ? 'Start job'
                            : 'Add photos'}
                      </Button>
                    </>
                  }
                />
              </Specimen>
              <Specimen label="Bottom bar (phone)">
                <div className="overflow-hidden rounded-card border border-line bg-bg pt-10">
                  <BottomNav
                    position="static"
                    items={NAV[role].items}
                    primaryAction={NAV[role].action}
                  />
                </div>
              </Specimen>
            </>
          )
        }}
      </Specimens>
      <Specimens wide>
        {(role) => (
          <Specimen label="Side bar (desktop)">
            <SideNavDemo role={role} />
          </Specimen>
        )}
      </Specimens>
    </Section>
  )
}
