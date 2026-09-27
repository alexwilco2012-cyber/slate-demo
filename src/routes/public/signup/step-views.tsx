// One screen per question. Each view gets the draft, a way to change it, and the errors from the
// last attempt to carry on; the flow around it supplies the heading, progress and buttons.

import { BRAND } from '@/config/brand'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  IdentificationCardIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import {
  ELECTRICAL_SCHEMES,
  GAS_APPLIANCE_CATEGORIES,
  GAS_APPLIANCE_LABELS,
  TRADE_TYPE_LABELS,
  TRADE_TYPES,
} from '@/domain/types'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/components/ui/cn'
import { Input } from '@/components/ui/input'
import { RadioGroup, type RadioGroupProps } from '@/components/ui/radio-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { inlineLinkClass } from '../layout/parts'
import { ChoiceChips } from './choice-chips'
import { ABERDEEN_DISTRICTS } from './districts'
import type { Council, Cover, Draft, SchemeAnswer, YesNo } from './draft'
import { needsGasSafe, normaliseDistrict, type StepErrors, type StepId } from './steps'

export interface StepProps {
  draft: Draft
  update: (patch: Partial<Draft>) => void
  errors: StepErrors
}

interface StepView {
  title: (draft: Draft) => string
  intro?: (draft: Draft) => ReactNode
  Body: (props: StepProps) => ReactNode
}

/** A calm panel explaining why we ask, or what happens next. */
export function Note({
  icon: Glyph = InfoIcon,
  children,
  className,
}: {
  icon?: typeof InfoIcon
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control bg-surface-2 p-4 text-small text-ink',
        className,
      )}
    >
      <Glyph weight="duotone" aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-text" />
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

/**
 * A radio group for a question that may not be answered yet. Uncontrolled, starting from the saved
 * answer, so "nothing chosen" and "chosen" never switch it between controlled and not.
 */
function ChoiceCards<V extends string>({
  initial,
  ...props
}: Omit<RadioGroupProps<V>, 'value' | 'defaultValue'> & { initial: V | null }) {
  const [start] = useState(initial)
  return <RadioGroup<V> {...props} defaultValue={start ?? undefined} />
}

const COUNCILS: { value: Council; label: string }[] = [
  { value: 'Aberdeen City Council', label: 'Aberdeen City Council' },
  { value: 'Aberdeenshire Council', label: 'Aberdeenshire Council' },
  { value: 'other', label: 'Another council' },
]

const COVER: { value: Cover; label: string }[] = [
  { value: '1m', label: '£1 million' },
  { value: '2m', label: '£2 million' },
  { value: '5m', label: '£5 million+' },
]

export const COVER_LABELS: Record<Cover, string> = {
  '1m': '£1 million',
  '2m': '£2 million',
  '5m': '£5 million or more',
}

