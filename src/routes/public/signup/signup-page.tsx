import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { BRAND } from '@/config/brand'
import { SlateError, useSlate } from '@/data'
import { ROLES, type Role } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { RoleIcon } from '@/components/ui/role-icon'
import { RoleChip } from '@/components/slate/role-chip'
import { NotFound, useDocumentTitle } from '@/routes/_shell'
import { isRole, START_PATH, useSession } from '@/session'
import { DemoInbox } from '../auth/demo-inbox'
import { EmailSignIn } from '../auth/email-sign-in'
import { messageOf, useOpenMagicLink } from '../auth/use-magic-link'
import { planFor } from '../content/pricing'
import { ROLE_STORIES } from '../content/roles'
import { Container, inlineLinkClass } from '../layout/parts'
import { PublicLayout } from '../layout/public-layout'
import { CheckAnswers } from './check-answers'
import { useDraft, type Draft } from './draft'
import { SignUpTerms, STEP_VIEWS } from './step-views'
import {
  FIELD_STEPS,
  firstIncomplete,
  STEP_LABELS,
  stepsFor,
  toSignUpInput,
  validateStep,
  type StepErrors,
  type StepId,
} from './steps'
import { Welcome, type WelcomeState } from './welcome'

// ─── Choosing a role ────────────────────────────────────────────────────────────────────────

