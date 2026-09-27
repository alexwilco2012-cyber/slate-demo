// Turns "Actions needed" items into what the landlord reads: a title, the thing it is about, a
// line of context and the one button that deals with it.

import {
  CheckCircleIcon,
  ChatTeardropTextIcon,
  CurrencyGbpIcon,
  FireIcon,
  HouseLineIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  UserCirclePlusIcon,
  UsersThreeIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { ActionItem, TeamMember } from '@/data'
import {
  DOCUMENT_TYPE_INFO,
  type Job,
  type JobId,
  type PersonCard,
  type PersonId,
  type Property,
  type PropertyId,
  type Tenancy,
  type TenancyId,
} from '@/domain/types'
import { DOCUMENT_ICONS } from '@/components/slate/document-meta'
import { describeDaysLeft, formatDate } from '@/components/slate/format'
import { firstName, formatPounds, joinNames, placeOf, streetOf } from './format'

export type ActionTone = 'critical' | 'accent' | 'neutral'

export interface ActionView {
  key: string
  icon: Icon
  tone: ActionTone
  title: string
  subject: string
  meta?: string
  cta: { label: string; to: string }
}

export interface ActionContext {
  jobs: ReadonlyMap<JobId, Job>
  properties: ReadonlyMap<PropertyId, Property>
  tenancies: ReadonlyMap<TenancyId, Tenancy>
  people: ReadonlyMap<PersonId, PersonCard>
  team: readonly TeamMember[]
}

/** Ratings are written from the ratings page: /landlord/ratings/rate/<job|tenancy>/<id>/<subject>. */
export function rateHref(
  context: Tenancy['id'] | JobId,
  kind: 'job' | 'tenancy',
  subjectId: PersonId,
) {
  return `/landlord/ratings/rate/${kind}/${context}/${subjectId}`
}

function name(people: ActionContext['people'], id: PersonId | undefined, fallback: string) {
  const card = id ? people.get(id) : undefined
  return card ? firstName(card.displayName) : fallback
}

/** Every person an action item mentions, so their names can be loaded in one go. */
export function peopleIn(
  actions: readonly ActionItem[],
  jobs: ReadonlyMap<JobId, Job>,
  tenancies: ReadonlyMap<TenancyId, Tenancy>,
) {
  const ids: PersonId[] = []
  for (const action of actions) {
    if ('jobId' in action) {
      const job = jobs.get(action.jobId)
      if (job) ids.push(job.reportedById, ...(job.tradeId ? [job.tradeId] : []))
    }
    if (action.kind === 'leave_rating') ids.push(action.task.subjectId)
    if (action.kind === 'confirm_tenancy')
      ids.push(...(tenancies.get(action.tenancyId)?.tenantIds ?? []))
  }
  return ids
}

export function describeAction(action: ActionItem, ctx: ActionContext): ActionView | null {
  const jobOf = (jobId: JobId) => ctx.jobs.get(jobId)
  const where = (propertyId: PropertyId | null | undefined) => {
    const property = propertyId ? ctx.properties.get(propertyId) : undefined
    return property ? placeOf(property) : 'All your homes'
  }

  switch (action.kind) {
    case 'approve_job': {
      const job = jobOf(action.jobId)
      if (!job) return null
      const emergency = job.urgency === 'emergency'
      return {
        key: `approve-${job.id}`,
        icon: emergency ? FireIcon : WrenchIcon,
        tone: emergency ? 'critical' : 'accent',
        title: emergency ? 'Emergency repair to approve' : 'Approve a repair',
        subject: job.title,
        meta: `${where(job.propertyId)} · reported by ${name(ctx.people, job.reportedById, 'your tenant')}${job.urgency === 'urgent' ? ' · urgent' : ''}`,
        cta: { label: 'Review', to: `/landlord/jobs/${job.id}` },
      }
    }
    case 'choose_trade': {
      const job = jobOf(action.jobId)
      if (!job) return null
      return {
        key: `choose-${job.id}`,
        icon: UserCirclePlusIcon,
        tone: 'accent',
        title: 'Choose a trade',
        subject: job.title,
        meta: `${where(job.propertyId)} · approved and waiting for you to pick someone`,
        cta: { label: 'Choose', to: `/landlord/jobs/${job.id}` },
      }
    }
    case 'compare_quotes': {
      const job = jobOf(action.jobId)
      if (!job) return null
      return {
        key: `compare-${job.id}`,
        icon: ReceiptIcon,
        tone: 'accent',
        title:
          action.quoteCount === 1 ? 'A quote to look at' : `Compare ${action.quoteCount} quotes`,
        subject: job.title,
        meta: `${where(job.propertyId)}${job.board?.closesAt ? ` · quotes close ${formatDate(job.board.closesAt)}` : ''}`,
        cta: {
          label: action.quoteCount === 1 ? 'See quote' : 'Compare',
          to: `/landlord/jobs/${job.id}#quotes`,
        },
      }
    }
    case 'instruct_trade': {
      const job = jobOf(action.jobId)
      if (!job) return null
      return {
        key: `instruct-${job.id}`,
        icon: PaperPlaneTiltIcon,
        tone: 'accent',
        title: `Give ${name(ctx.people, job.tradeId, 'the trade')} the go-ahead`,
        subject: job.title,
        meta: `${where(job.propertyId)} · quote accepted, waiting for your go-ahead`,
        cta: { label: 'Instruct', to: `/landlord/jobs/${job.id}` },
      }
    }
    case 'confirm_job': {
      const job = jobOf(action.jobId)
      if (!job) return null
      return {
        key: `confirm-${job.id}`,
        icon: CheckCircleIcon,
        tone: 'accent',
        title: 'Confirm the work is done',
        subject: job.title,
        meta: `${where(job.propertyId)} · ${name(ctx.people, job.tradeId, 'The trade')} has marked it done`,
        cta: { label: 'Check', to: `/landlord/jobs/${job.id}` },
      }
    }
    case 'pay_invoice': {
      const job = jobOf(action.jobId)
      if (!job) return null
      return {
        key: `pay-${job.id}`,
        icon: CurrencyGbpIcon,
        tone: action.overdue ? 'critical' : 'neutral',
        title: action.overdue ? 'Invoice overdue' : 'Invoice to pay',
        subject: `${formatPounds(action.amountPence)} to ${name(ctx.people, job.tradeId, 'the trade')} · ${job.title}`,
        meta: `${action.overdue ? 'Was due' : 'Due'} ${formatDate(action.dueOn)} · pay them directly, then mark it paid`,
        cta: { label: 'View invoice', to: `/landlord/jobs/${job.id}#payment` },
      }
    }
    case 'renew_document': {
      const { item } = action
      const info = DOCUMENT_TYPE_INFO[item.type]
      const title =
        item.status === 'EXPIRED'
          ? `${info.label} expired`
          : item.status === 'TO_ARRANGE'
            ? `${info.label} to arrange`
            : `${info.label} due soon`
      const docsHref = item.propertyId
        ? `/landlord/homes/${item.propertyId}/documents`
        : '/landlord/documents'
      return {
        key: `renew-${item.type}-${item.propertyId ?? 'all'}`,
        icon: DOCUMENT_ICONS[item.type],
        tone: item.status === 'EXPIRED' ? 'critical' : 'neutral',
        title,
        subject: where(item.propertyId),
        meta:
          item.daysLeft !== null
            ? describeDaysLeft(item.daysLeft)
            : item.status === 'TO_ARRANGE'
              ? 'Nothing on file yet'
              : undefined,
        cta: { label: item.status === 'TO_ARRANGE' ? 'Arrange' : 'Renew', to: docsHref },
      }
    }
    case 'leave_rating': {
      const { task } = action
      const who = name(ctx.people, task.subjectId, 'them')
      const job = task.context.kind === 'job' ? jobOf(task.context.jobId) : undefined
      const contextId = task.context.kind === 'job' ? task.context.jobId : task.context.tenancyId
      return {
        key: `rate-${contextId}-${task.subjectId}`,
        icon: ChatTeardropTextIcon,
        tone: 'neutral',
        title: `Rate ${who}`,
        subject: job ? job.title : `Tenancy at ${where(task.propertyId)}`,
        meta: `Closes ${formatDate(task.closesAt)}${task.counterpartHasRated ? ` · ${who} has rated you. Leave yours to see what they said` : ''}`,
        cta: { label: 'Rate', to: rateHref(contextId, task.context.kind, task.subjectId) },
      }
    }
    case 'confirm_tenancy': {
      const tenancy = ctx.tenancies.get(action.tenancyId)
      if (!tenancy) return null
      const property = ctx.properties.get(tenancy.propertyId)
      return {
        key: `tenancy-${tenancy.id}`,
        icon: HouseLineIcon,
        tone: 'accent',
        title: 'Confirm a new tenancy',
        subject: property ? streetOf(property) : 'A new tenancy',
        meta: `${joinNames(tenancy.tenantIds.map((id) => name(ctx.people, id, 'Tenant')))} · starts ${formatDate(tenancy.startDate)}`,
        cta: { label: 'Review', to: `/landlord/tenancies/${tenancy.id}` },
      }
    }
    case 'answer_team_invite': {
      const member = ctx.team.find((m) => m.membership.id === action.membershipId)
      return {
        key: `invite-${action.membershipId}`,
        icon: UsersThreeIcon,
        tone: 'accent',
        title: 'An invitation to join a landlord’s team',
        subject: member ? `${member.landlord.displayName} invited you` : 'A landlord invited you',
        meta: member ? `As ${member.agency.name}` : undefined,
        cta: { label: 'Answer', to: '/landlord/team' },
      }
    }
    default:
      return null
  }
}
