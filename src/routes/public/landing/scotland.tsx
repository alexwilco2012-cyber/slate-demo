import { BRAND } from '@/config/brand'
import {
  BellRingingIcon,
  FileTextIcon,
  IdentificationBadgeIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react'
import { LETTING_RULES } from '@/domain/types'
import { Container, SectionHeading } from '../layout/parts'
import { Tenements } from '../illustrations/tenements'

const POINTS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: FileTextIcon,
    title: 'Private residential tenancies',
    body: `Tenancies follow Scottish rules, and both sides confirm them on ${BRAND.name}.`,
  },
  {
    icon: IdentificationBadgeIcon,
    title: 'Landlord registration',
    body: 'We check registration numbers against the public register. The badge shows the date we checked.',
  },
  {
    icon: WrenchIcon,
    title: 'The Repairing Standard',
    body: `${BRAND.name} logs every repair from report to fix, with dates, so there’s a record if anyone ever needs one.`,
  },
  {
    icon: BellRingingIcon,
    title: `${LETTING_RULES.visitNoticeHours} hours’ notice`,
    body: `Visits need ${LETTING_RULES.visitNoticeHours} hours’ written notice unless it’s an emergency. ${BRAND.name} won’t book one sooner.`,
  },
]

/** Scotland-first: the rules Slate is built around. */
export function Scotland() {
  return (
    <section aria-labelledby="scotland-title" className="relative overflow-hidden pt-16 sm:pt-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="scotland-title"
          eyebrow="Scotland first"
          title="Built for how letting works here"
          intro="Scottish rules and Scottish words from the start, beginning in Aberdeen. England and Wales follow, with their own."
        />
        <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Glyph, title, body }) => (
            <li key={title} className="flex flex-col gap-3 bg-surface p-6">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full bg-brand-tint text-brand"
              >
                <Glyph weight="duotone" className="size-6" />
              </span>
              <h3 className="text-title leading-snug font-semibold text-ink">{title}</h3>
              <p className="text-body text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
      <Tenements repeat={2} className="mt-12 h-32 w-full sm:h-44" />
    </section>
  )
}
