// Adding a credential to be checked: Gas Safe (with the appliances it covers), membership of an
// electrical scheme, or the electrical competence checklist. It becomes a badge, with the date it
// was checked, only once we've checked it.

import { useState } from 'react'
import { SealCheckIcon } from '@phosphor-icons/react'
import { useSlate } from '@/data'
import {
  ELECTRICAL_SCHEMES,
  GAS_APPLIANCE_CATEGORIES,
  GAS_APPLIANCE_LABELS,
  type ElectricalScheme,
  type GasApplianceCategory,
  type VerificationClaim,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'
import { ChoiceTiles } from '../components/choice-tiles'
import { errorText, fieldError } from '../lib/errors'

type Kind = 'gas_safe' | 'electrical_scheme' | 'electrical_checklist'

export function CredentialSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const [kind, setKind] = useState<Kind | undefined>()
  const [number, setNumber] = useState('')
  const [categories, setCategories] = useState<GasApplianceCategory[]>([])
  const [scheme, setScheme] = useState<ElectricalScheme>('SELECT')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  async function send() {
    if (!kind) {
      setErrors({ kind: 'Choose what you’d like checked.' })
      return
    }
    const claim: VerificationClaim =
      kind === 'gas_safe'
        ? { kind, registrationNumber: number.trim(), applianceCategories: categories }
        : kind === 'electrical_scheme'
          ? { kind, scheme, membershipNumber: number.trim() }
          : { kind }
    setSaving(true)
    setErrors({})
    try {
      await api.requestVerification(viewer, claim)
      onOpenChange(false)
      setKind(undefined)
      setNumber('')
      setCategories([])
      toast.success('Sent for checking', {
        description: 'It usually takes about a day. The badge shows the date we checked it.',
      })
    } catch (error) {
      const fields = {
        number: fieldError(error, 'registrationNumber') ?? fieldError(error, 'membershipNumber'),
        categories: fieldError(error, 'applianceCategories'),
      }
      setErrors(fields)
      if (!fields.number && !fields.categories) {
        toast.error('Not sent', { description: errorText(error) })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add a credential"
        description="Landlords can only give gas work to Gas Safe engineers registered for that kind of appliance. Electrical certificates go to scheme members, or to electricians who’ve completed our competence checklist."
        footer={
          <>
            <DialogClose render={<Button variant="secondary">Cancel</Button>} />
            <Button
              loading={saving}
              iconStart={<SealCheckIcon weight="bold" aria-hidden />}
              onClick={send}
            >
              Send for checking
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <ChoiceTiles
            label="What should we check?"
            columns={1}
            value={kind}
            onValueChange={(value) => {
              setKind(value)
              setErrors({})
            }}
            error={errors.kind}
            options={[
              {
                value: 'gas_safe',
                label: 'Gas Safe registration',
                detail: 'For gas appliances and safety records',
              },
              {
                value: 'electrical_scheme',
                label: 'SELECT, NICEIC or NAPIT',
                detail: 'For EICRs and electrical work',
              },
              {
                value: 'electrical_checklist',
                label: 'Electrical competence checklist',
                detail: 'If you’re not in a scheme, we’ll send you the checklist',
              },
            ]}
          />
          {kind === 'gas_safe' ? (
            <>
              <Input
                label="Gas Safe registration number"
                hint="6 or 7 digits, from your Gas Safe card."
                inputMode="numeric"
                autoComplete="off"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                error={errors.number}
              />
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 font-semibold text-ink">
                  Appliances you’re registered for
                </legend>
                {GAS_APPLIANCE_CATEGORIES.map((category) => (
                  <Checkbox
                    key={category}
                    label={GAS_APPLIANCE_LABELS[category]}
                    checked={categories.includes(category)}
                    onCheckedChange={(checked) =>
                      setCategories((current) =>
                        checked ? [...current, category] : current.filter((c) => c !== category),
                      )
                    }
                  />
                ))}
                {errors.categories ? (
                  <p className="text-small font-semibold text-critical">{errors.categories}</p>
                ) : null}
              </fieldset>
            </>
          ) : null}
          {kind === 'electrical_scheme' ? (
            <>
              <SegmentedControl
                label="Scheme"
                options={ELECTRICAL_SCHEMES.map((value) => ({ value, label: value }))}
                value={scheme}
                onValueChange={setScheme}
              />
              <Input
                label="Membership number"
                autoComplete="off"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                error={errors.number}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
