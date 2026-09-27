// Every notification links somewhere, and every link has a read that serves it to the person the
// notification was for. Checked for the seed's notifications and for those a full demo run makes.

import type { SlateApi, Viewer } from '@/data/api'
import type { NotificationRecord } from '@/domain/types'
import { freshSlate } from './helpers'

type Opened = 'ok' | `missing: ${string}`

/** Opens a notification's link the way a screen would, and says whether it found its page. */
async function open(api: SlateApi, viewer: Viewer, note: NotificationRecord): Promise<Opened> {
  const parts = note.href.split('/').filter(Boolean)
  const [role, page, id, sub] = parts
  if (role !== viewer.role) return `missing: link for the ${role} portal sent to ${viewer.role}`
  const found = (value: unknown, what: string): Opened =>
    value === null || value === undefined ? `missing: ${what} ${note.href}` : 'ok'

  if (page === undefined) return found(await api.listActionsNeeded(viewer), 'home')
  switch (page) {
    case 'jobs':
      return found(await api.getJob(viewer, id as `job_${string}`), 'job')
    case 'messages':
      return found(await api.getThread(viewer, id as `thread_${string}`), 'thread')
    case 'tenancies':
      return found(await api.getTenancy(viewer, id as `tenancy_${string}`), 'tenancy')
    case 'ratings':
      return found(await api.listRatingTasks(viewer), 'ratings')
    case 'reviews':
      return found(await api.getReview(viewer, id as `rating_${string}`), 'review')
    case 'reports': {
      const mine = await api.listMyReports(viewer)
      const aboutMe = await api.listReportsAboutMe(viewer)
      const reportId = note.ref?.entity === 'report' ? note.ref.id : undefined
      if (!reportId) return 'ok'
      const listed = [...mine.map((r) => r.id), ...aboutMe.map((r) => r.id)].includes(reportId)
      return listed ? 'ok' : `missing: report ${reportId}`
    }
    case 'profile':
      return found(await api.getMe(viewer), 'profile')
    case 'board':
      return found(await api.listJobBoard(viewer), 'board')
    case 'documents':
      return found(await api.getComplianceCalendar(viewer), 'documents')
    case 'homes': {
      const propertyId = id as `property_${string}`
      if (sub !== 'documents') return `missing: page ${note.href}`
      const docs = await api.listDocuments(viewer, { propertyId })
      if (docs.length === 0) return `missing: documents for ${propertyId}`
      return found(await api.getProperty(viewer, propertyId), 'home')
    }
    case 'team':
      return found(await api.listTeam(viewer), 'team')
    case 'passport':
      return found(await api.getMyPassport(viewer), 'passport')
    default:
      return `missing: no read for ${note.href}`
  }
}

/** The viewer a notification is for: agents read landlord pages inside the landlord's account. */
async function viewerFor(api: SlateApi, note: NotificationRecord): Promise<Viewer> {
  const viewer: Viewer = { personId: note.recipientId, role: note.role }
  if (note.role !== 'landlord') return viewer
  const team = await api.listTeam(viewer)
  const actingFor = team.find(
    (m) => m.membership.agentId === note.recipientId && m.membership.status === 'active',
  )
  return actingFor ? { ...viewer, actingForId: actingFor.membership.landlordId } : viewer
}

async function allNotifications(slate: ReturnType<typeof freshSlate>) {
  return Object.values(slate.store.getState().data.tables.notifications).filter(
    (n): n is NotificationRecord => n !== undefined,
  )
}

async function expectAllOpen(slate: ReturnType<typeof freshSlate>) {
  const problems: string[] = []
  for (const note of await allNotifications(slate)) {
    const viewer = await viewerFor(slate.api, note)
    const result = await open(slate.api, viewer, note)
    if (result !== 'ok') problems.push(`${note.id}: ${result}`)
  }
  expect(problems).toEqual([])
}

test('every seed notification opens a page its recipient can see', async () => {
  await expectAllOpen(freshSlate())
})

test('so does every notification a full demo run sends', async () => {
  const slate = freshSlate()
  const { api, demo } = slate
  const graham: Viewer = { personId: 'person_graham', role: 'landlord' }
  const kev: Viewer = { personId: 'person_kev', role: 'trade' }
  const sarah: Viewer = { personId: 'person_sarah', role: 'tenant' }
  const derek: Viewer = { personId: 'person_derek', role: 'landlord' }

  await api.approveJob(graham, 'job_ceiling_esslemont')
  await api.acceptQuote(graham, 'quote_basin_kev', { instruct: true })
  await api.withdrawQuote({ personId: 'person_ian', role: 'trade' }, 'quote_gutter_ian')
  await api.cancelJob(graham, 'job_sink_queens', 'The tenants cleared it themselves.')
  await api.submitRating(sarah, {
    direction: 'tenant->landlord',
    context: { kind: 'job', jobId: 'job_radiator_esslemont' },
    subjectId: 'person_graham',
    answers: { fixed_quickly: 4, kept_informed: 4 },
  })
  await api.submitReport(derek, {
    target: { kind: 'rating', ratingId: 'rating_victoria_sarah_derek' },
    route: 'defamation',
    details: 'The damp was treated twice and the tenant was told both times.',
  })
  await api.recordPayment(derek, 'job_waste_victoria')
  await demo.advanceClock(8)
  await api.markComplete(kev, 'job_toilet_walker', { photos: [], invoiceDueInDays: 0 })
  await demo.advanceToShieldRelease()
  await expectAllOpen(slate)
})
