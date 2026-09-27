// What the rated person can do about a review: one public reply, a visible "disputes this" note,
// and a report through each of the four legal routes.

import { expect, test, type Page } from '@playwright/test'
import { GRAHAM, KEV, crashesOn, goTo, openAs } from './helpers'

const REPLY =
  'Thank you. The keys were left with the neighbour as agreed, and the flat was ready on the day.'

test('Graham replies to a trade’s review once and marks it as disputed', async ({ context }) => {
  const graham = await openAs(context, GRAHAM, 'landlord/reviews/rating_clean_joanna_graham')
  await expect(graham.getByRole('heading', { level: 1, name: 'A review about you' })).toBeVisible()

  // The reviewer, in another tab, sees the reply arrive under her own review.
  const joanna = await openAs(
    context,
    { personId: 'person_joanna', role: 'trade' },
    'trade/reviews/rating_clean_joanna_graham',
  )
  await expect(joanna.getByText(REPLY)).toHaveCount(0)

  const replyBox = graham.getByRole('region', { name: 'Reply publicly' })
  await replyBox.getByLabel('Your reply').fill(REPLY)
  await replyBox.getByRole('button', { name: 'Post reply' }).click()
  await expect(graham.getByText(REPLY)).toBeVisible()
  // One reply only: the form is gone once it's posted.
  await expect(graham.getByRole('button', { name: 'Post reply' })).toHaveCount(0)

  await graham.getByRole('button', { name: 'Mark as disputed' }).click()
  const confirm = graham.getByRole('dialog').getByRole('button', { name: /disputed|Dispute/ })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await expect(graham.getByText('Landlord disputes this').first()).toBeVisible()
  await expect(graham.getByRole('button', { name: 'Mark as disputed' })).toHaveCount(0)

  await expect(joanna.getByText(REPLY)).toBeVisible()
  await expect(joanna.getByText('Landlord disputes this').first()).toBeVisible()

  expect(crashesOn(graham)).toEqual([])
  expect(crashesOn(joanna)).toEqual([])
})

const ROUTES = [
  { label: "It's untrue and damages someone's reputation", name: 'defamation' },
  { label: "It's illegal", name: 'illegal content' },
  { label: 'I think this is a fake review', name: 'suspected fake' },
  { label: "It's about my personal data", name: 'data protection' },
] as const

async function report(page: Page, label: string, details: string) {
  await page.getByRole('button', { name: 'Report', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Report this review' })
  await dialog.getByRole('radio', { name: new RegExp(`^${label}`) }).click()
  await dialog.getByLabel('What’s wrong?').fill(details)
  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect(dialog).toBeHidden()
}

test('a review can be reported through each of the four routes', async ({ context }) => {
  // Kev reports four different reviews, one route each.
  const kev = await openAs(context, KEV, 'trade/profile')
  const reviews = [
    'trade/reviews/rating_toilet_hannah_kev',
    'trade/reviews/rating_bath_derek_kev',
    'trade/reviews/rating_sink_graham_kev',
  ]
  const graham = await openAs(context, GRAHAM, 'landlord/reviews/rating_pane_fiona_graham')

  for (const [index, route] of ROUTES.entries()) {
    const page = index < reviews.length ? kev : graham
    if (index < reviews.length) await goTo(kev, reviews[index]!)
    await report(
      page,
      route.label,
      `Reporting this for the ${route.name} route: what it says about the job is not what happened.`,
    )
  }

  // Each report is listed under the route it went through.
  await goTo(kev, 'trade/reports')
  const made = kev.getByRole('region', { name: /^Reports you made/ })
  await expect(made.getByRole('listitem')).toHaveCount(3)
  for (const route of ROUTES.slice(0, 3)) {
    await expect(made.getByText(route.label)).toBeVisible()
  }
  // Graham hears about the report on his review of Kev, never who made it, and sees his own.
  await goTo(graham, 'landlord/reports')
  const aboutMe = graham.getByRole('tabpanel', { name: /^About what you wrote/ })
  await expect(aboutMe.getByText(ROUTES[2].label)).toBeVisible()
  await graham.getByRole('tab', { name: /^Reports you made/ }).click()
  await expect(
    graham.getByRole('tabpanel', { name: /^Reports you made/ }).getByText(ROUTES[3].label),
  ).toBeVisible()

  // A suspected fake shows as "pending check" on the review itself.
  await goTo(kev, 'trade/reviews/rating_sink_graham_kev')
  await expect(kev.getByText(/pending check/i).first()).toBeVisible()

  expect(crashesOn(kev)).toEqual([])
  expect(crashesOn(graham)).toEqual([])
})
