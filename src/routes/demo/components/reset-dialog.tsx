import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'

export function ResetDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Start the demo again?"
        description="All three phones go back to the start. Sarah’s leak, and every quote, message and rating added since, are cleared."
        footer={
          <>
            <DialogClose render={<Button variant="secondary" />}>Keep going</DialogClose>
            <Button variant="danger-solid" loading={busy} onClick={() => void confirm()}>
              Reset the demo
            </Button>
          </>
        }
      />
    </Dialog>
  )
}
