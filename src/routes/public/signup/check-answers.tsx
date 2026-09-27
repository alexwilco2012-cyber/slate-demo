import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { GAS_APPLIANCE_LABELS, TRADE_TYPE_LABELS } from '@/domain/types'
import { inlineLinkClass } from '../layout/parts'
import type { Draft } from './draft'
import {
  asksAboutElectrical,
  asksAboutGas,
  needsGasSafe,
  normaliseDistrict,
  type StepId,
} from './steps'
import { COVER_LABELS } from './step-views'

interface Row {
  step: StepId
  label: string
  value: ReactNode
}

function rowsFor(draft: Draft): Row[] {
  const rows: Row[] = [
    { step: 'name', label: 'Name', value: draft.displayName.trim() },
    { step: 'age', label: 'Age', value: '18 or over' },
    { step: 'email', label: 'Email', value: draft.email.trim() },
  ]
  if (draft.role === 'tenant' || draft.role === 'landlord') {
    rows.push({ step: 'area', label: 'Area', value: normaliseDistrict(draft.postcodeDistrict) })
  }
  if (draft.role === 'tenant') {
    rows.push({
      step: 'id',
      label: 'ID check',
      value: draft.idCheck === 'now' ? 'Now' : 'Later, from my profile',
    })
  }
  if (draft.role === 'landlord') {
    rows.push({
      step: 'registration',
      label: 'Landlord registration',
      value: draft.registrationLater ? (
        'Adding it later'
      ) : (
        <>
          <span className="figures">{draft.registrationNumber.trim()}</span>
          <br />
          {draft.council === 'other' ? draft.otherCouncil.trim() : draft.council}
        </>
      ),
    })
    rows.push({
      step: 'agent',
      label: 'Letting agent',
      value:
        draft.agent === 'yes'
          ? draft.agentEmail.trim()
            ? `Yes: ${draft.agentEmail.trim()}`
            : 'Yes'
          : 'No, I manage my homes myself',
    })
  }
  if (draft.role === 'trade') {
    rows.push(
      { step: 'business', label: 'Business', value: draft.businessName.trim() },
      {
        step: 'trades',
        label: 'Trades',
        value: draft.trades.map((trade) => TRADE_TYPE_LABELS[trade]).join(', '),
      },
      { step: 'areas', label: 'Areas you cover', value: draft.serviceDistricts.join(', ') },
    )
    if (asksAboutGas(draft)) {
      const doesGas = needsGasSafe(draft) || draft.gasWork === 'yes'
      rows.push({
        step: 'gas',
        label: 'Gas Safe',
        value: doesGas ? (
          <>
            <span className="figures">{draft.gasNumber}</span>
            <br />
            {draft.gasCategories.map((category) => GAS_APPLIANCE_LABELS[category]).join(', ')}
          </>
        ) : (
          'No gas work'
        ),
      })
    }
    if (asksAboutElectrical(draft)) {
      rows.push({
        step: 'electrical',
        label: 'Electrical scheme',
        value:
          draft.scheme && draft.scheme !== 'none'
            ? `${draft.scheme} · ${draft.membershipNumber.trim()}`
            : draft.checklist
              ? 'Not a member; will evidence the checklist'
              : 'Not a member',
      })
    }
    rows.push({
      step: 'insurance',
      label: 'Public liability insurance',
      value: draft.insurance === 'yes' ? `Yes, ${COVER_LABELS[draft.cover]}` : 'Not yet',
    })
  }
  return rows
}

/** Every answer with a way back to change it, as a description list. */
export function CheckAnswers({
  draft,
  changeHref,
}: {
  draft: Draft
  changeHref: (step: StepId) => string
}) {
  return (
    <dl className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
      {rowsFor(draft).map((row) => (
        <div
          key={row.step}
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[11rem_1fr_auto] sm:px-5"
        >
          <dt className="text-small font-semibold text-muted sm:pt-0.5">{row.label}</dt>
          <dd className="col-start-1 min-w-0 text-body break-words text-ink sm:col-start-2 sm:row-start-1">
            {row.value}
          </dd>
          <dd className="col-start-2 row-span-2 row-start-1 self-center sm:col-start-3 sm:row-span-1">
            <Link to={changeHref(row.step)} className={`${inlineLinkClass} text-small`}>
              <span aria-hidden="true">Change</span>
              <span className="sr-only">Change {row.label.toLowerCase()}</span>
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  )
}
