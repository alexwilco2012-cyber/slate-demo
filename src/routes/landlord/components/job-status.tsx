import { FireIcon, LightningIcon } from '@phosphor-icons/react'
import { JOB_STATUS_LABELS, type JobStatus, type Urgency } from '@/domain/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { JOB_STATUS_META } from '../lib/jobs'

/** A job's status in words with its own icon; the colour only backs them up. */
export function JobStatusBadge({
  status,
  size = 'sm',
}: {
  status: JobStatus
  size?: BadgeProps['size']
}) {
  const meta = JOB_STATUS_META[status]
  const Glyph = meta.icon
  return (
    <Badge tone={meta.tone} size={size} icon={<Glyph weight="bold" aria-hidden />}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  )
}

/** Only urgent and emergency jobs get a badge; routine is the quiet default. */
export function UrgencyBadge({
  urgency,
  size = 'sm',
}: {
  urgency: Urgency
  size?: BadgeProps['size']
}) {
  if (urgency === 'routine') return null
  return urgency === 'emergency' ? (
    <Badge tone="critical" size={size} icon={<FireIcon weight="fill" aria-hidden />}>
      Emergency
    </Badge>
  ) : (
    <Badge tone="caution" size={size} icon={<LightningIcon weight="fill" aria-hidden />}>
      Urgent
    </Badge>
  )
}
