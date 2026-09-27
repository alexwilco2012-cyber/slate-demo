// Drawn stand-ins for the landing page's photographs (docs/LANDING_BRIEF.md §5). Each is Hearth
// toned and decorative, and stays for good if its photo never arrives.

import { useId, type CSSProperties } from 'react'
import type { Role } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { Tenements } from '../illustrations/tenements'

const SPRITE_ID = 'lp-tenements'
const ROW = { width: 900, height: 240 }

/**
 * The drawn street, once, for every row on the page to reuse. Rows are <use> copies of it, so the
 * page carries one drawing's worth of shapes however many times the street appears. Colours are
 * CSS variables, which each copy takes from wherever it sits.
 */
export function TenementSprite() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <symbol id={SPRITE_ID} viewBox={`0 0 ${ROW.width} ${ROW.height}`}>
        <Tenements />
      </symbol>
    </svg>
  )
}

/** A row of tenements, `repeat` streets long, filling its box from the bottom. */
export function TenementRow({ repeat = 1, className }: { repeat?: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${ROW.width * repeat} ${ROW.height}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      {Array.from({ length: repeat }, (_, copy) => (
        <use
          key={copy}
          href={`#${SPRITE_ID}`}
          x={copy * ROW.width}
          width={ROW.width}
          height={ROW.height}
        />
      ))}
    </svg>
  )
}

/**
 * The tenements redrawn in one role's colours: granite in the tint, slate in the accent, lit
 * windows in hearth gold.
 */
const ROLE_STREET = {
  '--illo-granite': 'color-mix(in oklab, var(--accent-tint) 72%, var(--surface))',
  '--illo-granite-shade': 'var(--accent-tint)',
  '--illo-roof': 'color-mix(in oklab, var(--accent) 58%, var(--accent-tint))',
  '--illo-roof-edge': 'color-mix(in oklab, var(--accent) 78%, var(--accent-tint))',
  '--illo-line': 'color-mix(in oklab, var(--accent) 26%, var(--accent-tint))',
  '--illo-glass': 'color-mix(in oklab, var(--accent) 18%, var(--accent-tint))',
  '--illo-lit': 'var(--logo-hearth)',
  '--illo-door': 'var(--accent)',
} as CSSProperties

/**
 * Which part of the 900-unit street each door looks at, and how far down: the tenant a bay of
 * lit windows, the landlord a front door, the trade the chimneys and slates.
 */
const FOCUS: Record<Role, { x: number; drop: number }> = {
  tenant: { x: 290, drop: 0 },
  landlord: { x: 666, drop: -4 },
  trade: { x: 150, drop: 58 },
}

/** A close crop of the street for one door card. The frame must be 4:5 or wider. */
export function DoorArt({ role, className }: { role: Role; className?: string }) {
  const { x, drop } = FOCUS[role]
  // Drawn 1.6 times the frame's height; x is centred. 240 units tall, so a unit is h × 1.6 / 240.
  return (
    <div
      data-role-accent={role}
      style={ROLE_STREET}
      className={cn(
        'lp-grain absolute inset-0 overflow-hidden bg-linear-to-b from-(--accent-tint) to-[color-mix(in_oklab,var(--accent-tint)_60%,var(--surface))] [container-type:size]',
        className,
      )}
    >
      <div
        className="absolute h-[160%]"
        style={{ left: `calc(50% - ${x} * 160cqh / 240)`, bottom: `${-drop}%` }}
      >
        <TenementRow className="h-full w-auto max-w-none" />
      </div>
    </div>
  )
}

/** The Aberdeen terrace for wide frames: the hero's scene, without its motion. */
export function StreetArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('lp-sky lp-grain absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(28%_46%_at_22%_36%,var(--scene-sun),transparent_72%)]" />
      <div className="lp-far absolute inset-x-0 bottom-[22%] h-[40%]">
        <TenementRow repeat={2} className="size-full" />
      </div>
      <div className="absolute inset-x-0 bottom-[14%] h-[34%] bg-linear-to-b from-transparent to-(--scene-haze)" />
      <div className="absolute inset-x-0 bottom-0 h-[56%]">
        <TenementRow repeat={2} className="size-full" />
      </div>
    </div>
  )
}

