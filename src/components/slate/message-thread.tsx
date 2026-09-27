import { Fragment, useId, type FormEvent, type ReactNode } from 'react'
import {
  CalendarCheckIcon,
  FlagIcon,
  InfoIcon,
  PaperPlaneRightIcon,
  PaperclipIcon,
} from '@phosphor-icons/react'
import type { ImageRef, IsoDateTime, Role } from '@/domain/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/icon-button'
import { daysBetween, formatTime, formatWeekday } from './format'
import { RoleChip } from './role-chip'

export interface ThreadMessage {
  id: string
  /** 'notice' is the written 48-hour notice of a visit; 'system' a line such as "Visit booked". */
  kind: 'text' | 'notice' | 'system'
  body: string
  sentAt: IsoDateTime
  /** Absent for system lines. */
  author?: {
    name: string
    role: Role
    avatarSeed?: string
    /** Replaces the role word on the chip, e.g. "Agent for Graham". */
    roleLabel?: string
  }
  /** Written by the person viewing. */
  own?: boolean
  attachments?: readonly ImageRef[]
}

function Attachments({ images }: { images: readonly ImageRef[] }) {
  return (
    <ul className="mt-2 grid max-w-72 grid-cols-2 gap-1.5">
      {images.map((image) => (
        <li key={image.url}>
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            className="aspect-square w-full rounded-lg bg-surface-2 object-cover"
          />
        </li>
      ))}
    </ul>
  )
}

export interface MessageBubbleProps {
  message: ThreadMessage
  /** Report route for someone else's message (SPEC §4 messaging). */
  onReport?: (message: ThreadMessage) => void
}

/** One message with the writer's name, role chip and time. The chip is on every message. */
export function MessageBubble({ message, onReport }: MessageBubbleProps) {
  const time = (
    <time dateTime={message.sentAt} className="figures text-caption whitespace-nowrap text-muted">
      {formatTime(message.sentAt)}
    </time>
  )

  if (message.kind === 'system' || !message.author) {
    return (
      <p className="mx-auto flex max-w-md items-start justify-center gap-1.5 px-4 text-center text-small text-muted">
        <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
        {/* Non-breaking around the dot: the last word travels with the time, never a lone "·". */}
        <span>
          {message.body}
          {'\u00a0·\u00a0'}
          {time}
        </span>
      </p>
    )
  }

  const { author } = message
  const header = (
    <p
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1',
        message.own && 'justify-end',
      )}
    >
      <span className="text-small font-semibold text-ink">{message.own ? 'You' : author.name}</span>
      <RoleChip role={author.role} label={author.roleLabel} />
      {time}
    </p>
  )

  if (message.kind === 'notice') {
    return (
      <div className="flex flex-col gap-2 rounded-card border border-input-border bg-surface p-4 shadow-soft">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-brand"
          >
            <CalendarCheckIcon weight="bold" className="size-4.5" />
          </span>
          Written notice of a visit
        </p>
        <p className="text-body text-ink">{message.body}</p>
        {header}
      </div>
    )
  }

  return (
    <div className={cn('flex items-start gap-2.5', message.own && 'flex-row-reverse')}>
      {message.own ? null : (
        <Avatar
          name={author.name}
          seed={author.avatarSeed}
          role={author.role}
          size="sm"
          decorative
          className="mt-0.5"
        />
      )}
      <div
        className={cn(
          'flex max-w-[min(34rem,85%)] min-w-0 flex-col gap-1',
          message.own && 'items-end',
        )}
      >
        <div className={cn('flex max-w-full items-center gap-1', message.own && 'justify-end')}>
          {header}
          {onReport && !message.own ? (
            <IconButton
              label={`Report message from ${author.name}`}
              icon={<FlagIcon weight="bold" />}
              variant="quiet"
              size="sm"
              className="-my-1.5"
              onClick={() => onReport(message)}
            />
          ) : null}
        </div>
        <div
          className={cn(
            'rounded-[1.25rem] px-4 py-2.5 text-body break-words whitespace-pre-line text-ink',
            message.own
              ? 'rounded-tr-md bg-accent-tint'
              : 'rounded-tl-md border border-line bg-surface shadow-soft',
          )}
        >
          {message.body}
          {message.attachments && message.attachments.length > 0 ? (
            <Attachments images={message.attachments} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function dayLabel(sentAt: IsoDateTime, now: IsoDateTime) {
  const days = daysBetween(sentAt, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return formatWeekday(sentAt)
}

export interface MessageThreadProps {
  messages: readonly ThreadMessage[]
  /** For "Today" and "Yesterday". Defaults to the real clock. */
  now?: IsoDateTime
  onReport?: (message: ThreadMessage) => void
  /** Accessible name, e.g. "Messages about the leak under the kitchen sink". */
  label: string
  className?: string
}

/** A conversation on a job or tenancy, split by day. New messages are announced politely. */
export function MessageThread({
  messages,
  now = new Date().toISOString(),
  onReport,
  label,
  className,
}: MessageThreadProps) {
  return (
    <div role="log" aria-label={label} className={cn('flex flex-col gap-4', className)}>
      {messages.map((message, index) => {
        const day = dayLabel(message.sentAt, now)
        const previous = messages[index - 1]
        const newDay = !previous || dayLabel(previous.sentAt, now) !== day
        return (
          <Fragment key={message.id}>
            {newDay ? (
              <p className="flex items-center gap-3 text-caption font-semibold text-muted">
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
                {day}
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </p>
            ) : null}
            <MessageBubble message={message} onReport={onReport} />
          </Fragment>
        )
      })}
    </div>
  )
}

export interface MessageComposerProps {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  onAttach?: () => void
  /** e.g. "Message Graham and Kev". */
  label?: string
  placeholder?: string
  disabled?: boolean
  /** Shown above the box, e.g. who will see the message. */
  note?: ReactNode
  className?: string
}

/** The box at the foot of a thread. Enter adds a line; the send button sends. */
export function MessageComposer({
  value,
  onValueChange,
  onSend,
  onAttach,
  label = 'Message',
  placeholder = 'Write a message',
  disabled,
  note,
  className,
}: MessageComposerProps) {
  const id = useId()
  const empty = value.trim().length === 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!empty) onSend()
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2', className)}>
      {note ? <p className="text-small text-muted">{note}</p> : null}
      <div className="flex items-end gap-2">
        {onAttach ? (
          <IconButton
            label="Add a photo"
            icon={<PaperclipIcon weight="bold" />}
            variant="secondary"
            onClick={onAttach}
            disabled={disabled}
          />
        ) : null}
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          id={id}
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            // Padding centres one line in the control height, so the placeholder sits mid-box
            // in the trade portal's 56px box too.
            'max-h-40 min-h-(--control-h) flex-1 resize-none rounded-[1.375rem] border border-input-border bg-surface px-4 py-[calc((var(--control-h)_-_2px_-_1lh)/2)] text-body text-ink [field-sizing:content]',
            'placeholder:text-muted',
            'focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
          )}
        />
        <Button
          type="submit"
          aria-label="Send"
          disabled={disabled || empty}
          className="size-(--control-h) rounded-full px-0"
        >
          <PaperPlaneRightIcon weight="fill" aria-hidden />
        </Button>
      </div>
    </form>
  )
}
