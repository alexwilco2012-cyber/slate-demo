// Repair jobs from report to the moment a trade is chosen, plus the job board. The landlord (or
// their agent) always chooses the trade: Slate never assigns, matches or dispatches.

import { SlateError, type JobBoardFilter, type SlateApi } from '@/data/api'
import { newId } from '@/domain/ids'
import { withinBand } from '@/domain/places'
import {
  ACCESS_SLOTS,
  DOCUMENT_TYPES,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  ROOMS,
  TRADE_JOB_CATEGORIES,
  URGENCIES,
  type AccessWindow,
  type Job,
  type JobAccess,
  type JobCategory,
  type Person,
  type Room,
} from '@/domain/types'
import {
  currentTenancy,
  forbidden,
  invalidState,
  jobSide,
  landlordSide,
  notFound,
  requireJob,
  requireJobAsLandlord,
  requireManagedProperty,
  requireRole,
  resolveViewer,
} from '../access'
import { defaultCredential, meetsCredential, requireCredential } from '../credentials'
import { addDays, isBefore, ukDate } from '../dates'
import { appendEvent } from '../events'
import { hrefs } from '../hrefs'
import { instructJob } from '../instruct'
import { firstName, notify, notifyJobParties } from '../notify'
import { photosFrom } from '../photos'
import { ensureJobThread, postMessage } from '../threads'
import {
  invalid,
  optionalText,
  requireDate,
  requireDateTime,
  requireImages,
  requireOneOf,
  requireText,
} from '../validate'
import { jobBoardPost, jobFor } from '../views'
import type { LocalContext } from './context'

type JobMethods =
  | 'listJobs'
  | 'getJob'
  | 'createJob'
  | 'addJobPhotos'
  | 'approveJob'
  | 'declineJob'
  | 'cancelJob'
  | 'chooseTrade'
  | 'instructTrade'
  | 'postToJobBoard'
  | 'listJobBoard'
  | 'getJobBoardPost'

const ROOM_PHRASE: Record<Room, string> = {
  kitchen: 'in the kitchen',
  bathroom: 'in the bathroom',
  bedroom: 'in the bedroom',
  living_room: 'in the living room',
  hall: 'in the hall',
  common_close: 'in the shared close',
  outside: 'outside',
  whole_home: 'around the home',
  other: '',
}

/** A job board stays open this long unless the landlord says otherwise. */
const BOARD_DAYS = 7
const BOARD_MAX_DAYS = 30

/** Job categories a board filter asks for, or null for all of them. */
function wantedCategories(filter: JobBoardFilter, trade: Person): Set<JobCategory> | null {
  const trades = filter.trades === 'mine' ? (trade.tradeProfile?.trades ?? []) : filter.trades
  const byTrade = trades?.flatMap((type): readonly JobCategory[] => TRADE_JOB_CATEGORIES[type])
  if (!byTrade && !filter.categories) return null
  const wanted = new Set<JobCategory>(byTrade ?? JOB_CATEGORIES)
  if (!filter.categories) return wanted
  return new Set(filter.categories.filter((category) => wanted.has(category)))
}

/** Statuses a job can still be called off from: before anyone has started the work. */
const CANCELLABLE: ReadonlySet<Job['status']> = new Set([
  'reported',
  'approved',
  'quoting',
  'instructed',
  'booked',
])

export function defaultTitle(category: Job['category'], room: Room): string {
  return `${JOB_CATEGORY_LABELS[category]} ${ROOM_PHRASE[room]}`.trim()
}

function checkAccess(access: JobAccess | undefined, needsWindow: boolean): JobAccess {
  const windows: AccessWindow[] = (access?.windows ?? []).map((w, index) => ({
    date: requireDate(w.date, 'access', `access time ${index + 1}`),
    slot: requireOneOf(
      w.slot,
      ACCESS_SLOTS,
      'access',
      'Choose morning, afternoon, evening or any time.',
    ),
  }))
  if (needsWindow && windows.length === 0) {
    throw invalid('access', 'Choose at least one time when someone can get in.')
  }
  if (windows.length > 14) throw invalid('access', 'Choose up to 14 access times.')
  const notes = optionalText(access?.notes, {
    field: 'access',
    label: 'the access notes',
    max: 500,
  })
  return { windows, keyAllowed: access?.keyAllowed === true, ...(notes ? { notes } : {}) }
}

