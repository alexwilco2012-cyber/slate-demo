import {
  ClipboardTextIcon,
  CurrencyGbpIcon,
  HouseLineIcon,
  ShieldWarningIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { ComplianceCalendarRow, ComplianceTable } from '@/components/slate/compliance-calendar'
import { DocumentCard } from '@/components/slate/document-card'
import { StatTile } from '@/components/slate/stat-tile'
import { compliance } from '../gallery-data'
import { Section, Specimen, Specimens } from '../gallery-frame'

const ACTION_LABELS = {
  EXPIRED: 'Book now',
  DUE_SOON: 'Book renewal',
  BOOKED: 'View job',
  OK: 'View',
  TO_ARRANGE: 'Upload',
} as const

function Stats({ role }: { role: Role }) {
  if (role === 'trade') {
    return (
      <div className="grid grid-cols-1 gap-(--gap-touch) @2xs:grid-cols-2">
        <StatTile
          label="Jobs this week"
          value="6"
          hint="2 today"
          icon={WrenchIcon}
          tone="accent"
          to="/dev/gallery"
        />
        <StatTile label="Owed to you" value="£1,240" hint="3 invoices" icon={CurrencyGbpIcon} />
      </div>
    )
  }
  if (role === 'tenant') {
    return (
      <div className="grid grid-cols-1 gap-(--gap-touch) @2xs:grid-cols-2">
        <StatTile
          label="Open repairs"
          value="1"
          hint="Visit on Monday"
          icon={WrenchIcon}
          tone="accent"
          to="/dev/gallery"
        />
        <StatTile
          label="Documents"
          value="7"
          hint="All shared by Graham"
          icon={ClipboardTextIcon}
        />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-(--gap-touch) @2xs:grid-cols-2">
      <StatTile
        label="Actions needed"
        value="4"
        hint="1 certificate expired"
        icon={ShieldWarningIcon}
        tone="accent"
        to="/dev/gallery"
      />
      <StatTile label="Homes" value="3" hint="All let" icon={HouseLineIcon} />
    </div>
  )
}

export function DocumentsSection() {
  return (
    <Section
      id="documents"
      title="Documents and compliance"
      description="Each certificate says its status in words with its own icon, the dates, and how long is left. The compliance calendar stays a plain table and stacks on phones."
    >
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Stat tiles" className="@container">
              <Stats role={role} />
            </Specimen>
            <Specimen label="Document cards">
              <DocumentCard
                type="gas_safety"
                status="EXPIRED"
                daysLeft={-4}
                propertyLabel="6 Orchard Street, Old Aberdeen, AB24"
                document={{
                  title: 'Gas safety record',
                  issuedAt: '2025-09-22',
                  expiresAt: '2026-09-22',
                  reference: 'GSR-2025-4471',
                  issuedBy: 'Granite Tap Plumbing',
                  sharedWithTenant: true,
                }}
                actions={
                  role === 'landlord' ? (
                    <Button size="sm">Book gas check</Button>
                  ) : (
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  )
                }
              />
              <DocumentCard
                type="eicr"
                status="DUE_SOON"
                daysLeft={38}
                propertyLabel="17 Fonthill Road, Ferryhill, AB11"
                document={{
                  title: 'Electrical installation condition report (EICR)',
                  issuedAt: '2021-11-03',
                  expiresAt: '2026-11-03',
                  reference: 'EICR 118204',
                  issuedBy: 'Kittybrewster Test and Inspect',
                  sharedWithTenant: false,
                }}
              />
              <DocumentCard
                type="legionella"
                status="TO_ARRANGE"
                daysLeft={null}
                actions={
                  <Button size="sm" variant="soft">
                    Upload
                  </Button>
                }
              />
            </Specimen>
          </>
        )}
      </Specimens>
      <Specimens wide>
        {() => (
          <Specimen label="Compliance calendar">
            <ComplianceTable caption="Certificates across your homes" showProperty>
              {compliance.map((item) => (
                <ComplianceCalendarRow
                  key={`${item.type}-${item.home}`}
                  item={item}
                  propertyLabel={item.home}
                  action={
                    <Button size="sm" variant={item.status === 'EXPIRED' ? 'primary' : 'secondary'}>
                      {ACTION_LABELS[item.status]}
                    </Button>
                  }
                />
              ))}
            </ComplianceTable>
          </Specimen>
        )}
      </Specimens>
    </Section>
  )
}
