import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PersonId } from '@/domain/types'
import { freshSlate } from '../shell/harness'
import { AILEEN, GRAHAM, graham, renderLandlord } from './harness'

const HANNAH = 'person_hannah' as PersonId

beforeEach(() => {
  window.scrollTo = vi.fn()
})

describe('the landlord’s team', () => {
  it('shows each agent, what they can do and which homes they work on', async () => {
    renderLandlord('/landlord/team')
    const aileen = (await screen.findByRole('heading', { name: 'Aileen Christie' })).closest('li')!
    expect(aileen).toHaveTextContent('On your team')
    expect(aileen).toHaveTextContent('Leask & Ogston Lettings')
    expect(within(aileen).getByText('Approve, decline and confirm repairs')).toBeInTheDocument()
    expect(aileen).toHaveTextContent('Can: Approve, decline and confirm repairs')
    expect(aileen).toHaveTextContent('118 King Street, Old Aberdeen')
    expect(screen.getByText(/never by us/)).toBeInTheDocument()
  })

  it('invites a letting agent, who then shows as waiting to accept', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/team')
    await user.click(await screen.findByRole('button', { name: 'Invite a letting agent' }))
    const dialog = await screen.findByRole('dialog', { name: 'Invite a letting agent' })

    await user.type(
      within(dialog).getByRole('textbox', { name: /Their email/ }),
      'nobody@example.com',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))
    expect(
      await within(dialog).findByText(/There's no Slate account with that email yet/),
    ).toBeInTheDocument()

    await user.clear(within(dialog).getByRole('textbox', { name: /Their email/ }))
    await user.type(
      within(dialog).getByRole('textbox', { name: /Their email/ }),
      'hannah.reid@example.com',
    )
    // Only some permissions, on one home.
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Accept quotes and record payments' }),
    )
    for (const home of [
      '31 Jesmond Drive, Bridge of Don',
      '9 Fonthill Road, Ferryhill',
      "32 Queen's Road, West End",
      '47 Union Grove, West End',
      '14 Esslemont Avenue, Rosemount',
    ]) {
      await user.click(within(dialog).getByRole('checkbox', { name: home }))
    }
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))

    const hannah = (await screen.findByRole('heading', { name: 'Hannah Reid' })).closest('li')!
    expect(hannah).toHaveTextContent('Invitation sent')
    expect(hannah).toHaveTextContent('Waiting for Hannah to accept')
    expect(hannah).toHaveTextContent('Can’t: Accept quotes and record payments')
    const team = await slate.api.listTeam(graham)
    const invite = team.find((m) => m.agent.id === HANNAH)!
    expect(invite.membership.status).toBe('invited')
    expect(invite.membership.permissions).not.toContain('accept_quotes')
  })

  it('lets the invited agent see exactly what they’d do, and accept', async () => {
    const user = userEvent.setup()
    const slate = freshSlate()
    const [agency] = (await slate.api.listTeam(graham)).map((m) => m.agency)
    await slate.api.inviteAgent(graham, {
      agencyId: agency!.id,
      email: 'hannah.reid@example.com',
      permissions: ['approve_repairs', 'message'],
      propertyIds: ['property_king_street'],
    })
    renderLandlord('/landlord/team', { personId: HANNAH, slate })

    const invitations = await screen.findByRole('region', { name: 'Invitations' })
    expect(
      within(invitations).getByText('Graham Forbes invited you to their team'),
    ).toBeInTheDocument()
    expect(invitations).toHaveTextContent('Can: Approve, decline and confirm repairs')
    expect(invitations).toHaveTextContent('Can’t: Choose and instruct trades, and book visits')
    // Hannah lets her own homes too, so her own team is still there underneath.
    expect(screen.getByRole('heading', { name: 'People on your team' })).toBeInTheDocument()

    await user.click(within(invitations).getByRole('button', { name: 'Accept and join' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Invitations' })).not.toBeInTheDocument(),
    )
    const team = await slate.api.listTeam({ personId: HANNAH, role: 'landlord' })
    expect(team.find((m) => m.landlord.id === GRAHAM)?.membership.status).toBe('active')
  })

  it('shows an agent the landlords they work for', async () => {
    renderLandlord('/landlord/team', { personId: AILEEN, actingForLandlordId: GRAHAM })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your landlords' }),
    ).toBeInTheDocument()
    const graham = (await screen.findByText('Graham Forbes', { selector: 'span' })).closest('li')!
    expect(graham).toHaveTextContent('Working in this account')
  })

  it('removes an agent after asking first', async () => {
    const user = userEvent.setup()
    const { slate } = renderLandlord('/landlord/team')
    const aileen = (await screen.findByRole('heading', { name: 'Aileen Christie' })).closest('li')!
    await user.click(within(aileen).getByRole('button', { name: 'Remove from team' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Aileen Christie?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(async () => {
      const team = await slate.api.listTeam(graham)
      expect(team.find((m) => m.agent.id === AILEEN)?.membership.status).toBe('ended')
    })
  })
})
