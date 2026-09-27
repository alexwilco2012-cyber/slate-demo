import { useMemo, type ReactNode } from 'react'
import { Toast } from '@base-ui/react/toast'
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { cn } from './cn'
import { buttonVariants } from './button'
import { iconButtonVariants } from './icon-button'
import { usePortalContainer } from './portal-container'

export type ToastTone = 'success' | 'error' | 'info'

const TONE: Record<ToastTone, { icon: Icon; className: string }> = {
  success: { icon: CheckCircleIcon, className: 'text-positive' },
  error: { icon: WarningCircleIcon, className: 'text-critical' },
  info: { icon: InfoIcon, className: 'text-info' },
}

/**
 * The portal and theme a toast belongs to. Toasts render on <body>: in the app they take both from
 * <html> (the portal layout and theme set them there), but a toast raised inside a panel with its
 * own role or theme (the dev gallery, a side-by-side demo) carries that panel's with it.
 */
interface ToastScope {
  role?: string
  theme?: string
}

function scopeOf(container: HTMLElement | undefined): ToastScope | undefined {
  if (!container) return undefined
  return {
    role: container.closest('[data-role]')?.getAttribute('data-role') ?? undefined,
    theme: container.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined,
  }
}

/** Renders queued toasts. Mounted once by UiProvider; screens call useToast(). */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider timeout={5000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="slate-toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastScope>()
  return toasts.map((toast) => {
    const tone = TONE[(toast.type as ToastTone | undefined) ?? 'info'] ?? TONE.info
    const ToneIcon = tone.icon
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        data-role={toast.data?.role}
        data-theme={toast.data?.theme}
        className="slate-toast"
      >
        <Toast.Content className="slate-toast-content flex items-start gap-3 p-4">
          <ToneIcon
            weight="fill"
            aria-hidden
            className={cn('mt-0.5 size-6 shrink-0', tone.className)}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Toast.Title className="text-body font-semibold text-ink" />
            <Toast.Description className="text-small text-muted" />
            {toast.actionProps ? (
              <Toast.Action
                className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'mt-2 self-start')}
              />
            ) : null}
          </div>
          <Toast.Close
            aria-label="Dismiss"
            className={cn(iconButtonVariants({ variant: 'quiet', size: 'sm' }), '-mt-1.5 -mr-1.5')}
          >
            <XIcon weight="bold" aria-hidden />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    )
  })
}

export interface ToastOptions {
  description?: ReactNode
  /** e.g. { label: 'Undo', onClick } */
  action?: { label: string; onClick: () => void }
  /** Milliseconds; 0 keeps it until dismissed. Errors stay by default so nobody misses them. */
  timeout?: number
}

/** Show a toast: short confirmation of something that already happened. Never the only record. */
export function useToast() {
  const manager = Toast.useToastManager<ToastScope>()
  const container = usePortalContainer()
  return useMemo(() => {
    function show(tone: ToastTone, title: ReactNode, options: ToastOptions = {}) {
      return manager.add({
        data: scopeOf(container),
        type: tone,
        title,
        description: options.description,
        timeout: options.timeout ?? (tone === 'error' ? 0 : undefined),
        priority: tone === 'error' ? 'high' : 'low',
        actionProps: options.action
          ? { children: options.action.label, onClick: options.action.onClick }
          : undefined,
      })
    }
    return {
      success: (title: ReactNode, options?: ToastOptions) => show('success', title, options),
      error: (title: ReactNode, options?: ToastOptions) => show('error', title, options),
      info: (title: ReactNode, options?: ToastOptions) => show('info', title, options),
      dismiss: (id: string) => manager.close(id),
    }
  }, [manager, container])
}
