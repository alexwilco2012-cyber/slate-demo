// A small drawing of each home, in place of a photo: the demo ships no real pictures. The
// building follows the property type, and the flat itself is picked out from the address
// ("Top Floor Right" lights the top right windows), so each card is recognisably that home.

import type { Property } from '@/domain/types'
import { cn } from '@/components/ui/cn'

type Kind = 'tenement' | 'villa' | 'house'

const W = 320
const H = 120
const GROUND = 110
const FLOOR = 19
const COLUMN = 22
const WINDOW = { w: 11, h: 13 }

function kindOf(type: Property['type']): { kind: Kind; floors: number; columns: number } {
  switch (type) {
    case 'tenement_flat':
      return { kind: 'tenement', floors: 4, columns: 4 }
    case 'flat':
    case 'maisonette':
      return { kind: 'villa', floors: 3, columns: 3 }
    default:
      return { kind: 'house', floors: 2, columns: 2 }
  }
}

/** Which floor (0 = ground) and side the flat is on, read from the address. */
function flatPosition(addressLine: string, floors: number): { floor: number | null; side: string } {
  const text = addressLine.toLowerCase()
  let floor: number | null = null
  if (text.includes('top floor')) floor = floors - 1
  else if (text.includes('ground floor')) floor = 0
  else if (text.includes('first floor')) floor = 1
  else if (text.includes('second floor')) floor = 2
  else if (text.includes('third floor')) floor = 3
  else {
    const flat = /flat (\d+)/.exec(text)
    if (flat) floor = Math.min(floors - 1, Math.floor((Number(flat[1]) - 1) / 2))
    // "Flat C" and similar give no floor: light the first floor.
    else if (/flat [a-z]\b/.test(text)) floor = 1
  }
  const side = text.includes('right') ? 'right' : text.includes('left') ? 'left' : 'both'
  return { floor, side }
}

