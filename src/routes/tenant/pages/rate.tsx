// Leaving a rating: the trade after a visit, the landlord's handling of a repair (sealed by the
// retaliation shield), or the landlord at the end of a tenancy. Plain words, never stars; an
// optional public opinion with a live check for things reviews mustn't mention; a private note;
// the private "again?" question; and a safety flag that goes to moderation.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import {
  EyeSlashIcon,
  FloppyDiskIcon,
  LockSimpleIcon,
  PaperPlaneTiltIcon,
  ShieldWarningIcon,
  StarIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import {
  SlateError,
  type RatingInput,
  type RatingTask,
  type SlateApi,
  type TextCheck,
  type Viewer,
} from '@/data/api'
import { useDemoNow, useSlate, useSlateQuery } from '@/data'
import { criteriaFor, RATING_RULES, RELATIONSHIPS, SCALES, type ScaleId } from '@/domain/criteria'
import { isId } from '@/domain/ids'
import {
  SENSITIVE_TOPIC_LABELS,
  type ContextRef,
  type CriteriaAnswers,
  type Rating,
  type ScaleScore,
  type WouldAgain,
} from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/components/ui/cn'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { RadioGroup } from '@/components/ui/radio-group'
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/components/slate/format'
import { PageHeader } from '@/components/slate/page-header'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { Explainer, QueryError, ReviewPolicyLink } from '../components/basics'
import { ratingFor, taskFor } from '../lib/data'
import { firstName } from '../lib/format'
import {
  doubleBlindExplanation,
  sealOf,
  shieldExplanation,
  type TenantDirection,
} from '../lib/ratings'

interface Back {
  to: string
  label: string
  text: string
}

interface Target {
  direction: TenantDirection
  context: ContextRef
  /** Where "back" goes, and the words for the button after sending. */
  back: Back
}

async function loadRating(api: SlateApi, viewer: Viewer, target: Target) {
  const [tasks, ratings] = await Promise.all([
    api.listRatingTasks(viewer),
    api.listMyRatings(viewer),
  ])
  const task = taskFor(tasks, target.direction, target.context) ?? null
  const existing = ratingFor(ratings, target.direction, target.context) ?? null
  const subjectId = task?.subjectId ?? existing?.subjectId
  const [subject, about] = await Promise.all([
    subjectId ? api.getPerson(viewer, subjectId) : Promise.resolve(null),
    target.context.kind === 'job'
      ? api.getJob(viewer, target.context.jobId).then((job) => job?.title ?? null)
      : api
          .getTenancy(viewer, target.context.tenancyId)
          .then(async (tenancy) =>
            tenancy
              ? ((await api.getProperty(viewer, tenancy.propertyId))?.addressLine ?? null)
              : null,
          ),
  ])
  return { task, existing, subject, about }
}

