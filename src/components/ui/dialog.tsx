import { useRef, type ComponentProps, type ReactNode } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { XIcon } from '@phosphor-icons/react'
import { cn } from './cn'
import { iconButtonVariants } from './icon-button'
import { usePortalContainer } from './portal-container'

/** Root: controls open state. Use `open`/`onOpenChange` or leave it uncontrolled. */
export const Dialog = BaseDialog.Root
/** Opens the dialog. Pass `render={<Button …/>}` to use a styled button. */
export const DialogTrigger = BaseDialog.Trigger
/** Closes the dialog. Pass `render={<Button …/>}` to use a styled button. */
export const DialogClose = BaseDialog.Close

/**
 * Where typing or choosing starts. Hidden inputs behind Base UI's radios and checkboxes are
 * skipped; the visible radio that takes focus in a group (tabindex 0) is included.
 */
const FIRST_FIELD = [
  'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[role="radio"][tabindex="0"]:not([data-disabled])',
  '[role="checkbox"]:not([data-disabled])',
  '[role="switch"]:not([data-disabled])',
  '[role="combobox"]',
].join(',')

type PopupProps = ComponentProps<typeof BaseDialog.Popup>

export interface DialogContentProps {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Actions pinned to the bottom. Put the main action last so it sits nearest the thumb. */
  footer?: ReactNode
  /**
   * - dialog: bottom sheet on phones, centred card from 640px.
   * - sheet: bottom sheet on phones, a drawer from the right from 768px (landlord detail views).
   */
  variant?: 'dialog' | 'sheet'
  size?: 'sm' | 'md' | 'lg'
  /**
   * What takes focus on opening. By default the first field in the body, so a form is ready to
   * fill in; without one, the first button (usually Close).
   */
  initialFocus?: PopupProps['initialFocus']
  /** What takes focus on closing. By default the button that opened it. */
  finalFocus?: PopupProps['finalFocus']
  className?: string
}

/**
 * The popup, with backdrop, title, close button and scrollable body. Opens with focus in the first
 * field, is trapped while open and returns to the trigger afterwards; Escape and the close button
 * both dismiss it.
 */
export function DialogContent({
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  size = 'md',
  initialFocus,
  finalFocus,
  className,
}: DialogContentProps) {
  const container = usePortalContainer()
  const bodyRef = useRef<HTMLDivElement>(null)
  return (
    <BaseDialog.Portal container={container}>
      <BaseDialog.Backdrop className="slate-backdrop" />
      <BaseDialog.Popup
        data-variant={variant}
        data-size={size}
        initialFocus={
          initialFocus ?? (() => bodyRef.current?.querySelector<HTMLElement>(FIRST_FIELD) ?? true)
        }
        finalFocus={finalFocus}
        className={cn('slate-dialog', className)}
      >
        <div className="slate-dialog-handle" aria-hidden="true" />
        <header className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <BaseDialog.Title className="font-display text-display-m font-semibold text-ink">
              {title}
            </BaseDialog.Title>
            {description ? (
              <BaseDialog.Description className="text-body text-muted">
                {description}
              </BaseDialog.Description>
            ) : null}
          </div>
          <BaseDialog.Close
            aria-label="Close"
            className={cn(iconButtonVariants({ variant: 'ghost', size: 'md' }), '-mt-1 -mr-2')}
          >
            <XIcon weight="bold" aria-hidden />
          </BaseDialog.Close>
        </header>
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6"
        >
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-col gap-(--gap-touch) border-t border-line bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:[&>*]:w-full sm:flex-row sm:justify-end sm:px-6 sm:pb-5">
            {footer}
          </footer>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}
