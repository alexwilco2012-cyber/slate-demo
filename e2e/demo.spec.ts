// The side-by-side demo page: three live phones and a guided story that can be played through
// with Skip ahead, ending with the ratings revealed together.

import { expect, test, type FrameLocator, type Page } from '@playwright/test'
import { scrollWidth, watchErrors } from './helpers'

function phone(page: Page, key: 'tenant' | 'landlord' | 'trade'): FrameLocator {
  return page.frameLocator(`iframe[name="slate-demo-${key}"]`)
}

test('the demo plays the whole story through Skip ahead, live in all three phones', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('demo')

  await expect(page.getByRole('heading', { name: 'Sarah reports a leak' })).toBeVisible()
  await expect(phone(page, 'tenant').getByRole('heading', { name: /Sarah/ }).first()).toBeVisible()
  await expect(
    phone(page, 'landlord')
      .getByRole('heading', { name: /Graham/ })
      .first(),
  ).toBeVisible()
  await expect(phone(page, 'trade').getByRole('heading', { name: /Kev/ }).first()).toBeVisible()
  expect(await scrollWidth(page)).toBe(1440)

  // "Show me" opens the right screen in the right phone.
  await page.getByRole('button', { name: 'Show me in Sarah’s phone' }).click()
  await expect(
    phone(page, 'tenant').getByRole('heading', { name: 'Where’s the problem?' }),
  ).toBeVisible()

  // Step one done for her: Graham's phone gets the report as a notification, live.
  await page.getByRole('button', { name: 'Skip ahead: Sarah does this step' }).click()
  await expect(page.getByRole('heading', { name: 'Graham approves the repair' })).toBeVisible()
  await expect(
    page.getByTestId('ping').filter({ hasText: /Sarah reported a problem/ }),
  ).toBeVisible()
  await expect(
    phone(page, 'landlord').getByRole('heading', { name: 'Leak under the kitchen sink' }),
  ).toBeVisible()

  const steps = [
    'Graham chooses the trade',
    'Kev sends a quote',
    'Graham says go ahead',
    'Kev books the visit',
    'The day of the visit',
  ]
  for (const next of steps) {
    await page.getByRole('button', { name: /^Skip ahead/ }).click()
    await expect(page.getByRole('heading', { name: next })).toBeVisible()
  }

  // The clock moves every phone on to the day of the visit.
  await page.getByRole('button', { name: /^Move to Tue/ }).click()
  await expect(page.getByRole('heading', { name: 'Kev fixes the leak' })).toBeVisible()
  await expect(page.getByText(/Tue 29 Sept/).first()).toBeVisible()
  await expect(phone(page, 'trade').getByRole('button', { name: 'On my way' })).toBeVisible()

  for (const next of ['Sarah confirms Kev came', 'Graham confirms the job', 'Everyone rates']) {
    await page.getByRole('button', { name: /^Skip ahead/ }).click()
    await expect(page.getByRole('heading', { name: next })).toBeVisible()
  }
  await expect(page.getByRole('list', { name: 'Who has rated' }).getByRole('listitem')).toHaveCount(
    5,
  )
  // Each phone opens on its own first rating form.
  await expect(
    phone(page, 'tenant').getByRole('heading', { name: 'Rate Kev’s visit' }),
  ).toBeVisible()
  await expect(phone(page, 'trade').getByRole('heading', { name: 'Rate Sarah' })).toBeVisible()

  await page.getByRole('button', { name: 'Skip ahead: everyone rates' }).click()
  await expect(page.getByRole('heading', { name: 'Revealed together' })).toBeVisible()
  await page.getByRole('button', { name: 'See Kev’s new reviews' }).click()
  await expect(phone(page, 'trade').getByRole('heading', { name: 'Reviews of you' })).toBeVisible()

  // Starting again puts every phone back where the story begins.
  await page.getByRole('button', { name: 'Reset demo' }).first().click()
  await page.getByRole('button', { name: 'Reset the demo' }).click()
  await expect(page.getByRole('heading', { name: 'Sarah reports a leak' })).toBeVisible()
  await expect(phone(page, 'trade').getByRole('heading', { name: /Morning, Kev/ })).toBeVisible()

  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('on a phone, the demo shows one phone at a time with tabs', async ({ page }) => {
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('demo')
  const tabs = page.getByRole('tablist', { name: 'Phones' })
  await expect(tabs.getByRole('tab', { name: /Sarah/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('iframe[name="slate-demo-tenant"]')).toBeVisible()
  await expect(page.locator('iframe[name="slate-demo-landlord"]')).toBeHidden()

  await tabs.getByRole('tab', { name: /Graham/ }).click()
  await expect(page.locator('iframe[name="slate-demo-landlord"]')).toBeVisible()
  await expect(page.locator('iframe[name="slate-demo-tenant"]')).toBeHidden()

  // Show me switches to the phone whose turn it is.
  await page.getByRole('button', { name: 'Show me in Sarah’s phone' }).click()
  await expect(tabs.getByRole('tab', { name: /Sarah/ })).toHaveAttribute('aria-selected', 'true')
  expect(await scrollWidth(page)).toBe(375)
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})
