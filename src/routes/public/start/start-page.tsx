import { Link, useLocation, useNavigate } from 'react-router'
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  SignpostIcon,
  SquareSplitHorizontalIcon,
  UserPlusIcon,
} from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { useSlateQuery, type Persona } from '@/data'
import type { SlateApi } from '@/data/api'
import { ROLE_LABELS, ROLES } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { RoleChip } from '@/components/slate/role-chip'
import { useDocumentTitle } from '@/routes/_shell'
import { returnPathAfterSignIn, useSession, type StartState } from '@/session'
import { EmailSignIn } from '../auth/email-sign-in'
import { Container } from '../layout/parts'
import { PublicLayout } from '../layout/public-layout'
import { ContinueAs } from './continue-as'

/** Aileen isn't one of the front-page personas, but shows how agents work inside an account. */
const AGENT: Persona = {
  personId: 'person_aileen',
  role: 'landlord',
  name: 'Aileen',
  blurb:
    'Letting agent at Leask & Ogston Lettings. She works inside Graham’s account with the permissions he gave her, so there’s no separate agent app.',
}

async function loadPeople(api: SlateApi) {
  const personas = await api.listPersonas()
  const agentExists = await api
    .getMe({ personId: AGENT.personId, role: AGENT.role })
    .then(() => true)
    .catch(() => false)
  // The first persona for each role leads; the rest are "more people to try".
  const main = ROLES.flatMap((role) => personas.find((persona) => persona.role === role) ?? [])
  const more = personas.filter((persona) => !main.includes(persona))
  return { main, more: agentExists ? [...more, AGENT] : more }
}

function MainCard({ persona, onChoose }: { persona: Persona; onChoose: () => void }) {
  return (
    <li data-role-accent={persona.role} className="flex">
      <button
        type="button"
        onClick={onChoose}
        className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-6 text-left shadow-soft transition-[box-shadow,translate,border-color] duration-(--duration-base) ease-out-soft hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--accent),transparent_55%)] hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
        <span className="flex items-center gap-4">
          <Avatar
            name={persona.name}
            seed={persona.personId}
            role={persona.role}
            size="lg"
            decorative
          />
          <span className="flex flex-col items-start gap-1.5">
            <span className="font-display text-display-m leading-none font-semibold text-ink">
              {persona.name}
            </span>
            <RoleChip role={persona.role} />
          </span>
        </span>
        <span className="text-body text-muted">{persona.blurb}</span>
        <span className="mt-auto flex min-h-(--control-h) w-full items-center justify-center gap-2 rounded-control bg-accent px-5 font-semibold text-on-accent shadow-soft transition-colors duration-(--duration-quick) group-hover:bg-accent-hover sm:w-auto sm:self-start lg:w-full lg:self-stretch">
          Try as {persona.name}
          <ArrowRightIcon
            weight="bold"
            aria-hidden
            className="size-5 transition-transform duration-(--duration-base) ease-out-soft group-hover:translate-x-0.5"
          />
        </span>
      </button>
    </li>
  )
}

function MoreRow({ persona, onChoose }: { persona: Persona; onChoose: () => void }) {
  const agent = persona.personId === AGENT.personId
  return (
    <li>
      <button
        type="button"
        onClick={onChoose}
        className="group flex w-full items-start gap-4 rounded-card border border-line bg-surface p-4 text-left transition-[background-color,border-color] duration-(--duration-quick) hover:border-input-border hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
      >
        <Avatar
          name={persona.name}
          seed={persona.personId}
          role={persona.role}
          size="md"
          decorative
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">Try as {persona.name}</span>
            <RoleChip
              role={persona.role}
              label={agent ? 'Letting agent' : ROLE_LABELS[persona.role]}
            />
          </span>
          <span className="text-small text-muted">{persona.blurb}</span>
        </span>
        <ArrowRightIcon
          weight="bold"
          aria-hidden
          className="mt-1 size-5 shrink-0 text-muted transition-transform duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </button>
    </li>
  )
}