/**
 * Three front doors on one tenement landing, in clay, moss and ochre, each open a little with
 * lamplight behind: the closing picture's stand-in. Drawn tall, so the doors stay whole in any
 * frame from 4:3 to portrait; the wall above is what gets cropped.
 */
export function ThreeDoorsArt({ className }: { className?: string }) {
  const doors: { x: number; role: Role }[] = [
    { x: 64, role: 'tenant' },
    { x: 190, role: 'landlord' },
    { x: 316, role: 'trade' },
  ]
  const id = useId()
  const glowId = `${id}-glow`
  const stoneId = `${id}-stone`
  // Tall on purpose: a narrow frame crops the wall above, never the doors.
  const height = 680
  const top = 370
  const floor = 590
  return (
    <div
      aria-hidden="true"
      className={cn(
        'lp-grain absolute inset-0 overflow-hidden bg-[var(--illo-granite)]',
        className,
      )}
    >
      <svg
        viewBox={`0 0 480 ${height}`}
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
        className="block size-full"
      >
        <defs>
          {/* Ashlar: two courses of blocks, the joints staggered between them. */}
          <pattern id={stoneId} width={88} height={40} patternUnits="userSpaceOnUse" y={10}>
            <path
              d="M0 0.4 H88 M0 20.4 H88 M0 0 V20 M44 20 V40"
              stroke="var(--illo-line)"
              strokeWidth={0.8}
              opacity={0.55}
            />
          </pattern>
          <radialGradient id={glowId}>
            <stop offset="0" stopColor="var(--illo-lit)" stopOpacity={0.35} />
            <stop offset="1" stopColor="var(--illo-lit)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={480} height={height} fill={`url(#${stoneId})`} />
        {/* A lamp between the doors, and the pool of light it throws. */}
        <ellipse cx={240} cy={top - 90} rx={220} ry={150} fill={`url(#${glowId})`} />
        <rect x={236} y={top - 130} width={8} height={26} rx={2} fill="var(--illo-roof-edge)" />
        <circle cx={240} cy={top - 96} r={9} fill="var(--illo-lit)" />
        {/* The landing: worn stone, one step down at the front. */}
        <rect
          x={0}
          y={floor}
          width={480}
          height={height - floor}
          fill="var(--illo-granite-shade)"
        />
        <path d={`M0 ${floor} H480`} stroke="var(--illo-line)" strokeWidth={2} />
        <path d={`M0 ${floor + 30} H480`} stroke="var(--illo-line)" strokeWidth={1} opacity={0.7} />
        {doors.map(({ x, role }) => (
          <g key={role}>
            {/* Stone surround and fanlight. */}
            <path
              d={`M${x - 8} ${floor} V${top - 6} a58 58 0 0 1 116 0 V${floor} Z`}
              fill="var(--illo-granite-shade)"
            />
            <path d={`M${x} ${top} a50 50 0 0 1 100 0 Z`} fill="var(--illo-lit)" opacity={0.8} />
            <path
              d={`M${x + 50} ${top} V${top - 48} M${x + 50} ${top} L${x + 16} ${top - 34} M${x + 50} ${top} L${x + 84} ${top - 34}`}
              stroke="var(--illo-granite-shade)"
              strokeWidth={3}
            />
            {/* Lamplight in the gap, then the door, swung open a little. */}
            <rect
              x={x}
              y={top + 6}
              width={100}
              height={floor - top - 6}
              fill="var(--illo-lit)"
              opacity={0.7}
            />
            <path
              d={`M${x} ${top + 6} H${x + 84} L${x + 79} ${floor} H${x} Z`}
              style={{ fill: `var(--paint-${role})` }}
            />
            {[top + 26, top + 108].map((panel) => (
              <rect
                key={panel}
                x={x + 12}
                y={panel}
                width={58}
                height={70}
                rx={2}
                fill="none"
                stroke="rgb(0 0 0 / 0.16)"
                strokeWidth={2}
              />
            ))}
            <circle cx={x + 68} cy={top + 104} r={4} fill="var(--paint-brass)" />
            {/* A spill of light on the landing. */}
            <path
              d={`M${x + 79} ${floor} L${x + 100} ${floor} L${x + 136} ${height} L${x + 90} ${height} Z`}
              fill="var(--illo-lit)"
              opacity={0.3}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
