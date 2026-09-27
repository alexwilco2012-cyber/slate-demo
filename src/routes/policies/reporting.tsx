import { Link } from 'react-router'
import {
  ClockIcon,
  EyeSlashIcon,
  FlagIcon,
  GavelIcon,
  LockKeyIcon,
  MaskHappyIcon,
  ScalesIcon,
  type Icon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import type { ReportRoute } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { inlineLinkClass } from '@/routes/public/layout/parts'
import { PolicyPage, Prose, type PolicySection } from './policy-layout'
import { REPORT_ROUTE_COPY, type ReportRouteCopy } from './report-routes'

const ROUTE_ICONS: Record<ReportRoute, Icon> = {
  defamation: ScalesIcon,
  illegal: GavelIcon,
  fake: MaskHappyIcon,
  data_protection: LockKeyIcon,
}

function RouteBody({ copy }: { copy: ReportRouteCopy }) {
  const Glyph = ROUTE_ICONS[copy.route]
  return (
    <div className="flex max-w-prose flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
          >
            <Glyph weight="duotone" className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-small font-semibold text-muted">In the Report sheet</p>
            <p className="text-title leading-snug font-semibold text-ink">“{copy.label}”</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="flex items-start gap-2 text-body font-semibold text-ink">
            <ClockIcon weight="bold" aria-hidden className="mt-1 size-4 shrink-0" />
            {copy.clock}
          </p>
          <div className="flex flex-wrap items-center gap-2 pl-6">
            <Badge tone={copy.clockSource === 'Set in law' ? 'info' : 'neutral'} size="sm">
              {copy.clockSource}
            </Badge>
            <span className="text-small text-muted">{copy.basis}</span>
          </div>
        </div>
      </div>
      <Prose>
        <p>
          <strong>Use it when:</strong> {copy.whenToUse}
        </p>
        <ol>
          {copy.whatHappens.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Prose>
    </div>
  )
}

const SECTIONS: PolicySection[] = [
  {
    id: 'where',
    title: 'Where to report',
    body: (
      <Prose>
        <p>
          Every review, reply, update, message and profile on {BRAND.name} has a{' '}
          <span className="inline-flex items-center gap-1 font-semibold">
            <FlagIcon weight="bold" aria-hidden className="size-4" />
            Report
          </span>{' '}
          button. It asks which of the four routes below fits, then a few words about what’s wrong.
          You can follow what happens next from Reports in your account.
        </p>
      </Prose>
    ),
  },
  ...REPORT_ROUTE_COPY.map((copy): PolicySection => ({
    id: copy.anchor,
    title:
      copy.route === 'defamation'
        ? 'Untrue and damaging'
        : copy.route === 'illegal'
          ? 'Illegal content'
          : copy.route === 'fake'
            ? 'A suspected fake review'
            : 'Your personal data',
    body: <RouteBody copy={copy} />,
  })),
  {
    id: 'if-reported',
    title: 'If something you wrote is reported',
    body: (
      <Prose>
        <p>
          You’ll see the report in Reports, with the route and what you can do. We never tell you
          who reported it. For a defamation complaint you’re told straight away and can respond
          once, and your response goes to whoever decides.
        </p>
        <p className="flex items-start gap-2">
          <EyeSlashIcon weight="bold" aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />
          <span>
            We may hide a review while a defamation complaint is open. We never edit it to suit
            either side. It stays as written, or we remove it.
          </span>
        </p>
        <p>
          Read the{' '}
          <Link to="/policies/reviews#removal" className={inlineLinkClass}>
            reasons we remove reviews
          </Link>
          .
        </p>
      </Prose>
    ),
  },
]

export function ReportingPolicy() {
  return (
    <PolicyPage
      title="Reporting"
      lead={
        <p>
          Four ways to tell us something is wrong, each with its own clock. Some are set in law; the
          rest are our own promises, and we say which is which.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