function Loading() {
  return (
    <LoadingRegion label="Loading people to try" className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-7 w-28" />
            </div>
            <SkeletonText lines={3} />
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

/** "Try Slate as…": the persona picker. The portal guard sends signed-out visitors here. */
export function StartPage() {
  useDocumentTitle('Choose someone to try')
  const { signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, refresh } = useSlateQuery(loadPeople, [])
  const from = (location.state as Partial<StartState> | null)?.from

  function tryAs(persona: Persona) {
    signIn({ personId: persona.personId, activeRole: persona.role })
    navigate(returnPathAfterSignIn(location.state, persona.role), { replace: true })
  }

  return (
    <PublicLayout>
      <Container className="flex flex-col gap-10 py-10 sm:gap-12 sm:py-16">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-display text-[clamp(2.25rem,1.7rem+2.4vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
            Try {BRAND.name} as…
          </h1>
          <p className="text-body-l text-muted">
            {from
              ? 'Choose who you are to carry on to the page you opened.'
              : 'Each person has a real situation waiting in fictional Aberdeen. You can switch to someone else at any time from the account menu.'}
          </p>
        </div>

        <ContinueAs />

        {state.status === 'loading' ? (
          <Loading />
        ) : state.status === 'error' && !state.data ? (
          <EmptyState
            icon={SignpostIcon}
            title="We couldn’t load the people to try"
            description="The demo data didn’t load. Try again; if it keeps happening, reload the page."
            action={
              <Button
                onClick={refresh}
                iconStart={<ArrowClockwiseIcon weight="bold" aria-hidden />}
              >
                Try again
              </Button>
            }
            headingLevel="h2"
          />
        ) : state.data && state.data.main.length === 0 && state.data.more.length === 0 ? (
          <EmptyState
            icon={UserPlusIcon}
            title="Nobody to try yet"
            description="The demo has no people in it. Sign up to make your own account, or reset the demo data."
            action={
              <Link to="/signup" className={buttonVariants()}>
                Sign up
              </Link>
            }
            headingLevel="h2"
          />
        ) : state.data ? (
          <div className="flex flex-col gap-12">
            <section aria-labelledby="main-people" className="flex flex-col gap-5">
              <h2 id="main-people" className="sr-only">
                One person for each portal
              </h2>
              <ul className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                {state.data.main.map((persona) => (
                  <MainCard
                    key={persona.personId}
                    persona={persona}
                    onChoose={() => tryAs(persona)}
                  />
                ))}
              </ul>
            </section>

            <Link
              to="/demo"
              className="group flex flex-col gap-4 rounded-card bg-brand-tint p-6 text-ink no-underline transition-[box-shadow] duration-(--duration-base) hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-6 sm:p-7"
            >
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand shadow-soft"
              >
                <SquareSplitHorizontalIcon weight="duotone" className="size-7" />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-display text-display-m font-semibold">
                  Open all three side by side
                </span>
                <span className="text-body text-muted">
                  Sarah, Graham and Kev at once. What one does shows up for the others as it
                  happens.
                </span>
              </span>
              <span className="flex items-center gap-2 font-semibold text-brand">
                Open the demo
                <ArrowRightIcon
                  weight="bold"
                  aria-hidden
                  className="size-5 transition-transform duration-(--duration-base) group-hover:translate-x-0.5"
                />
              </span>
            </Link>

            {state.data.more.length > 0 ? (
              <section aria-labelledby="more-people" className="flex flex-col gap-4">
                <h2 id="more-people" className="text-title font-semibold text-ink">
                  More people to try
                </h2>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {state.data.more.map((persona) => (
                    <MoreRow
                      key={persona.personId}
                      persona={persona}
                      onChoose={() => tryAs(persona)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        <section
          aria-labelledby="your-own"
          className="flex flex-col gap-4 border-t border-line pt-10 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-col gap-1">
            <h2 id="your-own" className="text-title font-semibold text-ink">
              Rather be yourself?
            </h2>
            <p className="text-body text-muted">
              Sign up as a tenant, landlord or trade. It’s saved only in this browser.
            </p>
          </div>
          <div className="flex flex-col gap-(--gap-touch) sm:flex-row">
            <EmailSignIn />
            <Link to="/signup" className={buttonVariants()}>
              <UserPlusIcon weight="bold" aria-hidden />
              Sign up
            </Link>
          </div>
        </section>
      </Container>
    </PublicLayout>
  )
}
