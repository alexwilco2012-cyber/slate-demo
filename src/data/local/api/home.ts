// Home screens: "Actions needed", most pressing first, "while you were away" and notifications.

import type { ActionItem, RatingTask, SlateApi } from '@/data/api'
import type { Job, Urgency } from '@/domain/types'
import { hasPermission, jobSide, managesProperty, resolveViewer, type Actor } from '../access'
import { awayFeed } from '../away'
import { complianceCalendar, isRequired } from '../compliance'
import { daysBetweenDates, ukDate } from '../dates'
import { allOwed } from '../settle'
import { ratingTasksFor, raterRole } from '@/domain/rating'
import type { Reader } from '../tx'
import type { LocalContext } from './context'

type HomeMethods =
  | 'listActionsNeeded'
  | 'listNotifications'
  | 'markNotificationsRead'
  | 'getAwayFeed'
  | 'markAwaySeen'

const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, urgent: 1, routine: 2 }

/** A trade is reminded to invoice work finished within this many days. */
const INVOICE_REMINDER_DAYS = 30

function byUrgency(a: Job, b: Job): number {
  return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.createdAt.localeCompare(b.createdAt)
}

function ratingActions(db: Reader, actor: Actor): ActionItem[] {
  return ratingTasksFor(actor.actingAs, allOwed(db), db.rows('ratings'), db.now)
    .filter((task) => task.status !== 'submitted' && raterRole(task.direction) === actor.role)
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt))
    .map((task): ActionItem => ({ kind: 'leave_rating', task: { ...task } as RatingTask }))
}

function landlordActions(db: Reader, actor: Actor): ActionItem[] {
  const properties = db.rows('properties').filter((p) => managesProperty(actor, p))
  const can = (propertyId: string, permission: Parameters<typeof managesProperty>[2]) => {
    const property = properties.find((p) => p.id === propertyId)
    return property !== undefined && managesProperty(actor, property, permission)
  }
  const jobs = db
    .rows('jobs')
    .filter((job) => properties.some((p) => p.id === job.propertyId))
    .sort(byUrgency)

  const toApprove = jobs.filter(
    (j) => j.status === 'reported' && can(j.propertyId, 'approve_repairs'),
  )
  const emergencies = toApprove.filter((j) => j.urgency === 'emergency')
  const otherApprovals = toApprove.filter((j) => j.urgency !== 'emergency')
  const toConfirm = jobs.filter(
    (j) => j.status === 'completed' && can(j.propertyId, 'approve_repairs'),
  )
  const toCompare = jobs.flatMap((job) => {
    if (job.status !== 'quoting' || job.acceptedQuoteId || !can(job.propertyId, 'accept_quotes')) {
      return []
    }
    const quoteCount = db
      .rows('quotes')
      .filter((q) => q.jobId === job.id && q.status === 'submitted').length
    return quoteCount > 0 ? [{ job, quoteCount }] : []
  })
  const toChoose = jobs.filter(
    (j) =>
      j.status === 'approved' && !j.tradeId && !j.board && can(j.propertyId, 'instruct_trades'),
  )
  const toInstruct = jobs.filter(
    (j) => j.status === 'quoting' && j.acceptedQuoteId && can(j.propertyId, 'instruct_trades'),
  )
  const today = ukDate(db.now)
  const toPay = jobs.flatMap((job): ActionItem[] => {
    const payment = job.payment
    if (!payment || payment.paidAt || !can(job.propertyId, 'accept_quotes')) return []
    return [
      {
        kind: 'pay_invoice',
        jobId: job.id,
        amountPence: payment.amountPence,
        dueOn: payment.dueOn,
        overdue: payment.dueOn < today,
      },
    ]
  })
  const overdue = toPay.filter((item) => item.kind === 'pay_invoice' && item.overdue)
  const invites = db
    .rows('memberships')
    .filter((m) => m.agentId === actor.person.id && m.status === 'invited')

  // An agent only sees certificates they're allowed to manage.
  const calendar = complianceCalendar(db, actor.actingAs, properties, true).filter((item) =>
    item.propertyId === null
      ? hasPermission(actor, 'manage_documents')
      : can(item.propertyId, 'manage_documents'),
  )
  const renew = (status: string) =>
    calendar
      .filter((item) => item.status === status && isRequired(item))
      .map((item): ActionItem => ({ kind: 'renew_document', item }))

  const tenancies = db
    .rows('tenancies')
    .filter(
      (t) =>
        t.status === 'proposed' &&
        can(t.propertyId, 'manage_tenancies') &&
        !t.confirmations.some((c) => c.side === 'landlord'),
    )

  return [
    ...invites.map((m): ActionItem => ({ kind: 'answer_team_invite', membershipId: m.id })),
    ...emergencies.map((job): ActionItem => ({ kind: 'approve_job', jobId: job.id })),
    ...renew('EXPIRED'),
    ...otherApprovals.map((job): ActionItem => ({ kind: 'approve_job', jobId: job.id })),
    ...overdue,
    ...toInstruct.map((job): ActionItem => ({ kind: 'instruct_trade', jobId: job.id })),
    ...toConfirm.map((job): ActionItem => ({ kind: 'confirm_job', jobId: job.id })),
    ...toCompare.map(({ job, quoteCount }): ActionItem => ({
      kind: 'compare_quotes',
      jobId: job.id,
      quoteCount,
    })),
    ...toChoose.map((job): ActionItem => ({ kind: 'choose_trade', jobId: job.id })),
    ...toPay.filter((item) => !overdue.includes(item)),
    ...ratingActions(db, actor),
    ...tenancies.map((t): ActionItem => ({ kind: 'confirm_tenancy', tenancyId: t.id })),
    ...renew('TO_ARRANGE'),
    ...renew('DUE_SOON'),
  ]
}