export const STEP_VIEWS: Record<Exclude<StepId, 'check'>, StepView> = {
  name: {
    title: () => 'What’s your name?',
    intro: (draft) =>
      draft.role === 'tenant'
        ? 'It’s how your landlord and the trades who visit will see you. Reviews you write show your area instead of your name.'
        : 'It’s how the people you work with will see you. Reviews you write show your area instead of your name.',
    Body: ({ draft, update, errors }) => (
      <Input
        label="Full name"
        autoComplete="name"
        value={draft.displayName}
        onChange={(event) => update({ displayName: event.target.value })}
        error={errors.displayName}
      />
    ),
  },
  age: {
    title: () => 'Are you 18 or over?',
    intro: () =>
      `${BRAND.name} is only for adults. We record that you’ve confirmed it, never your date of birth.`,
    Body: ({ draft, update, errors }) => (
      <Checkbox
        label="I’m 18 or over"
        checked={draft.adult}
        onCheckedChange={(adult) => update({ adult })}
        error={errors.adult}
      />
    ),
  },
  email: {
    title: () => 'What’s your email?',
    intro: () => 'We’ll send you a link to sign in. There’s no password to remember.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={draft.email}
          onChange={(event) => update({ email: event.target.value })}
          error={errors.email}
        />
        <Note>
          <p>
            This is a demo, so we don’t send an email. It appears on screen instead, and a made-up
            address works, like you@example.com.
          </p>
        </Note>
      </div>
    ),
  },
  area: {
    title: (draft) => (draft.role === 'tenant' ? 'Where do you live?' : 'Where are you based?'),
    intro: (draft) =>
      draft.role === 'tenant'
        ? 'The first part of your postcode. Reviews you write show this area, never your address.'
        : 'The first part of your own postcode. You add your homes, with their addresses, once you’re in.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-5">
        <Input
          label="Postcode area"
          hint="For example AB25"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={5}
          value={draft.postcodeDistrict}
          onChange={(event) => update({ postcodeDistrict: event.target.value })}
          onBlur={() =>
            draft.postcodeDistrict &&
            update({ postcodeDistrict: normaliseDistrict(draft.postcodeDistrict) })
          }
          error={errors.postcodeDistrict}
          fieldClassName="max-w-56"
        />
        <div className="flex flex-col gap-2">
          <p className="text-small font-semibold text-muted">Or choose an Aberdeen area</p>
          <ul className="flex flex-wrap gap-2">
            {ABERDEEN_DISTRICTS.map((district) => {
              const on = normaliseDistrict(draft.postcodeDistrict) === district.value
              return (
                <li key={district.value}>
                  <button
                    type="button"
                    aria-pressed={on}
                    title={district.hint}
                    onClick={() => update({ postcodeDistrict: district.value })}
                    className={cn(
                      'min-h-10 rounded-full border px-3.5 text-small font-semibold transition-colors duration-(--duration-quick)',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      on
                        ? 'border-accent-strong bg-accent-tint text-ink shadow-[inset_0_0_0_1px_var(--accent-strong)]'
                        : 'border-input-border bg-surface text-ink hover:bg-surface-2',
                    )}
                  >
                    {district.label}
                    <span className="sr-only">, {district.hint}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    ),
  },
  id: {
    title: () => 'Check your ID?',
    intro: () =>
      'A checked ID tells landlords and trades you are who you say you are. It shows as a badge on your profile, with the date it was checked.',
    Body: ({ draft, update }) => (
      <RadioGroup<Draft['idCheck']>
        label="When would you like to check your ID?"
        hideLabel
        variant="cards"
        value={draft.idCheck}
        onValueChange={(idCheck) => update({ idCheck })}
        options={[
          {
            value: 'now',
            label: 'Check my ID now',
            description:
              'A passport or driving licence and a quick selfie. In this demo the check is simulated.',
          },
          {
            value: 'later',
            label: 'Later, from my profile',
            description: 'Some landlords ask for it before a viewing.',
          },
        ]}
      />
    ),
  },
  registration: {
    title: () => 'Your landlord registration number',
    intro: () =>
      'Every private landlord in Scotland registers with their council. Add your number and we’ll show a “Registration verified” badge once it checks out.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-6">
        <Note icon={MagnifyingGlassIcon}>
          <p className="font-semibold">We check this against the public register</p>
          <p className="text-muted">
            The Scottish Landlord Register is public. We match your number and council there, then
            show the badge with the date we checked. Tenants see the badge, not the number.
          </p>
        </Note>
        <Input
          label="Registration number"
          hint="It looks like 123456/100/12345"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          value={draft.registrationNumber}
          onChange={(event) =>
            update({ registrationNumber: event.target.value, registrationLater: false })
          }
          error={errors.registrationNumber}
          className="figures"
        />
        <RadioGroup<Council>
          label="Which council did you register with?"
          value={draft.council}
          onValueChange={(council) => update({ council })}
          options={COUNCILS}
        />
        {draft.council === 'other' ? (
          <Input
            label="Council name"
            value={draft.otherCouncil}
            onChange={(event) => update({ otherCouncil: event.target.value })}
            error={errors.otherCouncil}
          />
        ) : null}
      </div>
    ),
  },
  agent: {
    title: () => 'Do you work with a letting agent?',
    intro: () =>
      'Agents work inside your account, with only the permissions you give them. There’s no separate app for them.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-5">
        <ChoiceCards<YesNo>
          label="Do you work with a letting agent?"
          hideLabel
          variant="cards"
          initial={draft.agent}
          onValueChange={(agent) => update({ agent })}
          error={errors.agent}
          options={[
            { value: 'no', label: 'No, I manage my homes myself' },
            {
              value: 'yes',
              label: 'Yes, I use a letting agent',
              description:
                'They can approve repairs, choose trades or keep documents, as you decide.',
            },
          ]}
        />
        {draft.agent === 'yes' ? (
          <Input
            label="Your agent’s email"
            optional
            hint="We’ll help you invite them from Team once your account is set up."
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            value={draft.agentEmail}
            onChange={(event) => update({ agentEmail: event.target.value })}
            error={errors.agentEmail}
          />
        ) : null}
      </div>
    ),
  },
  business: {
    title: () => 'What’s your business called?',
    intro: () =>
      'Landlords see it on your quotes and your profile. If you trade under your own name, use that.',
    Body: ({ draft, update, errors }) => (
      <Input
        label="Business name"
        autoComplete="organization"
        value={draft.businessName}
        onChange={(event) => update({ businessName: event.target.value })}
        error={errors.businessName}
      />
    ),
  },
  trades: {
    title: () => 'What work do you do?',
    intro: () =>
      'Choose all that apply. Gas and electrical work need a checked credential before those jobs reach you.',
    Body: ({ draft, update, errors }) => (
      <ChoiceChips
        legend="Your trades"
        hideLegend
        options={TRADE_TYPES.map((trade) => ({ value: trade, label: TRADE_TYPE_LABELS[trade] }))}
        value={draft.trades}
        onChange={(trades) => update({ trades })}
        error={errors.trades}
      />
    ),
  },
  areas: {
    title: () => 'Which areas do you cover?',
    intro: () =>
      'You’ll see jobs posted in these postcode areas. The first one you choose is your base; you can change them any time.',
    Body: ({ draft, update, errors }) => (
      <ChoiceChips
        legend="Areas you cover"
        hideLegend
        options={ABERDEEN_DISTRICTS}
        value={draft.serviceDistricts}
        onChange={(serviceDistricts) => update({ serviceDistricts })}
        error={errors.serviceDistricts}
      />
    ),
  },
  gas: {
    title: (draft) =>
      needsGasSafe(draft) ? 'Your Gas Safe registration' : 'Do you work on gas appliances?',
    intro: () =>
      'Gas jobs only reach engineers on the Gas Safe Register for the right appliances. We check your number against the register.',
    Body: ({ draft, update, errors }) => {
      const doesGas = needsGasSafe(draft) || draft.gasWork === 'yes'
      return (
        <div className="flex flex-col gap-6">
          {needsGasSafe(draft) ? null : (
            <ChoiceCards<YesNo>
              label="Do you work on gas appliances?"
              hideLabel
              variant="cards"
              initial={draft.gasWork}
              onValueChange={(gasWork) => update({ gasWork })}
              error={errors.gasWork}
              options={[
                { value: 'yes', label: 'Yes, I’m Gas Safe registered' },
                { value: 'no', label: 'No, not gas work' },
              ]}
            />
          )}
          {doesGas ? (
            <>
              <Input
                label="Gas Safe registration number"
                hint="6 or 7 digits, on your Gas Safe ID card"
                inputMode="numeric"
                autoComplete="off"
                maxLength={7}
                value={draft.gasNumber}
                onChange={(event) => update({ gasNumber: event.target.value.replace(/\D/g, '') })}
                error={errors.gasNumber}
                fieldClassName="max-w-72"
                className="figures"
              />
              <ChoiceChips
                legend="Which appliances are you registered for?"
                hint="As listed on the back of your ID card."
                options={GAS_APPLIANCE_CATEGORIES.map((category) => ({
                  value: category,
                  label: GAS_APPLIANCE_LABELS[category],
                }))}
                value={draft.gasCategories}
                onChange={(gasCategories) => update({ gasCategories })}
                error={errors.gasCategories}
              />
            </>
          ) : null}
        </div>
      )
    },
  },
  electrical: {
    title: () => 'Are you in an electrical scheme?',
    intro: () =>
      'Electrical safety reports (EICRs) only go to SELECT, NICEIC or NAPIT members, or electricians who evidence our competence checklist.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-6">
        <ChoiceCards<SchemeAnswer>
          label="Your scheme"
          hideLabel
          variant="cards"
          initial={draft.scheme}
          onValueChange={(scheme) => update({ scheme })}
          error={errors.scheme}
          options={[
            ...ELECTRICAL_SCHEMES.map((scheme) => ({ value: scheme, label: scheme })),
            { value: 'none' as const, label: 'I’m not a scheme member' },
          ]}
        />
        {draft.scheme && draft.scheme !== 'none' ? (
          <Input
            label={`${draft.scheme} membership number`}
            autoComplete="off"
            spellCheck={false}
            value={draft.membershipNumber}
            onChange={(event) => update({ membershipNumber: event.target.value })}
            error={errors.membershipNumber}
            fieldClassName="max-w-80"
          />
        ) : null}
        {draft.scheme === 'none' ? (
          <Checkbox
            label="I can evidence the competence checklist"
            description="We’ll ask for your qualifications and a few recent certificates."
            checked={draft.checklist}
            onCheckedChange={(checklist) => update({ checklist })}
          />
        ) : null}
      </div>
    ),
  },
  insurance: {
    title: () => 'Do you have public liability insurance?',
    intro: () => 'Most landlords ask to see it before they instruct a trade.',
    Body: ({ draft, update, errors }) => (
      <div className="flex flex-col gap-6">
        <ChoiceCards<YesNo>
          label="Do you have public liability insurance?"
          hideLabel
          variant="cards"
          initial={draft.insurance}
          onValueChange={(insurance) => update({ insurance })}
          error={errors.insurance}
          options={[
            { value: 'yes', label: 'Yes, I’m insured' },
            { value: 'no', label: 'Not yet' },
          ]}
        />
        {draft.insurance === 'yes' ? (
          <SegmentedControl<Cover>
            label="How much cover?"
            options={COVER}
            value={draft.cover}
            onValueChange={(cover) => update({ cover })}
            fullWidth
            stackOnPhone
          />
        ) : null}
        <Note icon={ShieldCheckIcon}>
          <p>
            You’ll add the certificate from your profile, so landlords can see your cover and when
            it runs out.
          </p>
        </Note>
      </div>
    ),
  },
}

/** Shown under the check-answers list: what signing up agrees to, in plain words. */
export function SignUpTerms() {
  return (
    <Note icon={IdentificationCardIcon}>
      <p>
        Our{' '}
        <Link to="/policies/reviews" target="_blank" className={inlineLinkClass}>
          review policy
        </Link>{' '}
        and{' '}
        <Link to="/policies/privacy" target="_blank" className={inlineLinkClass}>
          privacy notice
        </Link>{' '}
        say how ratings and your information are handled. Both open in a new tab.
      </p>
    </Note>
  )
}
