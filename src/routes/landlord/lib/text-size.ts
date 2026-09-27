// The landlord portal's "comfortable" text option (SPEC §9: 16px body with an 18px option).
// Saved in this browser only. It is set on <body>, not <html>, so the rem (and with it every
// spacing token) stays put and only the text grows; dialogs and toasts mounted on <body> follow.

import { useLayoutEffect, useSyncExternalStore } from 'react'

export type TextSize = 'standard' | 'comfortable'

export const TEXT_SIZE_KEY = 'slate-text-size'

const listeners = new Set<() => void>()

function read(): TextSize {
  try {
    return localStorage.getItem(TEXT_SIZE_KEY) === 'comfortable' ? 'comfortable' : 'standard'
  } catch {
    return 'standard'
  }
}

export function setTextSize(size: TextSize) {
  try {
    if (size === 'comfortable') localStorage.setItem(TEXT_SIZE_KEY, size)
    else localStorage.removeItem(TEXT_SIZE_KEY)
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
  current = size
  for (const listener of listeners) listener()
}

let current: TextSize | null = null

function snapshot(): TextSize {
  current ??= read()
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTextSize(): [TextSize, (size: TextSize) => void] {
  const size = useSyncExternalStore(subscribe, snapshot, () => 'standard' as const)
  return [size, setTextSize]
}

/** Applies the saved text size while the landlord portal is on screen. */
export function useTextSizeOnBody() {
  const [size] = useTextSize()
  useLayoutEffect(() => {
    const body = document.body
    if (size === 'comfortable') body.dataset.textSize = 'comfortable'
    else delete body.dataset.textSize
    return () => {
      delete body.dataset.textSize
    }
  }, [size])
}
