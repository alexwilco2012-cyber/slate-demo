// The report button on every review, reply, update, message and profile. Each route starts its
// own clock (SPEC §6). A report never edits content; moderation removes or restricts it.

import { SlateError, type ReportAboutMe, type SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import {
  REPORT_ROUTES,
  type ContentReport,
  type PersonId,
  type ReportRoute,
  type ReportTarget,
  type Role,
} from '@/domain/types'
import { forbidden, invalidState, notFound, resolveViewer, type Actor } from '../access'
import { hrefs } from '../hrefs'
import { notify } from '../notify'
import { raterRole, reportClock, subjectRole } from '@/domain/rating'
import type { Reader } from '../tx'
import { invalid, requireOneOf, requireText } from '../validate'
import type { LocalContext } from './context'

type ReportMethods = 'submitReport' | 'listMyReports' | 'listReportsAboutMe' | 'respondToReport'

/** Who posted the reported words, and in which portal. Null for a report about a profile. */
function posterOf(db: Reader, target: ReportTarget): { personId: PersonId; role: Role } | null {
  switch (target.kind) {
    case 'rating': {
      const rating = db.get('ratings', target.ratingId)
      return rating ? { personId: rating.raterId, role: raterRole(rating.direction) } : null
    }
    case 'reply': {
      const reply = db.get('replies', target.replyId)
      const rating = db.get('ratings', reply?.ratingId)
      return reply && rating
        ? { personId: reply.authorId, role: subjectRole(rating.direction) }
        : null
    }
    case 'update': {
      const update = db.get('updates', target.updateId)
      const rating = db.get('ratings', update?.ratingId)
      return update && rating
        ? { personId: update.authorId, role: raterRole(rating.direction) }
        : null
    }
    case 'message': {
      const author = db.get('messages', target.messageId)?.author
      return author ? { personId: author.personId, role: author.role } : null
    }
    case 'person':
      return null
  }
}

/** Reviews, replies and updates are posted in a landlord's name by their agents too. */
function postedBy(db: Reader, actor: Actor, report: ContentReport): boolean {
  const poster = posterOf(db, report.target)
  if (!poster || poster.role !== actor.role) return false
  return poster.personId === (report.target.kind === 'message' ? actor.person.id : actor.actingAs)
}

function aboutMe(report: ContentReport): ReportAboutMe {
  const view: ReportAboutMe = {
    id: report.id,
    target: report.target,
    route: report.route,
    submittedAt: report.submittedAt,
    status: report.status,
    clocks: report.clocks,
    canRespond: report.status !== 'resolved' && !report.posterResponse,
  }
  if (report.route === 'defamation') view.details = report.details
  if (report.posterResponse) view.posterResponse = report.posterResponse
  if (report.outcome) view.outcome = report.outcome
  return view
}

function targetExists(db: Reader, target: ReportTarget): boolean {
  switch (target.kind) {
    case 'rating':
      return db.get('ratings', target.ratingId) !== undefined
    case 'reply':
      return db.get('replies', target.replyId) !== undefined
    case 'update':
      return db.get('updates', target.updateId) !== undefined
    case 'message':
      return db.get('messages', target.messageId) !== undefined
    case 'person':
      return db.get('people', target.personId) !== undefined
  }
}

function sameTarget(a: ReportTarget, b: ReportTarget): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

const RECEIVED_BODY: Record<ReportRoute, string> = {
  defamation: 'The person who posted it will be told within 48 working hours, and can respond.',
  illegal: 'We aim to review it within 24 hours.',
  fake: 'The review shows a "pending" label while we check it, usually within 5 working days.',
  data_protection: 'We will acknowledge your request within 30 days.',
}

export function reportsApi(ctx: LocalContext): Pick<SlateApi, ReportMethods> {
  return {
    async submitReport(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const route = requireOneOf(
          input.route,
          REPORT_ROUTES,
          'route',
          'Choose why you are reporting this.',
        )
        if (!input.target || !targetExists(tx, input.target)) throw notFound('item to report')
        const details = requireText(input.details, {
          field: 'details',
          label: 'what is wrong',
          min: 10,
          max: 2000,
        })
        const open = tx
          .rows('reports')
          .find(
            (r) =>
              r.reporterId === actor.person.id &&
              r.status !== 'resolved' &&
              sameTarget(r.target, input.target),
          )
        if (open) {
          throw new SlateError(
            'already_done',
            'You have already reported this. We will be in touch about it.',
          )
        }
        if (input.target.kind === 'person' && input.target.personId === actor.person.id) {
          throw invalid('target', "You can't report yourself.")
        }
        const report: ContentReport = {
          id: newId('report'),
          reporterId: actor.person.id,
          target: input.target,
          route,
          details,
          submittedAt: tx.now,
          status: 'received',
          clocks: [reportClock(route, tx.now)],
        }
        // Defamation: the poster is told about the complaint so they can answer it (the regulations
        // allow 48 working hours; the demo tells them straight away).
        const poster = route === 'defamation' ? posterOf(tx, input.target) : null
        if (poster) {
          report.clocks = report.clocks.map((clock) =>
            clock.step === 'notify_poster' ? { ...clock, metAt: tx.now } : clock,
          )
          notify(tx, {
            to: [poster.personId],
            role: poster.role,
            kind: 'report_update',
            title: 'Something you wrote has been reported',
            body: "Someone says it's untrue and damages their reputation. You can respond before we decide what to do.",
            href: hrefs.reports(poster.role),
            ref: { entity: 'report', id: report.id },
          })
        }
        tx.put('reports', report)
        notify(tx, {
          to: [actor.person.id],
          role: actor.role,
          kind: 'report_update',
          title: "We've received your report",
          body: RECEIVED_BODY[route],
          href: hrefs.reports(actor.role),
          ref: { entity: 'report', id: report.id },
        })
        return report
      })
    },

    async listMyReports(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('reports')
        .filter((r) => r.reporterId === actor.person.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    },

    async listReportsAboutMe(viewer) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('reports')
        .filter((report) => postedBy(db, actor, report))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(aboutMe)
    },

    async respondToReport(viewer, reportId, rawBody) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const report = tx.get('reports', reportId)
        if (!report) throw notFound('report')
        if (!postedBy(tx, actor, report)) {
          throw forbidden('Only the person who posted it can respond to this report.')
        }
        if (report.posterResponse) {
          throw new SlateError('already_done', "You've already responded to this report.")
        }
        if (report.status === 'resolved') {
          throw invalidState('This report has been decided, so it can no longer take a response.')
        }
        const body = requireText(rawBody, {
          field: 'body',
          label: 'your response',
          min: 10,
          max: 1000,
        })
        const saved = tx.put('reports', {
          ...report,
          status: report.status === 'received' ? 'in_review' : report.status,
          posterResponse: { body, at: tx.now },
        })
        // Tell them in the portal they reported from, which their receipt went to.
        const receipt = tx
          .rows('notifications')
          .find((n) => n.recipientId === report.reporterId && n.ref?.id === report.id)
        const role = receipt?.role ?? tx.get('people', report.reporterId)?.roles[0] ?? 'tenant'
        notify(tx, {
          to: [report.reporterId],
          role,
          kind: 'report_update',
          title: 'The person who posted it has responded',
          body: "We'll look at both sides and tell you what we decide.",
          href: hrefs.reports(role),
          ref: { entity: 'report', id: report.id },
        })
        return aboutMe(saved)
      })
    },
  }
}
