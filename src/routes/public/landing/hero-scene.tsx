import { cn } from '@/components/ui/cn'
import { TenementRow } from './door-art'

/**
 * The hero's drawn stand-in for the film: an Aberdeen terrace in low sun (dusk in dark mode), a
 * second row further down the street in haze, and a sun whose halo slowly swells and settles.
 * Decorative. Its loops stop with the hero's Pause button and with reduced motion.
 */
export function HeroScene({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('lp-sky lp-grain absolute inset-0 overflow-hidden', className)}
    >
      <div className="lp-sun lp-glow absolute inset-0" />
      <div className="lp-far lp-drift absolute -inset-x-[6%] bottom-[19%] h-[33%]">
        <TenementRow repeat={2} className="size-full" />
      </div>
      <div className="absolute inset-x-0 bottom-[12%] h-[30%] bg-linear-to-b from-transparent to-(--scene-haze)" />
      <div className="lp-near absolute inset-x-0 bottom-0 h-[43%]">
        <TenementRow repeat={2} className="size-full" />
      </div>
      {/* Low sun from the left, warming the stone it reaches first. */}
      <div className="lp-wash absolute inset-0" />
    </div>
  )
}
