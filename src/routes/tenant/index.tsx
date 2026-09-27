// The tenant portal: phone-first, calm, with "Report a problem" as the one big action.
// Contract with the shell: src/routes/README.md.

import { Route, Routes } from 'react-router'
import {
  ChatsCircleIcon,
  HouseIcon,
  HouseLineIcon,
  IdentificationCardIcon,
  PlusIcon,
  StarIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useSlateQuery } from '@/data'
import {
  HELP_TOPICS,
  NotFound,
  PortalLayout,
  type HelpTopic,
  type PortalNav,
} from '@/routes/_shell'
import { useViewer } from '@/session'
import { GAS_EMERGENCY } from './lib/emergency'
import { TenantHomePage } from './pages/home'
import { JobPage } from './pages/job'
import { MessagesPage } from './pages/messages'
import { PassportPage } from './pages/passport'
import { ProfilePage } from './pages/profile'
import { RatingsPage } from './pages/ratings'
import { ReportsPage } from './pages/reports'
import { ReviewPage } from './pages/review'
import { TenancyPage } from './pages/tenancy'
import { RatePage } from './pages/rate'
import { RepairsPage } from './pages/repairs'
import { ThreadPage } from './pages/thread'
import { ReportPage } from './pages/report/report'
import { ReportSentPage } from './pages/report/sent'

/** Help answers for tenants: the shell's standard ones, plus what to do in an emergency. */
const HELP: HelpTopic[] = [
  {
    question: 'In an emergency',
    answer: `If you smell gas, leave the home, don’t use switches or flames, and call the ${GAS_EMERGENCY.name} on ${GAS_EMERGENCY.display}. If anyone is in danger, call 999. Then report it here as an emergency.`,
  },
  ...HELP_TOPICS.tenant,
]

function useNav(): PortalNav {
  const viewer = useViewer()
  const { state } = useSlateQuery(
    async (api) => {
      const [threads, tasks] = await Promise.all([
        api.listThreads(viewer),
        api.listRatingTasks(viewer),
      ])
      return {
        unread: threads.filter((summary) => summary.unreadCount > 0).length,
        ratings: tasks.filter((task) => task.status !== 'submitted').length,
      }
    },
    [viewer],
  )
  const counts = state.data ?? { unread: 0, ratings: 0 }
  return {
    items: [
      { to: '/tenant', label: 'Home', icon: HouseIcon, end: true },
      { to: '/tenant/repairs', label: 'Repairs', icon: WrenchIcon },
      { to: '/tenant/messages', label: 'Messages', icon: ChatsCircleIcon, count: counts.unread },
      { to: '/tenant/tenancies', label: 'Your home', icon: HouseLineIcon },
      { to: '/tenant/ratings', label: 'Ratings', icon: StarIcon, count: counts.ratings },
      { to: '/tenant/passport', label: 'Passport', icon: IdentificationCardIcon },
    ],
    primaryAction: { to: '/tenant/report', label: 'Report a problem', icon: PlusIcon },
  }
}

export default function TenantPortal() {
  const nav = useNav()
  return (
    <PortalLayout nav={nav} help={HELP}>
      <Routes>
        <Route index element={<TenantHomePage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="report/sent/:jobId" element={<ReportSentPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="jobs/:jobId" element={<JobPage />} />
        <Route path="jobs/:jobId/rate/:who" element={<RatePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:threadId" element={<ThreadPage />} />
        <Route path="tenancies" element={<TenancyPage />} />
        <Route path="tenancies/:tenancyId" element={<TenancyPage />} />
        <Route path="tenancies/:tenancyId/rate" element={<RatePage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="reviews/:ratingId" element={<ReviewPage />} />
        <Route path="passport" element={<PassportPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalLayout>
  )
}
