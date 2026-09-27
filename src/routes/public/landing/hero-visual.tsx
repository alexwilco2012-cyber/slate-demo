// The landlord's home screen as a small card, for the how-it-works pages: real components with
// the sample records, so it reads the same however far someone has played the demo.

import type { ReactNode } from 'react'
import { ClipboardTextIcon, ScalesIcon, WarningIcon, type Icon } from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import { RoleChip } from '@/components/slate/role-chip'
import { LANDLORD_ACTIONS, type SampleAction } from '../content/samples'

/** A product card in the picture: surface, role accent bar along the top, soft lift. */
function Shot({
  role,
  label,
  children,
  className,
}: {
  role: Role
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure
      data-role-accent={role}
      className={cn(
        'relative flex flex-col gap-3.5 overflow-hidden rounded-card border border-line bg-surface p-4 pt-5 text-ink shadow-overlay sm:p-5 sm:pt-6',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <figcaption className="flex flex-wrap items-center gap-2">
        <RoleChip role={role} label={label} />
      </figcaption>
      {children}
    </figure>
  )
}

const ACTION_ICONS: Record<SampleAction['kind'], Icon> = {
  approve: ClipboardTextIcon,
  quotes: ScalesIcon,
  expired: WarningIcon,
}

export function LandlordShot({ className }: { className?: string }) {
  return (
    <Shot role="landlord" label="Graham’s home screen" className={className}>
      <h3 className="flex items-baseline gap-2 text-title font-semibold">
        Actions needed
        <span className="figures text-small font-semibold text-muted">
          {LANDLORD_ACTIONS.length}
        </span>
      </h3>
      <ul className="-mx-1 flex flex-col">
        {LANDLORD_ACTIONS.map((action) => {
          const Glyph = ACTION_ICONS[action.kind]
          const expired = action.kind === 'expired'
          return (
            <li
              key={action.title}
              className="flex items-start gap-3 border-t border-line px-1 py-2.5 first:border-t-0 first:pt-0.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                  expired ? 'bg-critical-tint text-critical' : 'bg-accent-tint text-accent-text',
                )}
              >
                <Glyph weight="bold" className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small font-semibold">
                  {action.title}
                  {expired ? (
                    <Badge
                      tone="critical"
                      size="sm"
                      icon={<WarningIcon weight="bold" aria-hidden />}
                    >
                      Expired
                    </Badge>
                  ) : null}
                </span>
                <span className="text-caption text-muted">{action.detail}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Shot>
  )
}
