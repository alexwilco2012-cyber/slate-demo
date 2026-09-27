// Report a problem: one question per screen, with a progress bar and a way back. The step is in
// the address (?step=urgency) so the browser's back button steps back too, and the answers are
// kept in this tab until the report is sent.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowRightIcon,
  CaretLeftIcon,
  HouseLineIcon,
  InfoIcon,
  KeyIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { SlateError } from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { LETTING_RULES, ROOM_LABELS, type PersonCard } from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/slate/page-header'
import { PortalPage } from '@/routes/_shell'
import { usePortal, useViewer } from '@/session'
import { QueryError } from '../../components/basics'
import { ChoiceTiles } from '../../components/choice-tiles'
import { EmergencyAdvice, GasWarning } from '../../components/emergency-advice'
import { PhotoTile } from '../../components/photo'
import { currentHome, loadHomes, loadPeople, type TenantHome } from '../../lib/data'
import { firstName, ukDate } from '../../lib/format'
import { URGENCY_META } from '../../lib/jobs'
import { AccessGrid, describeWindows, MAX_WINDOWS } from './access-grid'
import {
  DESCRIPTION_MIN,
  STEPS,
  STEP_NAMES,
  firstIncomplete,
  stepIndex,
  useReportDraft,
  type ReportDraft,
  type Step,
} from './draft'
import { PhotoQueue } from './photo-queue'
import { ROOM_CHOICES, problemById, problemsFor, titleFor } from './problems'

type Errors = Partial<
  Record<'room' | 'problem' | 'description' | 'urgency' | 'access' | 'form', string>
>

const HEADINGS: Record<Step, string> = {
  room: 'Where’s the problem?',
  problem: 'What’s wrong?',
  photos: 'Add a photo or two',
  urgency: 'How urgent is it?',
  access: 'When can someone get in?',
  check: 'Check your answers',
}

function isStep(value: string | null): value is Step {
  return value !== null && (STEPS as readonly string[]).includes(value)
}

/** The step's own checks, before moving on. */
function validate(step: Step, draft: ReportDraft): Errors {
  switch (step) {
    case 'room':
      return draft.room ? {} : { room: 'Choose where the problem is.' }
    case 'problem': {
      const errors: Errors = {}
      if (!draft.problemId) errors.problem = 'Choose what’s wrong, or pick Something else.'
      if (draft.description.trim().length < DESCRIPTION_MIN) {
        errors.description = 'Tell us a little more, in a sentence or two.'
      }
      return errors
    }
    case 'urgency':
      return draft.urgency ? {} : { urgency: 'Choose how urgent it is.' }
    case 'access':
      if (draft.urgency !== 'emergency' && draft.windows.length === 0) {
        return { access: 'Choose at least one time when someone can get in.' }
      }
      if (draft.windows.length > MAX_WINDOWS) {
        return { access: `Choose up to ${MAX_WINDOWS} times.` }
      }
      return {}
    default:
      return {}
  }
}

export function ReportPage() {
  const viewer = useViewer()
  const { person } = usePortal()
  const { state, refresh } = useSlateQuery(
    async (api) => {
      const homes = await loadHomes(api, viewer)
      const home = currentHome(homes)
      const agents = home ? await loadPeople(api, viewer, home.property.agentIds) : new Map()
      return { home, agents: [...agents.values()] }
    },
    [viewer],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Report a problem" width="narrow">
        <LoadingRegion label="Getting the form ready" className="flex flex-col gap-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-card" />
            ))}
          </div>
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Report a problem" width="narrow">
        <QueryError what="the report form" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data.home) {
    return (
      <PortalPage title="Report a problem" width="narrow">
        <PageHeader title="Report a problem" />
        <EmptyState
          icon={HouseLineIcon}
          headingLevel="h2"
          title="Nowhere to report to yet"
          description="You can report problems at a home you rent now, once you and your landlord have both confirmed the tenancy."
          action={
            <Link to="/tenant" className={buttonVariants()}>
              Back to home
            </Link>
          }
        />
      </PortalPage>
    )
  }
  return <ReportWizard home={state.data.home} agents={state.data.agents} personId={person.id} />
}

