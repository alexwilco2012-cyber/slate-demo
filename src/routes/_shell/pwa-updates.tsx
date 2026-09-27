/// <reference types="vite-plugin-pwa/client" />
import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

let registered = false

/**
 * Registers the service worker (installed app, offline pages) and, when a new version has been
 * downloaded, says so quietly with a Reload button instead of reloading under someone's feet.
 * Production builds only: the development server has no service worker.
 */
export function PwaUpdates() {
  const toast = useToast()

  useEffect(() => {
    if (!import.meta.env.PROD || registered) return
    registered = true
    const offerReload = (reload: () => void) =>
      toast.info('Update available', {
        description: 'Reload to use the latest version.',
        action: { label: 'Reload', onClick: reload },
        timeout: 0,
      })
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const update = registerSW({
          immediate: true,
          // Auto-update mode: the new version has taken over; the page just needs a reload.
          onNeedReload: () => offerReload(() => window.location.reload()),
          // Prompt mode: the new version is waiting; activating it reloads the page.
          onNeedRefresh: () => offerReload(() => void update(true)),
        })
      })
      .catch(() => {
        // No service worker (unsupported browser, or blocked): the app still works online.
      })
  }, [toast])

  return null
}
