import {
  BuildingsIcon,
  KeyIcon,
  WrenchIcon,
  type Icon,
  type IconProps,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'

/** One icon per role, used wherever a role appears so it is never shown by colour alone. */
export const ROLE_ICONS: Record<Role, Icon> = {
  tenant: KeyIcon,
  landlord: BuildingsIcon,
  trade: WrenchIcon,
}

export function RoleIcon({ role, ...props }: IconProps & { role: Role }) {
  const RoleGlyph = ROLE_ICONS[role]
  return <RoleGlyph aria-hidden {...props} />
}
