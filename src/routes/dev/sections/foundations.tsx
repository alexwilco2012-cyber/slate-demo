import { useLayoutEffect, useRef, useState } from 'react'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { Section, Specimen, Specimens } from '../gallery-frame'

function parseRgb(value: string): [number, number, number] | null {
  const match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Measures its own resolved colours, so every frame shows the ratio it really gets. */
function ContrastTile({
  fg,
  bg,
  label,
  role,
}: {
  fg: string
  bg: string
  label: string
  role: Role
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<number | null>(null)
  const target = role === 'trade' ? 7 : 4.5

  useLayoutEffect(() => {
    if (!ref.current) return
    const style = getComputedStyle(ref.current)
    const a = parseRgb(style.color)
    const b = parseRgb(style.backgroundColor)
    if (!a || !b) return
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    setRatio((high! + 0.05) / (low! + 0.05))
  }, [])

  return (
    <div
      ref={ref}
      style={{ color: `var(--${fg})`, backgroundColor: `var(--${bg})` }}
      className="flex flex-col gap-1 rounded-control border border-line p-3"
    >
      <span className="font-display text-display-m leading-none font-semibold">Aa</span>
      <span className="text-small font-semibold">{label}</span>
      <span className="figures text-caption">
        {ratio === null
          ? 'Measuring'
          : `${ratio.toFixed(2)}:1 · ${ratio >= target ? `passes ${target}:1` : `below ${target}:1`}`}
      </span>
    </div>
  )
}

const PAIRS = [
  ['ink', 'bg', 'Ink on page'],
  ['ink', 'surface', 'Ink on surface'],
  ['muted', 'bg', 'Muted on page'],
  ['muted', 'surface-2', 'Muted on well'],
  ['accent-text', 'accent-tint', 'Role text on tint'],
  ['on-accent', 'accent', 'Label on role fill'],
  ['brand', 'brand-tint', 'Spruce on tint'],
  ['critical', 'critical-tint', 'Critical'],
  ['caution', 'caution-tint', 'Caution'],
  ['info', 'info-tint', 'Info'],
  ['positive', 'positive-tint', 'Positive'],
  ['danger', 'surface', 'Danger outline'],
  ['on-danger', 'danger', 'Danger confirm'],
  ['accent-strong', 'surface', 'State edges and dots'],
] as const

const SWATCHES = [
  ['bg', 'Page'],
  ['surface', 'Surface'],
  ['surface-2', 'Well'],
  ['line', 'Hairline'],
  ['input-border', 'Control border'],
  ['brand', 'Spruce'],
  ['accent', 'Role accent'],
  ['accent-tint', 'Role tint'],
  ['score', 'Score accent'],
  ['danger', 'Danger'],
] as const

const TYPE = [
  [
    'text-display-xl font-display font-semibold',
    'Display XL · Fraunces',
    'Every home, on the record',
  ],
  [
    'text-display-l font-display font-semibold',
    'Display L · Fraunces',
    'Repairs at 17 Fonthill Road',
  ],
  [
    'text-display-m font-display font-semibold',
    'Display M · Fraunces',
    'Leak under the kitchen sink',
  ],
  ['text-title font-semibold', 'Title', 'Actions needed'],
  ['text-body-l', 'Body large', 'Kev will visit on Monday between 9am and 11am.'],
  ['text-body', 'Body', 'We sent Sarah 48 hours’ written notice of the visit.'],
  ['text-small', 'Small', 'Last review 3 Sept 2026 · 14 reviews'],
  ['text-caption', 'Caption', 'Verified tenant · AB11 · 2025'],
] as const

function Controls() {
  return (
    <div className="flex items-end gap-3">
      {(
        [
          ['--control-h-sm', 'Small'],
          ['--control-h', 'Default'],
          ['--control-h-lg', 'Large'],
        ] as const
      ).map(([token, label]) => (
        <div key={token} className="flex flex-1 flex-col items-center gap-1.5">
          <span
            style={{ height: `var(${token})` }}
            className="w-full rounded-control bg-accent-tint shadow-[inset_0_0_0_1px_var(--accent)]"
          />
          <span className="text-caption text-muted">{label}</span>
        </div>
      ))}
    </div>
  )
}

export function FoundationsSection() {
  return (
    <Section
      id="foundations"
      title="Foundations"
      description="Warm paper, spruce and one accent per portal. Every ratio below is measured live in its own frame; the trade portal holds essential text to 7:1."
    >
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Contrast, measured">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {PAIRS.map(([fg, bg, label]) => (
                  <ContrastTile key={label} fg={fg} bg={bg} label={label} role={role} />
                ))}
              </div>
            </Specimen>
            <Specimen label="Colour">
              <ul className="grid grid-cols-5 gap-2">
                {SWATCHES.map(([token, label]) => (
                  <li key={token} className="flex min-w-0 flex-col gap-1">
                    <span
                      style={{ backgroundColor: `var(--${token})` }}
                      className="aspect-square rounded-control shadow-[inset_0_0_0_1px_var(--line)]"
                    />
                    <span className="text-caption leading-tight text-balance text-muted">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </Specimen>
            <Specimen label="Type">
              <ul className="flex flex-col gap-3">
                {TYPE.map(([classes, label, sample]) => (
                  <li key={label} className="flex flex-col gap-0.5">
                    <span className="text-caption text-muted">{label}</span>
                    <span className={cn('text-ink', classes)}>{sample}</span>
                  </li>
                ))}
              </ul>
            </Specimen>
            <Specimen label="Control heights">
              <Controls />
            </Specimen>
            <Specimen label="Elevation and radius">
              <div className="grid grid-cols-3 gap-3">
                {(['shadow-soft', 'shadow-raised', 'shadow-overlay'] as const).map((shadow, i) => (
                  <span
                    key={shadow}
                    className={cn(
                      'flex h-16 items-end bg-surface p-2 text-caption text-muted',
                      shadow,
                      ['rounded-control', 'rounded-card', 'rounded-sheet'][i],
                    )}
                  >
                    {['Soft', 'Raised', 'Overlay'][i]}
                  </span>
                ))}
              </div>
            </Specimen>
          </>
        )}
      </Specimens>
    </Section>
  )
}
