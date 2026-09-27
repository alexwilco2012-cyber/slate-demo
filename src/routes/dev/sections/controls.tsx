import { useState } from 'react'
import {
  CalendarBlankIcon,
  CameraIcon,
  ChatCircleTextIcon,
  CheckIcon,
  DotsThreeIcon,
  FlagIcon,
  LightningIcon,
  PlusIcon,
  SirenIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Section, Specimen, Specimens } from '../gallery-frame'

const MAIN_ACTION: Record<Role, string> = {
  tenant: 'Report a problem',
  landlord: 'Approve repair',
  trade: 'Start the job',
}

function LoadingButton() {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={() => {
        setLoading(true)
        window.setTimeout(() => setLoading(false), 1600)
      }}
    >
      {loading ? 'Sending' : 'Send quote'}
    </Button>
  )
}

/** Danger is outlined on the page; only the confirm inside the dialog is a solid red. */
function WithdrawQuote() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="danger" iconStart={<TrashIcon weight="bold" aria-hidden />}>
            Withdraw quote
          </Button>
        }
      />
      <DialogContent
        size="sm"
        title="Withdraw this quote?"
        description="Graham will see that you withdrew it. You can send a new quote while the job is open."
        footer={
          <>
            <DialogClose render={<Button variant="ghost">Keep quote</Button>} />
            <DialogClose render={<Button variant="danger-solid">Withdraw quote</Button>} />
          </>
        }
      />
    </Dialog>
  )
}

function FormsDemo({ role }: { role: Role }) {
  const [urgency, setUrgency] = useState<'emergency' | 'urgent' | 'routine'>('urgent')
  const [comment, setComment] = useState(
    'In my experience Kev was on time, polite and left the kitchen spotless.',
  )
  return (
    <>
      <Specimen label="Text fields">
        <Input
          label="Quote total"
          hint="Including VAT"
          leading="£"
          inputMode="decimal"
          defaultValue="185.00"
        />
        <Input
          label="Landlord registration number"
          defaultValue="284113/100/1957"
          error="That number is one digit short. It looks like 123456/100/12345."
        />
        <Input label="Access notes" optional placeholder="e.g. Door code on the job page" />
        <Textarea
          label="Your opinion"
          hint="Say what happened, in your experience. Leave out names and anything about health or family."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={30}
          maxLength={1000}
          showCount
          optional
        />
      </Specimen>
      <Specimen label={role === 'trade' ? 'Segmented choice (no dropdowns)' : 'Segmented choice'}>
        <SegmentedControl
          label="How urgent is it?"
          value={urgency}
          onValueChange={setUrgency}
          options={[
            { value: 'emergency', label: 'Emergency', icon: <SirenIcon weight="bold" /> },
            { value: 'urgent', label: 'Urgent', icon: <LightningIcon weight="bold" /> },
            { value: 'routine', label: 'Routine', icon: <CalendarBlankIcon weight="bold" /> },
          ]}
          stackOnPhone
        />
      </Specimen>
      <Specimen label="Choices">
        <RadioGroup
          label="When can the trade get in?"
          variant="cards"
          defaultValue="morning"
          options={[
            { value: 'morning', label: 'Mornings', description: '8am to 12pm, weekdays' },
            { value: 'afternoon', label: 'Afternoons', description: '12pm to 5pm, weekdays' },
            {
              value: 'key',
              label: 'Use the spare key',
              description: 'Collected from the letting agent on Union Street',
            },
          ]}
        />
        <div className="flex flex-col">
          <Checkbox label="Share this certificate with the tenant" defaultChecked />
          <Checkbox
            label="I have given 48 hours’ written notice"
            description="Not needed for emergencies."
          />
          <Checkbox label="Gas Safe engineer needed" disabled />
        </div>
        <div className="flex flex-col divide-y divide-line">
          <Switch
            label="Remind me before certificates expire"
            description="60 days and 14 days before"
            defaultChecked
          />
          <Switch label="Mute this conversation" />
        </div>
      </Specimen>
    </>
  )
}

export function ControlsSection() {
  return (
    <Section
      id="controls"
      title="Actions and forms"
      description="One primary action per screen, in the portal colour. In the trade portal every control grows: 56px defaults, 64px large, a 60px full-width button for the bottom third."
    >
      <Specimens>
        {(role) => (
          <>
            <Specimen label="Buttons">
              <div className="flex flex-wrap gap-(--gap-touch)">
                <Button iconStart={<PlusIcon weight="bold" aria-hidden />}>
                  {MAIN_ACTION[role]}
                </Button>
                <Button variant="secondary">Message</Button>
                <Button variant="soft" iconStart={<CheckIcon weight="bold" aria-hidden />}>
                  Confirm visit
                </Button>
                <Button variant="ghost">Not now</Button>
                <WithdrawQuote />
                <Button disabled>Submit rating</Button>
                <LoadingButton />
              </div>
              <div className="flex flex-wrap items-center gap-(--gap-touch)">
                <Button size="sm">Small</Button>
                <Button size="md">Default</Button>
                <Button size="lg">Large</Button>
              </div>
              <Button size="trade" iconStart={<CameraIcon weight="bold" aria-hidden />}>
                Take photos
              </Button>
            </Specimen>
            <Specimen label="Icon buttons">
              <div className="flex flex-wrap items-center gap-(--gap-touch)">
                <IconButton label="More options" icon={<DotsThreeIcon weight="bold" />} />
                <IconButton
                  label="Message"
                  icon={<ChatCircleTextIcon weight="bold" />}
                  variant="secondary"
                />
                <IconButton label="Add photo" icon={<CameraIcon weight="bold" />} variant="soft" />
                <IconButton label="Add line" icon={<PlusIcon weight="bold" />} variant="primary" />
                <IconButton
                  label="Report"
                  icon={<FlagIcon weight="bold" />}
                  variant="quiet"
                  size="sm"
                />
                <IconButton
                  label="Add photo"
                  icon={<CameraIcon weight="bold" />}
                  variant="primary"
                  size="lg"
                />
              </div>
            </Specimen>
            <FormsDemo role={role} />
          </>
        )}
      </Specimens>
    </Section>
  )
}
