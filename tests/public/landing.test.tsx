import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BRAND } from '@/config/brand'
import { PublicPhoto } from '@/components/slate/public-photo'
import { renderPublic } from './harness'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Answers the landing page's check for its media: `type` for every file it asks about. */
function serveMedia(type: string) {
  const fetchMock = vi.fn(
    async () => new Response(null, { status: 200, headers: { 'content-type': type } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('front page', () => {
  test('leads with the promise and two ways in: the live demo and sign-up', () => {
    renderPublic('/')
    expect(screen.getByRole('heading', { level: 1, name: BRAND.tagline })).toBeInTheDocument()
    const hero = screen.getByRole('region', { name: BRAND.tagline })
    expect(within(hero).getByRole('link', { name: /Try the demo/ })).toHaveAttribute(
      'href',
      '/demo',
    )
    expect(within(hero).getByRole('link', { name: /Sign up free/ })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  test('persona shortcuts sign a tab straight into each portal, with everyone else at /start', () => {
    renderPublic('/')
    const hero = screen.getByRole('region', { name: BRAND.tagline })
    expect(
      within(hero)
        .getByRole('link', { name: /Try as Sarah/ })
        .getAttribute('href'),
    ).toMatch(/^\/tenant\?as=person_sarah&role=tenant/)
    expect(
      within(hero)
        .getByRole('link', { name: /Try as Graham/ })
        .getAttribute('href'),
    ).toMatch(/^\/landlord\?as=person_graham/)
    expect(
      within(hero)
        .getByRole('link', { name: /Try as Kev/ })
        .getAttribute('href'),
    ).toMatch(/^\/trade\?as=person_kev/)
    expect(within(hero).getByRole('link', { name: /More people to try/ })).toHaveAttribute(
      'href',
      '/start',
    )
  })

  test('the film is told in words, chapter by chapter, and can be paused', async () => {
    const user = userEvent.setup()
    renderPublic('/')
    expect(
      screen.getByRole('img', { name: /Sarah reports a leaking radiator valve/ }),
    ).toBeInTheDocument()
    const chapters = screen.getByRole('list', { name: 'Chapters' })
    const buttons = within(chapters).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      '01Chapter 1: A drip in Rosemount',
      '02Chapter 2: Three people, one record',
      '03Chapter 3: Rated fairly, revealed together',
    ])
    expect(buttons[0]).toHaveAttribute('aria-current', 'step')

    await user.click(within(chapters).getByRole('button', { name: /Rated fairly/ }))
    expect(within(chapters).getByRole('button', { name: /Rated fairly/ })).toHaveAttribute(
      'aria-current',
      'step',
    )

    await user.click(screen.getByRole('button', { name: 'Pause the story' }))
    expect(screen.getByRole('button', { name: 'Play the story' })).toBeInTheDocument()
  })

  test('keeps the drawn film when there is no video file', async () => {
    // The dev server answers a missing file with the app's HTML, not a 404.
    const fetchMock = serveMedia('text/html')
    const { container } = renderPublic('/')
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/media\/hero\.mp4$/),
        expect.objectContaining({ method: 'HEAD' }),
      ),
    )
    expect(container.querySelector('video')).toBeNull()
  })

  test('swaps in the real film, muted and looping, once the file exists', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    serveMedia('video/mp4')
    const { container } = renderPublic('/')
    await waitFor(() => expect(container.querySelector('video')).not.toBeNull())
    const video = container.querySelector('video')!
    expect(video.getAttribute('src')).toMatch(/media\/hero\.mp4$/)
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('muted')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('aria-hidden', 'true')
  })

  test('says what the idea is in a paragraph', () => {
    renderPublic('/')
    const idea = screen.getByRole('region', { name: 'The idea' })
    expect(idea).toHaveTextContent(/Every repair passes through three people/)
    expect(idea).toHaveTextContent(new RegExp(`On ${BRAND.name}, all three work from one record`))
  })

  test('walks one repair from drip to done in five steps, then offers the demo', () => {
    renderPublic('/')
    const story = screen.getByRole('region', { name: 'One repair, from drip to done.' })
    for (const step of [
      'Sarah reports it in about a minute.',
      'Graham approves it and chooses who fixes it.',
      'Written notice, 48 hours ahead.',
      'Kev fixes it, and Sarah confirms.',
      'Everyone rates. Nobody peeks.',
    ]) {
      expect(within(story).getByRole('heading', { level: 3, name: step })).toBeInTheDocument()
    }
    expect(within(story).getByRole('link', { name: /Try the demo/ })).toHaveAttribute(
      'href',
      '/demo',
    )
    const walkthroughs = within(story).getByRole('navigation', { name: 'Walkthroughs' })
    for (const role of ['tenant', 'landlord', 'trade']) {
      expect(within(walkthroughs).getByRole('link', { name: `${role}s` })).toHaveAttribute(
        'href',
        `/how-it-works/${role}`,
      )
    }
  })

  test('lets a visitor rate Kev as Sarah and see both ratings revealed together', async () => {
    const user = userEvent.setup()
    renderPublic('/')
    const fair = screen.getByRole('region', { name: 'Nobody rates in revenge.' })
    const demo = within(fair).getByRole('region', { name: /Now they rate each other/ })
    expect(within(demo).getByText(/Kev has rated/)).toBeInTheDocument()

    await user.click(within(demo).getByRole('button', { name: /Send and reveal both/ }))
    expect(within(demo).getByText('Choose an answer first.')).toBeInTheDocument()

    await user.click(within(demo).getByRole('radio', { name: /Outstanding/ }))
    await user.click(within(demo).getByRole('button', { name: /Send and reveal both/ }))
    expect(within(demo).getByText('Both ratings revealed together.')).toBeInTheDocument()
    expect(within(demo).getByText('Access given as arranged')).toBeInTheDocument()
    expect(within(demo).getByText('Turned up when agreed')).toBeInTheDocument()
    const again = within(demo).getByRole('button', { name: /Start again/ })
    expect(again).toHaveFocus()

    await user.click(again)
    expect(within(demo).getByText(/Kev has rated/)).toBeInTheDocument()
  })

  test('sets out the rules that keep ratings fair, with the review policy a click away', () => {
    renderPublic('/')
    const fair = screen.getByRole('region', { name: 'Nobody rates in revenge.' })
    for (const rule of [
      'Only after real work.',
      'Hidden until both are in.',
      'Sealed while you live there.',
      'Plain words, never stars.',
      'The tenant passport.',
      'Trades finally rate their customers.',
    ]) {
      expect(within(fair).getByRole('heading', { name: rule })).toBeInTheDocument()
    }
    expect(within(fair).getByText(/Paid on time on/)).toHaveTextContent(
      'Paid on time on 9 of 9 jobs',
    )
    expect(within(fair).getByRole('link', { name: /Read the review policy/ })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
  })

  test('the sample client rating links the policy and can be reported', async () => {
    const user = userEvent.setup()
    renderPublic('/')
    const fair = screen.getByRole('region', { name: 'Nobody rates in revenge.' })
    expect(within(fair).getByRole('link', { name: 'Review policy' })).toHaveAttribute(
      'href',
      '/policies/reviews',
    )
    await user.click(within(fair).getByRole('button', { name: 'Report' }))
    const dialog = await screen.findByRole('dialog', { name: 'Report this review' })
    expect(within(dialog).getAllByRole('link', { name: /within/ })).toHaveLength(4)
  })

  test('three doors, each with a way straight in and a walkthrough', () => {
    renderPublic('/')
    const doors = screen.getByRole('region', { name: 'Three doors, one record.' })
    for (const [door, persona, role] of [
      ['I rent', 'Sarah', 'tenant'],
      ['I let', 'Graham', 'landlord'],
      ['I’m a trade', 'Kev', 'trade'],
    ] as const) {
      const card = within(doors).getByRole('article', { name: door })
      expect(
        within(card)
          .getByRole('link', { name: new RegExp(`Try as ${persona}`) })
          .getAttribute('href'),
      ).toMatch(new RegExp(`^/${role}\\?as=person_`))
      expect(within(card).getByRole('link', { name: /How it works for/ })).toHaveAttribute(
        'href',
        `/how-it-works/${role}`,
      )
    }
  })

  test('shows the Scottish rules it is built around', () => {
    renderPublic('/')
    const scotland = screen.getByRole('region', {
      name: 'Built for how letting works in Scotland.',
    })
    for (const rule of [
      '48 hours’ notice',
      'Landlord registration',
      'The Repairing Standard',
      'Approved deposit schemes',
      'Certificates on time',
      'Private residential tenancies',
    ]) {
      expect(within(scotland).getByRole('heading', { name: rule })).toBeInTheDocument()
    }
  })

  test('pricing is free during launch, with later prices marked as intended', () => {
    renderPublic('/')
    const pricing = screen.getByRole('region', { name: 'Free during launch.' })
    expect(within(pricing).getAllByText('£0')).toHaveLength(3)
    expect(within(pricing).getByText('Then from £4 per home a month')).toBeInTheDocument()
    expect(within(pricing).getByText(/Nobody is charged during launch/)).toBeInTheDocument()
    expect(within(pricing).getByRole('link', { name: 'Sign up as a landlord' })).toHaveAttribute(
      'href',
      '/signup/landlord',
    )
  })

  test('ends on the demo, with every way in', () => {
    renderPublic('/')
    const closing = screen.getByRole('region', { name: 'See one repair from all three sides.' })
    expect(within(closing).getByRole('link', { name: /Try the demo/ })).toHaveAttribute(
      'href',
      '/demo',
    )
    expect(within(closing).getByRole('link', { name: /Sign up free/ })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(within(closing).getByRole('link', { name: /More people to try/ })).toHaveAttribute(
      'href',
      '/start',
    )
  })

  test('every anchor the site links to lands on a section', () => {
    renderPublic('/')
    for (const id of ['how-it-works', 'fair-ratings', 'doors', 'scotland', 'pricing', 'faq']) {
      expect(document.getElementById(id)).toBeInTheDocument()
    }
  })

  test('the footer says it is a demo and links every policy', () => {
    renderPublic('/')
    // The page's own footer comes last; cards (the tenant passport) have footers of their own.
    const footer = screen.getAllByRole('contentinfo').at(-1)!
    expect(
      within(footer).getByText('This is a demo with fictional people and places.'),
    ).toBeInTheDocument()
    for (const [name, href] of [
      ['Review policy', '/policies/reviews'],
      ['Reporting a review', '/policies/reporting'],
      ['Privacy', '/policies/privacy'],
    ] as const) {
      expect(within(footer).getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  test('an unknown public address gets the friendly 404', async () => {
    renderPublic('/no-such-page')
    expect(
      await screen.findByRole('heading', { name: 'We can’t find that page' }),
    ).toBeInTheDocument()
  })
})

describe('photo slots', () => {
  test('show the drawing until the photo loads, and for good if it fails', () => {
    const { container } = render(
      <PublicPhoto
        src="/images/landing/missing.webp"
        alt=""
        fallback={<span data-testid="drawing" />}
        className="aspect-[4/5]"
      />,
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveClass('opacity-0')
    expect(screen.getByTestId('drawing')).toBeInTheDocument()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('drawing')).toBeInTheDocument()
  })

  test('fade the photo in once it has loaded', () => {
    const { container } = render(
      <PublicPhoto src="/images/landing/door-tenant.webp" alt="" fallback={null} priority />,
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'eager')
    Object.defineProperty(img, 'naturalWidth', { value: 1200 })
    fireEvent.load(img)
    expect(img).toHaveClass('opacity-100')
  })
})

test('a tenant’s passport link opens in the landlord portal', async () => {
  const { location } = renderPublic('/passport/pass_abc123')
  await waitFor(() => expect(location()).toBe('/landlord/passports/pass_abc123'))
})