function RoleChoice() {
  useDocumentTitle('Sign up')
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[clamp(2rem,1.6rem+1.8vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
          How will you use {BRAND.name}?
        </h1>
        <p className="text-body-l text-muted">
          Choose one to start. If you’re a landlord who also rents, you can add the other later.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {ROLES.map((role) => {
          const story = ROLE_STORIES[role]
          return (
            <li key={role} data-role-accent={role}>
              <Link
                to={role}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 text-ink no-underline shadow-soft transition-[box-shadow,border-color,translate] duration-(--duration-base) ease-out-soft hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--accent),transparent_55%)] hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent-text"
                >
                  <RoleIcon role={role} weight="duotone" className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-display-m leading-tight font-semibold">
                    {story.door}
                  </span>
                  <span className="text-small text-muted">{story.doorLine}</span>
                </span>
                <ArrowRightIcon
                  weight="bold"
                  aria-hidden
                  className="size-5 shrink-0 text-muted transition-transform duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-accent-text"
                />
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-muted">
          Want a look first?{' '}
          <Link to={START_PATH} className={inlineLinkClass}>
            Try the demo as Sarah, Graham or Kev
          </Link>
        </p>
        <EmailSignIn />
      </div>
    </div>
  )
}

// ─── The questions ──────────────────────────────────────────────────────────────────────────

function useStepMotion(index: number) {
  const reduced = useReducedMotion()
  const previous = useRef(index)
  const direction = index >= previous.current ? 1 : -1
  useEffect(() => {
    previous.current = index
  }, [index])
  // Enter only: the old question goes at once, so a quick second tap never lands on it.
  if (reduced) return { initial: { opacity: 0.6 }, animate: { opacity: 1 } }
  return { initial: { opacity: 0, x: 24 * direction }, animate: { opacity: 1, x: 0 } }
}

function Questions({ role }: { role: Role }) {
  const { draft, update } = useDraft(role)
  const { api, demo } = useSlate()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [errors, setErrors] = useState<StepErrors>({})
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const firstRender = useRef(true)

  const steps = stepsFor(draft)
  const requested = params.get('step') as StepId | null
  const incomplete = firstIncomplete(draft)
  let step: StepId = requested && steps.includes(requested) ? requested : steps[0]!
  // No skipping ahead past a question that still needs an answer.
  if (incomplete && steps.indexOf(step) > steps.indexOf(incomplete)) step = incomplete
  const index = steps.indexOf(step)
  const motionProps = useStepMotion(index)
  useDocumentTitle(`${STEP_LABELS[step]} · Sign up`)

  // A new question: its heading takes focus, so it is read out first.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [step])

  function go(to: StepId, replace = false) {
    setErrors({})
    setSendError(null)
    setParams({ step: to }, { replace })
  }

  function change(patch: Partial<Draft>) {
    update(patch)
    // Once an error is showing, it clears as soon as the answer is put right.
    if (Object.keys(errors).length > 0) setErrors(validateStep(step, { ...draft, ...patch }))
  }

  /** The first control with a problem takes focus: a field itself, or the first choice in a group. */
  function focusFirstError() {
    requestAnimationFrame(() => {
      const invalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid]',
      )
      if (!invalid) return
      const control = invalid.matches('input, textarea, select, [role="checkbox"]')
        ? invalid
        : invalid.querySelector<HTMLElement>(
            '[role="radio"][aria-checked="true"], [role="radio"], [role="checkbox"], input:not([type="hidden"]):not([aria-hidden="true"]), textarea',
          )
      control?.focus()
    })
  }

  async function send() {
    setSending(true)
    setSendError(null)
    try {
      const sentAt = demo.now()
      const sent = await api.signUp(toSignUpInput(draft))
      update({ sent: { sent, sentAt } })
      navigate(`/signup/${role}/check-email`)
    } catch (caught) {
      if (caught instanceof SlateError && Object.keys(caught.fields).length > 0) {
        const [field, message] = Object.entries(caught.fields)[0]!
        const target =
          role === 'trade' && field === 'postcodeDistrict' ? 'areas' : (FIELD_STEPS[field] ?? step)
        const key = target === 'areas' ? 'serviceDistricts' : field
        go(target)
        setErrors({ [key]: message })
      } else {
        setSendError(messageOf(caught))
      }
    } finally {
      setSending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (step === 'check') {
      void send()
      return
    }
    const found = validateStep(step, draft)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      focusFirstError()
      return
    }
    const next = stepsFor(draft)[index + 1]
    if (next) go(next)
  }

  const view = step === 'check' ? null : STEP_VIEWS[step]
  const title = view ? view.title(draft) : 'Check your answers'
  const intro = view?.intro?.(draft) ?? 'Change anything before we send your sign-in link.'
  const previous = steps[index - 1]

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-5">
        {previous ? (
          <button
            type="button"
            onClick={() => go(previous)}
            className="-ml-2 inline-flex min-h-10 items-center gap-1.5 self-start rounded-control px-2 text-small font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeftIcon weight="bold" aria-hidden className="size-4" />
            Back
          </button>
        ) : (
          <Link
            to="/signup"
            className="-ml-2 inline-flex min-h-10 items-center gap-1.5 self-start rounded-control px-2 text-small font-semibold text-ink no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeftIcon weight="bold" aria-hidden className="size-4" />
            Choose another role
          </Link>
        )}
        <ProgressSteps steps={steps.map((id) => STEP_LABELS[id])} current={index} />
      </div>

      <motion.form
        key={step}
        ref={formRef}
        onSubmit={submit}
        noValidate
        {...motionProps}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-7"
      >
        <div className="flex flex-col gap-3">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink outline-none"
          >
            {title}
          </h1>
          <p className="text-body-l text-pretty text-muted">{intro}</p>
        </div>

        {view ? (
          <view.Body draft={draft} update={change} errors={errors} />
        ) : (
          <div className="flex flex-col gap-5">
            <CheckAnswers draft={draft} changeHref={(to) => `?step=${to}`} />
            <SignUpTerms />
          </div>
        )}

        <div aria-live="polite">
          {sendError ? <p className="text-small font-semibold text-critical">{sendError}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-(--gap-touch) sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            loading={sending}
            iconEnd={
              step === 'check' ? (
                <PaperPlaneTiltIcon weight="bold" aria-hidden />
              ) : (
                <ArrowRightIcon weight="bold" aria-hidden />
              )
            }
            className="max-sm:w-full"
          >
            {step === 'check' ? 'Send my sign-in link' : 'Continue'}
          </Button>
          {step === 'registration' ? (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                update({ registrationLater: true })
                const next = steps[index + 1]
                if (next) go(next)
              }}
            >
              Add it later
            </Button>
          ) : null}
        </div>
      </motion.form>
    </div>
  )
}

