import { cn } from '@/components/ui/cn'

// A row of Aberdeen granite tenements: ashlar fronts, slate roofs with dormers, chimney stacks
// and a few windows lit from inside. Drawn for Slate in place of stock photography; colours come
// from the --illo-* tokens in public.css, so it follows the theme.

interface Block {
  x: number
  width: number
  /** Where the wall meets the roof. */
  eaves: number
  roof: number
  columns: number
  storeys: number
  /** Windows lit from inside, as "column,storey" from the top left. */
  lit: string[]
  dormers?: number[]
  door?: number
  stacks: number[]
}

const GROUND = 240

const BLOCKS: Block[] = [
  {
    x: 0,
    width: 168,
    eaves: 92,
    roof: 30,
    columns: 3,
    storeys: 4,
    lit: ['2,1', '0,3'],
    stacks: [14, 150],
  },
  {
    x: 172,
    width: 214,
    eaves: 70,
    roof: 34,
    columns: 4,
    storeys: 4,
    lit: ['1,0', '3,2', '0,2'],
    dormers: [1, 2],
    door: 1,
    stacks: [22, 188],
  },
  {
    x: 390,
    width: 150,
    eaves: 104,
    roof: 26,
    columns: 3,
    storeys: 3,
    lit: ['1,1'],
    stacks: [128],
  },
  {
    x: 544,
    width: 196,
    eaves: 80,
    roof: 32,
    columns: 4,
    storeys: 4,
    lit: ['2,0', '0,1', '3,3'],
    dormers: [0, 3],
    door: 2,
    stacks: [16, 172],
  },
  {
    x: 744,
    width: 156,
    eaves: 96,
    roof: 28,
    columns: 3,
    storeys: 3,
    lit: ['0,0', '2,2'],
    stacks: [20, 136],
  },
]

function Tenement({ block }: { block: Block }) {
  const { x, width, eaves, roof, columns, storeys } = block
  const wallHeight = GROUND - eaves
  const bay = width / columns
  const storey = wallHeight / (storeys + 0.35)
  const windowWidth = Math.min(bay * 0.46, 26)
  const windowHeight = storey * 0.6
  const courses = Math.floor(wallHeight / 11)

  return (
    <g>
      {block.stacks.map((offset) => (
        <g key={offset}>
          <rect
            x={x + offset}
            y={eaves - roof - 16}
            width={18}
            height={roof + 16}
            fill="var(--illo-granite-shade)"
          />
          <rect
            x={x + offset - 2}
            y={eaves - roof - 19}
            width={22}
            height={4}
            fill="var(--illo-line)"
          />
          {[3, 10].map((pot) => (
            <rect
              key={pot}
              x={x + offset + pot}
              y={eaves - roof - 26}
              width={5}
              height={8}
              rx={1}
              fill="var(--illo-roof-edge)"
            />
          ))}
        </g>
      ))}
      <path
        d={`M${x - 3} ${eaves} L${x + 10} ${eaves - roof} H${x + width - 10} L${x + width + 3} ${eaves} Z`}
        fill="var(--illo-roof)"
      />
      <path
        d={`M${x - 3} ${eaves} H${x + width + 3}`}
        stroke="var(--illo-roof-edge)"
        strokeWidth={3}
      />
      {block.dormers?.map((column) => {
        const cx = x + bay * column + bay / 2
        return (
          <g key={column}>
            <path
              d={`M${cx - 15} ${eaves - 2} V${eaves - roof + 8} L${cx} ${eaves - roof - 2} L${cx + 15} ${eaves - roof + 8} V${eaves - 2} Z`}
              fill="var(--illo-granite)"
            />
            <rect
              x={cx - 8}
              y={eaves - roof + 9}
              width={16}
              height={roof - 14}
              fill="var(--illo-glass)"
            />
          </g>
        )
      })}
      <rect x={x} y={eaves} width={width} height={wallHeight} fill="var(--illo-granite)" />
      {Array.from({ length: courses }, (_, index) => (
        <path
          key={index}
          d={`M${x} ${eaves + 11 * (index + 1)} H${x + width}`}
          stroke="var(--illo-line)"
          strokeWidth={0.6}
          opacity={0.55}
        />
      ))}
      {Array.from({ length: storeys }, (_, row) =>
        Array.from({ length: columns }, (_, column) => {
          if (block.door === column && row === storeys - 1) return null
          const wx = x + bay * column + (bay - windowWidth) / 2
          const wy = eaves + storey * 0.35 + storey * row
          const lit = block.lit.includes(`${column},${row}`)
          return (
            <g key={`${column}-${row}`}>
              <rect
                x={wx - 2}
                y={wy + windowHeight}
                width={windowWidth + 4}
                height={3}
                fill="var(--illo-line)"
              />
              <rect
                x={wx}
                y={wy}
                width={windowWidth}
                height={windowHeight}
                fill={lit ? 'var(--illo-lit)' : 'var(--illo-glass)'}
              />
              <path
                d={`M${wx} ${wy + windowHeight / 2} H${wx + windowWidth} M${wx + windowWidth / 2} ${wy} V${wy + windowHeight}`}
                stroke="var(--illo-granite)"
                strokeWidth={1.4}
              />
            </g>
          )
        }),
      )}
      {block.door !== undefined ? (
        <g>
          <path
            d={`M${x + bay * block.door + bay / 2 - 11} ${GROUND} V${GROUND - storey * 0.62} a11 11 0 0 1 22 0 V${GROUND} Z`}
            fill="var(--illo-door)"
          />
          <rect
            x={x + bay * block.door + bay / 2 - 15}
            y={GROUND - 3}
            width={30}
            height={3}
            fill="var(--illo-line)"
          />
        </g>
      ) : null}
    </g>
  )
}

const ROW_WIDTH = 900

/**
 * The tenement row. Decorative: it carries no information, so screen readers skip it. `repeat`
 * lays the street out more than once, so a wide banner keeps its roofline instead of being
 * scaled up until only the windows show.
 */
export function Tenements({ className, repeat = 1 }: { className?: string; repeat?: number }) {
  return (
    <svg
      viewBox={`0 0 ${ROW_WIDTH * repeat} ${GROUND}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      {Array.from({ length: repeat }, (_, copy) => (
        <g key={copy} transform={`translate(${copy * ROW_WIDTH} 0)`}>
          {BLOCKS.map((block) => (
            <Tenement key={block.x} block={block} />
          ))}
        </g>
      ))}
    </svg>
  )
}
