import {
  CheckCircleIcon,
  ClockCountdownIcon,
  FlagIcon,
  HouseLineIcon,
  InfoIcon,
  WarningOctagonIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import type { Role } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { RadioGroup } from '@/components/ui/radio-group'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { Section, Specimen, Specimens } from '../gallery-frame'

const REPORT_STEPS = ['Room', 'Problem', 'Photos', 'Urgency', 'Access', 'Check answers'] as const

function ReportDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="secondary" iconStart={<FlagIcon weight="bold" aria-hidden />}>
            Report this review
          </Button>
        }
      />
      <DialogContent
        title="Report this review"
        description="Tell us what’s wrong. The review stays up while we check, unless the law says otherwise."
        footer={
          <>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <DialogClose render={<Button>Send report</Button>} />
          </>
        }
      >
        <RadioGroup
          label="What is the problem?"
          hideLabel
          variant="cards"
          defaultValue="fake"
          options={[
            {
              value: 'defamation',
              label: 'It’s untrue and harms my reputation',
              description: 'We contact the reviewer within 48 working hours.',
            },
            {
              value: 'illegal',
              label: 'It’s illegal content',
              description: 'Threats, hate, or anything else against the law.',
            },
            {
              value: 'fake',
              label: 'I think it’s fake',
              description: 'It shows as “pending check” while we look.',
            },
            {
              value: 'data',
              label: 'It shares my personal data',
              description: 'We acknowledge within 30 days.',
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  )
}

function SheetDemo() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary">Open detail sheet</Button>} />
      <DialogContent
        variant="sheet"
        title="Leak under the kitchen sink"
        description="Flat 2, 41 Rosemount Place, AB25"
        footer={
          <>
            <DialogClose render={<Button variant="ghost">Close</Button>} />
            <Button>Approve repair</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-body text-ink">
          <p>
            Water pooling under the sink after the dishwasher runs. The tenant has put a basin under
            it and turned the stopcock down.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="caution" icon={<ClockCountdownIcon weight="bold" aria-hidden />}>
              Urgent
            </Badge>
            <Badge tone="outline">Kitchen</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ToastDemo() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-(--gap-touch)">
      <Button
        variant="secondary"
        onClick={() =>
          toast.success('Rating sent', {
            description: 'It stays sealed until Graham rates too, or on 10 Oct.',
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error('Photo didn’t upload', {
            description: 'No signal. We’ll keep it in the queue and try again.',
            action: { label: 'Retry now', onClick: () => undefined },
          })
        }
      >
        Error toast
      </Button>
    </div>
  )
}

export function FeedbackSection() {
  return (
    <Section
      id="feedback"
      title="Feedback and overlays"
      description="Dialogs become bottom sheets on phones; landlord detail opens as a drawer on desktop. Status always pairs an icon and words with its tone."
    >
      <Specimens>
        {(role: Role) => (
          <>
            <Specimen label="Dialog, sheet, toast, tooltip">
              <div className="flex flex-wrap gap-(--gap-touch)">
                <ReportDialog />
                <SheetDemo />
              </div>
              <ToastDemo />
              <div className="flex items-center gap-2 text-small text-muted">
                <Tooltip content="Report this message">
                  <IconButton
                    label="Report this message"
                    icon={<FlagIcon weight="bold" />}
                    variant="secondary"
                    tooltip={false}
                  />
                </Tooltip>
                Hover or focus for a tooltip
              </div>
            </Specimen>
            <Specimen label="Badges">
              <div className="flex flex-wrap gap-2">
                <Badge tone="critical" icon={<WarningOctagonIcon weight="bold" aria-hidden />}>
                  Expired
                </Badge>
                <Badge tone="caution" icon={<ClockCountdownIcon weight="bold" aria-hidden />}>
                  Due soon
                </Badge>
                <Badge tone="info" icon={<InfoIcon weight="bold" aria-hidden />}>
                  Pending check
                </Badge>
                <Badge tone="positive" icon={<CheckCircleIcon weight="bold" aria-hidden />}>
                  Up to date
                </Badge>
                <Badge tone="accent">3 quotes</Badge>
                <Badge tone="brand">Registration verified</Badge>
                <Badge tone="neutral" size="sm">
                  Kitchen
                </Badge>
                <Badge tone="outline" size="sm">
                  To arrange
                </Badge>
              </div>
            </Specimen>
            <Specimen label="Progress">
              <ProgressSteps steps={REPORT_STEPS} current={2} />
              <ProgressSteps steps={REPORT_STEPS} current={4} variant="list" />
            </Specimen>
            <Specimen label="Tabs">
              <Tabs defaultValue="open">
                <TabsList>
                  <TabsTab value="open">Open</TabsTab>
                  <TabsTab value="quotes">Quotes</TabsTab>
                  <TabsTab value="done">Done</TabsTab>
                </TabsList>
                <TabsPanel value="open" className="text-body text-ink">
                  2 repairs are waiting on you.
                </TabsPanel>
                <TabsPanel value="quotes" className="text-body text-ink">
                  3 quotes to compare for the roof at 6 Orchard Street.
                </TabsPanel>
                <TabsPanel value="done" className="text-body text-ink">
                  14 repairs finished this year.
                </TabsPanel>
              </Tabs>
            </Specimen>
            <Specimen label="Cards">
              <Card accentBar>
                <CardHeader
                  eyebrow="Actions needed"
                  title="Approve the repair at 17 Fonthill Road"
                  description="Reported by Sarah on Mon 21 Sept · Urgent"
                />
                <CardFooter>
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="ghost">
                    Decline
                  </Button>
                </CardFooter>
              </Card>
              <Card variant="accent" padding="sm">
                <p className="text-body text-ink">
                  Leave yours to see what they said about you. Both are revealed together on 10 Oct.
                </p>
              </Card>
              <Card variant="sunken" padding="sm">
                <p className="text-small text-muted">A sunken well for secondary detail.</p>
              </Card>
            </Specimen>
            <Specimen label="Loading">
              <LoadingRegion label="Loading repairs" className="flex flex-col gap-3">
                {[0, 1].map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-card border border-line p-4"
                  >
                    <Skeleton className="size-11 rounded-full" />
                    <SkeletonText lines={2} className="flex-1" />
                  </div>
                ))}
              </LoadingRegion>
            </Specimen>
            <Specimen label="Empty state">
              {role === 'trade' ? (
                <EmptyState
                  icon={WrenchIcon}
                  title="No jobs booked yet"
                  description="Landlords choose trades themselves. Keep your profile and quotes up to date and new jobs will show here."
                  action={<Button>Browse the job board</Button>}
                />
              ) : (
                <EmptyState
                  icon={HouseLineIcon}
                  title={role === 'tenant' ? 'No repairs reported' : 'No homes added yet'}
                  description={
                    role === 'tenant'
                      ? 'If something needs fixing, report it here and your landlord will see it straight away.'
                      : 'Add your first home to track repairs, documents and certificate dates.'
                  }
                  action={<Button>{role === 'tenant' ? 'Report a problem' : 'Add a home'}</Button>}
                />
              )}
            </Specimen>
          </>
        )}
      </Specimens>
    </Section>
  )
}
