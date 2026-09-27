import { useParams } from 'react-router'
import type { JobId } from '@/domain/types'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { placeOf } from '../../lib/format'
import { JobDetail, JobMeta } from './job-detail'

/** /landlord/jobs/:jobId: a repair on its own page (phones, links from notifications). */
export default function JobPage() {
  const { jobId } = useParams()
  return (
    <PortalPage title="Repair" width="wide">
      <JobDetail
        key={jobId}
        jobId={jobId as JobId}
        variant="page"
        header={(data) => (
          <PageHeader
            back={{ to: '/landlord/repairs', label: 'Repairs' }}
            eyebrow={data.property ? placeOf(data.property) : undefined}
            title={data.job.title}
            meta={<JobMeta data={data} />}
          />
        )}
      />
    </PortalPage>
  )
}
