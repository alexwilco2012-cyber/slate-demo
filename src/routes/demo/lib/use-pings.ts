// "Push notifications" for the demo's phones: when something new arrives for Sarah, Graham or
// Kev, their phone shows a banner for a few seconds, so the audience sees each change land.

import { useEffect, useRef, useState } from 'react'
import { useDemoNow, useSlateQuery } from '@/data'
import type { NotificationRecord } from '@/domain/types'
import { CAST, CAST_ORDER, type CastKey } from '../cast'

export interface Ping {
  id: string
  title: string
  body?: string
  href: string
}

const SHOW_MS = 5200

/** The newest notification each person has had since the page opened, while it's fresh. */
export function usePings(): {
  pings: Partial<Record<CastKey, Ping>>
  dismiss: (key: CastKey) => void
} {
  const now = useDemoNow()
  const { state } = useSlateQuery(
    async (api) =>
      Object.fromEntries(
        await Promise.all(
          CAST_ORDER.map(
            async (key) => [key, await api.listNotifications(CAST[key].viewer)] as const,
          ),
        ),
      ) as Record<CastKey, NotificationRecord[]>,
    [],
  )
  const [pings, setPings] = useState<Partial<Record<CastKey, Ping>>>({})
  // What each phone has already been told about: the newest moment seen, per person.
  const seen = useRef<Partial<Record<CastKey, string>> | null>(null)
  const lastNow = useRef(now)
  const timers = useRef<Partial<Record<CastKey, ReturnType<typeof setTimeout>>>>({})

  useEffect(() => {
    const lists = state.data
    if (!lists) return
    const newest = (key: CastKey) =>
      lists[key].reduce<NotificationRecord | undefined>(
        (top, n) => (!top || n.createdAt > top.createdAt ? n : top),
        undefined,
      )
    // First read, or the clock went backwards (a reset): start again from what's there now.
    const rebase = seen.current === null || now < lastNow.current
    lastNow.current = now
    if (rebase) {
      seen.current = Object.fromEntries(CAST_ORDER.map((key) => [key, newest(key)?.createdAt]))
      return
    }
    for (const key of CAST_ORDER) {
      const top = newest(key)
      const before = seen.current?.[key]
      if (!top || (before && top.createdAt <= before)) continue
      seen.current = { ...seen.current, [key]: top.createdAt }
      setPings((current) => ({
        ...current,
        [key]: { id: top.id, title: top.title, body: top.body, href: top.href },
      }))
      clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => {
        setPings((current) =>
          current[key]?.id === top.id ? { ...current, [key]: undefined } : current,
        )
      }, SHOW_MS)
    }
  }, [state.data, now])

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer)
    }
  }, [])

  return {
    pings,
    dismiss: (key) => setPings((current) => ({ ...current, [key]: undefined })),
  }
}