/** /tenant/jobs/:jobId/rate/:who and /tenant/tenancies/:tenancyId/rate */
export function RatePage() {
  const { jobId, who, tenancyId } = useParams()
  const target: Target | null = useMemo(() => {
    if (isId('job', jobId) && (who === 'trade' || who === 'landlord')) {
      return {
        direction: who === 'trade' ? 'tenant->trade' : 'tenant->landlord',
        context: { kind: 'job', jobId },
        back: { to: `/tenant/jobs/${jobId}`, label: 'Repair', text: 'Back to the repair' },
      }
    }
    if (isId('tenancy', tenancyId)) {
      return {
        direction: 'tenant->landlord',
        context: { kind: 'tenancy', tenancyId },
        back: {
          to: `/tenant/tenancies/${tenancyId}`,
          label: 'Your tenancy',
          text: 'Back to your tenancy',
        },
      }
    }
    return null
  }, [jobId, who, tenancyId])
  const viewer = useViewer()
  const [justSent, setJustSent] = useState<Rating | null>(null)
  const { state, refresh } = useSlateQuery(
    async (api) => (target ? loadRating(api, viewer, target) : null),
    [viewer, target],
  )

  if (!target) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageHeader title="Nothing to rate here" />
        <p className="text-body text-muted">This link doesn’t point to a rating.</p>
      </PortalPage>
    )
  }
  if (state.status === 'loading') {
    return (
      <PortalPage title="Rate" width="narrow">
        <LoadingRegion label="Loading the rating form" className="flex flex-col gap-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-20 w-full rounded-card" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-44 w-full rounded-card" />
          ))}
        </LoadingRegion>
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageHeader back={target.back} title="Rate" />
        <QueryError what="this rating" onRetry={refresh} />
      </PortalPage>
    )
  }
  const { task, existing, subject, about } = state.data
  // Straight after sending, the moment of sealing rather than the "already rated" page.
  if (justSent) {
    return (
      <SentState
        rating={justSent}
        subjectName={subject?.displayName ?? 'them'}
        about={about}
        back={target.back}
        shielded={justSent.seal === 'retaliation_shield'}
      />
    )
  }
  if (!task && (!existing || existing.state === 'draft')) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageHeader back={target.back} title="This rating isn’t open" />
        <EmptyState
          icon={StarIcon}
          headingLevel="h2"
          title="Nothing to rate yet"
          description="Ratings open after a visit you’ve confirmed, a finished repair, or the end of a tenancy confirmed by both of you."
          action={
            <Link to={target.back.to} className={buttonVariants()}>
              Back
            </Link>
          }
        />
      </PortalPage>
    )
  }
  if (existing && existing.state !== 'draft') {
    return (
      <AlreadySent
        rating={existing}
        subjectName={subject?.displayName ?? 'them'}
        about={about}
        back={target.back}
      />
    )
  }
  return (
    <RatingForm
      key={`${target.direction}-${JSON.stringify(target.context)}`}
      target={target}
      task={task!}
      draft={existing}
      subjectName={subject?.displayName ?? 'them'}
      about={about}
      onSent={setJustSent}
    />
  )
}

function useTextCheck(text: string, allowedNames: string[]) {
  const { api } = useSlate()
  const [check, setCheck] = useState<TextCheck | null>(null)
  useEffect(() => {
    if (text.trim().length < 3) {
      setCheck(null)
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      api
        .checkText(text)
        .then((result) => live && setCheck(result))
        .catch(() => undefined)
    }, 350)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [api, text])
  // The person being rated may be named ("Kev fixed it"); the live check doesn't know who that is.
  const allowed = new Set(
    allowedNames.flatMap((name) => [name, ...name.split(' ')]).map((n) => n.toLowerCase()),
  )
  const issues = (check?.issues ?? []).filter(
    (issue) =>
      !(
        issue.topic === 'third_party_name' &&
        allowed.has(text.slice(issue.start, issue.end).toLowerCase().trim())
      ),
  )
  const topics = (action: 'block' | 'flag') => [
    ...new Set(
      issues
        .filter((issue) => issue.action === action)
        .map((issue) => SENSITIVE_TOPIC_LABELS[issue.topic]),
    ),
  ]
  return { blocked: topics('block'), flagged: topics('flag') }
}

