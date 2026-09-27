import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { BRAND } from '@/config/brand'
import type { Role } from '@/domain/types'
import { canObserve } from '@/components/slate/public-reveal'
import { Container } from '../layout/parts'
import { SectionLabel } from './parts'

/** A run of words, or one of the three parties, which is kept whole and underlined in its colour. */
type Piece = string | { text: string; role: Role }

const PARAGRAPHS: Piece[][] = [
  [
    'Every repair passes through three people:',
    { text: 'the\u00a0tenant', role: 'tenant' },
    'who reports it,',
    { text: 'the\u00a0landlord', role: 'landlord' },
    'who pays for it and',
    { text: 'the\u00a0trade', role: 'trade' },
    'who fixes it. Usually it gets lost somewhere in between.',
  ],
  [
    `On ${BRAND.name}, all three work from one record, from the first photo of the drip to the day it’s fixed. Then they rate each other, by the same rules.`,
  ],
]

interface Unit {
  text: string
  role?: Role
}

function unitsOf(pieces: Piece[]): Unit[] {
  return pieces.flatMap((piece) =>
    typeof piece === 'string' ? piece.split(' ').map((text) => ({ text })) : [piece],
  )
}

const statementClass =
  'max-w-[21em] font-display text-[clamp(1.75rem,1.05rem+2.7vw,3.25rem)] leading-[1.16] font-[440] tracking-[-0.022em] text-ink'

function Mark({ unit, children }: { unit: Unit; children: ReactNode }) {
  return unit.role ? (
    <span className="lp-mark" data-mark={unit.role}>
      {children}
    </span>
  ) : (
    <>{children}</>
  )
}

/** One word that firms from pale to full ink as its turn in the scroll comes round. */
function Word({
  unit,
  progress,
  range,
}: {
  unit: Unit
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.2, 1])
  return (
    <motion.span style={{ opacity }}>
      <Mark unit={unit}>{unit.text}</Mark>
    </motion.span>
  )
}

function AnimatedStatement() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.6'] })
  const paragraphs = PARAGRAPHS.map(unitsOf)
  const total = paragraphs.reduce((sum, units) => sum + units.length, 0)
  let index = 0
  return (
    <div ref={ref} className="flex flex-col gap-[1em]">
      {paragraphs.map((units, p) => (
        <p key={p} className={statementClass}>
          {units.map((unit, u) => {
            const start = index++ / total
            return (
              <span key={u}>
                <Word unit={unit} progress={scrollYProgress} range={[start, start + 1.5 / total]} />
                {u < units.length - 1 ? ' ' : null}
              </span>
            )
          })}
        </p>
      ))}
    </div>
  )
}

function StaticStatement() {
  return (
    <div className="flex flex-col gap-[1em]">
      {PARAGRAPHS.map((pieces, p) => (
        <p key={p} className={statementClass}>
          {unitsOf(pieces).map((unit, u, units) => (
            <span key={u}>
              <Mark unit={unit}>{unit.text}</Mark>
              {u < units.length - 1 ? ' ' : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

/** The argument of the page in one paragraph, read at the pace of the scroll. */
export function Statement() {
  const reduced = useReducedMotion()
  return (
    <section aria-labelledby="idea-title" className="py-20 sm:py-28 lg:py-36">
      <Container className="grid gap-6 lg:grid-cols-12 lg:gap-x-12">
        <SectionLabel as="h2" id="idea-title" className="self-start lg:col-span-3 lg:pt-5">
          The idea
        </SectionLabel>
        <div className="lg:col-span-9">
          {reduced || !canObserve() ? <StaticStatement /> : <AnimatedStatement />}
        </div>
      </Container>
    </section>
  )
}
