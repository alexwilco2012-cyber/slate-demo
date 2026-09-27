// Signing up as a new trade: one question per screen, a simulated magic link, checks that finish
// on the welcome screen, and a trade portal whose profile shows the checked badges.

import { expect, test, type Page } from '@playwright/test'
import { PHONE, crashesOn, goTo, watchErrors } from './helpers'

async function carryOn(page: Page, heading: string | RegExp) {
  await page.getByRole('button', { name: /Continue/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
}

test('a new trade signs up and lands in the trade portal with checked badges', async ({ page }) => {
  await page.setViewportSize(PHONE)
  watchErrors(page)
  await page.goto('signup/trade')
  await expect(page.getByRole('heading', { level: 1, name: 'What’s your name?' })).toBeVisible()

  await page.getByLabel('Full name').fill('Isla Buchanan')
  await carryOn(page, 'Are you 18 or over?')
  await page.getByText('I’m 18 or over').click()
  await carryOn(page, 'What’s your email?')
  await page.getByLabel('Email').fill('isla.buchanan@example.com')
  await carryOn(page, 'What’s your business called?')
  await page.getByLabel('Business name').fill('Buchanan Heating and Electrical')
  await carryOn(page, 'What work do you do?')
  await page.getByText('Gas engineer', { exact: true }).click()
  await page.getByText('Electrician', { exact: true }).click()
  await carryOn(page, 'Which areas do you cover?')
  await page.getByText(/^AB15/).click()
  await page.getByText(/^AB25/).click()
  await carryOn(page, /Your Gas.Safe registration/)
  await page.getByLabel('Gas Safe registration number').fill('5123456')
  await page.getByText('Boilers and central heating').click()
  await carryOn(page, 'Are you in an electrical scheme?')
  await page.getByText('NICEIC', { exact: true }).click()
  await page.getByLabel('NICEIC membership number').fill('D604211')
  await carryOn(page, 'Do you have public liability insurance?')
  await page.getByText('Yes, I’m insured').click()
  await carryOn(page, 'Check your answers')
  await expect(page.getByText('Gas engineer, Electrician')).toBeVisible()

  // The magic link arrives in the on-screen demo inbox. There is never a password.
  await page.getByRole('button', { name: /Send my sign-in link/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible()
  await expect(page.locator('input[type=password]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm and continue' }).click()

  await expect(page.getByRole('heading', { level: 1, name: /^Welcome to .+, Isla$/ })).toBeVisible()
  await expect(page.getByText('Check in progress').first()).toBeVisible()
  await expect(
    page.getByText('All checked. Each badge shows the date it was checked.'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Go to your home' }).click()
  await expect(page).toHaveURL(/\/slate-demo\/trade$/)
  await expect(page.getByRole('link', { name: /for trades/ }).first()).toBeVisible()

  // The same badges, checked, on the trade's own profile.
  await goTo(page, 'trade/profile')
  const credentials = page.getByRole('region', { name: /Checked credentials/ })
  await expect(credentials.getByText('Gas Safe registered')).toBeVisible()
  await expect(credentials.getByText('NICEIC member')).toBeVisible()
  await expect(credentials.getByText(/^Checked \d+ \w+ \d{4}$/)).toHaveCount(2)
  await expect(credentials.getByText('Check in progress')).toHaveCount(0)
  expect(crashesOn(page)).toEqual([])
})
