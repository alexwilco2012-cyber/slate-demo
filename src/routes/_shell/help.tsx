import type { ReactNode } from 'react'
import { FlaskIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import type { Role } from '@/domain/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export interface HelpTopic {
  question: string
  answer: ReactNode
}

/** The short answers each portal's help opens with. A portal can pass its own instead. */
export const HELP_TOPICS: Record<Role, HelpTopic[]> = {
  tenant: [
    {
      question: 'Something needs fixing',
      answer:
        'Use Report a problem. Your landlord sees it straight away, and you can follow every step on the repair.',
    },
    {
      question: 'Visits to your home',
      answer:
        'Your landlord, or the trade they send, must give you 48 hours’ written notice before a visit, unless it’s an emergency.',
    },
    {
      question: 'Who sees your ratings',
      answer:
        'Nobody sees a rating until everyone on that repair or tenancy has rated, or the window closes. What you say about your current landlord after a repair is sealed and only counts inside their score.',
    },
  ],
  landlord: [
    {
      question: 'Choosing a trade',
      answer: `You always choose who to instruct: from your saved trades, the directory or quotes on the job board. ${BRAND.name} never assigns a trade for you.`,
    },
    {
      question: 'Certificate reminders',
      answer:
        'Gas safety is due every 12 months, the EICR every 5 years and landlord registration every 3 years. We remind you well before each one runs out.',
    },
    {
      question: 'Visits and notice',
      answer:
        'Give your tenants 48 hours’ written notice before a visit, except in an emergency. Booking a visit here sends the notice for you.',
    },
  ],
  trade: [
    {
      question: 'Getting onto a job',
      answer:
        'Landlords choose who they instruct. Send quotes on the job board, or a landlord who has saved you can instruct you directly.',
    },
    {
      question: 'Gas and electrical work',
      answer:
        'Gas jobs need a checked Gas Safe registration for that kind of appliance. Electrical inspections need SELECT, NICEIC or NAPIT membership, or a checked checklist.',
    },
    {
      question: 'Rating the landlord',
      answer:
        'You have 30 days after a job to rate the landlord, so you can say whether they paid on time. They only see it once their rating of you is in.',
    },
  ],
}

export interface HelpDialogProps {
  role: Role
  open: boolean
  onOpenChange: (open: boolean) => void
  topics?: HelpTopic[]
}

export function HelpDialog({ role, open, onOpenChange, topics }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Help" description="Quick answers for this part of the app.">
        <div className="flex flex-col gap-6">
          <dl className="flex flex-col gap-5">
            {(topics ?? HELP_TOPICS[role]).map((topic) => (
              <div key={topic.question} className="flex flex-col gap-1">
                <dt className="text-body-l font-semibold text-ink">{topic.question}</dt>
                <dd className="text-body text-muted">{topic.answer}</dd>
              </div>
            ))}
          </dl>
          <section
            aria-labelledby="help-demo-title"
            className="flex gap-3 rounded-card bg-surface-2 p-4"
          >
            <FlaskIcon weight="duotone" aria-hidden className="mt-0.5 size-6 shrink-0 text-muted" />
            <div className="flex flex-col gap-1">
              <h3 id="help-demo-title" className="font-semibold text-ink">
                About this demo
              </h3>
              <p className="text-small text-muted">
                Everyone and everything here is made up: the people, homes, messages and ratings.
                Changes are saved in this browser only. To start again, choose Reset demo data in
                your account menu.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
