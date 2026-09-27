import { Link } from 'react-router'
import { BRAND } from '@/config/brand'
import { REPORT_ROUTE_INFO } from '@/domain/types'
import { inlineLinkClass } from '@/routes/public/layout/parts'
import { PolicyPage, Prose, type PolicySection } from './policy-layout'

const SECTIONS: PolicySection[] = [
  {
    id: 'in-your-browser',
    title: 'It stays in your browser',
    body: (
      <Prose>
        <p>
          This demo has no server. Everything you add, such as a repair report or a new account,
          stays in this browser on this device. We can’t see it, and nor can anyone else.
        </p>
        <p>
          There are no adverts, no analytics and no tracking cookies. This site serves its own
          fonts, so no other company sees your visit.
        </p>
      </Prose>
    ),
  },
  {
    id: 'what-is-kept',
    title: 'What’s kept, and where',
    body: (
      <Prose>
        <ul>
          <li>
            <strong>The demo’s records</strong> (people, homes, repairs, messages, ratings) in this
            browser’s local storage, shared between your open tabs so the portals update each other.
          </li>
          <li>
            <strong>Who you’re signed in as</strong>, separately for each tab, until you close it.
          </li>
          <li>
            <strong>Your light or dark choice</strong>, so it’s the same next time.
          </li>
        </ul>
      </Prose>
    ),
  },
  {
    id: 'fictional',
    title: 'Everyone here is made up',
    body: (
      <Prose>
        <p>
          The people, businesses and addresses are fictional, set in real Aberdeen neighbourhoods.
          Phone numbers and emails use ranges kept for examples, so none of them reach anyone.
        </p>
        <p>
          If you sign up, use made-up details too. You don’t need a real email, because the sign-in
          link appears on screen.
        </p>
      </Prose>
    ),
  },
  {
    id: 'removing',
    title: 'Clearing it',
    body: (
      <Prose>
        <p>
          Choose <strong>Reset demo data</strong> in the account menu to put everything back as it
          started. To remove it all, clear this site’s data in your browser settings.
        </p>
      </Prose>
    ),
  },
  {
    id: 'after-launch',
    title: `When ${BRAND.name} launches`,
    body: (
      <Prose>
        <p>
          The live service will have a full privacy notice under UK GDPR before anyone signs up.
          We’ll store your information in the UK, and you’ll be able to see, correct or delete it.
        </p>
        <p>
          We acknowledge requests about your personal data within{' '}
          {REPORT_ROUTE_INFO.data_protection.clock.amount} days.{' '}
          <Link to="/policies/reporting#data-protection" className={inlineLinkClass}>
            How to make one
          </Link>
          .
        </p>
      </Prose>
    ),
  },
]

export function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy"
      lead={<p>In short, this demo keeps everything in your browser and sends nothing anywhere.</p>}
      sections={SECTIONS}
    />
  )
}