export function jobsApi(ctx: LocalContext): Pick<SlateApi, JobMethods> {
  return {
    async listJobs(viewer, filter = {}) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      return db
        .rows('jobs')
        .flatMap((job) => {
          const side = jobSide(db, actor, job)
          return side ? [jobFor(db, job, side, actor.person.id)] : []
        })
        .filter((job) => !filter.status || filter.status.includes(job.status))
        .filter((job) => !filter.propertyId || job.propertyId === filter.propertyId)
        .filter((job) => !filter.tenancyId || job.tenancyId === filter.tenancyId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    async getJob(viewer, jobId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      const job = db.get('jobs', jobId)
      const side = job ? jobSide(db, actor, job) : null
      return job && side ? jobFor(db, job, side, actor.person.id) : null
    },

    async createJob(viewer, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const property = tx.get('properties', input.propertyId)
        if (!property) throw notFound('home')
        const room = requireOneOf(input.room, ROOMS, 'room', 'Choose the room.')
        const category = requireOneOf(
          input.category,
          JOB_CATEGORIES,
          'category',
          'Choose what the problem is.',
        )
        const urgency = requireOneOf(
          input.urgency,
          URGENCIES,
          'urgency',
          'Choose how urgent it is.',
        )
        const description = requireText(input.description, {
          field: 'description',
          label: 'a description of the problem',
          min: 10,
          max: 2000,
        })
        const title =
          optionalText(input.title, { field: 'title', label: 'the title', max: 80 }) ??
          defaultTitle(category, room)
        const complianceType =
          input.complianceType === undefined
            ? undefined
            : requireOneOf(
                input.complianceType,
                DOCUMENT_TYPES,
                'complianceType',
                'Choose a certificate.',
              )
        const images = requireImages(input.photos ?? [])

        const tenancy = currentTenancy(tx, property.id)
        if (actor.role === 'tenant') {
          if (!tenancy || !tenancy.tenantIds.includes(actor.person.id)) {
            throw forbidden('You can report problems only at a home you currently rent.')
          }
        } else if (actor.role === 'landlord') {
          requireManagedProperty(tx, actor, property.id, 'approve_repairs')
        } else {
          throw forbidden('Trades are instructed on jobs by the landlord; they do not raise them.')
        }
        const access = checkAccess(input.access, actor.role === 'tenant' && urgency !== 'emergency')

        const job: Job = {
          id: newId('job'),
          propertyId: property.id,
          reportedById: actor.person.id,
          reportedAs: actor.role,
          title,
          room,
          category,
          description,
          photos: photosFrom(images, actor.person.id, tx.now),
          urgency,
          access,
          // A landlord raising a job themselves has approved it by doing so.
          status: actor.role === 'landlord' ? 'approved' : 'reported',
          visits: [],
          timeline: [],
          createdAt: tx.now,
          updatedAt: tx.now,
        }
        if (tenancy) job.tenancyId = tenancy.id
        if (complianceType) job.complianceType = complianceType
        const credential = defaultCredential(category, complianceType)
        if (credential) job.credentialNeeded = credential
        tx.put('jobs', job)
        let saved = appendEvent(tx, job, { kind: 'reported' }, actor.person.id)
        if (actor.role === 'landlord') {
          saved = appendEvent(tx, saved, { kind: 'approved' }, actor.person.id)
        }
        ensureJobThread(tx, saved)

        if (actor.role === 'tenant') {
          notify(tx, {
            to: landlordSide(tx, property),
            role: 'landlord',
            kind: 'job_reported',
            title: `${firstName(tx, actor.person.id)} reported a problem: ${title}`,
            ...(urgency === 'emergency' ? { body: 'Marked as an emergency.' } : {}),
            href: hrefs.job('landlord', saved.id),
            ref: { entity: 'job', id: saved.id },
          })
        }
        return saved
      })
    },

    async addJobPhotos(viewer, jobId, photos) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJob(tx, actor, jobId)
        if (job.status === 'cancelled' || job.status === 'declined') {
          throw invalidState('This job is closed, so photos can no longer be added.')
        }
        const images = requireImages(photos)
        if (images.length === 0) throw invalid('photos', 'Add at least one photo.')
        if (job.photos.length + images.length > 20) {
          throw invalid('photos', 'A job can hold up to 20 photos.')
        }
        const next = {
          ...job,
          photos: [...job.photos, ...photosFrom(images, actor.person.id, tx.now)],
        }
        return appendEvent(
          tx,
          next,
          { kind: 'photos_added', count: images.length },
          actor.person.id,
        )
      })
    },

    async approveJob(viewer, jobId, input = {}) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'approve_repairs')
        if (job.status !== 'reported') {
          throw invalidState('Only a newly reported job can be approved.')
        }
        const note = optionalText(input.note, { field: 'note', label: 'your note', max: 500 })
        const credential =
          input.credentialNeeded ??
          job.credentialNeeded ??
          defaultCredential(job.category, job.complianceType)
        const next: Job = { ...job, status: 'approved' }
        if (credential) next.credentialNeeded = credential
        const saved = appendEvent(
          tx,
          next,
          note ? { kind: 'approved', note } : { kind: 'approved' },
          actor.person.id,
        )
        notifyJobParties(
          tx,
          saved,
          actor.person.id,
          {
            kind: 'job_approved',
            title: `${firstName(tx, actor.person.id)} approved your repair: ${job.title}`,
            ...(note ? { body: note } : {}),
          },
          ['tenant'],
        )
        return saved
      })
    },

    async declineJob(viewer, jobId, rawReason) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'approve_repairs')
        if (job.status !== 'reported' && job.status !== 'approved') {
          throw invalidState('A job can only be declined before a trade is chosen.')
        }
        const reason = requireText(rawReason, {
          field: 'reason',
          label: 'a reason for the tenant',
          min: 5,
          max: 500,
        })
        const saved = appendEvent(
          tx,
          { ...job, status: 'declined' },
          { kind: 'declined', reason },
          actor.person.id,
        )
        notifyJobParties(
          tx,
          saved,
          actor.person.id,
          {
            kind: 'job_declined',
            title: `${firstName(tx, actor.person.id)} declined: ${job.title}`,
            body: reason,
          },
          ['tenant'],
        )
        return saved
      })
    },

    async cancelJob(viewer, jobId, rawReason) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job, side } = requireJob(tx, actor, jobId)
        if (side === 'trade') throw forbidden('Only the tenant or the landlord can cancel a job.')
        if (side === 'tenant' && job.reportedById !== actor.person.id) {
          throw forbidden('Only the person who reported this can cancel it.')
        }
        if (side === 'landlord') requireJobAsLandlord(tx, actor, jobId, 'approve_repairs')
        if (job.status === 'cancelled') {
          throw new SlateError('already_done', 'This job is already cancelled.')
        }
        if (!CANCELLABLE.has(job.status)) {
          throw invalidState('Work has already started, so this job can no longer be cancelled.')
        }
        const reason = requireText(rawReason, {
          field: 'reason',
          label: 'a reason',
          min: 3,
          max: 500,
        })
        let next: Job = {
          ...job,
          status: 'cancelled',
          visits: job.visits.map((v) =>
            v.status === 'booked' ? { ...v, status: 'cancelled' } : v,
          ),
        }
        for (const visit of job.visits.filter((v) => v.status === 'booked')) {
          next = appendEvent(
            tx,
            next,
            { kind: 'visit_cancelled', visitId: visit.id, reason },
            actor.person.id,
          )
        }
        if (next.board && (!next.board.closesAt || isBefore(tx.now, next.board.closesAt))) {
          next = { ...next, board: { ...next.board, closesAt: tx.now } }
        }
        const who = firstName(tx, actor.person.id)
        // Trades who quoted from the board aren't on the job, so they hear about it here.
        for (const quote of tx.rows('quotes')) {
          if (quote.jobId !== job.id || quote.status !== 'submitted') continue
          tx.put('quotes', { ...quote, status: 'declined', decidedAt: tx.now })
          if (quote.tradeId === job.tradeId) continue
          notify(tx, {
            to: [quote.tradeId],
            role: 'trade',
            kind: 'job_cancelled',
            title: `Cancelled, so no longer needed: ${job.title}`,
            body: 'Thanks for quoting. The job was called off before anyone was chosen.',
            href: hrefs.jobBoard(),
            ref: { entity: 'quote', id: quote.id },
          })
        }
        const saved = appendEvent(tx, next, { kind: 'cancelled', reason }, actor.person.id)
        postMessage(
          tx,
          ensureJobThread(tx, saved),
          null,
          'system',
          `${who} cancelled this job: ${reason}`,
        )
        notifyJobParties(tx, saved, actor.person.id, {
          kind: 'job_cancelled',
          title: `${who} cancelled: ${job.title}`,
          body: reason,
        })
        return saved
      })
    },

    async chooseTrade(viewer, jobId, input) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'instruct_trades')
        if (job.tradeId) throw invalidState('A trade is already instructed on this job.')
        if (job.status !== 'approved' && job.status !== 'quoting') {
          throw invalidState('Approve the job before choosing a trade.')
        }
        const route = requireOneOf(
          input.route,
          ['saved_trades', 'directory'],
          'route',
          'Choose where the trade came from.',
        )
        const trade = tx.get('people', input.tradeId)
        if (!trade || !trade.roles.includes('trade') || !trade.tradeProfile) throw notFound('trade')
        const landlord = tx.get('people', actor.actingAs)
        if (route === 'saved_trades' && !landlord?.savedTradeIds.includes(trade.id)) {
          throw invalid('tradeId', "That trade isn't in your saved trades.")
        }
        requireCredential(trade, job.credentialNeeded, ukDate(tx.now))
        // Choosing directly ends any open request for quotes; the other trades hear so.
        for (const quote of tx.rows('quotes')) {
          if (
            quote.jobId === job.id &&
            quote.status === 'submitted' &&
            quote.tradeId !== trade.id
          ) {
            tx.put('quotes', { ...quote, status: 'declined', decidedAt: tx.now })
            notify(tx, {
              to: [quote.tradeId],
              role: 'trade',
              kind: 'quote_declined',
              title: `Not chosen this time: ${job.title}`,
              href: hrefs.jobBoard(),
              ref: { entity: 'quote', id: quote.id },
            })
          }
        }
        const next: Job = { ...job, tradeId: trade.id, status: 'quoting' }
        if (job.board && (!job.board.closesAt || isBefore(tx.now, job.board.closesAt))) {
          next.board = { ...job.board, closesAt: tx.now }
        }
        const saved = appendEvent(
          tx,
          next,
          { kind: 'trade_chosen', tradeId: trade.id, route },
          actor.person.id,
        )
        ensureJobThread(tx, saved)
        notify(tx, {
          to: [trade.id],
          role: 'trade',
          kind: 'trade_instructed',
          title: `${landlord?.displayName ?? 'A landlord'} chose you for a job: ${job.title}`,
          body: 'Send a quote when you can. The tenant has given access times on the job.',
          href: hrefs.job('trade', job.id),
          ref: { entity: 'job', id: job.id },
        })
        return saved
      })
    },

    async instructTrade(viewer, jobId, input = {}) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'instruct_trades')
        if (job.status === 'instructed') {
          throw new SlateError('already_done', 'This trade is already instructed.')
        }
        const trade = tx.get('people', job.tradeId)
        if (job.status !== 'quoting' || !trade) {
          throw invalidState('Choose a trade and accept their quote before instructing them.')
        }
        if (!job.acceptedQuoteId && job.urgency !== 'emergency') {
          throw invalidState(
            'Accept a quote first, then instruct the trade. Only emergencies can go ahead without one.',
          )
        }
        requireCredential(trade, job.credentialNeeded, ukDate(tx.now))
        const note = optionalText(input.note, { field: 'note', label: 'your note', max: 500 })
        return instructJob(tx, job, trade, actor.person.id, actor.actingAs, note)
      })
    },

    async postToJobBoard(viewer, jobId, rawClosesAt) {
      return ctx.write((tx) => {
        const actor = resolveViewer(tx, viewer)
        const { job } = requireJobAsLandlord(tx, actor, jobId, 'instruct_trades')
        if (job.status !== 'approved' || job.tradeId) {
          throw invalidState('Only an approved job without a trade can go on the job board.')
        }
        const closesAt =
          rawClosesAt === undefined
            ? addDays(tx.now, BOARD_DAYS)
            : requireDateTime(rawClosesAt, 'closesAt', 'when quotes close')
        if (!isBefore(tx.now, closesAt) || isBefore(addDays(tx.now, BOARD_MAX_DAYS), closesAt)) {
          throw invalid('closesAt', `Choose a closing time within the next ${BOARD_MAX_DAYS} days.`)
        }
        return appendEvent(
          tx,
          { ...job, status: 'quoting', board: { postedAt: tx.now, closesAt } },
          { kind: 'posted_to_board' },
          actor.person.id,
        )
      })
    },

    async listJobBoard(viewer, filter = {}) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'trade')
      const today = ukDate(db.now)
      const categories = wantedCategories(filter, actor.person)
      return db
        .rows('jobs')
        .filter((job) => job.board && job.status === 'quoting' && !job.tradeId)
        .filter((job) => !job.board?.closesAt || isBefore(db.now, job.board.closesAt))
        .filter((job) => meetsCredential(actor.person, job.credentialNeeded, today))
        .filter((job) => !categories || categories.has(job.category))
        .flatMap((job) => {
          const post = jobBoardPost(db, job, actor.person)
          return post ? [post] : []
        })
        .filter((post) => !filter.districts || filter.districts.includes(post.postcodeDistrict))
        .filter((post) => !filter.distance || withinBand(post.milesAway, filter.distance))
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    },

    async getJobBoardPost(viewer, jobId) {
      const db = ctx.read()
      const actor = resolveViewer(db, viewer)
      requireRole(actor, 'trade')
      const job = db.get('jobs', jobId)
      if (!job?.board) return null
      const quoted = db
        .rows('quotes')
        .some((q) => q.jobId === job.id && q.tradeId === actor.person.id)
      const open = job.status === 'quoting' && !job.tradeId
      return open || quoted ? jobBoardPost(db, job, actor.person) : null
    },
  }
}
