import { ChatCircleTextIcon } from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import { TRADE_TYPE_LABELS, type PersonId } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { RoleIcon } from '@/components/ui/role-icon'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { TradeScoreSummary } from '@/components/slate/trade-score'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { useViewer } from '@/session'
import { ErrorPanel, ListSkeleton } from './states'
import { ReviewItem, ReviewPolicyLink } from './review-item'
import { distanceText } from './trade-card'

export interface TradeProfileSheetProps {
  tradeId: PersonId | null
  district?: string
  onOpenChange: (open: boolean) => void
}

/** A trade's public page in the detail drawer: credentials, both halves and every review. */
export function TradeProfileSheet({ tradeId, district, onOpenChange }: TradeProfileSheetProps) {
  const viewer = useViewer()
  const { state, refresh } = useSlateQuery(
    (api) => (tradeId ? api.getTradeProfile(viewer, tradeId) : Promise.resolve(null)),
    [viewer, tradeId],
  )
  const profile = state.data
  const business = profile?.trade.tradeProfile

  return (
    <Dialog open={tradeId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        variant="sheet"
        size="lg"
        title={business?.businessName ?? profile?.trade.displayName ?? 'Trade'}
        description={
          profile
            ? `${profile.trade.displayName} · ${business?.trades.map((t) => TRADE_TYPE_LABELS[t]).join(', ') ?? ''}`
            : undefined
        }
      >
        {state.status === 'error' ? (
          <ErrorPanel error={state.error} onRetry={refresh} />
        ) : !profile ? (
          <ListSkeleton rows={3} label="Loading the trade’s profile" />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <Avatar
                name={profile.trade.displayName}
                seed={profile.trade.avatarSeed}
                role="trade"
                size="lg"
                decorative
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-small text-muted">
                  {distanceText(profile.trade.postcodeDistrict, district)}
                </p>
                {business?.about ? <p className="text-body text-ink">{business.about}</p> : null}
                {business ? (
                  <p className="text-small text-muted">
                    Covers {business.serviceDistricts.join(', ')}
                    {business.vatRegistered ? ' · VAT registered' : ''}
                  </p>
                ) : null}
              </div>
            </div>
            {profile.trade.badges.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2" aria-label="Checked credentials">
                {profile.trade.badges.map((badge) => (
                  <li key={badge.kind}>
                    <VerifiedBadge badge={badge} variant="detail" />
                  </li>
                ))}
              </ul>
            ) : null}
            <TradeScoreSummary score={profile.score} details={false} />
            <Tabs defaultValue="landlords">
              <TabsList>
                <TabsTab value="landlords">
                  <RoleIcon role="landlord" weight="bold" />
                  From landlords ({profile.fromLandlords.length})
                </TabsTab>
                <TabsTab value="tenants">
                  <RoleIcon role="tenant" weight="bold" />
                  From tenants ({profile.fromTenants.length})
                </TabsTab>
              </TabsList>
              {(['landlords', 'tenants'] as const).map((half) => {
                const reviews = half === 'landlords' ? profile.fromLandlords : profile.fromTenants
                return (
                  <TabsPanel key={half} value={half} className="flex flex-col gap-4">
                    {reviews.length === 0 ? (
                      <EmptyState
                        icon={ChatCircleTextIcon}
                        title="No reviews yet"
                        description={`Reviews appear after a completed job, once both sides have rated or the window closes.`}
                        headingLevel="h4"
                      />
                    ) : (
                      reviews.map((review) => (
                        <ReviewItem key={review.ratingId} review={review} headingLevel="h4" />
                      ))
                    )}
                    {reviews.length === 0 ? <ReviewPolicyLink /> : null}
                  </TabsPanel>
                )
              })}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
