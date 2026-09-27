import { BRAND } from '@/config/brand'
import { Link } from 'react-router'
import { RATING_RULES, SCALES, type RatingDirection } from '@/domain/criteria'
import { RATING_CONFIG } from '@/domain/rating'
import { ROLE_LABELS, SENSITIVE_TOPIC_LABELS, SENSITIVE_TOPICS } from '@/domain/types'
import { RoleChip } from '@/components/slate/role-chip'
import { inlineLinkClass } from '@/routes/public/layout/parts'
import { PolicyPage, Prose, type PolicySection } from './policy-layout'
import { curly, REPORT_ROUTE_COPY } from './report-routes'

const { windowDays } = RATING_CONFIG

interface Relationship {
  direction: RatingDirection
  who: string
  when: string
  window: number
  seenBy: string
}

const RELATIONSHIP_ROWS: Relationship[] = [
  {
    direction: 'tenant->landlord',
    who: 'Tenant rates landlord',
    when: 'At the end of the tenancy. After each repair too, on the first two questions only, held back to protect the tenant',
    window: windowDays.tenancy,
    seenBy: 'Anyone signed in, on the landlord’s profile and the home’s page',
  },
  {
    direction: 'landlord->tenant',
    who: 'Landlord rates tenant',
    when: 'At the end of the tenancy',
    window: windowDays.tenancy,
    seenBy: 'Never public. The tenant sees it in their passport and chooses who else does',
  },
  {
    direction: 'landlord->trade',
    who: 'Landlord rates trade',
    when: 'When the landlord confirms the job is complete',
    window: windowDays.job,
    seenBy: 'Anyone signed in, on the trade’s profile',
  },
  {
    direction: 'trade->landlord',
    who: 'Trade rates landlord',
    when: 'When the job is complete, with longer to judge whether they were paid',
    window: windowDays.tradeRatesLandlord,
    seenBy: 'Other trades, on the landlord’s client profile. The landlord sees their own',
  },
  {
    direction: 'tenant->trade',
    who: 'Tenant rates trade',
    when: 'When the tenant confirms the visit',
    window: windowDays.job,
    seenBy: 'Anyone signed in, on the trade’s profile',
  },
  {
    direction: 'trade->tenant',
    who: 'Trade rates tenant',
    when: 'After the visit',
    window: windowDays.job,
    seenBy: 'Only the tenant. The landlord sees whether access was given, nothing more',
  },
]

