import { useState } from 'react'
import { LinkSimpleIcon } from '@phosphor-icons/react'
import type { Role, ScaleScore } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { PassportCard } from '@/components/slate/passport-card'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { ReviewCard, SealedReviewCard } from '@/components/slate/review-card'
import { ScoreSummary } from '@/components/slate/score-summary'
import { TradeScoreSummary } from '@/components/slate/trade-score'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import {
  gasSafe,
  idCheck,
  landlordRegistration,
  landlordScore,
  newScore,
  passportLines,
  pendingReview,
  pendingScheme,
  PEOPLE,
  reviewOfLandlord,
  reviewOfTrade,
  tradeScore,
} from '../gallery-data'
import { Section, Specimen, Specimens } from '../gallery-frame'

function ScaleDemo({ role }: { role: Role }) {
  const [judgement, setJudgement] = useState<ScaleScore | undefined>(4)
  const [frequency, setFrequency] = useState<ScaleScore | undefined>()
  const [fixed, setFixed] = useState<ScaleScore | undefined>(3)
  return (
    <div className="flex flex-col gap-6">
      <PlainWordsScale
        label={role === 'trade' ? 'Clear job description' : 'Fixed problems quickly'}
        scale="judgement"
        value={judgement}
        onValueChange={setJudgement}
        required
      />
      <PlainWordsScale
        label={role === 'trade' ? 'Paid on time' : 'Gave proper notice before visits'}
        scale="frequency"
        value={frequency}
        onValueChange={setFrequency}
        required
        error={frequency === undefined ? 'Choose an answer to carry on.' : undefined}
      />
      <PlainWordsScale
        label="Is the problem fixed?"
        hint="Think about how it is today, not on the day of the visit."
        scale="yesPartlyNo"
        value={fixed}
        onValueChange={setFixed}
        required
      />
    </div>
  )
}

function PassportDemo() {
  const toast = useToast()
  return (
    <PassportCard
      tenantName={PEOPLE.sarah.name}
      landlordCount={2}
      lines={passportLines}
      footer={
        <>
          <Button
            variant="soft"
            iconStart={<LinkSimpleIcon weight="bold" aria-hidden />}
            onClick={() =>
              toast.info('Share link copied', {
                description: 'It shows everything and works for 30 days.',
              })
            }
          >
            Share my passport
          </Button>
          <p className="text-small text-muted">
            All or nothing: one link, works for 30 days, every view logged.
          </p>
        </>
      }
    />
  )
}

export function RatingsSection() {
  const toast = useToast()
  const report = () => toast.info('Report opened', { description: 'Four routes, one sheet.' })
  return (
    <Section
      id="ratings"
      title="Ratings"
      description="Plain words, never stars. Scores show to one decimal with their words, how many reviews, and the spread; the tenant passport has no single number at all."
    >
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Plain-words scale">
              <ScaleDemo role={role} />
            </Specimen>
            <Specimen label="Verified badges">
              <div className="flex flex-wrap gap-2">
                <VerifiedBadge badge={idCheck} />
                <VerifiedBadge badge={landlordRegistration} />
                <VerifiedBadge badge={gasSafe} />
                <VerifiedBadge badge={pendingScheme} pending />
              </div>
              <VerifiedBadge badge={gasSafe} variant="detail" />
              <VerifiedBadge badge={pendingScheme} pending variant="detail" />
            </Specimen>
          </>
        )}
      </Specimens>
      <Specimens>
        {(role) =>
          role === 'trade' ? (
            <Specimen label="Trade Overall, with both halves">
              <TradeScoreSummary score={tradeScore} />
            </Specimen>
          ) : (
            <>
              <Specimen label="Score summary">
                <ScoreSummary
                  title="What tenants say about Graham"
                  summary={landlordScore}
                  direction="tenant->landlord"
                  facts={['Property sub-score 4.6 at 17 Fonthill Road']}
                />
              </Specimen>
              <Specimen label="New: fewer than 3 reviewers">
                <ScoreSummary summary={newScore} direction="landlord->trade" variant="compact" />
              </Specimen>
            </>
          )
        }
      </Specimens>
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Reviews">
              <ReviewCard
                review={reviewOfLandlord}
                onReport={report}
                onReply={role === 'landlord' ? report : undefined}
              />
              <ReviewCard review={reviewOfTrade} onReport={report} />
              <ReviewCard review={pendingReview} onReport={report} />
            </Specimen>
            <Specimen label="Sealed">
              <SealedReviewCard
                seal="double_blind"
                raterRole={role === 'tenant' ? 'landlord' : 'tenant'}
                revealAt="2026-10-10T09:00:00.000Z"
                context="Repair: Leak under the kitchen sink"
              />
              <SealedReviewCard
                seal="retaliation_shield"
                raterRole="tenant"
                revealAt={null}
                context="Repair: Boiler not firing"
              />
            </Specimen>
            {role !== 'trade' ? (
              <Specimen label="Tenant passport">
                <PassportDemo />
              </Specimen>
            ) : null}
          </>
        )}
      </Specimens>
    </Section>
  )
}
