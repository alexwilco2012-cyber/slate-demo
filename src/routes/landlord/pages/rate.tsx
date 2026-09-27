// Rating a trade after a job, or a tenant at the end of a tenancy. Plain-words scales, never
// stars; the comment is checked as it's typed; private answers stay private. Once sent it's
// sealed, and both sides are revealed together (SPEC §5).

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'motion/react'
import {
  ChatTeardropTextIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PaperPlaneRightIcon,
} from '@phosphor-icons/react'
import { useSlate, useSlateQuery } from '@/data'
import { criteriaFor, type CriterionDef } from '@/domain/criteria'
import {
  type CriteriaAnswers,
  type JobId,
  type PersonId,
  type RatingDirection,
  type ScaleScore,
  type TenancyId,
  type WouldAgain,
} from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { formatDate } from '@/components/slate/format'
import { RELATIONSHIPS } from '@/domain/criteria'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { CheckedTextarea } from '../components/checked-text'
import { ReviewPolicyLink } from '../components/review-item'
import { ErrorPanel, PageSkeleton } from '../components/states'
import { reveal } from '../lib/dom'
import { errorMessage, fieldErrors } from '../lib/errors'
import { firstName, placeOf } from '../lib/format'

const WOULD_AGAIN: { value: WouldAgain; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'no', label: 'No' },
]

