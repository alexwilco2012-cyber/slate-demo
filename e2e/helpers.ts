// Shared bits for the end-to-end tests. Every page in one browser context shares localStorage and
// BroadcastChannel, exactly like three tabs on one computer, so each can be a different person.

import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test'

export const SARAH = { personId: 'person_sarah', role: 'tenant' } as const
export const GRAHAM = { personId: 'person_graham', role: 'landlord' } as const
export const KEV = { personId: 'person_kev', role: 'trade' } as const

/** Each person uses the app on a phone, as they would in real life. */
export const PHONE = { width: 390, height: 844 }

type Who = { personId: string; role: 'tenant' | 'landlord' | 'trade' }

/** Paths are relative to the app's base, e.g. 'tenant/report'. */
export async function openAs(context: BrowserContext, who: Who, path: string): Promise<Page> {
  const page = await context.newPage()
  await page.setViewportSize(PHONE)
  watchErrors(page)
  const joiner = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${joiner}as=${who.personId}&role=${who.role}`)
  await expect(page.locator('main').first()).toBeVisible()
  return page
}

const pageErrors = new WeakMap<Page, string[]>()

/** Uncaught exceptions and console errors, collected as the page runs. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  pageErrors.set(page, errors)
  return errors
}

/** Uncaught exceptions only: a crash, as opposed to a warning logged by a library. */
export function crashesOn(page: Page): string[] {
  return (pageErrors.get(page) ?? []).filter((e) => e.startsWith('pageerror'))
}

/**
 * Closes any toasts. A tab in the background keeps its toasts up (their timers pause while the
 * tab isn't looked at), and on a phone they sit over the actions at the foot of the screen.
 */
export async function clearToasts(page: Page) {
  const close = page.locator('.slate-toast').getByRole('button', { name: 'Dismiss' })
  for (let tries = 0; tries < 8 && (await close.count()) > 0; tries += 1) {
    await close
      .first()
      .click({ timeout: 2_000 })
      .catch(() => undefined)
  }
  await expect(page.locator('.slate-toast')).toHaveCount(0)
}

/** Moves to a page inside the same tab, keeping its session. */
export async function goTo(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('main').first()).toBeVisible()
}

export async function scrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth)
}

/** A tiny real PNG, for the camera and photo pickers. */
export const PHOTO = {
  name: 'photo.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIUlEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMAoAAPh2AAHbV9M9AAAAAElFTkSuQmCC',
    'base64',
  ),
}

/** Picks the answer in every plain-words question on a rating form. */
export async function answerAll(scope: Page | Locator, answer: RegExp | string) {
  const groups = scope.getByRole('radiogroup')
  const count = await groups.count()
  for (let index = 0; index < count; index += 1) {
    const group = groups.nth(index)
    const name = (await group.getAttribute('aria-label')) ?? ''
    const label = await group.evaluate((element) => {
      const id = element.getAttribute('aria-labelledby')
      return id ? (document.getElementById(id)?.textContent ?? '') : ''
    })
    if (/again/i.test(`${name}${label}`)) {
      await group.getByRole('radio', { name: 'Yes', exact: true }).click()
      continue
    }
    const options = group.getByRole('radio')
    const preferred = group.getByRole('radio', { name: answer })
    await ((await preferred.count()) > 0 ? preferred.first() : options.first()).click()
  }
}
