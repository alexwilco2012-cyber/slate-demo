// Facts about a job that appear in several places: urgency, distance, what kind of home.

import { CalendarBlankIcon, LightningIcon, MapPinIcon, SirenIcon } from '@phosphor-icons/react'
import type { JobBoardPost } from '@/data'
import { URGENCY_LABELS, type Urgency } from '@/domain/types'
import { Badge } from '@/components/ui/badge'

const URGENCY: Record<
  Urgency,
  { tone: 'critical' | 'caution' | 'neutral'; icon: typeof SirenIcon }
> = {
  emergency: { tone: 'critical', icon: SirenIcon },
  urgent: { tone: 'caution', icon: LightningIcon },
  routine: { tone: 'neutral', icon: CalendarBlankIcon },
}

export function UrgencyBadge({ urgency, size }: { urgency: Urgency; size?: 'sm' | 'md' }) {
  const { tone, icon: Glyph } = URGENCY[urgency]
  return (
    <Badge tone={tone} size={size} icon={<Glyph weight="bold" aria-hidden />}>
      {URGENCY_LABELS[urgency]}
    </Badge>
  )
}

const milesFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })

/** "1.5 miles away", "In your district", "Distance unknown". */
export function distanceText(post: Pick<JobBoardPost, 'milesAway'>): string {
  if (post.milesAway === null) return 'Distance unknown'
  if (post.milesAway === 0) return 'In your district'
  return `${milesFormat.format(post.milesAway)} ${post.milesAway === 1 ? 'mile' : 'miles'} away`
}

export function DistanceBadge({ post }: { post: Pick<JobBoardPost, 'milesAway'> }) {
  return (
    <Badge tone="outline" icon={<MapPinIcon weight="bold" aria-hidden />}>
      {distanceText(post)}
    </Badge>
  )
}