function listWords(words: string[]) {
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} or ${words.at(-1)}` : (words[0] ?? '')
}

function RatingForm({
  target,
  task,
  draft,
  subjectName,
  about,
  onSent,
}: {
  target: Target
  task: RatingTask
  draft: Rating | null
  subjectName: string
  about: string | null
  onSent: (rating: Rating) => void
}) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const now = useDemoNow()
  const criteria = criteriaFor(target.direction, target.context.kind)
  const shielded = sealOf(target.direction, target.context) === 'retaliation_shield'
  const relationship = RELATIONSHIPS[target.direction]
  const name = firstName(subjectName)

  const [answers, setAnswers] = useState<CriteriaAnswers>(() => ({ ...draft?.answers }))
  const [comment, setComment] = useState(draft?.comment ?? '')
  const [privateNote, setPrivateNote] = useState(draft?.privateNote ?? '')
  const [wouldAgain, setWouldAgain] = useState<WouldAgain | undefined>(draft?.wouldAgain)
  const [safetyFlag, setSafetyFlag] = useState(draft?.safetyFlag ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const check = useTextCheck(comment, [subjectName])

  const answered = criteria.filter(
    (c) => answers[c.id as keyof CriteriaAnswers] !== undefined,
  ).length
  const commentLength = comment.trim().length
  const commentTooShort = commentLength > 0 && commentLength < RATING_RULES.commentLength.min

  function input(): RatingInput {
    return {
      direction: target.direction,
      context: target.context,
      subjectId: task.subjectId,
      answers,
      ...(comment.trim() && !shielded ? { comment: comment.trim() } : {}),
      ...(privateNote.trim() ? { privateNote: privateNote.trim() } : {}),
      ...(wouldAgain ? { wouldAgain } : {}),
      safetyFlag,
    }
  }

  function showError(error: unknown) {
    if (error instanceof SlateError) {
      const fields: Record<string, string> = {}
      for (const [key, value] of Object.entries(error.fields))
        if (value) fields[key.replace(/^answers\./, '')] = value
      setErrors(fields)
      setFormError(error.message)
    } else {
      setFormError('That didn’t go through. Your answers are still here, so try again.')
    }
    window.setTimeout(() => errorRef.current?.focus(), 0)
  }

  async function saveDraft() {
    setSaving(true)
    try {
      await api.saveRatingDraft(viewer, input())
      toast.success('Saved for later', {
        description: `Finish it before ${formatDate(task.closesAt)}.`,
      })
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  function review() {
    const missing: Record<string, string> = {}
    for (const criterion of criteria) {
      if (answers[criterion.id as keyof CriteriaAnswers] === undefined)
        missing[criterion.id] = 'Choose an answer.'
    }
    if (commentTooShort)
      missing.comment = `Write at least ${RATING_RULES.commentLength.min} characters, or leave it empty.`
    if (check.blocked.length > 0)
      missing.comment = `Take out anything about ${listWords(check.blocked)}.`
    setErrors(missing)
    if (Object.keys(missing).length > 0) {
      setFormError('A few answers need a look before you send.')
      window.setTimeout(() => errorRef.current?.focus(), 0)
      return
    }
    setFormError(undefined)
    setConfirming(true)
  }

  async function send() {
    setSending(true)
    try {
      const rating = await api.submitRating(viewer, input())
      setConfirming(false)
      window.scrollTo({ top: 0 })
      onSent(rating)
    } catch (error) {
      setConfirming(false)
      showError(error)
    } finally {
      setSending(false)
    }
  }

  const title =
    target.context.kind === 'tenancy'
      ? `Rate ${name} as your landlord`
      : target.direction === 'tenant->trade'
        ? `Rate ${name}’s visit`
        : `How did ${name} handle the repair?`

  return (
    <PortalPage title={title} width="narrow">
      <PageHeader back={target.back} eyebrow={about ?? undefined} title={title} />

      {shielded ? (
        <Explainer
          icon={<LockSimpleIcon weight="bold" />}
          title="Sealed, and never shown on its own"
          tone="accent"
        >
          <p>{shieldExplanation(subjectName)}</p>
          <p>Two questions about how {name} handled this repair.</p>
        </Explainer>
      ) : (
        <Explainer
          icon={<EyeSlashIcon weight="bold" />}
          title="Sealed until you’ve both rated"
          tone="accent"
        >
          <p>{doubleBlindExplanation(subjectName, formatDate(task.closesAt))}</p>
          {task.counterpartHasRated ? (
            <p className="font-semibold">
              {name} has already rated you. Leave yours to see what they said.
            </p>
          ) : null}
        </Explainer>
      )}

      {formError ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-2 rounded-control border-2 border-critical bg-critical-tint p-4 text-small font-semibold text-critical outline-none"
        >
          <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          review()
        }}
        className="flex flex-col gap-8"
        noValidate
      >
        <section aria-labelledby="questions-title" className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="questions-title" className="font-display text-display-m font-semibold text-ink">
              {criteria.length === 1 ? 'One question' : `${criteria.length} questions`}
            </h2>
            <p className="figures text-small text-muted" aria-live="polite">
              {answered} of {criteria.length} answered
            </p>
          </div>
          {criteria.map((criterion) => (
            <PlainWordsScale
              key={criterion.id}
              label={criterion.label}
              scale={criterion.scale}
              value={answers[criterion.id as keyof CriteriaAnswers] as ScaleScore | undefined}
              onValueChange={(score) => {
                setAnswers((current) => ({ ...current, [criterion.id]: score }))
                setErrors((current) => {
                  const { [criterion.id]: _cleared, ...rest } = current
                  return rest
                })
              }}
              error={errors[criterion.id]}
              className="rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5"
            />
          ))}
        </section>

        <section aria-labelledby="words-title" className="flex flex-col gap-5">
          <h2 id="words-title" className="font-display text-display-m font-semibold text-ink">
            In your own words
          </h2>
          {shielded ? null : (
            <div className="flex flex-col gap-2">
              <Textarea
                label="Your opinion"
                optional
                hint={`Start with “In my experience”. It appears as “Tenant’s opinion”, never with your name. Don’t mention anyone’s children, health, benefits, religion or background, or other people by name.`}
                placeholder="In my experience…"
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  if (errors.comment) setErrors(({ comment: _c, ...rest }) => rest)
                }}
                maxLength={RATING_RULES.commentLength.max}
                minLength={RATING_RULES.commentLength.min}
                showCount
                rows={4}
                error={errors.comment}
              />
              <div aria-live="polite">
                {check.blocked.length > 0 && !errors.comment ? (
                  <p className="flex items-start gap-2 text-small font-semibold text-critical">
                    <WarningCircleIcon
                      weight="bold"
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0"
                    />
                    Reviews can’t mention {listWords(check.blocked)}. Take that out to send.
                  </p>
                ) : null}
                {check.flagged.length > 0 ? (
                  <p className="flex items-start gap-2 text-small text-muted">
                    <ShieldWarningIcon
                      weight="bold"
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0"
                    />
                    This seems to mention {listWords(check.flagged)}. You can still send it, and a
                    moderator will check it.
                  </p>
                ) : null}
              </div>
            </div>
          )}
          <Textarea
            label="A private note"
            optional
            hint={`Only you and our moderators see this. ${name} never does.`}
            value={privateNote}
            onChange={(event) => setPrivateNote(event.target.value)}
            maxLength={1000}
            rows={2}
          />
          <RadioGroup
            label={relationship.wouldAgainQuestion}
            hint="Private. We never show it to anyone or count it in a score."
            value={wouldAgain}
            onValueChange={setWouldAgain}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'not_sure', label: 'Not sure' },
              { value: 'no', label: 'No' },
            ]}
          />
          <div className="rounded-card border border-line bg-surface px-4 py-1 shadow-soft">
            <Checkbox
              label="I have a safety concern"
              description="Our moderators will look at it. It doesn’t change the score."
              checked={safetyFlag}
              onCheckedChange={setSafetyFlag}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <ReviewPolicyLink />
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              loading={saving}
              onClick={saveDraft}
              iconStart={<FloppyDiskIcon weight="bold" aria-hidden />}
            >
              Save and finish later
            </Button>
            <Button
              type="submit"
              size="lg"
              iconEnd={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
            >
              Check and send
            </Button>
          </div>
          <p className="text-center text-caption text-muted sm:text-right">
            {now > task.closesAt
              ? `Closed on ${formatDate(task.closesAt)}`
              : `Open until ${formatDate(task.closesAt)}`}
          </p>
        </div>
      </form>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Send your rating?"
          description={
            shielded
              ? `We seal it as soon as you send it, and you can’t change it. ${name} will never see it on its own.`
              : `We seal it as soon as you send it, and you can’t change it. Once it’s revealed, you can add one dated update.`
          }
          footer={
            <>
              <DialogClose render={<Button variant="secondary">Go back</Button>} />
              <Button
                loading={sending}
                onClick={send}
                iconEnd={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
              >
                Send and seal
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-1.5 rounded-control bg-surface-2 p-4 text-small text-ink">
            {criteria.map((criterion) => {
              const score = answers[criterion.id as keyof CriteriaAnswers]
              return (
                <li key={criterion.id} className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-muted">{criterion.short}</span>
                  <span className="font-semibold">
                    {score !== undefined ? scaleWord(criterion.scale, score) : 'Not answered'}
                  </span>
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </PortalPage>
  )
}

function scaleWord(scale: ScaleId, score: ScaleScore) {
  const points: readonly { score: ScaleScore; label: string }[] = SCALES[scale]
  return points.find((point) => point.score === score)?.label ?? String(score)
}

function SentState({
  rating,
  subjectName,
  about,
  back,
  shielded,
}: {
  rating: Rating
  subjectName: string
  about: string | null
  back: Back
  shielded: boolean
}) {
  const reduce = useReducedMotion()
  const name = firstName(subjectName)
  return (
    <PortalPage title="Rating sent" width="narrow" className="gap-8">
      <header className="flex flex-col items-center gap-5 pt-4 text-center">
        <motion.span
          aria-hidden="true"
          initial={reduce ? false : { scale: 0.7, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16 }}
          className="flex size-20 items-center justify-center rounded-full bg-surface text-accent-text shadow-raised ring-8 ring-accent-tint"
        >
          <LockSimpleIcon weight="bold" className="size-9" />
        </motion.span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-display-l font-semibold text-ink">Sent and sealed</h1>
          <p className="max-w-md text-body-l text-muted">
            {shielded
              ? `${name} will never see this on its own. It will only ever count inside their overall score.`
              : rating.revealAt
                ? `We’ll reveal your rating of ${name} together with theirs, by ${formatDate(rating.revealAt)} at the latest.`
                : `We’ll reveal your rating of ${name} together with theirs once you’ve both rated, or when the window closes.`}
          </p>
          {about ? <p className="text-small text-muted">{about}</p> : null}
        </div>
      </header>
      <Link
        to={back.to}
        className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto sm:self-center')}
      >
        {back.text}
      </Link>
      <Link
        to="/tenant/ratings"
        className="self-center text-small font-semibold text-accent-text underline underline-offset-4"
      >
        See all your ratings
      </Link>
    </PortalPage>
  )
}

function AlreadySent({
  rating,
  subjectName,
  about,
  back,
}: {
  rating: Rating
  subjectName: string
  about: string | null
  back: Back
}) {
  const name = firstName(subjectName)
  return (
    <PortalPage title="Already rated" width="narrow">
      <PageHeader back={back} eyebrow={about ?? undefined} title={`You’ve rated ${name}`} />
      {rating.state === 'revealed' ? (
        <Link to={`/tenant/reviews/${rating.id}`} className={cn(buttonVariants(), 'self-start')}>
          See the published review
        </Link>
      ) : (
        <Explainer icon={<LockSimpleIcon weight="bold" />} title="Sealed">
          <p>
            {rating.seal === 'retaliation_shield'
              ? shieldExplanation(subjectName)
              : rating.revealAt
                ? `It’s revealed with ${name}’s rating by ${formatDate(rating.revealAt)} at the latest.`
                : `It’s revealed with ${name}’s rating once you’ve both rated.`}
          </p>
        </Explainer>
      )}
    </PortalPage>
  )
}
