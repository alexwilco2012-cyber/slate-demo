// The landlord's profile: checked credentials (the landlord registration badge), contact details
// only they see, how others see them, and the comfortable text setting.

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, HourglassMediumIcon, TextAaIcon } from '@phosphor-icons/react'
import { useSlate, useSlateQuery } from '@/data'
import { PROPERTY_TYPE_LABELS } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { ScoreSummary } from '@/components/slate/score-summary'
import { VerifiedBadge } from '@/components/slate/verified-badge'
import { formatDate } from '@/components/slate/format'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { ReviewPolicyLink } from '../components/review-item'
import { Section } from '../components/section'
import { ErrorPanel, PageSkeleton } from '../components/states'
import { useAccountId } from '../lib/data'
import { errorMessage, fieldErrors } from '../lib/errors'
import { useTextSize, type TextSize } from '../lib/text-size'

function TextSizeSetting() {
  const [size, setSize] = useTextSize()
  return (
    <Section
      title="Text size"
      headingLevel="h2"
      description="Comfortable text makes the words larger throughout the landlord portal, on this device."
    >
      <Card padding="lg" className="gap-5">
        <SegmentedControl<TextSize>
          label="Text size"
          hideLabel
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'comfortable', label: 'Comfortable' },
          ]}
          value={size}
          onValueChange={setSize}
        />
        <p className="flex items-start gap-3 rounded-control bg-surface-2 p-4 text-body text-ink">
          <TextAaIcon
            weight="duotone"
            aria-hidden
            className="mt-0.5 size-6 shrink-0 text-accent-text"
          />
          <span>
            This is how repairs, messages and certificates read at this size. You can also zoom your
            browser, and everything reflows to fit.
          </span>
        </p>
      </Card>
    </Section>
  )
}

export default function ProfilePage() {
  const viewer = useViewer()
  const accountId = useAccountId()
  const { person, landlords } = usePortal()
  const { api } = useSlate()
  const toast = useToast()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [me, publicProfile] = await Promise.all([
        api.getMe(viewer),
        api.getLandlordProfile(viewer, accountId),
      ])
      return { me, publicProfile }
    },
    [viewer, accountId],
  )
  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)
  const me = state.data?.me

  useEffect(() => {
    if (!me) return
    setName(me.displayName)
    setDistrict(me.postcodeDistrict)
  }, [me])

  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Profile">
        <ErrorPanel error={state.error} onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data || !me) {
    return (
      <PortalPage title="Profile">
        <PageSkeleton label="Loading your profile" />
      </PortalPage>
    )
  }
  const { publicProfile } = state.data
  const actingFor = landlords.find((l) => l.id === viewer.actingForId)
  const changed = name !== me.displayName || district !== me.postcodeDistrict
  const registration = publicProfile?.registrationVerified
    ? me.badges.find((b) => b.kind === 'landlord_registration')
    : undefined

  async function save() {
    setBusy(true)
    try {
      await api.updateMe(viewer, { displayName: name, postcodeDistrict: district })
      toast.success('Profile saved')
      setErrors({})
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { displayName: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalPage title="Profile">
      <PageHeader
        title="Your profile"
        description="What’s checked, what others see, and your settings."
      />

      <Card padding="lg" className="gap-5 sm:flex-row sm:items-center">
        {/* self-start keeps the role mark on the avatar's corner when the card stacks on phones. */}
        <Avatar
          name={me.displayName}
          seed={me.avatarSeed}
          role="landlord"
          size="xl"
          decorative
          className="self-start sm:self-center"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-display-m font-semibold text-ink">{me.displayName}</p>
          <p className="text-body text-muted">
            {actingFor ? `Letting agent, working for ${actingFor.displayName}` : 'Landlord'} ·{' '}
            {me.postcodeDistrict} · joined {formatDate(me.joinedAt)}
          </p>
        </div>
      </Card>

      <Section
        title="Checked credentials"
        headingLevel="h2"
        description="Badges appear only once we’ve checked them, always with the date."
      >
        {me.badges.length === 0 && me.pendingVerifications.length === 0 ? (
          <p className="text-body text-muted">Nothing checked yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {me.badges.map((badge) => (
              <li key={badge.kind}>
                <VerifiedBadge badge={badge} variant="detail" />
              </li>
            ))}
            {me.pendingVerifications.map((pending) => (
              <li key={pending.claim.kind}>
                <VerifiedBadge badge={pending.claim} pending variant="detail" />
              </li>
            ))}
          </ul>
        )}
        {!me.badges.some((b) => b.kind === 'landlord_registration') && !actingFor ? (
          <p className="flex items-start gap-2 text-small text-muted">
            <HourglassMediumIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            Every landlord in Scotland must register with their council. Add your number when you
            sign up and we’ll check it.
          </p>
        ) : null}
      </Section>

      <Section
        title="Your details"
        headingLevel="h2"
        description="Your email and phone are only ever shown to you."
      >
        <Card padding="lg" className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={errors.displayName}
            />
            <Input
              label="Postcode district"
              hint="The first half of your postcode, like AB15."
              value={district}
              onChange={(event) => setDistrict(event.target.value.toUpperCase())}
              error={errors.postcodeDistrict}
            />
            <Input
              label="Email"
              value={me.contact.email}
              readOnly
              hint="Used for sign-in links. It can’t be changed in this demo."
            />
            <Input
              label="Phone"
              value={me.contact.phone ?? 'Not given'}
              readOnly
              hint="It can’t be changed in this demo."
            />
          </div>
          <Button className="self-end" disabled={!changed} loading={busy} onClick={save}>
            Save changes
          </Button>
        </Card>
      </Section>

      <TextSizeSetting />

      {publicProfile ? (
        <Section
          title="How others see you"
          headingLevel="h2"
          description="Your public page shows your score, reviews and homes by area only, never the address."
        >
          <Card padding="lg" className="gap-5">
            <ScoreSummary
              summary={publicProfile.score}
              direction="tenant->landlord"
              variant="compact"
              headingLevel="h3"
            />
            {registration ? <VerifiedBadge badge={registration} className="self-start" /> : null}
            <ul className="flex flex-wrap gap-2" aria-label="Homes, by area">
              {publicProfile.homes.map((home) => (
                <li
                  key={home.propertyId}
                  className="rounded-full bg-surface-2 px-3 py-1.5 text-small text-ink"
                >
                  {PROPERTY_TYPE_LABELS[home.type]} · {home.bedrooms} bed · {home.neighbourhood}{' '}
                  {home.postcodeDistrict}
                </li>
              ))}
            </ul>
            <p className={cn('text-small text-muted')}>
              Your client rating from trades is shown only to trades, and to you.
            </p>
            <div className="flex flex-wrap items-center gap-x-6">
              <Link
                to="/landlord/ratings"
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline"
              >
                Reviews and ratings
                <ArrowRightIcon weight="bold" aria-hidden className="size-4" />
              </Link>
              <ReviewPolicyLink />
            </div>
          </Card>
        </Section>
      ) : null}
      <p className="text-small text-muted">
        Signed in as {person.displayName}. Appearance (light or dark) is in the account menu.
      </p>
    </PortalPage>
  )
}
