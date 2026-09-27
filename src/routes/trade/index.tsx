// The trade portal (Hi-Vis rules, SPEC §9): today's jobs, the job board, one screen per job with
// its chat, quotes and invoices, and the trade's reputation. Contract: src/routes/README.md.

import { lazy, Suspense, useLayoutEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import {
  ChatsCircleIcon,
  ClipboardTextIcon,
  ReceiptIcon,
  UserCircleIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { useSlateQuery } from '@/data'
import {
  HELP_TOPICS,
  NotFound,
  PortalLayout,
  useThemePreference,
  type HelpTopic,
  type PortalNav,
} from '@/routes/_shell'
import { useViewer } from '@/session'
import { PageSkeleton } from './components/page-bits'
import { TodayPage } from './today/today-page'
import './trade.css'

const BoardPage = lazy(() => import('./board/board-page'))
const BoardPostPage = lazy(() => import('./board/board-post-page'))
const JobPage = lazy(() => import('./jobs/job-page'))
const QuotePage = lazy(() => import('./jobs/quote-page'))
const RatePage = lazy(() => import('./ratings/rate-page'))
const RatingsPage = lazy(() => import('./ratings/ratings-page'))
const MessagesPage = lazy(() => import('./messages/messages-page'))
const ThreadPage = lazy(() => import('./messages/thread-page'))
const QuotesPage = lazy(() => import('./quotes/quotes-page'))
const ProfilePage = lazy(() => import('./profile/profile-page'))
const ReviewPage = lazy(() => import('./reviews/review-page'))
const ReportsPage = lazy(() => import('./reports/reports-page'))

const HELP: HelpTopic[] = [
  ...HELP_TOPICS.trade,
  {
    question: 'Getting paid',
    answer: `Send your invoice from the job once the work is done. The landlord pays you directly, never through ${BRAND.name}. Mark it paid when the money arrives. Other trades see how promptly each landlord pays, as “Paid on time on 3 of 4 jobs”.`,
  },
  {
    question: 'Photos and notice',
    answer: `Tap Add photos on a job and the camera opens straight away. When you book a visit, ${BRAND.name} sends the tenant written notice at least 48 hours ahead, unless it’s an emergency.`,
  },
]

/**
 * Hi-Vis: the trade portal opens in light mode, which reads best outdoors and in bright rooms.
 * Anyone who picks dark in the account menu still gets dark.
 */
function useLightByDefault() {
  const [preference] = useThemePreference()
  useLayoutEffect(() => {
    if (preference !== 'system') return
    const root = document.documentElement
    const apply = () => {
      if (!root.dataset.theme) root.dataset.theme = 'light'
    }
    apply()
    // Following the system again (another tab, or the system theme changing) clears it: put it back.
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      observer.disconnect()
      if (root.dataset.theme === 'light') delete root.dataset.theme
    }
  }, [preference])
}

/** Unread conversations and new board posts, for the badges on the navigation. */
function useNav(): PortalNav {
  const viewer = useViewer()
  const { state } = useSlateQuery(
    async (api) => {
      const [threads, posts] = await Promise.all([
        api.listThreads(viewer),
        api.listJobBoard(viewer, { trades: 'mine' }),
      ])
      return {
        unread: threads.filter((summary) => summary.unreadCount > 0).length,
        newPosts: posts.filter((post) => !post.myQuoteId).length,
      }
    },
    [viewer],
  )
  return {
    items: [
      { to: '/trade', label: 'Jobs', icon: WrenchIcon, end: true },
      {
        to: '/trade/board',
        label: 'Job board',
        icon: ClipboardTextIcon,
        count: state.data?.newPosts,
      },
      {
        to: '/trade/messages',
        label: 'Messages',
        icon: ChatsCircleIcon,
        count: state.data?.unread,
      },
      { to: '/trade/quotes', label: 'Quotes and invoices', icon: ReceiptIcon },
      { to: '/trade/profile', label: 'Profile', icon: UserCircleIcon },
    ],
  }
}

export default function TradePortal() {
  useLightByDefault()
  const nav = useNav()
  return (
    <PortalLayout nav={nav} help={HELP}>
      <Suspense fallback={<PageSkeleton label="Loading" />}>
        <Routes>
          <Route index element={<TodayPage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="board/:jobId" element={<BoardPostPage />} />
          <Route path="jobs" element={<Navigate to="/trade" replace />} />
          <Route path="jobs/:jobId" element={<JobPage />} />
          <Route path="jobs/:jobId/quote" element={<QuotePage />} />
          <Route path="jobs/:jobId/rate/:who" element={<RatePage />} />
          <Route path="ratings" element={<RatingsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:threadId" element={<ThreadPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="reviews/:ratingId" element={<ReviewPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PortalLayout>
  )
}
