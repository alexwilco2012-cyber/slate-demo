// Rating the landlord or the tenant after a job, in plain words (never stars). The page says who
// will see it before anything else. Sending seals it; if the other side has already rated, both
// are revealed there and then.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  FloppyDiskIcon,
  PaperPlaneTiltIcon,
  ShieldCheckIcon,
  SignpostIcon,
} from '@phosphor-icons/react'
import { SlateError, useSlate, useSlateQuery, type TextIssue } from '@/data'
import { criteriaFor, RATING_RULES } from '@/domain/criteria'
import { isId } from '@/domain/ids'
import {
  SENSITIVE_TOPIC_LABELS,
  type CriteriaAnswers,
  type Rating,
  type RatingDirection,
  type ScaleScore,
  type WouldAgain,
} from '@/domain/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/slate/page-header'
import { PlainWordsScale } from '@/components/slate/plain-words-scale'
import { RoleChip } from '@/components/slate/role-chip'
import { PortalPage } from '@/routes/_shell'
import { useViewer } from '@/session'
import { ActionDock } from '../components/action-dock'
import { LoadError, PageSkeleton } from '../components/page-bits'
import { directionOf, type RateWho } from '../jobs/job-ratings'
import { errorText } from '../lib/errors'
import { firstNameOf } from '../lib/job'
import { formatShortDay } from '../lib/time'
import { loadRate, type RateData } from './load'
import { RatingSent } from './rating-sent'

export default function RatePage() {
  const { jobId, who } = useParams()
  const viewer = useViewer()
  const side: RateWho | null = who === 'landlord' || who === 'tenant' ? who : null
  const { state, refresh } = useSlateQuery(
    (api) =>
      isId('job', jobId) && side
        ? loadRate(api, viewer, jobId, directionOf(side))
        : Promise.resolve(null),
    [viewer, jobId, side],
  )

  if (state.status === 'loading') {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageSkeleton label="Loading" />
      </PortalPage>
    )
  }
  if (state.status === 'error' && !state.data) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageHeader back={{ to: '/trade/ratings', label: 'Ratings' }} title="Rate" />
        <LoadError what="this rating" onRetry={refresh} />
      </PortalPage>
    )
  }
  if (!state.data || !side) {
    return (
      <PortalPage title="Rate" width="narrow">
        <PageHeader
          back={{ to: '/trade/ratings', label: 'Ratings' }}
          title="Nothing to rate here"
        />
        <EmptyState
          icon={SignpostIcon}
          headingLevel="h2"
          title="This rating isn’t open"
          description="Ratings open when the work is done and close when their window ends. Your open ones are on the ratings page."
          action={
            <Link to="/trade/ratings" className={buttonVariants({ variant: 'primary' })}>
              Your ratings
            </Link>
          }
        />
      </PortalPage>
    )
  }
  return <RateForm key={`${state.data.job.id}-${side}`} data={state.data} who={side} />
}

function visibilityText(who: RateWho, name: string) {
  return who === 'landlord'
    ? [
        `Other trades see it on ${name}’s client profile, but only once ${name}’s rating of you is locked in.`,
        `${name} sees their client rating from trades, never who said what.`,
      ]
    : [`Only ${name} sees it.`, `${name}’s landlord only sees whether you got in as arranged.`]
}

