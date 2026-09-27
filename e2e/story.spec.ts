// The whole story, as three people in three tabs of one browser: Sarah reports a leak, Graham
// approves it and chooses Kev, Kev quotes, Graham gives the go-ahead, Kev books with 48 hours'
// notice, does the work, Graham confirms, everyone rates and the ratings are revealed together.
// After each step the other tabs are checked without reloading: they must update live.

import { expect, test, type Page } from '@playwright/test'
import {
  GRAHAM,
  KEV,
  PHOTO,
  SARAH,
  answerAll,
  clearToasts,
  crashesOn,
  goTo,
  openAs,
} from './helpers'

const GOOD = /^(Better than expected|Always|Yes)$/
const SARAH_ON_KEV =
  'In my experience a tidy, careful plumber. He put a sheet down and explained what he had changed.'
const GRAHAM_ON_KEV =
  'In my experience a reliable plumber. The price matched the quote and the photos showed the work.'

async function sendAndSeal(page: Page) {
  await page.getByRole('button', { name: 'Check and send' }).click()
  await page
    .getByRole('dialog', { name: 'Send your rating?' })
    .getByRole('button', { name: /Send/ })
    .click()
}

test('a leak goes from report to reveal, and every portal updates live', async ({ context }) => {
  test.setTimeout(300_000)

  const graham = await openAs(context, GRAHAM, 'landlord')
  const kev = await openAs(context, KEV, 'trade')
  const sarah = await openAs(context, SARAH, 'tenant/report')

  // ── Sarah reports a leak under the kitchen sink, one question per screen ─────────────────
  await sarah.getByRole('radio', { name: 'Kitchen' }).click()
  await sarah.getByRole('button', { name: 'Continue' }).click()
  await sarah.getByRole('radio', { name: /^Leak or drip/ }).click()
  await sarah
    .getByLabel('Tell us more')
    .fill('Water drips from the pipe under the kitchen sink. The cupboard is wet every morning.')
  await sarah.getByRole('button', { name: 'Continue' }).click()
  await sarah.getByRole('button', { name: /sample photo/ }).click()
  await sarah.getByRole('button', { name: /^Continue/ }).click()
  await sarah.getByRole('radio', { name: /^Urgent/ }).click()
  await sarah.getByRole('button', { name: 'Continue' }).click()
  await sarah.getByRole('button', { name: 'Tuesday 29 September, afternoon (12pm to 5pm)' }).click()
  await sarah.getByRole('button', { name: 'Continue' }).click()
  await expect(sarah.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await sarah.getByRole('button', { name: 'Send to Graham' }).click()
  await expect(sarah.getByRole('heading', { name: 'Sent to Graham' })).toBeVisible()
  const jobId = sarah.url().split('/').pop() ?? ''
  expect(jobId).toMatch(/^job_/)

  // Graham's home, open all along, shows it straight away.
  const review = graham.getByRole('link', { name: 'Review: Leak or drip in the kitchen' })
  await expect(review).toBeVisible()
  await sarah.getByRole('link', { name: 'Follow your repair' }).click()
  await expect(sarah.getByRole('heading', { name: 'Leak or drip in the kitchen' })).toBeVisible()

  // ── Graham approves and chooses Kev from his saved trades ────────────────────────────────
  await review.click()
  await graham.getByRole('button', { name: 'Approve', exact: true }).click()
  await graham.getByRole('button', { name: 'Approve repair' }).click()
  await expect(
    sarah.getByRole('list', { name: 'Job progress' }).getByText('Approved'),
  ).toBeVisible()
  await graham.getByRole('button', { name: /^Your saved trades/ }).click()
  await graham.getByRole('button', { name: 'Ask Kev to quote' }).click()
  await expect(graham.getByRole('heading', { name: 'Waiting for Kev’s quote' })).toBeVisible()

  // ── Kev sees it in Needs you and sends a quote from his saved lines ──────────────────────
  const toQuote = kev.getByRole('link', { name: /^Send a quote: Leak or drip in the kitchen/ })
  await expect(toQuote).toBeVisible()
  await toQuote.click()
  await kev.getByRole('button', { name: /^Call-out/ }).click()
  await kev.getByRole('button', { name: /^Sink waste trap/ }).click()
  await kev.getByRole('button', { name: /^Labour/ }).click()
  await kev.getByRole('button', { name: 'Send quote' }).click()
  await expect(kev.getByRole('heading', { name: 'Quote sent', level: 2 })).toBeVisible()

  // ── Graham accepts it and gives the go-ahead ─────────────────────────────────────────────
  const accept = graham.getByRole('button', { name: 'Accept Kev’s quote' })
  await expect(accept).toBeVisible()
  await accept.click()
  await graham.getByRole('button', { name: 'Accept and give the go-ahead' }).click()

  // ── Kev books the visit: today and tomorrow are too soon for 48 hours' notice ────────────
  const book = kev.getByRole('button', { name: 'Book a visit' })
  await expect(book).toBeVisible()
  await clearToasts(kev)
  await book.click()
  const sheet = kev.getByRole('dialog', { name: 'Book a visit' })
  await expect(sheet.getByRole('radio', { name: /^Today/ })).toBeDisabled()
  await expect(sheet.getByRole('radio', { name: /^Tomorrow/ })).toBeDisabled()
  await sheet.getByRole('radio', { name: /^Tue 29 Sept/ }).click()
  await sheet.getByRole('radio', { name: /^1pm/ }).click()
  await sheet.getByRole('button', { name: 'Book visit' }).click()

  // Sarah gets the written notice on her repair, live.
  await expect(sarah.getByText('Tue 29 Sept, 1pm to 3pm').first()).toBeVisible()
  await expect(sarah.getByText(/Notice of a visit: Kev Rattray/)).toBeVisible()

  // ── The demo clock moves on to the day of the visit, for every tab at once ───────────────
  const demo = await context.newPage()
  await demo.goto('demo')
  const move = demo.getByRole('button', { name: /^Move to Tue 29 Sept/ })
  await expect(move).toBeVisible()
  await move.click()
  await expect(demo.getByRole('heading', { name: 'Kev fixes the leak' })).toBeVisible()
  await demo.close()

  // ── Kev: on my way, arrived, work done with an after photo and the invoice ───────────────
  await expect(kev.getByRole('button', { name: 'On my way' })).toBeVisible()
  await clearToasts(kev)
  await kev.getByRole('button', { name: 'On my way' }).click()
  await kev.getByRole('button', { name: 'About 10 minutes' }).click()
  await expect(sarah.getByText('On my way, there in about 10 minutes.')).toBeVisible()
  await clearToasts(kev)
  await kev.getByRole('button', { name: 'I’ve arrived' }).click()
  await clearToasts(kev)
  await kev.getByRole('button', { name: 'Mark the work done' }).click()
  const [chooser] = await Promise.all([
    kev.waitForEvent('filechooser'),
    kev.getByRole('button', { name: 'Take after photo' }).click(),
  ])
  await chooser.setFiles(PHOTO)
  await expect(kev.getByRole('img', { name: 'After photo' })).toBeVisible()
  await kev.getByRole('button', { name: 'Mark as done' }).click()

  // ── Sarah confirms the visit; Graham confirms the job ────────────────────────────────────
  const happened = sarah.getByRole('button', { name: 'Yes, it happened' })
  await expect(happened).toBeVisible()
  await happened.click()
  const confirm = graham.getByRole('button', { name: 'Confirm it’s done' })
  await expect(confirm).toBeVisible()
  await confirm.click()
  await expect(graham.getByRole('button', { name: 'Confirm it’s done' })).toBeHidden()

  // ── Everyone rates. Each rating is sealed until the last one is in ───────────────────────
  await goTo(sarah, `tenant/jobs/${jobId}/rate/trade`)
  await answerAll(sarah.locator('main'), GOOD)
  await sarah.getByLabel('Your opinion (optional)').fill(SARAH_ON_KEV)
  await sendAndSeal(sarah)

  await goTo(sarah, `tenant/jobs/${jobId}/rate/landlord`)
  await answerAll(sarah.locator('main'), GOOD)
  await sendAndSeal(sarah)

  await goTo(kev, `trade/jobs/${jobId}/rate/tenant`)
  await answerAll(kev.locator('main'), GOOD)
  await kev.getByRole('button', { name: 'Send rating' }).click()
  await goTo(kev, `trade/jobs/${jobId}/rate/landlord`)
  await answerAll(kev.locator('main'), GOOD)
  await kev.getByRole('button', { name: 'Send rating' }).click()
  await expect(kev.getByRole('heading', { name: 'Sent' })).toBeVisible()

  // Kev's profile is open while Graham rates: Sarah's review is still sealed.
  await goTo(kev, 'trade/profile')
  await expect(kev.getByRole('heading', { name: 'Reviews of you' })).toBeVisible()
  await kev.getByRole('tab', { name: /^Tenants \(/ }).click()
  await expect(kev.getByText(SARAH_ON_KEV)).toHaveCount(0)

  await goTo(graham, `landlord/ratings/rate/job/${jobId}/${KEV.personId}`)
  await answerAll(graham.locator('main'), GOOD)
  await graham.getByLabel('Your opinion, for other landlords (optional)').fill(GRAHAM_ON_KEV)
  await graham.getByRole('button', { name: 'Send rating' }).click()

  // ── The last one in reveals them all together, in every tab ──────────────────────────────
  await expect(graham.getByText(/revealed together/i).first()).toBeVisible()
  await expect(kev.getByText(SARAH_ON_KEV)).toBeVisible()
  await kev.getByRole('tab', { name: /^Landlords \(/ }).click()
  await expect(kev.getByText(GRAHAM_ON_KEV)).toBeVisible()
  await goTo(sarah, `tenant/jobs/${jobId}`)
  await expect(
    sarah
      .getByRole('list', { name: 'Job progress' })
      .getByText(/Rated|Revealed/)
      .first(),
  ).toBeVisible()

  for (const page of [sarah, graham, kev]) expect(crashesOn(page)).toEqual([])
})
