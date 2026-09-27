// The landlord portal: desktop-friendly as well as phone-first. "Actions needed" leads the home
// screen, lists open into a detail drawer on wide screens, and money and compliance stay in plain
// tables (SPEC §9). Letting agents use it too, inside the landlord's account.

import { useMemo } from 'react'
import { Route, Routes } from 'react-router'
import {
  ChatsCircleIcon,
  ChatTeardropTextIcon,
  FilesIcon,
  HouseIcon,
  HouseLineIcon,
  ToolboxIcon,
  UsersThreeIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useSlateQuery, type ActionItem } from '@/data'
import { BRAND } from '@/config/brand'
import {
  HELP_TOPICS,
  NotFound,
  PortalLayout,
  type HelpTopic,
  type PortalNav,
} from '@/routes/_shell'
import { useViewer } from '@/session'
import { useTextSizeOnBody } from './lib/text-size'
import HomePage from './pages/home'
import RepairsPage from './pages/repairs'
import JobPage from './pages/job/job-page'
import HomesPage from './pages/homes'
import PropertyPage from './pages/property'
import DocumentsPage from './pages/documents'
import TenancyPage from './pages/tenancy'
import TeamPage from './pages/team'
import TradesPage from './pages/trades'
import MessagesPage from './pages/messages'
import RatingsPage from './pages/ratings'
import RatePage from './pages/rate'
import ReviewPage from './pages/review'
import PassportsPage from './pages/passports'
import ReportsPage from './pages/reports'
import ProfilePage from './pages/profile'

const JOB_ACTIONS: ReadonlySet<ActionItem['kind']> = new Set([
  'approve_job',
  'choose_trade',
  'compare_quotes',
  'instruct_trade',
  'confirm_job',
  'pay_invoice',
])

const HELP: HelpTopic[] = [
  ...HELP_TOPICS.landlord,
  {
    question: 'Reviews about you',
    answer:
      'You can post one public reply to each review, within 30 days, and mark it as disputed. The review itself never changes, and every one has a Report button.',
  },
  {
    question: 'Bigger text',
    answer: `Turn on comfortable text in your profile. It makes the words in ${BRAND.name} larger on this device.`,
  },
]

/** Badge counts for the navigation: repairs waiting on you, unread conversations, ratings owed. */
function useNavCounts() {
  const viewer = useViewer()
  const { state } = useSlateQuery(
    async (api) => {
      const [actions, threads] = await Promise.all([
        api.listActionsNeeded(viewer),
        api.listThreads(viewer),
      ])
      return {
        repairs: actions.filter((a) => JOB_ACTIONS.has(a.kind)).length,
        messages: threads.filter((t) => t.unreadCount > 0).length,
        ratings: actions.filter((a) => a.kind === 'leave_rating').length,
        documents: actions.filter((a) => a.kind === 'renew_document' && a.item.status === 'EXPIRED')
          .length,
      }
    },
    [viewer],
  )
  return state.data
}

export default function LandlordPortal() {
  useTextSizeOnBody()
  const counts = useNavCounts()
  const nav = useMemo<PortalNav>(
    () => ({
      items: [
        { to: '/landlord', label: 'Home', icon: HouseIcon, end: true },
        { to: '/landlord/repairs', label: 'Repairs', icon: WrenchIcon, count: counts?.repairs },
        { to: '/landlord/homes', label: 'Homes', icon: HouseLineIcon },
        {
          to: '/landlord/messages',
          label: 'Messages',
          icon: ChatsCircleIcon,
          count: counts?.messages,
        },
        {
          to: '/landlord/documents',
          label: 'Documents',
          icon: FilesIcon,
          count: counts?.documents,
        },
        {
          to: '/landlord/ratings',
          label: 'Reviews',
          icon: ChatTeardropTextIcon,
          count: counts?.ratings,
        },
        { to: '/landlord/trades', label: 'Trades', icon: ToolboxIcon },
        { to: '/landlord/team', label: 'Team', icon: UsersThreeIcon },
      ],
    }),
    [counts],
  )

  return (
    <PortalLayout nav={nav} help={HELP}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="jobs/:jobId" element={<JobPage />} />
        <Route path="homes" element={<HomesPage />} />
        <Route path="homes/:propertyId" element={<PropertyPage />} />
        <Route path="homes/:propertyId/documents" element={<PropertyPage section="documents" />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="tenancies/:tenancyId" element={<TenancyPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:threadId" element={<MessagesPage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="ratings/rate/:kind/:contextId/:subjectId" element={<RatePage />} />
        <Route path="reviews/:ratingId" element={<ReviewPage />} />
        <Route path="passports" element={<PassportsPage />} />
        <Route path="passports/:token" element={<PassportsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalLayout>
  )
}