// ─── The link, then the welcome ─────────────────────────────────────────────────────────────

function CheckEmail({ role }: { role: Role }) {
  useDocumentTitle('Check your email')
  const { draft } = useDraft(role)
  const { signIn } = useSession()
  const navigate = useNavigate()
  const magic = useOpenMagicLink()

  if (!draft.sent) return <Navigate to={`/signup/${role}`} replace />
  const { sent, sentAt } = draft.sent

  async function openLink() {
    const person = await magic.open(sent.demoToken)
    if (!person) return
    signIn({ personId: person.id, activeRole: role })
    const extras: WelcomeState = {
      ...(draft.agent === 'yes' && draft.agentEmail.trim()
        ? { agentEmail: draft.agentEmail.trim() }
        : {}),
      insured: draft.insurance === 'yes',
    }
    navigate(`/signup/${role}/welcome`, { replace: true, state: extras })
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[clamp(1.875rem,1.5rem+1.6vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-ink">
          Check your email
        </h1>
        <p className="text-body-l text-muted">
          We sent a link to <span className="font-semibold text-ink">{sent.sentTo}</span>. Open it
          to finish signing up.
        </p>
      </div>
      <DemoInbox
        sent={sent}
        sentAt={sentAt}
        purpose="sign-up"
        name={draft.displayName.trim().split(' ')[0]}
        opening={magic.opening}
        error={magic.error}
        onOpen={openLink}
      />
      <p className="text-small text-muted">
        Wrong email?{' '}
        <Link to={`/signup/${role}?step=email`} className={inlineLinkClass}>
          Change it
        </Link>{' '}
        and we’ll send a new link.
      </p>
    </div>
  )
}

// ─── The frame around every sign-up screen ──────────────────────────────────────────────────

function Aside({ role }: { role: Role }) {
  const story = ROLE_STORIES[role]
  const plan = planFor(role)
  return (
    <aside aria-label={`Signing up as ${story.singular}`} className="hidden lg:block">
      <div className="sticky top-24 flex flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-6 shadow-soft">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
        <RoleChip role={role} size="md" className="self-start" />
        <p className="font-display text-display-m leading-tight font-semibold text-ink">
          {story.door}
        </p>
        <ul className="flex flex-col gap-2.5 text-body text-ink">
          {story.doorPoints.map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <CheckIcon
                weight="bold"
                aria-hidden
                className="mt-1 size-4 shrink-0 text-accent-text"
              />
              {point}
            </li>
          ))}
        </ul>
        <p className="border-t border-line pt-4 text-small text-muted">
          {plan.later ? `Free during launch. ${plan.later}.` : 'Free, always.'}
        </p>
      </div>
    </aside>
  )
}

function RoleFrame({ children }: { children: (role: Role) => ReactNode }) {
  const { role } = useParams()
  if (!isRole(role)) return <NotFound />
  return (
    <PublicLayout focused footer={false}>
      <div data-role={role} className="bg-bg">
        <Container className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="mx-auto w-full max-w-xl lg:mx-0">{children(role)}</div>
          <Aside role={role} />
        </Container>
      </div>
    </PublicLayout>
  )
}

/** /signup: choose a role, answer one question per screen, open the link, arrive signed in. */
export default function SignUpPage() {
  return (
    <Routes>
      <Route
        index
        element={
          <PublicLayout focused footer={false}>
            <Container className="py-8 sm:py-12">
              <div className="mx-auto w-full max-w-xl">
                <RoleChoice />
              </div>
            </Container>
          </PublicLayout>
        }
      />
      <Route
        path=":role"
        element={<RoleFrame>{(role) => <Questions key={role} role={role} />}</RoleFrame>}
      />
      <Route
        path=":role/check-email"
        element={<RoleFrame>{(role) => <CheckEmail key={role} role={role} />}</RoleFrame>}
      />
      <Route
        path=":role/welcome"
        element={<RoleFrame>{(role) => <Welcome role={role} />}</RoleFrame>}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
