// Below 1024px there's room for one phone at a time: tabs switch between Sarah, Graham and Kev.
// A dot marks whose turn it is, and a bell whoever has just had a notification.

import { useRef, type KeyboardEvent } from 'react'
import { BellSimpleIcon } from '@phosphor-icons/react'
import { cn } from '@/components/ui/cn'
import { Avatar } from '@/components/ui/avatar'
import { CAST, CAST_ORDER, type CastKey } from '../cast'

export function tabId(key: CastKey) {
  return `demo-tab-${key}`
}

export function panelId(key: CastKey) {
  return `demo-phone-${key}`
}

export function PhoneTabs({
  active,
  onChange,
  waiting,
  pinged,
}: {
  active: CastKey
  onChange: (key: CastKey) => void
  waiting: readonly CastKey[]
  pinged: readonly CastKey[]
}) {
  const tabs = useRef<Partial<Record<CastKey, HTMLButtonElement | null>>>({})

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = CAST_ORDER.indexOf(active)
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: CAST_ORDER.length - 1,
    }
    const target = moves[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = CAST_ORDER[(target + CAST_ORDER.length) % CAST_ORDER.length]!
    onChange(next)
    tabs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Phones"
      onKeyDown={onKeyDown}
      className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface-2 p-1"
    >
      {CAST_ORDER.map((key) => {
        const member = CAST[key]
        const selected = key === active
        const turn = waiting.includes(key)
        const news = pinged.includes(key) && !selected
        return (
          <button
            key={key}
            ref={(element) => {
              tabs.current[key] = element
            }}
            type="button"
            role="tab"
            id={tabId(key)}
            aria-selected={selected}
            aria-controls={panelId(key)}
            tabIndex={selected ? 0 : -1}
            data-role-accent={key}
            onClick={() => onChange(key)}
            className={cn(
              'relative flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-small font-semibold transition-[background-color,color,box-shadow] duration-(--duration-quick)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              selected ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            <Avatar
              name={member.fullName}
              role={member.role}
              size="xs"
              decorative
              className="max-xs:hidden"
            />
            <span className="truncate">{member.firstName}</span>
            {turn ? (
              <>
                <span
                  aria-hidden
                  className="story-current size-2 shrink-0 rounded-full bg-accent-strong"
                />
                <span className="sr-only">, their turn</span>
              </>
            ) : null}
            {news ? (
              <>
                <BellSimpleIcon
                  weight="fill"
                  aria-hidden
                  className="size-3.5 shrink-0 text-accent-text"
                />
                <span className="sr-only">, something new</span>
              </>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
