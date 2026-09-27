// Small browser helpers that do nothing where the browser lacks the feature (tests, old engines).

/** Scrolls an element into view, and moves focus to it when asked (for headings with tabIndex). */
export function reveal(
  element: Element | null | undefined,
  options: ScrollIntoViewOptions & { focus?: boolean } = {},
) {
  if (!element) return
  const { focus, ...scroll } = options
  if (typeof element.scrollIntoView === 'function') element.scrollIntoView(scroll)
  if (focus && element instanceof HTMLElement) element.focus({ preventScroll: true })
}

/** Reveals the element with this id after the page has settled from a navigation. */
export function revealLater(id: string, delay = 60): () => void {
  const timer = window.setTimeout(() => {
    reveal(document.getElementById(`${id}-heading`) ?? document.getElementById(id), {
      block: 'start',
      focus: true,
    })
  }, delay)
  return () => window.clearTimeout(timer)
}

/** True on screens 1024px and wider, where lists open a detail drawer. */
export function isWide(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 64rem)').matches
}