function ReportWizard({
  home,
  agents,
  personId,
}: {
  home: TenantHome
  agents: PersonCard[]
  personId: PersonCard['id']
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const now = useDemoNow()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const { draft, update, reset } = useReportDraft(personId)
  const [errors, setErrors] = useState<Errors>({})
  const [photosBusy, setPhotosBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const direction = useRef(1)

  const requested = params.get('step')
  const returnToCheck = params.get('return') === 'check'
  const earliest = firstIncomplete(draft)
  const requestedStep: Step = isStep(requested) ? requested : 'room'
  // A deep link can't skip past an unanswered question. Photos are optional, so never block.
  const step: Step = stepIndex(requestedStep) > stepIndex(earliest) ? earliest : requestedStep
  const index = stepIndex(step)
  const problem = problemById(draft.problemId)
  const landlordName = home.landlord ? home.landlord.displayName : 'your landlord'

  // New question on screen: start at the top and move focus to it, so screen readers read it.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    if (!draft.propertyId) update({ propertyId: home.property.id })
  }, [draft.propertyId, home.property.id, update])

  function go(next: Step, options: { back?: boolean } = {}) {
    direction.current = options.back ? -1 : 1
    setErrors({})
    const search = next === 'room' ? '' : `?step=${next}`
    if (options.back && (location.state as { wizard?: boolean } | null)?.wizard) {
      navigate(-1)
      return
    }
    navigate({ search }, { state: { wizard: true }, replace: Boolean(options.back) })
  }

  function next() {
    const found = validate(step, draft)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    if (returnToCheck || step === 'access') return go('check')
    go(STEPS[index + 1] ?? 'check')
  }

  function back() {
    if (index === 0) {
      navigate('/tenant')
      return
    }
    go(STEPS[index - 1] ?? 'room', { back: true })
  }

  async function send() {
    if (!draft.room || !problem || !draft.urgency) {
      go(firstIncomplete(draft))
      return
    }
    setSending(true)
    setErrors({})
    try {
      const job = await api.createJob(viewer, {
        propertyId: home.property.id,
        room: draft.room,
        category: problem.category,
        title: titleFor(problem, draft.room, draft.description),
        description: draft.description.trim(),
        photos: draft.photos.map(({ url, alt }) => ({ url, alt })),
        urgency: draft.urgency,
        access: {
          windows: draft.windows,
          keyAllowed: draft.keyAllowed,
          ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
        },
      })
      reset()
      navigate(`/tenant/report/sent/${job.id}`, { replace: true })
    } catch (error) {
      setSending(false)
      if (error instanceof SlateError && Object.keys(error.fields).length > 0) {
        const fields = error.fields
        setErrors({
          form: 'Some answers need another look before you can send this.',
          ...(fields.room ? { room: fields.room } : {}),
          ...(fields.category ? { problem: fields.category } : {}),
          ...(fields.description ? { description: fields.description } : {}),
          ...(fields.urgency ? { urgency: fields.urgency } : {}),
          ...(fields.access ? { access: fields.access } : {}),
        })
      } else {
        setErrors({
          form:
            error instanceof Error
              ? error.message
              : 'Your report didn’t send. Your answers are saved, so try again in a moment.',
        })
      }
    }
  }

  const started = Boolean(draft.room || draft.description || draft.photos.length)
  const errorId = 'report-step-error'
  const stepError = errors.room ?? errors.problem ?? errors.urgency ?? errors.access

  return (
    <PortalPage title={`Report a problem: ${STEP_NAMES[step]}`} width="narrow" className="gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <CaretLeftIcon weight="bold" aria-hidden className="size-4.5" />
          {index === 0 ? 'Home' : 'Back'}
        </button>
        <button
          type="button"
          onClick={() => (started ? setConfirmCancel(true) : navigate('/tenant'))}
          className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-small font-semibold text-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Cancel
        </button>
      </div>

      <ProgressSteps steps={STEPS.map((s) => STEP_NAMES[s])} current={index} />

      <AnimatePresence mode="wait" initial={false} custom={direction.current}>
        <motion.div
          key={step}
          custom={direction.current}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 * direction.current }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 * direction.current }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-5"
        >
          <header className="flex flex-col gap-1.5">
            <p className="text-small font-semibold text-muted">
              Report a problem · {home.property.addressLine.split(',').at(-1)?.trim()}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              id="report-question"
              className="font-display text-display-l font-semibold text-ink outline-none"
            >
              {HEADINGS[step]}
            </h1>
          </header>

          {stepError ? (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-2 rounded-control bg-critical-tint p-3 text-small font-semibold text-critical"
            >
              <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
              {stepError}
            </p>
          ) : null}

          {step === 'room' ? (
            <ChoiceTiles
              labelledBy="report-question"
              describedBy={errors.room ? errorId : undefined}
              invalid={Boolean(errors.room)}
              options={ROOM_CHOICES}
              value={draft.room}
              onValueChange={(room) => {
                // A different room offers different problems, so an old choice may not fit.
                const keep = problemsFor(room).some((p) => p.id === draft.problemId)
                update({ room, ...(keep ? {} : { problemId: undefined }) })
                setErrors({})
              }}
            />
          ) : null}

          {step === 'problem' && draft.room ? (
            <>
              <p id="report-problem-hint" className="-mt-2 text-body text-muted">
                {ROOM_LABELS[draft.room]}. Pick the closest, then tell us more in your own words.
              </p>
              <ChoiceTiles
                layout="list"
                labelledBy="report-question"
                describedBy={
                  errors.problem ? `${errorId} report-problem-hint` : 'report-problem-hint'
                }
                invalid={Boolean(errors.problem)}
                options={problemsFor(draft.room).map((p) => ({
                  value: p.id,
                  label: p.label,
                  description: p.hint,
                  icon: p.icon,
                }))}
                value={draft.problemId}
                onValueChange={(problemId) => {
                  const chosen = problemById(problemId)
                  update({
                    problemId,
                    // A gas problem is always treated as an emergency unless the tenant says not.
                    ...(chosen?.gas && !draft.urgency ? { urgency: 'emergency' } : {}),
                  })
                  setErrors((current) => ({ ...current, problem: undefined }))
                }}
              />
              {problem?.gas ? <GasWarning /> : null}
              <Textarea
                label="Tell us more"
                hint="What’s happening, when it started, and anything you’ve tried. Your landlord and the trade will read this."
                value={draft.description}
                onChange={(event) => {
                  update({ description: event.target.value })
                  if (errors.description)
                    setErrors((current) => ({ ...current, description: undefined }))
                }}
                maxLength={2000}
                showCount
                rows={4}
                error={errors.description}
              />
            </>
          ) : null}

          {step === 'photos' ? (
            <>
              <p className="-mt-2 text-body text-muted">
                Photos help {firstName(landlordName)} and the trade understand the problem before
                anyone visits. You can skip this.
              </p>
              <PhotoQueue
                photos={draft.photos}
                onChange={(photos) => update({ photos })}
                onBusyChange={setPhotosBusy}
                sampleAlt={`${problem?.label ?? 'The problem'}${draft.room ? `, ${ROOM_LABELS[draft.room].toLowerCase()}` : ''}`}
              />
            </>
          ) : null}

          {step === 'urgency' ? (
            <>
              <ChoiceTiles
                layout="list"
                className="sm:grid-cols-1"
                labelledBy="report-question"
                describedBy={errors.urgency ? errorId : undefined}
                invalid={Boolean(errors.urgency)}
                options={(['emergency', 'urgent', 'routine'] as const).map((urgency) => ({
                  value: urgency,
                  label: URGENCY_META[urgency].label,
                  description: (
                    <>
                      <span className="block font-semibold text-ink">
                        {URGENCY_META[urgency].definition}
                      </span>
                      <span className="mt-0.5 block">
                        For example: {URGENCY_META[urgency].examples.charAt(0).toLowerCase()}
                        {URGENCY_META[urgency].examples.slice(1)}
                      </span>
                    </>
                  ),
                  icon: URGENCY_META[urgency].icon,
                }))}
                value={draft.urgency}
                onValueChange={(urgency) => {
                  update({ urgency })
                  setErrors({})
                  if (urgency === 'emergency') {
                    // The advice appears under the choices; bring it into view so it's read first.
                    window.setTimeout(() => {
                      document.getElementById('stay-safe')?.scrollIntoView?.({
                        behavior: reduceMotion ? 'auto' : 'smooth',
                        block: 'center',
                      })
                    }, 60)
                  }
                }}
              />
              {draft.urgency === 'emergency' ? <EmergencyAdvice id="stay-safe" /> : null}
            </>
          ) : null}

          {step === 'access' ? (
            <>
              <p id="report-access-hint" className="-mt-2 text-body text-muted">
                {draft.urgency === 'emergency'
                  ? `For an emergency, ${firstName(landlordName)} will contact you to get in as soon as possible. Add times anyway if you can.`
                  : `Choose the times that suit you. Whoever comes must still give you ${LETTING_RULES.visitNoticeHours} hours’ written notice first.`}
              </p>
              <AccessGrid
                windows={draft.windows}
                today={ukDate(now)}
                describedBy="report-access-hint"
                onChange={(windows) => {
                  update({ windows })
                  if (errors.access) setErrors({})
                }}
              />
              <div className="rounded-card border border-line bg-surface px-4 py-1 shadow-soft">
                <Switch
                  label={
                    <span className="flex items-center gap-2">
                      <KeyIcon weight="bold" aria-hidden className="size-4.5 text-accent-text" />
                      They can use a key if I’m out
                    </span>
                  }
                  description={`${firstName(landlordName)}${agents.length ? ' or their agent' : ''} holds a key. They’ll still give you notice.`}
                  checked={draft.keyAllowed}
                  onCheckedChange={(keyAllowed) => update({ keyAllowed })}
                />
              </div>
              <Textarea
                label="Anything they should know?"
                optional
                hint="For example, the buzzer doesn’t work, or there’s a dog."
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
                maxLength={500}
                showCount
                rows={2}
              />
            </>
          ) : null}

          {step === 'check' ? (
            <CheckAnswers
              draft={draft}
              home={home}
              agents={agents}
              errors={errors}
              onChange={(target) =>
                navigate({ search: `?step=${target}&return=check` }, { state: { wizard: true } })
              }
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Stays in reach of the thumb, just above the bottom bar. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-(--gutter) mt-2 bg-[linear-gradient(to_bottom,transparent,var(--bg)_1.25rem)] px-(--gutter) pt-5 pb-3 lg:bottom-0 lg:pb-6">
        {step === 'check' ? (
          <Button
            size="lg"
            fullWidth
            loading={sending}
            iconEnd={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
            onClick={send}
          >
            Send to {firstName(landlordName)}
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            onClick={next}
            disabled={step === 'photos' && photosBusy}
            iconEnd={<ArrowRightIcon weight="bold" aria-hidden />}
          >
            {step === 'photos' && draft.photos.length === 0
              ? 'Continue without photos'
              : returnToCheck
                ? 'Save and go back to check'
                : 'Continue'}
          </Button>
        )}
        {step === 'photos' && photosBusy ? (
          <p className="mt-2 text-center text-small text-muted" aria-live="polite">
            Waiting for your photos to finish uploading.
          </p>
        ) : null}
      </div>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent
          size="sm"
          title="Stop reporting?"
          description="Your answers so far will be cleared."
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Keep going</Button>} />
              <Button
                variant="danger"
                onClick={() => {
                  reset()
                  setConfirmCancel(false)
                  navigate('/tenant')
                }}
              >
                Stop and clear
              </Button>
            </>
          }
        />
      </Dialog>
    </PortalPage>
  )
}

