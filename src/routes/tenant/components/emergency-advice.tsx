// Stay-safe advice for emergencies, with the real numbers to call. Shown before anything else
// whenever a report might be dangerous.

import { FireIcon, LightningIcon, PhoneIcon, SirenIcon, DropIcon } from '@phosphor-icons/react'
import { LETTING_RULES } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { EMERGENCY_SERVICES, GAS_EMERGENCY } from '../lib/emergency'

export function GasWarning({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex flex-col gap-3 rounded-card border-2 border-critical bg-critical-tint p-4 sm:p-5',
        className,
      )}
    >
      <p className="flex items-center gap-2 font-semibold text-critical">
        <FireIcon weight="fill" aria-hidden className="size-5" />
        Can you smell gas?
      </p>
      <p className="text-body text-ink">
        Leave the home now. Don’t use light switches, flames or anything electrical inside. Then
        call the {GAS_EMERGENCY.name}. It’s free and open all day and night.
      </p>
      <a
        href={GAS_EMERGENCY.tel}
        className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-control bg-danger px-5 font-semibold text-on-danger no-underline shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xs:w-full"
      >
        <PhoneIcon weight="bold" aria-hidden className="size-5" />
        Call {GAS_EMERGENCY.display}
      </a>
    </div>
  )
}

export function EmergencyAdvice({ id, className }: { id?: string; className?: string }) {
  const tips = [
    {
      icon: FireIcon,
      text: (
        <>
          <span className="font-semibold">Gas smell:</span> leave the home and call{' '}
          <a
            href={GAS_EMERGENCY.tel}
            className="font-semibold whitespace-nowrap text-ink underline"
          >
            {GAS_EMERGENCY.display}
          </a>{' '}
          ({GAS_EMERGENCY.name}).
        </>
      ),
    },
    {
      icon: DropIcon,
      text: (
        <>
          <span className="font-semibold">Water pouring in:</span> turn the water off at the
          stopcock if you can do it safely.
        </>
      ),
    },
    {
      icon: LightningIcon,
      text: (
        <>
          <span className="font-semibold">Sparks or a burning smell:</span> switch off at the fuse
          box if it’s safe to.
        </>
      ),
    },
    {
      icon: SirenIcon,
      text: (
        <>
          <span className="font-semibold">Anyone in danger:</span> call{' '}
          <a href={EMERGENCY_SERVICES.tel} className="font-semibold text-ink underline">
            {EMERGENCY_SERVICES.display}
          </a>
          .
        </>
      ),
    },
  ]
  return (
    <section
      id={id}
      aria-labelledby="stay-safe-title"
      className={cn(
        'flex flex-col gap-3 rounded-card border-2 border-critical bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <h2 id="stay-safe-title" className="flex items-center gap-2 font-semibold text-critical">
        <SirenIcon weight="fill" aria-hidden className="size-5" />
        Stay safe first
      </h2>
      <ul className="flex flex-col gap-2.5">
        {tips.map(({ icon: Glyph, text }, index) => (
          <li key={index} className="flex items-start gap-2.5 text-small text-ink">
            <Glyph weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0 text-critical" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line pt-3 text-small text-muted">
        Emergencies don’t need {LETTING_RULES.visitNoticeHours} hours’ notice, so someone may come
        today. We’ll tell your landlord it’s an emergency.
      </p>
    </section>
  )
}