function RateForm({ data, who }: { data: RateData; who: RateWho }) {
  const { api } = useSlate()
  const viewer = useViewer()
  const toast = useToast()
  const { job, task, subject, draft } = data
  const direction: RatingDirection = task.direction
  const criteria = criteriaFor(direction, 'job')
  const name = firstNameOf(subject?.displayName, `the ${who}`)
  const [answers, setAnswers] = useState<CriteriaAnswers>(() => ({ ...draft?.answers }))
  const [comment, setComment] = useState(draft?.comment ?? '')
  const [privateNote, setPrivateNote] = useState(draft?.privateNote ?? '')
  const [wouldAgain, setWouldAgain] = useState<WouldAgain | undefined>(draft?.wouldAgain)
  const [safetyFlag, setSafetyFlag] = useState(draft?.safetyFlag ?? false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [issues, setIssues] = useState<TextIssue[]>([])
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null)
  const [sent, setSent] = useState<Rating | null>(null)

  // The filter runs as the trade types, so a blocked topic is caught before they press send.
  useEffect(() => {
    if (!comment.trim()) {
      setIssues([])
      return
    }
    const timer = window.setTimeout(() => {
      api
        .checkText(comment)
        .then((check) => setIssues(check.issues))
        .catch(() => setIssues([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [api, comment])

  const subjectFirst = name.toLowerCase()
  const shownIssues = issues.filter(
    (issue) =>
      !(
        issue.topic === 'third_party_name' &&
        comment.slice(issue.start, issue.end).toLowerCase().includes(subjectFirst)
      ),
  )
  const blocked = [
    ...new Set(
      shownIssues
        .filter((issue) => issue.action === 'block')
        .map((i) => SENSITIVE_TOPIC_LABELS[i.topic]),
    ),
  ]
  const flagged = [
    ...new Set(
      shownIssues
        .filter((issue) => issue.action === 'flag')
        .map((i) => SENSITIVE_TOPIC_LABELS[i.topic]),
    ),
  ]

  const input = {
    direction,
    context: task.context,
    subjectId: task.subjectId,
    answers,
    comment: comment.trim() || undefined,
    privateNote: privateNote.trim() || undefined,
    wouldAgain,
    safetyFlag,
  }

  async function save(mode: 'draft' | 'send') {
    setBusy(mode)
    setErrors({})
    try {
      if (mode === 'draft') {
        await api.saveRatingDraft(viewer, input)
        toast.success('Draft saved', {
          description: `Nobody sees it until you send it. Send by ${formatShortDay(task.closesAt)}.`,
        })
      } else {
        const rating = await api.submitRating(viewer, input)
        const fresh = (await api.getRating(viewer, rating.id)) ?? rating
        setSent(fresh)
        window.scrollTo({ top: 0 })
      }
    } catch (error) {
      if (error instanceof SlateError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
        const first = Object.keys(error.fields)[0]
        document.getElementById(`field-${first}`)?.scrollIntoView({ block: 'center' })
      }
      toast.error(mode === 'draft' ? 'Draft not saved' : 'Rating not sent', {
        description: errorText(error),
      })
    } finally {
      setBusy(null)
    }
  }

  if (sent) {
    return <RatingSent rating={sent} data={data} who={who} name={name} />
  }
  if (task.status === 'submitted') {
    return (
      <PortalPage title={`Rate ${name}`} width="narrow">
        <PageHeader
          back={{ to: `/trade/jobs/${job.id}`, label: 'Back to the job' }}
          eyebrow={job.title}
          title={`You’ve rated ${name}`}
          description="You can’t change a rating once it’s sent. You can add one dated update after it’s revealed."
        />
        <Link to={`/trade/jobs/${job.id}`} className={buttonVariants({ variant: 'primary' })}>
          Back to the job
        </Link>
      </PortalPage>
    )
  }

  const [see, limit] = visibilityText(who, name)
  const commentLength = comment.trim().length
  const commentShort =
    commentLength > 0 && commentLength < RATING_RULES.commentLength.min
      ? `Write at least ${RATING_RULES.commentLength.min} characters, or leave it empty.`
      : undefined

  return (
    <PortalPage title={`Rate ${name}`} width="narrow">
      <PageHeader
        back={{ to: `/trade/jobs/${job.id}`, label: 'Back to the job' }}
        eyebrow={job.title}
        title={`Rate ${name}`}
        meta={<RoleChip role={who} size="md" />}
      />

      <section
        aria-labelledby="who-sees"
        className="flex gap-3 rounded-card border border-line bg-surface p-4 shadow-soft"
      >
        <ShieldCheckIcon weight="duotone" aria-hidden className="size-8 shrink-0 text-brand" />
        <div className="flex flex-col gap-1.5">
          <h2 id="who-sees" className="font-bold text-ink">
            Who sees this
          </h2>
          <p className="text-ink">{see}</p>
          <p className="text-ink">{limit}</p>
          <p className="text-small text-muted">
            It stays sealed until {name} has rated too, or {formatShortDay(task.closesAt)}. You
            can’t change it once it’s sent.{' '}
            <Link to="/policies/reviews" className="font-semibold text-accent-text underline">
              Review policy
            </Link>
          </p>
        </div>
      </section>

      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault()
          void save('send')
        }}
      >
        {criteria.map((criterion) => (
          <div key={criterion.id} id={`field-answers.${criterion.id}`}>
            <PlainWordsScale
              label={criterion.label}
              scale={criterion.scale}
              value={answers[criterion.id as keyof CriteriaAnswers]}
              onValueChange={(score: ScaleScore) =>
                setAnswers((current) => ({ ...current, [criterion.id]: score }))
              }
              error={errors[`answers.${criterion.id}`]}
            />
          </div>
        ))}

        <div id="field-comment" className="flex flex-col gap-2">
          <Textarea
            label={who === 'landlord' ? 'Your opinion for other trades' : `A note for ${name}`}
            optional
            hint={
              who === 'landlord'
                ? `Start with “In my experience”. Shown as “Trade’s opinion”, never with your name. ${RATING_RULES.commentLength.min} to ${RATING_RULES.commentLength.max.toLocaleString('en-GB')} characters.`
                : `Only ${name} sees it. ${RATING_RULES.commentLength.min} to ${RATING_RULES.commentLength.max.toLocaleString('en-GB')} characters.`
            }
            placeholder={who === 'landlord' ? 'In my experience…' : undefined}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={RATING_RULES.commentLength.max}
            showCount
            error={errors.comment ?? commentShort}
          />
          <div aria-live="polite" className="flex flex-col gap-2">
            {blocked.length > 0 ? (
              <p className="rounded-control bg-critical-tint p-3 text-small font-semibold text-critical">
                Take out mentions of {blocked.join(', ')}. Ratings are about the job, not the
                person’s private life.
              </p>
            ) : null}
            {flagged.length > 0 ? (
              <p className="rounded-control bg-info-tint p-3 text-small text-info">
                We’ll check the mention of {flagged.join(', ')} before it’s shown.
              </p>
            ) : null}
          </div>
        </div>

        <Textarea
          label="Private note"
          optional
          hint="Only you and our moderators see this. It isn’t scored."
          value={privateNote}
          onChange={(event) => setPrivateNote(event.target.value)}
          maxLength={1000}
          rows={2}
          error={errors.privateNote}
        />

        <SegmentedControl
          label={`${data.wouldAgainQuestion}`}
          hint="Private. We never show it to anyone or count it in a score."
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'not_sure', label: 'Not sure' },
            { value: 'no', label: 'No' },
          ]}
          value={wouldAgain}
          onValueChange={setWouldAgain}
        />

        <Checkbox
          label={
            who === 'tenant' ? 'I felt unsafe or was treated badly' : 'I have a safety concern'
          }
          description="Goes straight to our moderators. It doesn’t change the rating."
          checked={safetyFlag}
          onCheckedChange={setSafetyFlag}
        />

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-muted">
            Not ready yet? Save it as a draft. Nobody else sees drafts.
          </p>
          <Button
            variant="secondary"
            loading={busy === 'draft'}
            iconStart={<FloppyDiskIcon weight="bold" aria-hidden />}
            onClick={() => save('draft')}
            className="shrink-0"
          >
            Save draft
          </Button>
        </div>

        <ActionDock label="Rating actions">
          <Button
            type="submit"
            size="trade"
            loading={busy === 'send'}
            disabled={blocked.length > 0}
            iconStart={<PaperPlaneTiltIcon weight="bold" aria-hidden />}
          >
            Send rating
          </Button>
        </ActionDock>
      </form>
    </PortalPage>
  )
}
