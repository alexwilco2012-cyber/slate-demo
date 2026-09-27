// A public comment box that runs the review filter as the person types, and says plainly what it
// can't contain (SPEC §5 rule 7): children, benefits, health, other people's names and so on.

import { useEffect, useState } from 'react'
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useSlate, type TextCheck } from '@/data'
import { SENSITIVE_TOPIC_LABELS, type SensitiveTopic } from '@/domain/types'
import { Textarea } from '@/components/ui/textarea'
import { joinNames } from '../lib/format'

function topicsOf(check: TextCheck | null, action: 'block' | 'flag'): string[] {
  if (!check) return []
  const topics = new Set<SensitiveTopic>(
    check.issues.filter((issue) => issue.action === action).map((issue) => issue.topic),
  )
  return [...topics].map((topic) => SENSITIVE_TOPIC_LABELS[topic])
}

export interface CheckedTextareaProps {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  minLength?: number
  maxLength: number
  rows?: number
  optional?: boolean
  error?: string
  /** Told whether the text can be sent as it is. */
  onBlockedChange?: (blocked: boolean) => void
}

export function CheckedTextarea({
  label,
  hint,
  value,
  onChange,
  minLength,
  maxLength,
  rows = 5,
  optional,
  error,
  onBlockedChange,
}: CheckedTextareaProps) {
  const { api } = useSlate()
  const [check, setCheck] = useState<TextCheck | null>(null)

  useEffect(() => {
    if (!value.trim()) {
      setCheck(null)
      onBlockedChange?.(false)
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      api
        .checkText(value)
        .then((result) => {
          if (!live) return
          setCheck(result)
          onBlockedChange?.(result.blocked)
        })
        .catch(() => undefined)
    }, 350)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [api, value, onBlockedChange])

  const blocked = topicsOf(check, 'block')
  const flagged = topicsOf(check, 'flag')
  const tooShort =
    minLength !== undefined && value.trim().length > 0 && value.trim().length < minLength

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        label={label}
        hint={hint}
        optional={optional}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        showCount
        rows={rows}
        error={
          error ??
          (blocked.length
            ? `Take out anything about ${joinNames(blocked)}. Reviews can’t mention them.`
            : undefined)
        }
      />
      <div aria-live="polite" className="flex flex-col gap-1.5">
        {flagged.length && !blocked.length ? (
          <p className="flex items-start gap-1.5 text-small text-info">
            <InfoIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            It mentions {joinNames(flagged)}. It can still be sent, and a moderator will check it.
          </p>
        ) : null}
        {tooShort ? (
          <p className="flex items-start gap-1.5 text-small text-muted">
            <WarningCircleIcon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0" />
            At least {minLength} characters, or leave it empty.
          </p>
        ) : null}
      </div>
    </div>
  )
}
