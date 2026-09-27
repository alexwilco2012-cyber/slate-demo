import { useCallback, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from './errors'

export interface RunOptions {
  /** Toast shown when it works. */
  success?: { title: ReactNode; description?: ReactNode }
  /** Shown as the error toast's title; the error's own message goes underneath. */
  failure?: string
}

/**
 * Runs one write at a time and says how it went: a quiet toast when it works, an error toast that
 * stays until dismissed when it doesn't. `busy` names the write in progress, for its spinner.
 */
export function useRun() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const run = useCallback(
    async <T>(key: string, write: () => Promise<T>, options: RunOptions = {}) => {
      setBusy(key)
      try {
        const result = await write()
        if (options.success) {
          toast.success(options.success.title, { description: options.success.description })
        }
        return { ok: true as const, result }
      } catch (error) {
        toast.error(options.failure ?? 'That didn’t work', { description: errorMessage(error) })
        return { ok: false as const, error }
      } finally {
        setBusy(null)
      }
    },
    [toast],
  )

  return { busy, run }
}
