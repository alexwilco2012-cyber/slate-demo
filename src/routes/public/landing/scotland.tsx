import { BRAND } from '@/config/brand'
import { LETTING_RULES } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { ComplianceCalendarRow, ComplianceTable } from '@/components/slate/compliance-calendar'
import { PublicPhoto } from '@/components/slate/public-photo'
import { PublicReveal } from '@/components/slate/public-reveal'
import { RoleChip } from '@/components/slate/role-chip'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { COMPLIANCE_ROWS } from '../content/samples'
import { Container } from '../layout/parts'
import { StreetArt } from './door-art'
import { PHOTOS } from './media'
import { leadClass, sectionTitleClass, SectionLabel } from './parts'

const RULES = [
  {
    title: `${LETTING_RULES.visitNoticeHours} hours’ notice`,
    body: `Visits need ${LETTING_RULES.visitNoticeHours} hours’ written notice unless it’s an emergency. ${BRAND.name} won’t book one sooner.`,
  },
  {
    title: 'Landlord registration',
    body: 'We check registration numbers against the public register, and the badge shows the date we checked.',
  },
  {
    title: 'The Repairing Standard',
    body: 'Every repair is logged from report to fix, with dates, so there’s a record if anyone ever needs one.',
  },
  {
    title: 'Approved deposit schemes',
    body: `The tenancy shows which of Scotland’s three approved schemes holds the deposit. ${BRAND.name} never holds it.`,
  },
  {
    title: 'Certificates on time',
    body: `Gas safety every year, the EICR every 5 years and registration every 3, plus alarms and legionella. Reminders come ${LETTING_RULES.documentDueSoonDays} days before each runs out.`,
  },
  {
    title: 'Private residential tenancies',
    body: `Tenancies follow Scottish rules, and both sides confirm them on ${BRAND.name}.`,
  },
]

/** A landlord's certificates for one home, with the registration badge: a picture, so inert. */
function Calendar() {
  return (
    <div
      inert
      data-role-accent="landlord"
      className="relative flex select-none flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-4 pt-5 text-ink shadow-overlay sm:p-6 sm:pt-7"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RoleChip role="landlord" label="Graham’s calendar" />
        <VerifiedBadge
          badge={{
            kind: 'landlord_registration',
            registrationNumber: '384011/100/27519',
            council: 'Aberdeen City Council',
            checkedAt: '2026-08-14',
          }}
        />
      </div>
      <ComplianceTable caption="Certificates · Flat 4, 118 King Street">
        {COMPLIANCE_ROWS.map((item) => (
          <ComplianceCalendarRow key={item.type} item={item} />
        ))}
      </ComplianceTable>
    </div>
  )
}

/** Scotland first: the rules Slate is built around, in the city it starts in. */
export function Scotland() {
  return (
    <section
      id="scotland"
      aria-labelledby="scotland-title"
      className="border-t border-line bg-surface py-20 outline-none sm:py-28 lg:py-32"
    >
      <Container className="flex flex-col">
        <PublicReveal className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <SectionLabel>Scotland first</SectionLabel>
            <h2 id="scotland-title" className={cn(sectionTitleClass, 'text-ink')}>
              Built for how letting works in Scotland.
            </h2>
          </div>
          <p className={cn(leadClass, 'text-muted lg:col-span-5 lg:pb-2')}>
            Scottish rules and Scottish words from day one, starting in Aberdeen. England and Wales
            follow, with their own.
          </p>
        </PublicReveal>

        <figure className="relative mt-12 sm:mt-16">
          <PublicPhoto
            src={PHOTOS.street}
            alt="Granite tenements on an Aberdeen street in low evening sun."
            fallback={<StreetArt />}
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="aspect-[4/3] rounded-[1.5rem] bg-surface-2 sm:aspect-[2/1] sm:rounded-[2rem] lg:aspect-[21/9]"
          />
          <figcaption className="absolute top-3 left-3 rounded-full border border-line bg-surface px-3.5 py-1.5 text-small font-semibold text-ink shadow-raised sm:top-5 sm:left-5">
            Aberdeen, where we’re starting.
          </figcaption>
        </figure>

        <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-12 lg:gap-x-12">
          <ul className="flex flex-col lg:col-span-5">
            {RULES.map((rule) => (
              <li
                key={rule.title}
                className="flex flex-col gap-1.5 border-t border-line py-5 last:border-b"
              >
                <h3 className="text-title leading-snug font-semibold text-ink">{rule.title}</h3>
                <p className="text-body text-muted">{rule.body}</p>
              </li>
            ))}
          </ul>
          <div className="lg:col-span-7">
            <PublicReveal className="lg:sticky lg:top-28">
              <Calendar />
            </PublicReveal>
          </div>
        </div>
      </Container>
    </section>
  )
}
