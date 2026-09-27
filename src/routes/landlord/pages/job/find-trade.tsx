// Choosing how to find a trade: saved trades, the directory, or quotes from the job board. The
// landlord always chooses; Slate never assigns, matches or dispatches (SPEC §4 legal rule).

import { useDeferredValue, useMemo, useRef, useState } from 'react'
import {
  AddressBookIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  MegaphoneSimpleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useDemoNow, useSlate, useSlateQuery, type TradeListing } from '@/data'
import {
  TRADE_TYPES,
  TRADE_TYPE_LABELS,
  type Job,
  type Property,
  type TradeType,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { BRAND } from '@/config/brand'
import { useViewer } from '@/session'
import { ReviewPolicyLink } from '../../components/review-item'
import { SelectField } from '../../components/select-field'
import { ErrorPanel, ListSkeleton } from '../../components/states'
import { TradeCard } from '../../components/trade-card'
import { TradeProfileSheet } from '../../components/trade-profile-sheet'
import { errorMessage } from '../../lib/errors'
import { firstName } from '../../lib/format'
import { addDays, formatClock, formatLongDay } from '../../lib/time'
import { CredentialNote } from './approve'
import { StepCard } from './step-card'

type Route = 'saved' | 'directory'

function RouteButton({
  icon: Glyph,
  title,
  description,
  onClick,
}: {
  icon: Icon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-24 items-center gap-3.5 rounded-card border border-input-border bg-surface p-4 text-left shadow-soft transition-[box-shadow,border-color,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:border-accent-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"
      >
        <Glyph weight="duotone" className="size-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-small text-muted">{description}</span>
      </span>
      <CaretRightIcon
        weight="bold"
        aria-hidden
        className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
      />
    </button>
  )
}

export function FindTradeStep({ job, property }: { job: Job; property: Property | null }) {
  const viewer = useViewer()
  const [picker, setPicker] = useState<Route | null>(null)
  const [board, setBoard] = useState(false)
  const saved = useSlateQuery((api) => api.listSavedTrades(viewer), [viewer])
  const savedCount = saved.state.data?.length
  return (
    <StepCard
      title="Choose how to find a trade"
      description={`You decide who does the work. ${BRAND.name} never picks or assigns a trade for you.`}
    >
      {job.credentialNeeded ? <CredentialNote credential={job.credentialNeeded} /> : null}
      <div className="grid gap-3 @2xl:grid-cols-3">
        <RouteButton
          icon={AddressBookIcon}
          title="Your saved trades"
          description={
            savedCount === undefined
              ? 'People you’ve used before'
              : savedCount === 0
                ? 'None saved yet'
                : `${savedCount} ${savedCount === 1 ? 'trade' : 'trades'} you’ve used before`
          }
          onClick={() => setPicker('saved')}
        />
        <RouteButton
          icon={MagnifyingGlassIcon}
          title="Browse the directory"
          description={`Every trade on ${BRAND.name}, A to Z, with their reviews`}
          onClick={() => setPicker('directory')}
        />
        <RouteButton
          icon={MegaphoneSimpleIcon}
          title="Post to the job board"
          description="Trades nearby send quotes; you compare and pick"
          onClick={() => setBoard(true)}
        />
      </div>
      <TradePicker job={job} property={property} route={picker} onRouteChange={setPicker} />
      <PostToBoardDialog job={job} property={property} open={board} onOpenChange={setBoard} />
    </StepCard>
  )
}

function TradePicker({
  job,
  property,
  route,
  onRouteChange,
}: {
  job: Job
  property: Property | null
  route: Route | null
  onRouteChange: (route: Route | null) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [trade, setTrade] = useState<TradeType | 'all'>('all')
  const [text, setText] = useState('')
  const search = useDeferredValue(text)
  const [choosing, setChoosing] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<TradeListing['trade']['id'] | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [saved, eligible, directory] = await Promise.all([
        api.listSavedTrades(viewer),
        api.searchTrades(viewer, { forJobId: job.id }),
        api.searchTrades(viewer, {
          forJobId: job.id,
          ...(trade === 'all' ? {} : { trade }),
          ...(search.trim() ? { text: search.trim() } : {}),
        }),
      ])
      return { saved, eligibleIds: new Set(eligible.map((l) => l.trade.id)), directory }
    },
    [viewer, job.id, trade, search],
  )

  async function choose(listing: TradeListing, from: Route) {
    setChoosing(listing.trade.id)
    try {
      await api.chooseTrade(viewer, job.id, {
        tradeId: listing.trade.id,
        route: from === 'saved' ? 'saved_trades' : 'directory',
      })
      toast.success(`${firstName(listing.trade.displayName)} has been asked for a quote`, {
        description: 'You’ll accept the quote and give the go-ahead before any work is booked.',
      })
      onRouteChange(null)
    } catch (error) {
      toast.error('That didn’t work', { description: errorMessage(error) })
    } finally {
      setChoosing(null)
    }
  }

  async function toggleSaved(listing: TradeListing, next: boolean) {
    try {
      await api.setTradeSaved(viewer, listing.trade.id, next)
    } catch (error) {
      toast.error('That didn’t save', { description: errorMessage(error) })
    }
  }

  const trades = useMemo(() => {
    const present = new Set(
      state.data?.directory.flatMap((l) => l.trade.tradeProfile?.trades ?? []),
    )
    return TRADE_TYPES.filter((type) => present.has(type) || type === trade)
  }, [state.data, trade])

  const renderList = (listings: TradeListing[], from: Route) => (
    <ul className="flex flex-col gap-3">
      {listings.map((listing) => {
        const eligible = state.data?.eligibleIds.has(listing.trade.id) ?? true
        const name = firstName(listing.trade.displayName)
        return (
          <li key={listing.trade.id}>
            <TradeCard
              listing={listing}
              district={property?.postcodeDistrict}
              onToggleSaved={(next) => toggleSaved(listing, next)}
              onViewProfile={() => setProfileId(listing.trade.id)}
              action={
                eligible ? (
                  <Button
                    loading={choosing === listing.trade.id}
                    disabled={choosing !== null && choosing !== listing.trade.id}
                    onClick={() => choose(listing, from)}
                  >
                    Ask {name} to quote
                  </Button>
                ) : (
                  <p className="text-small text-muted">
                    Can’t be chosen for this repair. We haven’t checked the credential it needs.
                  </p>
                )
              }
            />
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <Dialog open={route !== null} onOpenChange={(open) => (open ? null : onRouteChange(null))}>
        <DialogContent
          variant="sheet"
          size="lg"
          title="Choose a trade"
          description={`Listed A to Z. ${BRAND.name} doesn’t rank or recommend trades. You choose.`}
          // Focus starts on the chosen tab rather than the search box, so a phone keyboard
          // doesn't cover the list on opening.
          initialFocus={() =>
            tabsRef.current?.querySelector<HTMLElement>('[role=tab][aria-selected=true]') ?? true
          }
        >
          <Tabs
            ref={tabsRef}
            value={route ?? 'saved'}
            onValueChange={(value) => onRouteChange(value as Route)}
          >
            <TabsList>
              <TabsTab value="saved">
                <AddressBookIcon weight="bold" />
                Saved trades
              </TabsTab>
              <TabsTab value="directory">
                <MagnifyingGlassIcon weight="bold" />
                Directory
              </TabsTab>
            </TabsList>
            {state.status === 'error' && !state.data ? (
              <ErrorPanel error={state.error} onRetry={refresh} />
            ) : null}
            <TabsPanel value="saved" className="flex flex-col gap-4">
              {!state.data ? (
                <ListSkeleton rows={2} label="Loading your saved trades" />
              ) : state.data.saved.length === 0 ? (
                <EmptyState
                  icon={AddressBookIcon}
                  title="No saved trades yet"
                  description="Save trades from the directory and they appear here for next time."
                  action={
                    <Button variant="secondary" onClick={() => onRouteChange('directory')}>
                      Browse the directory
                    </Button>
                  }
                />
              ) : (
                renderList(state.data.saved, 'saved')
              )}
            </TabsPanel>
            <TabsPanel value="directory" className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Kind of trade"
                  value={trade}
                  onValueChange={setTrade}
                  options={[
                    { value: 'all', label: 'All trades' },
                    ...trades.map((type) => ({ value: type, label: TRADE_TYPE_LABELS[type] })),
                  ]}
                />
                <Input
                  label="Search by name"
                  type="search"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="e.g. Rattray"
                />
              </div>
              {job.credentialNeeded ? (
                <p className="text-small text-muted">
                  Showing only trades with the credential this repair needs.
                </p>
              ) : null}
              {!state.data ? (
                <ListSkeleton rows={2} label="Loading the directory" />
              ) : state.data.directory.length === 0 ? (
                <EmptyState
                  icon={MagnifyingGlassIcon}
                  title="No trades match"
                  description="Try another kind of trade, or clear the search. You can also post the job to the board for quotes."
                />
              ) : (
                renderList(state.data.directory, 'directory')
              )}
            </TabsPanel>
          </Tabs>
          <ReviewPolicyLink className="mt-2 self-start" />
        </DialogContent>
      </Dialog>
      <TradeProfileSheet
        tradeId={profileId}
        district={property?.postcodeDistrict}
        onOpenChange={(open) => (open ? null : setProfileId(null))}
      />
    </>
  )
}

const BOARD_DAYS = [3, 5, 7, 14] as const

function PostToBoardDialog({
  job,
  property,
  open,
  onOpenChange,
}: {
  job: Job
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const [days, setDays] = useState<`${(typeof BOARD_DAYS)[number]}`>('7')
  const [busy, setBusy] = useState(false)
  const closesAt = addDays(now, Number(days))

  async function post() {
    setBusy(true)
    try {
      await api.postToJobBoard(viewer, job.id, closesAt)
      toast.success('Posted to the job board', {
        description: 'We’ll tell you as each quote arrives.',
      })
      onOpenChange(false)
    } catch (error) {
      toast.error('That didn’t post', { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Post to the job board"
        description="Trades who do this kind of work can send you a quote. You compare them and choose."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={post}>
              Post for quotes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <SegmentedControl
            label="Take quotes for"
            options={BOARD_DAYS.map((d) => ({ value: `${d}` as const, label: `${d} days` }))}
            value={days}
            onValueChange={setDays}
            hint={`Quotes close ${formatLongDay(closesAt)} at ${formatClock(closesAt)}.`}
          />
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-small text-ink marker:text-muted">
            <li>
              Trades see the area
              {property ? ` (${property.neighbourhood}, ${property.postcodeDistrict})` : ''}, the
              problem and the photos. Never the address, until you choose someone.
            </li>
            <li>Quotes are itemised, so you can compare like with like.</li>
            <li>Nobody is booked until you accept a quote and give the go-ahead.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
