import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useThemePreference, type ThemePreference } from '@/routes/_shell'

const OPTIONS = [
  { value: 'system', label: 'System', icon: <DesktopIcon weight="bold" /> },
  { value: 'light', label: 'Light', icon: <SunIcon weight="bold" /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon weight="bold" /> },
] as const

/** Light, dark or follow the device. Shared with the account menu in the portals. */
export function ThemeChoice({ className }: { className?: string }) {
  const [preference, setPreference] = useThemePreference()
  return (
    <SegmentedControl<ThemePreference>
      label="Appearance"
      options={OPTIONS}
      value={preference}
      onValueChange={setPreference}
      size="sm"
      className={className}
    />
  )
}
