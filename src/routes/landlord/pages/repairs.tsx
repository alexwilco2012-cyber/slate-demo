// Every repair on the landlord's homes, filtered by what needs them and by home. On wide screens a
// repair opens in a drawer beside the list (?job=…); on phones it opens as its own page.

import { useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowSquareOutIcon, CaretRightIcon, PlusIcon, WrenchIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import type { Job, JobId, PropertyId } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { JobStatusBadge, UrgencyBadge } from '../components/job-status'
import { SelectField } from '../components/select-field'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { usePeople, usePortfolio } from '../lib/data'
import { isWide } from '../lib/dom'
import { placeOf } from '../lib/format'
import { formatShortDate } from '../lib/time'
import {
  actionsByJob,
  actionText,
  byLatest,
  JOB_PHASE_LABELS,
  JOB_PHASES,
  phaseOf,
  waitingText,
  type JobPhase,
} from '../lib/jobs'
import { JobDetail, JobMeta } from './job/job-detail'
import { NewJobDialog } from '../components/new-job-dialog'

/** The drawer's heading: the repair's own title once it has loaded. */
function DrawerTitle({ jobId }: { jobId: JobId }) {
  const viewer = useViewer()
  const { state } = useSlateQuery((api) => api.getJob(viewer, jobId), [viewer, jobId])
  return <>{state.data?.title ?? 'Repair'}</>
}

type PhaseFilter = JobPhase | 'all'

function isPhase(value: string | null): value is PhaseFilter {
  return value === 'all' || JOB_PHASES.includes(value as JobPhase)
}

export default function RepairsPage() {
  const viewer = useViewer()
  const now = useDemoNow()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [raising, setRaising] = useState(false)
  const portfolio = usePortfolio()
  const actions = useSlateQuery((api) => api.listActionsNeeded(viewer), [viewer])
  const data = portfolio.state.data
  const people = usePeople((data?.jobs ?? []).flatMap((j) => [j.tradeId, j.reportedById]))

  const phaseParam = params.get('show')
  const phase: PhaseFilter = isPhase(phaseParam) ? phaseParam : 'needs_you'
  const home = (params.get('home') ?? 'all') as PropertyId | 'all'
  const openJob = params.get('job') as JobId | null

  const byJob = useMemo(() => actionsByJob(actions.state.data ?? []), [actions.state.data])
  const withPhase = useMemo(
    () =>
      (data?.jobs ?? [])
        .filter((job) => home === 'all' || job.propertyId === home)
        .map((job) => ({
          job,
          action: byJob.get(job.id),
          phase: phaseOf(job, byJob.get(job.id)),
        })),
    [data, home, byJob],
  )
  const counts = useMemo(() => {
    const result: Record<PhaseFilter, number> = {
      needs_you: 0,
      in_hand: 0,
      done: 0,
      closed: 0,
      all: 0,
    }
    for (const row of withPhase) {
      result[row.phase] += 1
      result.all += 1
    }
    return result
  }, [withPhase])
  const rows = withPhase
    .filter((row) => phase === 'all' || row.phase === phase)
    .sort((a, b) => byLatest(a.job, b.job))

  const phaseOptions = (['needs_you', 'in_hand', 'done', 'closed', 'all'] as const).map(
    (value) => ({
      value,
      label:
        value === 'all'
          ? `All (${counts.all})`
          : `${value === 'closed' ? 'Closed' : JOB_PHASE_LABELS[value]} (${counts[value]})`,
    }),
  )

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null) merged.delete(key)
      else merged.set(key, value)
    }
    setParams(merged, { replace: !('job' in next) })
  }

  function openRow(event: MouseEvent<HTMLAnchorElement>, job: Job) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    if (!isWide()) return
    event.preventDefault()
    update({ job: job.id })
  }

  const loading = !data || !actions.state.data || !people.state.data
  const error = portfolio.state.error ?? actions.state.error

  return (
    <PortalPage title="Repairs" width="wide">
      <PageHeader
        title="Repairs"
        description="Everything reported at your homes, from the first report to the final rating."
        actions={
          <Button
            variant="secondary"
            iconStart={<PlusIcon weight="bold" aria-hidden />}
            onClick={() => setRaising(true)}
          >
            Raise a repair
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SegmentedControl
          label="Show"
          hideLabel
          size="sm"
          fullWidth={false}
          // Each option as wide as its words, so the tick on the chosen one never wraps.
          className="max-sm:hidden lg:flex-1 [&>[role=radiogroup]]:auto-cols-auto [&>[role=radiogroup]]:self-start"
          options={phaseOptions}
          value={phase}
          onValueChange={(value) => update({ show: value === 'needs_you' ? null : value })}
        />
        <SelectField
          label="Show"
          className="sm:hidden"
          value={phase}
          onValueChange={(value) => update({ show: value === 'needs_you' ? null : value })}
          options={phaseOptions}
        />
        <SelectField
          label="Home"
          hideLabel
          className="sm:max-lg:max-w-sm lg:w-72"
          value={home}
          onValueChange={(value) => update({ home: value === 'all' ? null : value })}
          options={[
            { value: 'all', label: 'All homes' },
            ...(data?.properties ?? []).map((p) => ({ value: p.id, label: placeOf(p) })),
          ]}
        />
      </div>

      {error && loading ? (
        <ErrorPanel
          error={error}
          onRetry={() => {
            portfolio.refresh()
            actions.refresh()
          }}
        />
      ) : loading ? (
        <ListSkeleton rows={5} label="Loading repairs" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={WrenchIcon}
          title={phase === 'needs_you' ? 'Nothing needs you' : 'No repairs here'}
          description={
            phase === 'needs_you'
              ? 'When a tenant reports a problem or a quote arrives, it shows here first.'
              : 'Try another filter, or raise a repair yourself.'
          }
          action={
            phase === 'needs_you' && counts.in_hand > 0 ? (
              <Button variant="secondary" onClick={() => update({ show: 'in_hand' })}>
                See {counts.in_hand} in hand
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setRaising(true)}>
                Raise a repair
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label="Repairs">
          <AnimatePresence initial={false}>
            {rows.map(({ job, action }) => {
              const property = data.propertyById.get(job.propertyId)
              const known = people.state.data ?? new Map()
              const next = action ? actionText(action, known) : null
              return (
                <motion.li
                  key={job.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={`/landlord/jobs/${job.id}`}
                    onClick={(event) => openRow(event, job)}
                    aria-current={openJob === job.id ? 'true' : undefined}
                    className={cn(
                      '@container group flex items-center gap-3 rounded-card border bg-surface p-4 no-underline shadow-soft transition-[box-shadow,border-color] duration-(--duration-quick) hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      openJob === job.id ? 'border-accent-strong' : 'border-line',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-2 @2xl:flex-row @2xl:items-center @2xl:gap-5">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="font-semibold text-ink">{job.title}</p>
                        <p className="text-small text-muted">
                          {property ? placeOf(property) : ''} · reported{' '}
                          {formatShortDate(job.createdAt, now)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 @2xl:w-72 @2xl:shrink-0 @2xl:flex-col @2xl:items-end @2xl:gap-1.5">
                        <span className="flex flex-wrap gap-1.5 @2xl:justify-end">
                          <UrgencyBadge urgency={job.urgency} />
                          <JobStatusBadge status={job.status} />
                        </span>
                        <span
                          className={cn(
                            'text-small',
                            next ? 'font-semibold text-accent-text' : 'text-muted',
                          )}
                        >
                          {next ?? waitingText(job, known)}
                        </span>
                      </div>
                    </div>
                    <CaretRightIcon
                      weight="bold"
                      aria-hidden
                      className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog
        open={openJob !== null}
        onOpenChange={(open) => (open ? null : update({ job: null }))}
      >
        {openJob ? (
          <DialogContent
            variant="sheet"
            size="lg"
            title={<DrawerTitle jobId={openJob} />}
            // Focus starts on the drawer's close button, never on a field further down.
            initialFocus
          >
            <JobDetail
              key={openJob}
              jobId={openJob}
              variant="drawer"
              header={(detail) => (
                <div className="flex flex-col gap-2">
                  <p className="text-small font-semibold text-muted">
                    {detail.property ? placeOf(detail.property) : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <JobMeta data={detail} />
                  </div>
                  <Link
                    to={`/landlord/jobs/${detail.job.id}`}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      '-ml-2 self-start',
                    )}
                  >
                    <ArrowSquareOutIcon weight="bold" aria-hidden />
                    Open as a full page
                  </Link>
                </div>
              )}
            />
          </DialogContent>
        ) : null}
      </Dialog>
      <NewJobDialog
        open={raising}
        onOpenChange={setRaising}
        properties={data?.properties ?? []}
        onCreated={(job) => navigate(`/landlord/jobs/${job.id}`)}
      />
    </PortalPage>
  )
}
