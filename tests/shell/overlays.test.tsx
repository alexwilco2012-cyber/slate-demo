import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PortalContainerProvider } from '@/components/ui/portal-container'
import { UiProvider } from '@/components/ui/provider'
import { useToast } from '@/components/ui/toast'

describe('dialogs', () => {
  it('open a form with focus in the first field, not on Close', async () => {
    render(
      <Dialog>
        <DialogTrigger render={<Button />}>Add a note</DialogTrigger>
        <DialogContent title="Add a note" description="Only you can see it.">
          <Input label="Note" />
        </DialogContent>
      </Dialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    await waitFor(() => expect(screen.getByLabelText('Note')).toHaveFocus())
  })

  it('without a field, start on the first button as before', async () => {
    render(
      <Dialog>
        <DialogTrigger render={<Button />}>Details</DialogTrigger>
        <DialogContent title="Details">
          <p>Nothing to fill in.</p>
        </DialogContent>
      </Dialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Details' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus())
  })
})

describe('toasts', () => {
  function Panel({ role, theme }: { role: string; theme: string }) {
    const [container, setContainer] = useState<HTMLElement | null>(null)
    return (
      <div data-role={role} data-theme={theme}>
        <PortalContainerProvider value={container}>
          <SaveButton />
        </PortalContainerProvider>
        <div ref={setContainer} />
      </div>
    )
  }

  function SaveButton() {
    const toast = useToast()
    return <Button onClick={() => toast.success('Quote sent')}>Send</Button>
  }

  it('wear the role and theme of the panel that raised them', async () => {
    render(
      <UiProvider>
        <Panel role="trade" theme="dark" />
      </UiProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    const title = await screen.findByText('Quote sent')
    const toast = title.closest('.slate-toast')
    expect(toast).toHaveAttribute('data-role', 'trade')
    expect(toast).toHaveAttribute('data-theme', 'dark')
  })
})
