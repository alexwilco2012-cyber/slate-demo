// Every repair the tenant has reported or been told about, open ones first, with a compact
// timeline on each. Past homes' repairs stay here too, labelled with the address.

import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircleIcon, PlusIcon, WrenchIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import type { Job } from '@/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { QueryError, TabCount } from '../components/basics'
import { RepairCard } from '../components/repair-card'
import {
  CLOSED_STATUSES,
  homeForProperty,
  isOpen,
  loadHomes,
  loadPeople,
  streetOf,
} from '../lib/data'

type Filter = 'open' | 'done' | 'closed'

function filterOf(job: Job): Filter {
  if (isOpen(job) || job.status === 'completed') return 'open'
  if (CLOSED_STATUSES.includes(job.status)) return 'closed'
  return 'done'
}

const FILTERS: Record<
  Filter,
  { tab: string; heading: string; title: string; description: string }
> = {
  open: {
    tab: 'Open',
    heading: 'Open repairs',
    title: 'Nothing waiting to be fixed',
    description: 'If something breaks, report it and you can follow every step here.',
  },
  done: {
    tab: 'Done',
    heading: 'Finished repairs',
    title: 'No finished repairs yet',
    description: 'A repair moves here once the work is done and your landlord confirms it.',
  },
  closed: {
    tab: 'Closed',
    heading: 'Declined or cancelled repairs',
    title: 'Nothing declined or cancelled',
    description: 'If a repair is declined or called off, it shows here with the reason.',
  },
}

const ORDER: readonly Filter[] = ['open', 'done', 'closed']

export function RepairsPage() {
  const viewer = useViewer()
  const now = useDemoNow()
  const [filter, setFilter] = useState<Filter>('open')
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [jobs, homes] = await Promise.all([api.listJobs(viewer), loadHomes(api, viewer)])
      const people = await loadPeople(
        api,
        viewer,
        jobs.flatMap((job) => [job.tradeId, job.reportedById]),
      )
      return { jobs, homes, people }
    },
    [viewer],
  )

  const jobs = state.data?.jobs ?? []
  const counts = { open: 0, done: 0, closed: 0 }
  for (const job of jobs) counts[filterOf(job)] += 1
  const shown = jobs.filter((job) => filterOf(job) === filter)

  return (
    <PortalPage title="Repairs">
      <PageHeader
        title="Repairs"
        description="Everything you’ve reported, and work your landlord has booked at your home."
        actions={
          <Link to="/tenant/report" className={buttonVariants()}>
            <PlusIcon weight="bold" aria-hidden />
            Report a problem
          </Link>
        }
      />

      {state.status === 'loading' ? (
        <LoadingRegion label="Loading your repairs" className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-control" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-40 w-full rounded-card" />
          ))}
        </LoadingRegion>
      ) : null}
      {state.status === 'error' && !state.data ? (
        <QueryError what="your repairs" onRetry={refresh} />
      ) : null}

      {state.data ? (
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList aria-label="Show repairs">
            {ORDER.map((key) => (
              <TabsTab key={key} value={key}>
                {FILTERS[key].tab} <TabCount count={counts[key]} />
              </TabsTab>
            ))}
          </TabsList>
          {ORDER.map((key) => (
            <TabsPanel key={key} value={key} className="flex flex-col gap-3">
              <h2 className="sr-only">{FILTERS[key].heading}</h2>
              {key !== filter ? null : shown.length === 0 ? (
                <EmptyState
                  icon={key === 'open' ? CheckCircleIcon : WrenchIcon}
                  headingLevel="h3"
                  title={FILTERS[key].title}
                  description={FILTERS[key].description}
                  action={
                    key === 'open' ? (
                      <Link to="/tenant/report" className={buttonVariants()}>
                        Report a problem
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {shown.map((job) => {
                      const home = homeForProperty(state.data!.homes, job.propertyId)
                      const past = home && home.tenancy.status === 'ended'
                      return (
                        <motion.li
                          key={job.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="flex flex-col gap-1.5"
                        >
                          {past ? (
                            <p className="text-caption font-semibold text-muted">
                              At your previous home, {streetOf(home.property)}
                            </p>
                          ) : null}
                          <RepairCard
                            job={job}
                            people={state.data!.people}
                            landlord={home?.landlord}
                            now={now}
                            showTimeline={!past}
                            className="flex-1"
                          />
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </TabsPanel>
          ))}
        </Tabs>
      ) : null}
    </PortalPage>
  )
}
