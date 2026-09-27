// The public front page: it loads cleanly, with nothing logged as an error, and never scrolls
// sideways on a phone or a laptop.

import { expect, test } from '@playwright/test'
import { scrollWidth, watchErrors } from './helpers'

for (const width of [375, 1280]) {
  test(`the landing page at ${width}px has no console errors and no sideways scroll`, async ({
    page,
  }) => {
    const errors = watchErrors(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Scroll to the foot so everything that loads as it comes into view has loaded.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y)
        await new Promise((resolve) => setTimeout(resolve, 60))
      }
    })
    await page.waitForLoadState('networkidle')
    expect(await scrollWidth(page)).toBe(width)
    expect(errors).toEqual([])
  })
}