/** 1st, 2nd, 3rd, 4th… */
function ordinal(n: number) {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

function raterOf(direction: RatingDirection) {
  return direction.split('->')[0] as keyof typeof ROLE_LABELS
}

const SECTIONS: PolicySection[] = [
  {
    id: 'who-can-review',
    title: 'Who can review',
    body: (
      <>
        <Prose>
          <p>
            Only people who have worked together on {BRAND.name}. A rating unlocks after a repair
            job is finished, or when a tenancy that both sides confirmed on {BRAND.name} comes to an
            end. Nobody can rate someone who isn’t a member, or someone they haven’t dealt with.
          </p>
          <p>
            Reviewers are shown by their role, area and year, for example “Verified tenant · AB10 ·
            2025”, never by name.
          </p>
        </Prose>
        <table className="slate-table mt-2">
          <caption className="sr-only">Who rates whom, when, and who sees it</caption>
          <thead>
            <tr>
              <th scope="col">Who rates whom</th>
              <th scope="col">When</th>
              <th scope="col" data-align="end">
                Time to rate
              </th>
              <th scope="col">Who sees it</th>
            </tr>
          </thead>
          <tbody>
            {RELATIONSHIP_ROWS.map((row) => (
              <tr key={row.direction}>
                <td data-primary data-label="Who rates whom" className="align-top">
                  <span className="flex flex-col items-start gap-1.5">
                    <RoleChip role={raterOf(row.direction)} />
                    <span className="font-semibold text-ink">{row.who}</span>
                  </span>
                </td>
                <td data-label="When" className="align-top text-small text-ink">
                  {row.when}
                </td>
                <td
                  data-label="Time to rate"
                  data-align="end"
                  className="figures align-top text-small whitespace-nowrap text-ink"
                >
                  {row.window} days
                </td>
                <td data-full data-label="Who sees it" className="align-top text-small text-ink">
                  {row.seenBy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'what-you-rate',
    title: 'What you’re asked',
    body: (
      <Prose>
        <p>
          Each relationship has its own short set of questions, the same for everyone. You answer in
          words, not stars:
        </p>
        <ul>
          <li>
            <strong>How good:</strong> {SCALES.judgement.map((point) => point.label).join(' · ')}
          </li>
          <li>
            <strong>How often:</strong> {SCALES.frequency.map((point) => point.label).join(' · ')}
          </li>
        </ul>
        <p>
          You can add a public comment of {RATING_RULES.commentLength.min} to{' '}
          {RATING_RULES.commentLength.max.toLocaleString('en-GB')} characters. It starts from “in my
          experience” and is labelled as your opinion, for example “Tenant’s opinion”.
        </p>
        <p>
          You can also leave a private note, and say privately whether you’d work with, rent to or
          rent from them again. Neither is ever shown or counted in a score. If you felt unsafe,
          tick the safety concern box. It goes straight to our moderators.
        </p>
      </Prose>
    ),
  },
  {
    id: 'double-blind',
    title: 'Revealed together',
    body: (
      <Prose>
        <p>
          Everything owed on a job or a tenancy stays hidden until everyone has rated, or the time
          to rate runs out. Then it’s all revealed at once. Nobody can read the other side’s rating
          first and answer it, and nobody can change theirs after the reveal.
        </p>
        <ul>
          <li>Repairs: {windowDays.job} days.</li>
          <li>End of a tenancy: {windowDays.tenancy} days.</li>
          <li>
            A trade rating a landlord: {windowDays.tradeRatesLandlord} days, so they can see whether
            they were paid on time. It shows only once the landlord’s rating of that trade is locked
            in.
          </li>
        </ul>
        <p>
          Everyone who still owes a rating gets the same reminder on day{' '}
          {RATING_RULES.reminderDays[0]} and day {RATING_RULES.reminderDays[1]}. We never reward
          reviews, and nothing is held back from people who don’t leave one.
        </p>
        <p>
          We tell the person rated when a review about them is revealed, before or as it’s
          published.
        </p>
      </Prose>
    ),
  },
  {
    id: 'tenants-protected',
    title: 'How tenants are protected',
    body: (
      <Prose>
        <p>
          A tenant rating their current landlord after a repair could fear the consequences. So
          those ratings are sealed. They are only ever released inside a batch:
        </p>
        <ul>
          <li>at the end of the tenancy, or</li>
          <li>
            once the landlord has ratings from {RATING_RULES.shieldReleaseTenantRaters} or more
            different tenants. Then held ratings join the score on the{' '}
            {ordinal(RATING_RULES.shieldReleaseDayOfMonth)} of each month, and only when at least{' '}
            {RATING_RULES.shieldBatchMinTenants} different tenants’ ratings are waiting, so nobody
            can work out one tenant’s answers.
          </li>
        </ul>
        <p>
          What landlords say about tenants goes into the tenant passport. It is never public and has
          no single score. The tenant sees all of it, can reply, and shares it all or nothing with a
          link that works for 30 days.
        </p>
        <p>
          {BRAND.name} never sorts, filters or turns down tenants automatically because of their
          ratings.
        </p>
      </Prose>
    ),
  },
  {
    id: 'filters',
    title: 'What we filter',
    body: (
      <>
        <Prose>
          <p>
            Reviews are about how someone did the job or kept the home, not about who they are.
            Before a comment, reply or update goes live, we check it for mentions of:
          </p>
        </Prose>
        <ul className="flex max-w-prose flex-wrap gap-2" aria-label="What we check for">
          {SENSITIVE_TOPICS.map((topic) => (
            <li
              key={topic}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-small font-semibold text-ink"
            >
              {curly(SENSITIVE_TOPIC_LABELS[topic])}
            </li>
          ))}
        </ul>
        <Prose>
          <p>
            Where the words are clear, we ask you to take that part out before it goes live. Where
            they might be innocent, it goes live and a moderator looks at it afterwards.
          </p>
        </Prose>
      </>
    ),
  },
  {
    id: 'scores',
    title: 'How scores work',
    body: (
      <Prose>
        <p>
          There’s no score until {RATING_RULES.minReviewersForScore} different people have reviewed.
          Before that you’ll see “New” and how many verified reviews there are.
        </p>
        <p>
          A score is shown to one decimal place with words beside it, how many reviews it comes
          from, when the last one was, and how many completed jobs were reviewed. Recent reviews
          count more. A review’s weight halves every {RATING_RULES.recencyHalfLifeMonths} months.
          Every score starts close to the average, so a single review can’t swing it.
        </p>
        <p>
          A trade’s Overall is the average of what landlords and tenants say, always shown with both
          halves. It appears once each half has its own score, from{' '}
          {RATING_RULES.minReviewersForScore} different landlords and{' '}
          {RATING_RULES.minReviewersForScore} different tenants. Labels such as “Top 10% in
          Aberdeen” only appear when there are at least {RATING_RULES.relativeBadgeMinPeers} others
          to compare with.
        </p>
      </Prose>
    ),
  },
  {
    id: 'replies',
    title: 'Replies and updates',
    body: (
      <Prose>
        <p>Ratings themselves never change. Instead, people can add to them, with dates:</p>
        <ul>
          <li>
            The person rated can post <strong>one public reply</strong> of up to{' '}
            {RATING_RULES.reply.maxLength} characters, within {RATING_RULES.reply.withinDays} days
            of the reveal.
          </li>
          <li>
            They can add a visible note that they dispute it, such as “Landlord disputes this”.
          </li>
          <li>
            The reviewer can add <strong>one dated update</strong>, for example when a problem was
            put right later.
          </li>
        </ul>
      </Prose>
    ),
  },
  {
    id: 'disputes',
    title: 'Reporting a review',
    body: (
      <Prose>
        <p>
          Every review, reply and message has a Report button. It offers four routes, each with its
          own clock:
        </p>
        <ul>
          {REPORT_ROUTE_COPY.map((route) => (
            <li key={route.route}>
              <Link to={`/policies/reporting#${route.anchor}`} className={inlineLinkClass}>
                {route.label}
              </Link>
              : {route.clock.charAt(0).toLowerCase() + route.clock.slice(1)}
            </li>
          ))}
        </ul>
      </Prose>
    ),
  },
  {
    id: 'removal',
    title: 'When reviews are removed',
    body: (
      <Prose>
        <p>
          Reviews publish automatically once the neutral checks above are done. Nobody at{' '}
          {BRAND.name} approves or rejects a review because of what it says about someone.
        </p>
        <p>We remove a review, rather than edit it, when:</p>
        <ul>
          <li>a defamation complaint isn’t answered or is upheld,</li>
          <li>it’s illegal,</li>
          <li>it turns out to be fake,</li>
          <li>
            a moderator finds it breaks these rules, for example by naming someone’s children,
          </li>
          <li>or it reaches {RATING_RULES.retentionMonths} months old.</li>
        </ul>
        <p>
          The only edits we ever make are to hide obscenity or fix a typo, and the review then says
          it was corrected. Whenever we remove a review, we work the scores out again.
        </p>
      </Prose>
    ),
  },
  {
    id: 'expiry',
    title: 'How long reviews last',
    body: (
      <Prose>
        <p>
          Reviews stop counting, and are deleted, {RATING_RULES.retentionMonths} months after they
          were written. People change, and a record should reflect the landlord, tenant or trade
          they are now.
        </p>
      </Prose>
    ),
  },
  {
    id: 'fake-reviews',
    title: 'Fake reviews',
    body: (
      <Prose>
        <p>
          {BRAND.name} is built so that only real work can be reviewed, but fake reviews are still
          against the rules, and against the law. That includes:
        </p>
        <ul>
          <li>writing a review for, or pretending to be, someone else,</li>
          <li>offering or accepting anything in return for a review, good or bad,</li>
          <li>agreeing to swap good reviews,</li>
          <li>pressing someone to change or remove their review.</li>
        </ul>
        <p>
          If you think a review is fake, report it. It shows a “Pending check” label while we look.
          We remove fake reviews, and may close the accounts that wrote them.
        </p>
      </Prose>
    ),
  },
]

export function ReviewPolicy() {
  return (
    <PolicyPage
      title="Review policy"
      lead={
        <p>
          How ratings work on {BRAND.name}: who can leave them, what they can say, and what happens
          when something goes wrong. The same rules apply to tenants, landlords and trades.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
