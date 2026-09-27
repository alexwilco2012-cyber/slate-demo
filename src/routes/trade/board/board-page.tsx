// The job board: open jobs landlords have posted for quotes. Filters are big segmented choices,
// never dropdowns. Nothing is ranked or recommended: newest first, and the trade decides.

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardTextIcon } from '@phosphor-icons/react'
import { useDemoNow, useSlateQuery } from '@/data'
import { DISTANCE_BANDS, type DistanceBand } from '@/domain/places'
import { TRADE_TYPE_LABELS } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PageHeader } from '@/components/slate/page-header'
import { plural } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { LoadError, PageSkeleton } from '../components/page-bits'
import { loadBoard, propertyTypeFor } from './load'
import { PostCard } from './post-card'

type Work = 'mine' | 'all'

const BAND_SHORT: Record<DistanceBand, string> = {
  within_2_miles: '2',
  within_5_miles: '5',
  within_10_miles: '10',
  any: 'Any',
}

const FILTER_KEY = 'slate-trade-board-filter'

function readFilter(): { work: Work; band: DistanceBand } {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null') as {
      work?: unknown
      band?: unknown
    } | null
    const work = saved?.work === 'all' ? 'all' : 'mine'
    const band = DISTANCE_BANDS.find((value) => value === saved?.band) ?? 'within_10_miles'
    return { work, band }
  } catch {
    return { work: 'mine', band: 'within_10_miles' }
  }
}

function saveFilter(filter: { work: Work; band: DistanceBand }) {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filter))
  } catch {
    // Not remembered in a private window; the board still works.
  }
}

export default function BoardPage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const now = useDemoNow()
  const [filter, setFilter] = useState(readFilter)
  const change = (next: Partial<typeof filter>) => {
    const merged = { ...filter, ...next }
    setFilter(merged)
    saveFilter(merged)
  }
  const { state, refresh } = useSlateQuery(
    (api) =>
      loadBoard(api, viewer, {
        ...(filter.work === 'mine' ? { trades: 'mine' as const } : {}),
        distance: filter.band,
      }),
    [viewer, filter.work, filter.band],
  )
  const trades = person.tradeProfile?.trades ?? []
  const tradeWords = trades.map((trade) => TRADE_TYPE_LABELS[trade].toLowerCase()).join(', ')
  const posts = state.data?.posts ?? []

  return (
    <PortalPage title="Job board" width="wide">
      <PageHeader
        title="Job board"
        description="Open jobs from landlords. They choose who to instruct, so a clear quote puts you in the running."
      />

      <div className="grid gap-5 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5 lg:grid-cols-2">
        <SegmentedControl
          label="Show jobs for"
          hint={tradeWords ? `Your trade: ${tradeWords}.` : undefined}
          options={[
            { value: 'mine', label: trades.length > 1 ? 'My trades' : 'My trade' },
            { value: 'all', label: 'All trades' },
          ]}
          value={filter.work}
          onValueChange={(work) => change({ work })}
        />
        <SegmentedControl
          label="Within how many miles"
          hint={`Measured from ${person.postcodeDistrict}, your base.`}
          options={DISTANCE_BANDS.map((band) => ({ value: band, label: BAND_SHORT[band] }))}
          value={filter.band}
          onValueChange={(band) => change({ band })}
        />
      </div>

      {state.status === 'loading' && !state.data ? (
        <PageSkeleton label="Loading open jobs" cards={2} />
      ) : !state.data ? (
        <LoadError what="the job board" onRetry={refresh} />
      ) : (
        <>
          <h2 aria-live="polite" className="font-semibold text-ink">
            {posts.length === 0 ? 'No open jobs' : plural(posts.length, 'open job')}
            <span className="font-normal text-muted"> · newest first</span>
          </h2>
          {posts.length === 0 ? (
            <EmptyState
              icon={ClipboardTextIcon}
              title="Nothing open with these filters"
              description="Landlords post new jobs most days. Look further afield, or at every trade’s jobs."
              action={
                filter.band !== 'any' ? (
                  <Button onClick={() => change({ band: 'any' })}>Show any distance</Button>
                ) : filter.work === 'mine' ? (
                  <Button onClick={() => change({ work: 'all' })}>Show all trades</Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid gap-5 xl:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {posts.map((post, index) => {
                  const profile = state.data?.landlords[post.landlordId]
                  return (
                    <motion.li
                      key={post.jobId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PostCard
                        post={post}
                        landlord={profile?.landlord}
                        client={profile?.clientRating ?? undefined}
                        propertyType={profile ? propertyTypeFor(post, profile.homes) : undefined}
                        myQuoteTotal={state.data?.myTotals[post.jobId]}
                        now={now}
                        primary={index === 0 && !post.myQuoteId}
                      />
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}
    </PortalPage>
  )
}
