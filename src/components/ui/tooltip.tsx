import type { ReactElement, ReactNode } from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from './cn'
import { usePortalContainer } from './portal-container'

/** Shares hover delays between neighbouring tooltips. Mounted once by UiProvider. */
export const TooltipProvider = BaseTooltip.Provider

export interface TooltipProps {
  content: ReactNode
  /** One focusable element, usually an IconButton. */
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Extra clarity for mouse and keyboard users only: Base UI keeps tooltips off touch screens, so
 * never put anything essential in one. Icon buttons still carry their own aria-label.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const container = usePortalContainer()
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal container={container}>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="z-(--z-tooltip)">
          <BaseTooltip.Popup
            className={cn(
              'max-w-64 origin-(--transform-origin) rounded-lg bg-ink px-2.5 py-1.5 text-small font-medium text-bg shadow-raised',
              'transition-[opacity,scale] duration-(--duration-quick) ease-out-soft',
              'data-starting-style:scale-95 data-starting-style:opacity-0',
              'data-ending-style:scale-95 data-ending-style:opacity-0',
              className,
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
