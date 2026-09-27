import { cn } from '@/components/ui/cn'

/**
 * A bar showing a share of a whole. The fill uses the score accent, which is never shown without
 * the number it stands for, so the text next to it carries the meaning.
 */
export function ScoreBar({
  value,
  max,
  size = 'md',
  className,
}: {
  value: number
  max: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block w-full overflow-hidden rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-2',
        size === 'lg' && 'h-2.5',
        className,
      )}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-score"
        style={{ width: `${share * 100}%` }}
      />
    </span>
  )
}
