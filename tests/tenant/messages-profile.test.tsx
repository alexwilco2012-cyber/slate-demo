import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderTenant, sarah } from './harness'

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.localStorage.clear()
})

describe('messages', () => {
  it('lists conversations newest first, with what’s unread', async () => {
    renderTenant('/tenant/messages')
    const first = await waitFor(() => {
      const threads = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('/tenant/messages/thread_'))
      expect(threads.length).toBeGreaterThan(0)
      return threads[0]!
    })
    expect(first).toHaveTextContent('Damp patch spreading on the bedroom ceiling')
    expect(first).toHaveTextContent(/1\s*new/)
    expect(first).toHaveTextContent('Aileen: Thanks Sarah')
  })

  it('opens a conversation, marks it read, and names who can see it', async () => {
    const { slate } = renderTenant('/tenant/messages/thread_ceiling_esslemont')
    expect(
      await screen.findByText('Graham and Aileen can see this conversation.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Agent for Graham').length).toBeGreaterThan(0)
    await waitFor(async () => {
      const threads = await slate.api.listThreads(sarah)
      expect(threads.find((t) => t.thread.id === 'thread_ceiling_esslemont')?.unreadCount).toBe(0)
    })
  })

  it('mutes a conversation and blocks someone after a confirmation', async () => {
    const user = userEvent.setup()
    const { slate } = renderTenant('/tenant/messages/thread_eicr_esslemont')
    await user.click(await screen.findByRole('switch', { name: /Mute this conversation/ }))
    await waitFor(async () => {
      const thread = await slate.api.getThread(sarah, 'thread_eicr_esslemont')
      expect(thread?.members.find((m) => m.personId === 'person_sarah')?.mutedAt).toBeDefined()
    })
    await user.click(screen.getByRole('button', { name: /Block\s*Neil Buchan/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Block Neil?' })
    await user.click(within(dialog).getByRole('button', { name: 'Block' }))
    await waitFor(async () =>
      expect((await slate.api.listBlocks(sarah)).map((b) => b.blockedId)).toContain('person_neil'),
    )
  })
})

describe('the profile', () => {
  it('shows checked badges with dates, roles, and notification choices kept on this device', async () => {
    const user = userEvent.setup()
    renderTenant('/tenant/profile')
    expect(await screen.findByText('ID checked')).toBeInTheDocument()
    expect(screen.getByText('Checked 16 Jan 2024')).toBeInTheDocument()
    expect(screen.getByText('Tenant (this portal)')).toBeInTheDocument()
    expect(await screen.findByText('sarah.laing@example.com')).toBeInTheDocument()
    const messages = screen.getByRole('switch', { name: /New messages/ })
    expect(messages).toBeChecked()
    await user.click(messages)
    expect(messages).not.toBeChecked()
    expect(
      JSON.parse(
        window.localStorage.getItem('slate-tenant-notification-prefs:person_sarah') ?? '{}',
      ),
    ).toMatchObject({ messages: false })
    expect(screen.getByText(/Always on\. It’s your legal record/)).toBeInTheDocument()
  })
})
