import {
  BellRingingIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  ClipboardTextIcon,
  ClockCountdownIcon,
  DropIcon,
  FileTextIcon,
  FireIcon,
  GaugeIcon,
  IdentificationBadgeIcon,
  LightningIcon,
  PlugIcon,
  ShieldCheckIcon,
  WarningOctagonIcon,
  WindIcon,
  type Icon,
} from '@phosphor-icons/react'
import { DOCUMENT_STATUS_LABELS, type DocumentStatus, type DocumentType } from '@/domain/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { describeDaysLeft } from './format'

export const DOCUMENT_ICONS: Record<DocumentType, Icon> = {
  tenancy_agreement: FileTextIcon,
  gas_safety: FireIcon,
  eicr: LightningIcon,
  epc: GaugeIcon,
  inventory: ClipboardTextIcon,
  smoke_heat_alarms: BellRingingIcon,
  co_alarms: WindIcon,
  legionella: DropIcon,
  landlord_registration: IdentificationBadgeIcon,
  pat: PlugIcon,
  insurance: ShieldCheckIcon,
}

/** Each status has its own icon and words as well as a tone: status is never colour alone. */
export const DOCUMENT_STATUS_META: Record<
  DocumentStatus,
  { icon: Icon; tone: NonNullable<BadgeProps['tone']> }
> = {
  EXPIRED: { icon: WarningOctagonIcon, tone: 'critical' },
  DUE_SOON: { icon: ClockCountdownIcon, tone: 'caution' },
  BOOKED: { icon: CalendarCheckIcon, tone: 'info' },
  OK: { icon: CheckCircleIcon, tone: 'positive' },
  TO_ARRANGE: { icon: CircleDashedIcon, tone: 'outline' },
}

export function DocumentStatusBadge({
  status,
  size = 'md',
}: {
  status: DocumentStatus
  size?: BadgeProps['size']
}) {
  const meta = DOCUMENT_STATUS_META[status]
  const Glyph = meta.icon
  return (
    <Badge tone={meta.tone} size={size} icon={<Glyph weight="bold" aria-hidden />}>
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  )
}

/** "169 days left", "Due today", "Expired 5 days ago", or nothing for documents that never expire. */
export function daysLeftText(daysLeft: number | null) {
  return daysLeft === null ? null : describeDaysLeft(daysLeft)
}