/** A stable small number from the id, so each home gets its own tree and sky. */
function seedOf(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

const LINE = { stroke: 'var(--ink)', strokeOpacity: 0.7, strokeWidth: 1.25 }

function Tree({ x, size }: { x: number; size: number }) {
  return (
    <g>
      <line x1={x} x2={x} y1={GROUND} y2={GROUND - size * 0.9} {...LINE} />
      <circle
        cx={x}
        cy={GROUND - size}
        r={size * 0.55}
        fill="var(--accent)"
        opacity="0.35"
        {...LINE}
        strokeOpacity={0.4}
      />
    </g>
  )
}

function Block({
  kind,
  floors,
  columns,
  lit,
}: {
  kind: Kind
  floors: number
  columns: number
  lit: (f: number, c: number) => boolean
}) {
  const width = columns * COLUMN + 12
  const height = floors * FLOOR + 6
  const left = (W - width) / 2
  const top = GROUND - height
  const doorColumn = Math.floor((columns - 1) / 2)
  const doorX = left + 6 + doorColumn * COLUMN + (columns % 2 === 0 ? COLUMN / 2 : 0)
  const windows = []
  for (let floor = 0; floor < floors; floor++) {
    for (let column = 0; column < columns; column++) {
      // With an odd number of columns the door takes the middle ground-floor window's place.
      if (floor === 0 && columns % 2 === 1 && column === doorColumn) continue
      windows.push(
        <rect
          key={`${floor}-${column}`}
          x={left + 6 + column * COLUMN}
          y={top + 5 + (floors - 1 - floor) * FLOOR}
          width={WINDOW.w}
          height={WINDOW.h}
          rx={1.5}
          fill={lit(floor, column) ? 'var(--accent)' : 'var(--brand-tint)'}
          {...LINE}
          strokeWidth={0.9}
        />,
      )
    }
  }
  return (
    <g>
      {/* Slate roof and chimney stacks; tenements get dormers. */}
      <rect
        x={left + 4}
        y={top - 25}
        width={8}
        height={12}
        fill="var(--muted)"
        {...LINE}
        strokeWidth={0.9}
      />
      <rect
        x={left + width - 12}
        y={top - 25}
        width={8}
        height={12}
        fill="var(--muted)"
        {...LINE}
        strokeWidth={0.9}
      />
      <path
        d={`M${left - 3} ${top} L${left + 12} ${top - 16} L${left + width - 12} ${top - 16} L${left + width + 3} ${top} Z`}
        fill="var(--brand)"
        {...LINE}
      />
      {kind === 'tenement' ? (
        <>
          <path
            d={`M${left + 26} ${top - 4} l0 -8 l7 -5 l7 5 l0 8 Z`}
            fill="var(--surface)"
            {...LINE}
            strokeWidth={0.9}
          />
          <path
            d={`M${left + width - 40} ${top - 4} l0 -8 l7 -5 l7 5 l0 8 Z`}
            fill="var(--surface)"
            {...LINE}
            strokeWidth={0.9}
          />
        </>
      ) : null}
      <rect x={left} y={top} width={width} height={height} fill="var(--surface)" {...LINE} />
      {Array.from({ length: floors - 1 }, (_, index) => (
        <line
          key={index}
          x1={left}
          x2={left + width}
          y1={top + 2 + (index + 1) * FLOOR}
          y2={top + 2 + (index + 1) * FLOOR}
          stroke="var(--ink)"
          strokeOpacity={0.12}
        />
      ))}
      {windows}
      <path
        d={`M${doorX} ${GROUND} l0 -14 a5.5 5.5 0 0 1 11 0 l0 14 Z`}
        fill="var(--muted)"
        {...LINE}
        strokeWidth={0.9}
      />
    </g>
  )
}

function Semis() {
  const cx = W / 2
  const top = GROUND - 44
  return (
    <g>
      {/* The neighbour's half, quieter. */}
      <path
        d={`M${cx} ${top} L${cx + 30} ${top - 22} L${cx + 60} ${top} Z`}
        fill="var(--brand)"
        opacity="0.4"
      />
      <rect
        x={cx}
        y={top}
        width={60}
        height={44}
        fill="var(--surface)"
        opacity="0.65"
        {...LINE}
        strokeOpacity={0.3}
      />
      {/* This home. */}
      <rect
        x={cx - 44}
        y={top - 30}
        width={8}
        height={14}
        fill="var(--muted)"
        {...LINE}
        strokeWidth={0.9}
      />
      <path
        d={`M${cx - 64} ${top} L${cx - 32} ${top - 24} L${cx} ${top} Z`}
        fill="var(--brand)"
        {...LINE}
      />
      <rect x={cx - 64} y={top} width={64} height={44} fill="var(--surface)" {...LINE} />
      <rect
        x={cx - 56}
        y={top + 6}
        width={14}
        height={14}
        rx={1.5}
        fill="var(--accent)"
        {...LINE}
        strokeWidth={0.9}
      />
      <rect
        x={cx - 22}
        y={top + 6}
        width={14}
        height={14}
        rx={1.5}
        fill="var(--accent)"
        {...LINE}
        strokeWidth={0.9}
      />
      <rect
        x={cx - 58}
        y={GROUND - 20}
        width={20}
        height={14}
        rx={1.5}
        fill="var(--accent)"
        {...LINE}
        strokeWidth={0.9}
      />
      <path
        d={`M${cx - 26} ${GROUND} l0 -16 a6 6 0 0 1 12 0 l0 16 Z`}
        fill="var(--muted)"
        {...LINE}
        strokeWidth={0.9}
      />
    </g>
  )
}

export interface HomeArtProps {
  property: Pick<Property, 'type' | 'addressLine' | 'id'>
  /** 'close' crops to the building, for a narrow thumbnail. */
  framing?: 'wide' | 'close'
  className?: string
}

const CLOSE_WIDTH = 150

export function HomeArt({ property, framing = 'wide', className }: HomeArtProps) {
  const shape = kindOf(property.type)
  const { floor, side } = flatPosition(property.addressLine, shape.floors)
  const seed = seedOf(property.id)
  const treeLeft = seed % 2 === 0
  const lit = (f: number, c: number) => {
    if (floor === null || f !== floor) return false
    if (side === 'left') return c < shape.columns / 2
    if (side === 'right') return c >= shape.columns / 2
    return true
  }

  return (
    <svg
      viewBox={
        framing === 'close' ? `${(W - CLOSE_WIDTH) / 2} 0 ${CLOSE_WIDTH} ${H}` : `0 0 ${W} ${H}`
      }
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
      overflow="visible"
      className={cn('block h-full w-full', className)}
    >
      {/* Sky and ground run past the drawing's edges, so any shape of box is filled. */}
      <rect x={-2000} y={-2000} width={W + 4000} height={2000 + GROUND} fill="var(--accent-tint)" />
      <circle
        cx={treeLeft ? 262 : 58}
        cy={30 + (seed % 12)}
        r={11}
        opacity="0.75"
        className="fill-surface dark:fill-muted"
      />
      <rect x={-2000} y={GROUND} width={W + 4000} height={2000} fill="var(--surface-2)" />
      <line x1={-2000} x2={W + 2000} y1={GROUND} y2={GROUND} {...LINE} strokeOpacity={0.3} />
      <Tree x={treeLeft ? 72 : 250} size={16 + (seed % 7)} />
      {shape.kind === 'house' ? (
        <Semis />
      ) : (
        <Block kind={shape.kind} floors={shape.floors} columns={shape.columns} lit={lit} />
      )}
    </svg>
  )
}
