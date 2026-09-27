// A landlord raising a repair themselves, or booking a certificate renewal as a job. Raising it
// counts as approving it, so the next step is choosing a trade.

import { useEffect, useState } from 'react'
import { useSlate } from '@/data'
import {
  DOCUMENT_TYPE_INFO,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  ROOMS,
  ROOM_LABELS,
  type DocumentType,
  type Job,
  type JobCategory,
  type Property,
  type PropertyId,
  type Room,
  type Urgency,
} from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useViewer } from '@/session'
import { SelectField } from '../components/select-field'
import { errorMessage, fieldErrors } from '../lib/errors'
import { lowerFirst, placeOf } from '../lib/format'

export interface NewJobPreset {
  propertyId: PropertyId
  complianceType: DocumentType
}

const RENEWAL_WORDS: Partial<Record<DocumentType, string>> = {
  gas_safety:
    'Annual gas safety check of every gas appliance, flue and pipework, with the record sent to us and shared with the tenant.',
  eicr: 'Five-yearly electrical installation condition report: a full inspection and test, with the report sent to us.',
  smoke_heat_alarms:
    'Test the interlinked smoke and heat alarms and replace any that are past their date.',
  co_alarms: 'Test the carbon monoxide alarms and replace any that are past their date.',
  legionella: 'Legionella risk assessment of the hot and cold water system.',
  pat: 'Portable appliance testing of the appliances we supply.',
  epc: 'A new energy performance certificate.',
}

export function NewJobDialog({
  open,
  onOpenChange,
  properties,
  preset,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: readonly Property[]
  preset?: NewJobPreset
  onCreated?: (job: Job) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const renewal = preset?.complianceType
  const [propertyId, setPropertyId] = useState<PropertyId | ''>(preset?.propertyId ?? '')
  const [category, setCategory] = useState<JobCategory>(renewal ? 'safety_check' : 'leak')
  const [room, setRoom] = useState<Room>(renewal ? 'whole_home' : 'kitchen')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('routine')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)

  // Fill in the form afresh each time it opens, for the certificate it was opened for.
  useEffect(() => {
    if (!open) return
    setPropertyId(preset?.propertyId ?? properties[0]?.id ?? '')
    setCategory(renewal ? 'safety_check' : 'leak')
    setRoom(renewal ? 'whole_home' : 'kitchen')
    setTitle(renewal ? DOCUMENT_TYPE_INFO[renewal].label.replace(/ \(.*\)$/, '') + ' renewal' : '')
    setDescription(renewal ? (RENEWAL_WORDS[renewal] ?? '') : '')
    setUrgency('routine')
    setErrors({})
  }, [open, preset?.propertyId, renewal, properties])

  async function create() {
    if (!propertyId) return setErrors({ propertyId: 'Choose the home.' })
    if (description.trim().length < 10) {
      return setErrors({
        description: 'Describe the job in a sentence or two, so trades can price it.',
      })
    }
    setBusy(true)
    try {
      const job = await api.createJob(viewer, {
        propertyId,
        room,
        category,
        description,
        photos: [],
        urgency,
        access: { windows: [], keyAllowed: false },
        ...(title.trim() ? { title } : {}),
        ...(renewal ? { complianceType: renewal } : {}),
      })
      toast.success(renewal ? 'Renewal added to your repairs' : 'Repair raised', {
        description: 'Next, choose how to find a trade.',
      })
      onOpenChange(false)
      onCreated?.(job)
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          renewal
            ? `Book a renewal: ${lowerFirst(DOCUMENT_TYPE_INFO[renewal].label)}`
            : 'Raise a repair'
        }
        description={
          renewal
            ? 'It goes on your repairs list, already approved. You choose who does it, and the calendar shows it as booked once a visit is in.'
            : 'For something you’ve spotted yourself. It starts approved, so the next step is choosing a trade.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={create}>
              {renewal ? 'Book renewal' : 'Raise repair'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label="Home"
            value={propertyId}
            onValueChange={(value) => setPropertyId(value as PropertyId)}
            error={errors.propertyId}
            options={properties.map((p) => ({ value: p.id, label: placeOf(p) }))}
          />
          {renewal ? null : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="What kind of repair"
                value={category}
                onValueChange={setCategory}
                options={JOB_CATEGORIES.map((c) => ({ value: c, label: JOB_CATEGORY_LABELS[c] }))}
              />
              <SelectField
                label="Where"
                value={room}
                onValueChange={setRoom}
                options={ROOMS.map((r) => ({ value: r, label: ROOM_LABELS[r] }))}
              />
            </div>
          )}
          <Input
            label="Short title"
            optional
            hint="Shown in lists. We’ll make one up if you leave it."
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
          />
          <Textarea
            label="What needs doing"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setErrors({})
            }}
            maxLength={2000}
            showCount
            rows={4}
            error={errors.description}
          />
          {renewal ? null : (
            <SegmentedControl
              label="How urgent"
              options={[
                { value: 'routine', label: 'Routine' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'emergency', label: 'Emergency' },
              ]}
              value={urgency}
              onValueChange={setUrgency}
              hint="Only emergencies can be visited without 48 hours’ notice to the tenant."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
