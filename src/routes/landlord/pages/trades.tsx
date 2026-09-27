// Saved trades and the directory. Listed A to Z: Slate never ranks, recommends or assigns a trade.

import { useDeferredValue, useMemo, useState } from 'react'
import { AddressBookIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery, type TradeListing } from '@/data'
import {
  TRADE_TYPES,
  TRADE_TYPE_LABELS,
  type PersonId,
  type PropertyId,
  type TradeType,
} from '@/domain/types'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { BRAND } from '@/config/brand'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ReviewPolicyLink } from '../components/review-item'
import { SelectField } from '../components/select-field'
import { ErrorPanel, ListSkeleton } from '../components/states'
import { TradeCard } from '../components/trade-card'
import { TradeProfileSheet } from '../components/trade-profile-sheet'
import { usePortfolio } from '../lib/data'
import { errorMessage } from '../lib/errors'
import { placeOf } from '../lib/format'

export default function TradesPage() {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const portfolio = usePortfolio()
  const [tab, setTab] = useState<'saved' | 'directory'>('saved')
  const [trade, setTrade] = useState<TradeType | 'all'>('all')
  const [text, setText] = useState('')
  const search = useDeferredValue(text)
  const [near, setNear] = useState<PropertyId | ''>('')
  const [profileId, setProfileId] = useState<PersonId | null>(null)
  const homes = portfolio.state.data?.properties ?? []
  const home = homes.find((p) => p.id === (near || homes[0]?.id))

  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [saved, directory] = await Promise.all([
        api.listSavedTrades(viewer),
        api.searchTrades(viewer, {
          ...(trade === 'all' ? {} : { trade }),
          ...(search.trim() ? { text: search.trim() } : {}),
        }),
      ])
      return { saved, directory }
    },
    [viewer, trade, search],
  )

  async function toggleSaved(listing: TradeListing, next: boolean) {
    try {
      await api.setTradeSaved(viewer, listing.trade.id, next)
      toast.success(
        next ? `Saved ${listing.trade.displayName}` : `Removed ${listing.trade.displayName}`,
        {
          description: next ? 'They’re in your saved trades for next time.' : undefined,
        },
      )
    } catch (error) {
      toast.error('That didn’t save', { description: errorMessage(error) })
    }
  }

  const kinds = useMemo(
    () => TRADE_TYPES.map((t) => ({ value: t, label: TRADE_TYPE_LABELS[t] })),
    [],
  )

  const list = (listings: TradeListing[]) => (
    <ul className="grid gap-4 lg:grid-cols-2">
      {listings.map((listing) => (
        <li key={listing.trade.id} className="flex [&>article]:flex-1">
          <TradeCard
            listing={listing}
            district={home?.postcodeDistrict}
            onToggleSaved={(next) => toggleSaved(listing, next)}
            onViewProfile={() => setProfileId(listing.trade.id)}
            headingLevel="h2"
          />
        </li>
      ))}
    </ul>
  )

  return (
    <PortalPage title="Trades" width="wide">
      <PageHeader
        title="Trades"
        description={`The trades you call on, listed A to Z. ${BRAND.name} never ranks, recommends or assigns a trade. You choose, on each repair.`}
        meta={<ReviewPolicyLink />}
      />
      {homes.length > 1 ? (
        <SelectField
          label="Show distances from"
          className="sm:max-w-sm"
          value={near || homes[0]!.id}
          onValueChange={(value) => setNear(value)}
          options={homes.map((p) => ({ value: p.id, label: placeOf(p) }))}
        />
      ) : null}
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTab value="saved">
            <AddressBookIcon weight="bold" />
            Saved{state.data ? ` (${state.data.saved.length})` : ''}
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
            <ListSkeleton rows={3} label="Loading your saved trades" />
          ) : state.data.saved.length === 0 ? (
            <EmptyState
              icon={AddressBookIcon}
              title="No saved trades yet"
              description="Save the trades you like working with. They’re one tap away when a repair comes in."
              headingLevel="h2"
            />
          ) : (
            list(state.data.saved)
          )}
        </TabsPanel>
        <TabsPanel value="directory" className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Kind of trade"
              value={trade}
              onValueChange={setTrade}
              options={[{ value: 'all', label: 'All trades' }, ...kinds]}
            />
            <Input
              label="Search by name"
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. Buchan"
            />
          </div>
          {!state.data ? (
            <ListSkeleton rows={3} label="Loading the directory" />
          ) : state.data.directory.length === 0 ? (
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="No trades match"
              description="Try another kind of trade or clear the search."
              headingLevel="h2"
            />
          ) : (
            list(state.data.directory)
          )}
        </TabsPanel>
      </Tabs>
      <TradeProfileSheet
        tradeId={profileId}
        district={home?.postcodeDistrict}
        onOpenChange={(open) => (open ? null : setProfileId(null))}
      />
    </PortalPage>
  )
}
