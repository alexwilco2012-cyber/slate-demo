import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import {
  ChatsCircleIcon,
  ClipboardTextIcon,
  FilesIcon,
  HouseIcon,
  PlusIcon,
  ReceiptIcon,
  UserCircleIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { PersonId } from '@/domain/ids'
import type { Role } from '@/domain/types'
import { PortalLayout, splitForPhone, type PortalNav } from '@/routes/_shell'
import { PortalGate } from '@/session'
import { renderShell } from './harness'

const NAV: Record<Role, PortalNav> = {
  tenant: {
    items: [
      { to: '/tenant', label: 'Home', icon: HouseIcon, end: true },
      { to: '/tenant/repairs', label: 'Repairs', icon: WrenchIcon },
      { to: '/tenant/messages', label: 'Messages', icon: ChatsCircleIcon, count: 2 },
      { to: '/tenant/documents', label: 'Documents', icon: FilesIcon },
    ],
    primaryAction: { to: '/tenant/report', label: 'Report a problem', icon: PlusIcon },
  },
  landlord: {
    items: [
      { to: '/landlord', label: 'Home', icon: HouseIcon, end: true },
      { to: '/landlord/repairs', label: 'Repairs', icon: WrenchIcon },
      { to: '/landlord/messages', label: 'Messages', icon: ChatsCircleIcon },
      { to: '/landlord/documents', label: 'Documents', icon: FilesIcon },
    ],
  },
  trade: {
    items: [
      { to: '/trade', label: 'Jobs', icon: WrenchIcon, end: true },
      { to: '/trade/board', label: 'Job board', icon: ClipboardTextIcon },
      { to: '/trade/messages', label: 'Messages', icon: ChatsCircleIcon },
      { to: '/trade/quotes', label: 'Quotes', icon: ReceiptIcon, count: 1 },
      { to: '/trade/profile', label: 'Profile', icon: UserCircleIcon },
    ],
  },
}

const PEOPLE: Record<Role, PersonId> = {
  tenant: 'person_sarah',
  landlord: 'person_graham',
  trade: 'person_kev',
}

function renderPortal(role: Role, path = `/${role}`) {
  return renderShell(
    <Routes>
      <Route
        path={`/${role}/*`}
        element={
          <PortalGate role={role} fallback={<p>Checking</p>}>
            <PortalLayout nav={NAV[role]}>
              <h1>Page content</h1>
            </PortalLayout>
          </PortalGate>
        }
      />
    </Routes>,
    { path, session: { personId: PEOPLE[role], activeRole: role } },
  )
}

/** The side bar (desktop) and the bottom bar (phones) are both in the page; CSS picks one. */
async function navigations() {
  await screen.findByRole('heading', { name: 'Page content' })
  const [side, bottom] = screen.getAllByRole('navigation', { name: 'Main' })
  return { side: side!, bottom: bottom! }
}

describe.each(['tenant', 'landlord', 'trade'] as const)('the %s portal layout', (role) => {
  it('shows every destination in the side bar, with the role on <html> for overlays', async () => {
    renderPortal(role)
    const { side } = await navigations()
    for (const item of NAV[role].items) {
      expect(
        within(side).getByRole('link', { name: new RegExp(`^${item.label}`) }),
      ).toHaveAttribute('href', item.to)
    }
    expect(document.documentElement.dataset.role).toBe(role)
    expect(screen.getByText('Demo · fictional data', { selector: 'p' })).toBeInTheDocument()
  })

  it('has a skip link, help, notifications and the account menu on every screen', async () => {
    renderPortal(role)
    await navigations()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Notifications/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Account: / })).toBeInTheDocument()
  })
})

describe('phone navigation', () => {
  it('keeps the tenant’s four destinations and raises the main action', async () => {
    renderPortal('tenant')
    const { bottom } = await navigations()
    const links = within(bottom).getAllByRole('link')
    const names = ['Home', 'Repairs', 'Report a problem', 'Messages, 2 new', 'Documents']
    expect(links).toHaveLength(names.length)
    names.forEach((name, index) => expect(links[index]).toHaveAccessibleName(name))
  })

  it('gives trade four wide cells: three destinations and More', async () => {
    renderPortal('trade')
    const { bottom } = await navigations()
    expect(
      within(bottom)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Jobs', 'Job board', 'Messages'])
    const more = within(bottom).getByRole('button', { name: 'More, 1 new' })
    await userEvent.click(more)
    const sheet = await screen.findByRole('dialog', { name: 'More' })
    expect(within(sheet).getByRole('link', { name: /^Quotes/ })).toHaveAttribute(
      'href',
      '/trade/quotes',
    )
    await userEvent.click(within(sheet).getByRole('link', { name: 'Profile' }))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/trade/profile'))
    expect(within(bottom).getByRole('button', { name: /^More, current section/ })).toBeVisible()
  })

  it('splits by the room each portal has', () => {
    const five = NAV.trade.items
    expect(splitForPhone({ items: five }, 'trade').bar).toHaveLength(3)
    expect(splitForPhone({ items: five }, 'landlord')).toEqual({ bar: five, more: [] })
    expect(splitForPhone({ items: five.slice(0, 4) }, 'trade').more).toHaveLength(0)
    const action = NAV.tenant.primaryAction
    expect(splitForPhone({ items: five, primaryAction: action }, 'tenant').bar).toHaveLength(3)
  })
})

describe('header', () => {
  it('counts unread notifications on the bell and lists them in the panel', async () => {
    renderPortal('tenant')
    const bell = await screen.findByRole('button', { name: /^Notifications, \d+ unread$/ })
    await userEvent.click(bell)
    const panel = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getAllByRole('link').length).toBeGreaterThan(0)
    await userEvent.click(within(panel).getByRole('button', { name: 'Mark all as read' }))
    await screen.findByRole('button', { name: 'Notifications' })
  })

  it('opens help written for the portal', async () => {
    renderPortal('landlord')
    await userEvent.click(await screen.findByRole('button', { name: 'Help' }))
    const help = await screen.findByRole('dialog', { name: 'Help' })
    expect(within(help).getByText('Choosing a trade')).toBeInTheDocument()
    expect(within(help).getByText('About this demo')).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    const { store } = renderPortal('trade')
    await userEvent.click(await screen.findByRole('button', { name: 'Account: Kev Rattray' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    expect(store.get()).toBeNull()
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
})