function Row({
  label,
  step,
  onChange,
  children,
}: {
  label: string
  step: Step
  onChange: (step: Step) => void
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
      <dt className="col-start-1 row-start-1 font-semibold text-ink">{label}</dt>
      <dd className="col-span-2 row-start-2 min-w-0 text-body text-ink sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {children}
      </dd>
      <dd className="col-start-2 row-start-1 sm:col-start-3">
        <button
          type="button"
          onClick={() => onChange(step)}
          className="-my-2.5 inline-flex min-h-11 items-center rounded-control px-1 text-small font-semibold text-accent-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Change<span className="sr-only"> {label.toLowerCase()}</span>
        </button>
      </dd>
    </div>
  )
}

function CheckAnswers({
  draft,
  home,
  agents,
  errors,
  onChange,
}: {
  draft: ReportDraft
  home: TenantHome
  agents: PersonCard[]
  errors: Errors
  onChange: (step: Step) => void
}) {
  const problem = problemById(draft.problemId)
  const urgency = draft.urgency ? URGENCY_META[draft.urgency] : null
  const UrgencyGlyph = urgency?.icon
  const windows = describeWindows(draft.windows)
  const landlord = home.landlord
  const fieldErrors = [
    errors.room,
    errors.problem,
    errors.description,
    errors.urgency,
    errors.access,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      {errors.form ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-control border-2 border-critical bg-critical-tint p-4"
        >
          <p className="font-semibold text-critical">{errors.form}</p>
          {fieldErrors.map((message) => (
            <p key={message} className="text-small text-ink">
              {message}
            </p>
          ))}
        </div>
      ) : null}
      <dl className="rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
        <Row label="Room" step="room" onChange={onChange}>
          {draft.room ? ROOM_LABELS[draft.room] : 'Not chosen'}
        </Row>
        <Row label="Problem" step="problem" onChange={onChange}>
          <span className="font-semibold">{problem?.label ?? 'Not chosen'}</span>
          <span className="mt-1 block whitespace-pre-line text-muted">
            {draft.description.trim()}
          </span>
        </Row>
        <Row label="Photos" step="photos" onChange={onChange}>
          {draft.photos.length === 0 ? (
            <span className="text-muted">None added</span>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label={`${draft.photos.length} photos`}>
              {draft.photos.map((photo) => (
                <li key={photo.id}>
                  <PhotoTile image={photo} showCaption={false} className="size-16" />
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row label="Urgency" step="urgency" onChange={onChange}>
          {urgency && UrgencyGlyph ? (
            <span className="flex items-start gap-2">
              <UrgencyGlyph weight="bold" aria-hidden className="mt-1 size-4 shrink-0" />
              <span>
                <span className="font-semibold">{urgency.label}.</span> {urgency.definition}
              </span>
            </span>
          ) : (
            'Not chosen'
          )}
        </Row>
        <Row label="Access" step="access" onChange={onChange}>
          {windows.length === 0 ? (
            <span className="text-muted">No times chosen. Your landlord will contact you.</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {windows.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <span className="mt-1 block text-muted">
            {draft.keyAllowed
              ? 'They can use a key if you’re out.'
              : 'They’ll only come when you’re home.'}
            {draft.notes.trim() ? ` “${draft.notes.trim()}”` : ''}
          </span>
        </Row>
      </dl>

      <div className="flex items-start gap-3 rounded-control bg-surface-2 p-4 text-small text-ink">
        <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p>
          <span className="font-semibold">
            {landlord ? landlord.displayName : 'Your landlord'}
            {agents.length > 0
              ? ` and ${agents.map((agent) => agent.displayName).join(', ')}, ${agents.length === 1 ? 'their letting agent' : 'their letting agents'},`
              : ''}{' '}
            will see this straight away.
          </span>{' '}
          Trades only see your address once your landlord chooses one to do the work.
        </p>
      </div>
    </div>
  )
}