export default function RatePage() {
  const params = useParams()
  const kind = params.kind === 'tenancy' ? 'tenancy' : 'job'
  const contextId = params.contextId ?? ''
  const subjectId = (params.subjectId ?? '') as PersonId
  const direction: RatingDirection = kind === 'job' ? 'landlord->trade' : 'landlord->tenant'
  const context =
    kind === 'job'
      ? ({ kind: 'job', jobId: contextId as JobId } as const)
      : ({ kind: 'tenancy', tenancyId: contextId as TenancyId } as const)
  const viewer = useViewer()
  const { api } = useSlate()
  const toast = useToast()

  const { state, refresh } = useSlateQuery(
    async (api) => {
      const [tasks, subject] = await Promise.all([
        api.listRatingTasks(viewer),
        api.getPerson(viewer, subjectId),
      ])
      const task = tasks.find(
        (t) =>
          t.direction === direction &&
          t.subjectId === subjectId &&
          (t.context.kind === 'job' ? t.context.jobId : t.context.tenancyId) === contextId,
      )
      const draft = task?.ratingId ? await api.getRating(viewer, task.ratingId) : null
      let about = ''
      if (context.kind === 'job') {
        const job = await api.getJob(viewer, context.jobId)
        about = job ? `Repair: ${job.title}` : ''
      } else {
        const tenancy = await api.getTenancy(viewer, context.tenancyId)
        const property = tenancy ? await api.getProperty(viewer, tenancy.propertyId) : null
        about = property ? `Tenancy at ${placeOf(property)}` : 'Tenancy'
      }
      return { task, subject, draft, about }
    },
    [viewer, direction, subjectId, contextId],
  )

  const criteria: readonly CriterionDef[] = criteriaFor(direction, kind)
  const relationship = RELATIONSHIPS[direction]
  const [answers, setAnswers] = useState<Partial<Record<string, ScaleScore>>>({})
  const [comment, setComment] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [wouldAgain, setWouldAgain] = useState<WouldAgain | undefined>()
  const [safetyFlag, setSafetyFlag] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null)
  // What happened on sending: sealed until the other side rates, or revealed there and then
  // because they already had.
  const [outcome, setOutcome] = useState<'sealed' | 'revealed' | null>(null)
  const [loadedDraft, setLoadedDraft] = useState(false)

  const draft = state.data?.draft
  useEffect(() => {
    if (loadedDraft || state.data === undefined) return
    if (draft && draft.state === 'draft') {
      setAnswers({ ...(draft.answers as Partial<Record<string, ScaleScore>>) })
      setComment(draft.comment ?? '')
      setPrivateNote(draft.privateNote ?? '')
      setWouldAgain(draft.wouldAgain)
      setSafetyFlag(draft.safetyFlag)
    }
    setLoadedDraft(true)
  }, [draft, loadedDraft, state.data])

  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Rate" width="narrow">
        <ErrorPanel error={state.error} onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageSkeleton label="Loading the rating" />
      </PortalPage>
    )
  }

  const { task, subject, about } = state.data
  const name = subject ? firstName(subject.displayName) : 'them'
  const business = subject?.tradeProfile?.businessName

  if (!task) {
    return (
      <PortalPage title="Rate" width="narrow">
        <EmptyState
          icon={ChatTeardropTextIcon}
          title="There’s no rating to leave here"
          description="Ratings open after a completed job, or when a tenancy you both confirmed ends."
          action={
            <Link to="/landlord/ratings" className={buttonVariants()}>
              Reviews and ratings
            </Link>
          }
        />
      </PortalPage>
    )
  }

  const input = () => ({
    direction,
    context,
    subjectId,
    answers: answers as CriteriaAnswers,
    ...(comment.trim() ? { comment } : {}),
    ...(privateNote.trim() ? { privateNote } : {}),
    ...(wouldAgain ? { wouldAgain } : {}),
    safetyFlag,
  })

  async function saveDraft() {
    setBusy('draft')
    try {
      await api.saveRatingDraft(viewer, input())
      toast.success('Draft saved', {
        description: `Only you can see it. It closes ${formatDate(task!.closesAt)}.`,
      })
    } catch (error) {
      toast.error('That didn’t save', { description: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  async function send() {
    const missing = criteria.filter((c) => answers[c.id] === undefined)
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((c) => [`answers.${c.id}`, 'Choose an answer.'])))
      reveal(document.getElementById(`criterion-${missing[0]!.id}`), { block: 'center' })
      return
    }
    if (comment.trim() && comment.trim().length < 30) {
      return setErrors({ comment: 'Write at least 30 characters, or leave the comment empty.' })
    }
    setBusy('send')
    try {
      const rating = await api.submitRating(viewer, input())
      setOutcome(rating.state === 'revealed' ? 'revealed' : 'sealed')
      reveal(document.getElementById('main'), { block: 'start' })
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(Object.keys(fields).length ? fields : { form: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  const done =
    outcome ??
    (task.status === 'submitted' ? (draft?.state === 'revealed' ? 'revealed' : 'sealed') : null)
  if (done) {
    const revealed = done === 'revealed'
    const Glyph = revealed ? LockSimpleOpenIcon : LockSimpleIcon
    return (
      <PortalPage title={revealed ? 'Ratings revealed' : 'Rating sent'} width="narrow">
        <div className="flex flex-col items-center gap-5 rounded-card border border-line bg-surface px-6 py-12 text-center shadow-soft">
          <motion.span
            initial={{ scale: 0.6, opacity: 0, rotate: revealed ? 0 : -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="flex size-20 items-center justify-center rounded-full bg-accent-tint text-accent-text"
            aria-hidden="true"
          >
            <motion.span
              initial={revealed ? { y: 3 } : false}
              animate={{ y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 14 }}
              className="flex"
            >
              <Glyph weight="duotone" className="size-10" />
            </motion.span>
          </motion.span>
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="font-display text-display-l font-semibold text-ink">
              {revealed ? 'Revealed together' : 'Sent and sealed'}
            </h1>
            <p className="text-body-l text-muted">
              {revealed
                ? `${name} had already rated you, so both ratings are now revealed. Yours now counts towards ${name}’s score, and theirs is with your reviews. Neither can change now.`
                : `Nobody sees it yet. When ${name} rates you, or the window closes on ${formatDate(task.closesAt)}, both ratings are revealed together. It can’t be changed after that.`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/landlord/ratings" className={buttonVariants()}>
              {revealed ? `See what ${name} said` : 'Back to reviews and ratings'}
            </Link>
          </div>
          <ReviewPolicyLink />
        </div>
      </PortalPage>
    )
  }

  const tenantRating = direction === 'landlord->tenant'

  return (
    <PortalPage title={`Rate ${name}`} width="narrow">
      <PageHeader
        back={{ to: '/landlord/ratings', label: 'Reviews and ratings' }}
        eyebrow={about}
        title={`How was ${business ?? name}?`}
        description={
          tenantRating
            ? `Your answers go into ${name}’s tenant passport. There’s no single score. We count each question on its own, and only ${name} can share it.`
            : `Your rating counts towards the “From landlords” half of ${name}’s score, shown on their public profile.`
        }
        meta={
          <span className="text-small text-muted">
            Closes {formatDate(task.closesAt)}
            {task.counterpartHasRated
              ? ` · ${name} has rated you. Leave yours to see what they said.`
              : ''}
          </span>
        }
      />

      {/* Our own messages sit beside each question, so the browser's pop-up checks are off. */}
      <form
        noValidate
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        {criteria.map((criterion) => (
          <div key={criterion.id} id={`criterion-${criterion.id}`} className="scroll-mt-28">
            <PlainWordsScale
              label={criterion.label}
              scale={criterion.scale}
              value={answers[criterion.id]}
              onValueChange={(score) => {
                setAnswers((current) => ({ ...current, [criterion.id]: score }))
                setErrors((current) => ({ ...current, [`answers.${criterion.id}`]: undefined }))
              }}
              error={errors[`answers.${criterion.id}`]}
              required
            />
          </div>
        ))}

        <CheckedTextarea
          label={
            tenantRating
              ? 'Anything to add, in your own words?'
              : `Your opinion, for other landlords`
          }
          hint={
            tenantRating
              ? `Start with “In my experience”. It appears in ${name}’s passport as “Landlord’s opinion”, and ${name} can reply.`
              : `Start with “In my experience”. It’s shown publicly as “Landlord’s opinion”, and ${name} can reply once.`
          }
          optional
          value={comment}
          onChange={(value) => {
            setComment(value)
            setErrors((current) => ({ ...current, comment: undefined }))
          }}
          minLength={30}
          maxLength={1000}
          error={errors.comment}
          onBlockedChange={setBlocked}
        />

        <fieldset className="flex flex-col gap-5 rounded-card bg-surface-2 p-4 sm:p-5">
          <legend className="sr-only">Private, never shown</legend>
          <p className="flex items-center gap-2 text-small font-semibold text-ink">
            <LockSimpleIcon weight="bold" aria-hidden className="size-4" />
            Private: never shown to {name} or anyone else, and never scored
          </p>
          <RadioGroup
            label={relationship.wouldAgainQuestion}
            options={WOULD_AGAIN}
            value={wouldAgain}
            onValueChange={setWouldAgain}
          />
          <Textarea
            label="A private note"
            optional
            hint="For your own records and our moderators only."
            value={privateNote}
            onChange={(event) => setPrivateNote(event.target.value)}
            maxLength={1000}
            showCount
            rows={3}
          />
          <Checkbox
            label="Something felt unsafe"
            description="Sends this to our moderators to look at. It doesn’t change the rating."
            checked={safetyFlag}
            onCheckedChange={setSafetyFlag}
          />
        </fieldset>

        {errors.form ? (
          <p role="alert" className="text-body font-semibold text-critical">
            {errors.form}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <p className="text-small text-muted">
            Once sent, a rating can’t be changed. You can add one dated update later if things
            change.
          </p>
          <div className="flex flex-col-reverse gap-(--gap-touch) sm:flex-row sm:justify-end">
            <Button variant="secondary" loading={busy === 'draft'} onClick={saveDraft}>
              Save draft
            </Button>
            <Button
              type="submit"
              loading={busy === 'send'}
              disabled={blocked}
              iconStart={<PaperPlaneRightIcon weight="bold" aria-hidden />}
            >
              Send rating
            </Button>
          </div>
          <ReviewPolicyLink className="self-start" />
        </div>
      </form>
    </PortalPage>
  )
}
