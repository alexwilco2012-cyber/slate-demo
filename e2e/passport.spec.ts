// A tenant shares their passport when applying, and a landlord opens it: all or nothing, no single
// score, and the tenant sees the view logged, live.

import { expect, test } from '@playwright/test'
import { GRAHAM, SARAH, crashesOn, openAs } from './helpers'

test('Sarah shares her tenant passport and Graham opens it', async ({ context }) => {
  const sarah = await openAs(context, SARAH, 'tenant/passport')
  await expect(sarah.getByRole('heading', { name: 'Your tenant passport' })).toBeVisible()

  await sarah.getByLabel('Who’s it for? (optional)').fill('For the flat on Union Grove')
  await sarah.getByRole('button', { name: 'Make a share link' }).click()
  const share = sarah.getByRole('listitem').filter({ hasText: 'For the flat on Union Grove' })
  await expect(share.getByText('Not opened yet')).toBeVisible()
  const link = await share.getByRole('textbox', { name: 'Share link' }).inputValue()
  expect(link).toMatch(/\/slate-demo\/passport\/[A-Za-z0-9]+$/)

  // Graham pastes the link Sarah sent him.
  const graham = await openAs(context, GRAHAM, 'landlord/passports')
  await graham.getByLabel('Link or code').fill(link)
  await graham.getByRole('button', { name: 'Open passport' }).click()
  await expect(
    graham.getByRole('heading', { level: 1, name: 'Sarah Laing’s tenant passport' }),
  ).toBeVisible()
  const passport = graham.getByRole('region', { name: 'Tenant passport' })
  await expect(passport.getByText('Always, from 2 of 2 landlords').first()).toBeVisible()
  await expect(passport.getByText(/No single score/)).toBeVisible()
  await expect(graham.getByRole('region', { name: 'What landlords wrote' })).toBeVisible()

  // Sarah sees the view logged without reloading, and never who it was by name.
  await expect(share.getByText('Opened 1 time')).toBeVisible()
  await expect(share.getByText(/Signed-in landlord/)).toBeVisible()

  // The link itself works too: opened in the browser, it lands on the same passport.
  await graham.goto(link)
  await expect(
    graham.getByRole('heading', { level: 1, name: 'Sarah Laing’s tenant passport' }),
  ).toBeVisible()

  // Switched off, the link stops working.
  await share.getByRole('button', { name: 'Switch off this link' }).click()
  const confirm = sarah.getByRole('dialog').getByRole('button', { name: /Switch (it )?off/ })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await expect(share.getByText(/Switched off|Off/).first()).toBeVisible()
  await graham.reload()
  await expect(
    graham.getByRole('heading', { name: 'The tenant switched this link off' }),
  ).toBeVisible()

  expect(crashesOn(sarah)).toEqual([])
  expect(crashesOn(graham)).toEqual([])
})
