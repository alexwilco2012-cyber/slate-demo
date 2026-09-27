import { Badge } from '@/components/ui/badge'
import type { StatusTone, TradeStatus } from '../lib/job'

/** Words, an icon and a tone together: status is never shown by colour alone. */
export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: {
  status: Pick<TradeStatus, 'label' | 'tone' | 'icon'>
  /** Replaces the status words, e.g. "16 days late". */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const Glyph = status.icon
  return (
    <Badge
      tone={status.tone satisfies StatusTone}
      size={size}
      icon={<Glyph weight="bold" aria-hidden />}
      className={className}
    >
      {label ?? status.label}
    </Badge>
  )
}