function tradeActions(db: Reader, actor: Actor): ActionItem[] {
  const me = actor.person.id
  const jobs = db
    .rows('jobs')
    .filter((job) => job.tradeId === me)
    .sort(byUrgency)
  const toBook = jobs.filter(
    (job) =>
      job.status === 'instructed' &&
      !job.visits.some((v) => v.status === 'booked' || v.status === 'on_site'),
  )
  const toQuote = jobs.filter(
    (job) =>
      job.status === 'quoting' &&
      !job.acceptedQuoteId &&
      !db
        .rows('quotes')
        .some((q) => q.jobId === job.id && q.tradeId === me && q.status === 'submitted'),
  )
  const today = ukDate(db.now)
  // Only recent work: an invoice nobody sent for a job long ago isn't worth a reminder.
  const toInvoice = jobs.filter(
    (job) =>
      (job.status === 'completed' || job.status === 'confirmed') &&
      !job.payment &&
      job.completion !== undefined &&
      daysBetweenDates(ukDate(job.completion.completedAt), today) <= INVOICE_REMINDER_DAYS,
  )
  const unpaid = jobs.flatMap((job): ActionItem[] => {
    const payment = job.payment
    if (!payment || payment.paidAt || payment.dueOn >= today) return []
    return [
      {
        kind: 'payment_overdue',
        jobId: job.id,
        amountPence: payment.amountPence,
        daysOverdue: daysBetweenDates(payment.dueOn, today),
      },
    ]
  })
  return [
    ...toBook.map((job): ActionItem => ({ kind: 'book_visit', jobId: job.id })),
    ...toQuote.map((job): ActionItem => ({ kind: 'send_quote', jobId: job.id })),
    ...unpaid,
    ...toInvoice.map((job): ActionItem => ({ kind: 'send_invoice', jobId: job.id })),
    ...ratingActions(db, actor),
  ]
}

function tenantActions(db: Reader, actor: Actor): ActionItem[] {
  const me = actor.person.id
  const tenancies = db
    .rows('tenancies')
    .filter(
      (t) =>
        t.status === 'proposed' &&
        t.tenantIds.includes(me) &&
        !t.confirmations.some((c) => c.side === 'tenant' && c.personId === me),
    )
  const visits = db
    .rows('jobs')
    .filter((job) => jobSide(db, actor, job) === 'tenant')
    .flatMap((job) =>
      job.visits
        .filter((v) => v.status === 'done' && !v.tenantConfirmedAt && v.tradeId === job.tradeId)
        .map((v): ActionItem => ({ kind: 'confirm_visit', jobId: job.id, visitId: v.id })),
    )
  return [
    ...tenancies.map((t): ActionItem => ({ kind: 'confirm_tenancy', tenancyId: t.id })),
    ...visits,
    ...ratingActions(db, actor),
  ]
}

export function homeApi(ctx: LocalContext): Pick<SlateApi, HomeMethods> {
  return {
    async listActionsNeeded(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      switch (actor.role) {
        case 'landlord':
          return landlordActions(db, actor)
        case 'trade':
          return tradeActions(db, actor)
        case 'tenant':
          return tenantActions(db, actor)
      }
    },

    async listNotifications(viewer, unreadOnly = false) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('notifications')
        .filter((n) => n.recipientId === actor.person.id && n.role === actor.role)
        .filter((n) => !unreadOnly || !n.readAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async getAwayFeed(viewer, since) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return awayFeed(db, actor.person.id, actor.role, since)
    },

    async markAwaySeen(viewer) {
      ctx.write((tx) => {
        const { person, role } = resolveViewer(tx, viewer)
        tx.put('people', { ...person, lastSeen: { ...person.lastSeen, [role]: tx.now } })
      })
    },

    async markNotificationsRead(viewer, ids) {
      ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const wanted = ids === 'all' ? null : new Set<string>(ids)
        for (const n of tx.rows('notifications')) {
          if (n.recipientId !== actor.person.id || n.role !== actor.role || n.readAt) continue
          if (wanted && !wanted.has(n.id)) continue
          tx.put('notifications', { ...n, readAt: tx.now })
        }
      })
    },
  }
}
