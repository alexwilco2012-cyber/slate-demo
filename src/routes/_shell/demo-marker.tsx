import { FlaskIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'

const LABEL = 'Demo · fictional data'

/**
 * "Demo · fictional data", on every portal screen. Quiet on purpose, never dismissible: a pill in
 * the desktop top bar, and on phones a caption under the lockup whose icon sits under the logo
 * mark and whose words line up with the wordmark.
 */
export function DemoMarker({
  variant,
  className,
}: {
  variant: 'pill' | 'caption'
  className?: string
}) {
  if (variant === 'pill') {
    return (
      <p
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-input-border/70 px-2.5 text-caption font-semibold whitespace-nowrap text-muted',
          className,
        )}
      >
        <FlaskIcon weight="duotone" aria-hidden className="size-4 shrink-0" />
        {LABEL}
      </p>
    )
  }
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 text-caption leading-tight font-semibold text-muted',
        className,
      )}
    >
      {/* Same width as the small logo mark, and the same gap as the lockup. */}
      <span aria-hidden="true" className="flex h-[1lh] w-7 shrink-0 items-center justify-center">
        <FlaskIcon weight="duotone" className="size-3.5" />
      </span>
      {/* On a narrow phone the words wrap as two pieces, and the dot between them is clipped so
          no line starts with it. */}
      <span className="flex min-w-0 flex-wrap gap-x-2.5 overflow-hidden">
        <span>Demo</span>
        <span className="relative whitespace-nowrap">
          <span aria-hidden="true" className="absolute -left-1.25 -translate-x-1/2">
            ·
          </span>
          <span className="sr-only">{' · '}</span>
          fictional data
        </span>
      </span>
    </p>
  )
}
