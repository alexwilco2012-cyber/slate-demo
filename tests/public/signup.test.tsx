import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { BRAND } from '@/config/brand'
import { renderPublic } from './harness'

beforeEach(() => {
  sessionStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

const question = (name: string | RegExp) =>
  screen.findByRole('heading', { level: 1, name }, { timeout: 3000 })

async function carryOn(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /Continue/ }))
}

async function answerCommonQuestions(user: UserEvent, name: string, email: string) {
  await question('What’s your name?')
  await user.type(screen.getByLabelText('Full name'), name)
  await carryOn(user)
  await question('Are you 18 or over?')
  await user.click(screen.getByText('I’m 18 or over'))
  await carryOn(user)
  await question('What’s your email?')
  await user.type(screen.getByLabelText('Email'), email)
  await carryOn(user)
}

describe('choosing a role', () => {
  test('/signup offers the three doors', async () => {
    renderPublic('/signup')
    expect(await question(`How will you use ${BRAND.name}?`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /I rent/ })).toHaveAttribute('href', '/signup/tenant')
    expect(screen.getByRole('link', { name: /I let/ })).toHaveAttribute('href', '/signup/landlord')
    expect(screen.getByRole('link', { name: /I’m a trade/ })).toHaveAttribute(
      'href',
      '/signup/trade',
    )
  })

  test('an unknown role is a 404', async () => {
    renderPublic('/signup/butler')
    expect(
      await screen.findByRole('heading', { name: 'We can’t find that page' }),
    ).toBeInTheDocument()
  })

  test('a question left unanswered says what is missing and puts focus on it', async () => {
    const user = userEvent.setup()
    renderPublic('/signup/tenant')
    await question('What’s your name?')
    await carryOn(user)
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveFocus())

    await user.type(screen.getByLabelText('Full name'), 'Jamie Duthie')
    await carryOn(user)
    await question('Are you 18 or over?')
    await carryOn(user)
    expect(await screen.findByText(/Tick the box to confirm you’re 18 or over/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'I’m 18 or over' })).toHaveFocus(),
    )
  })

  test('a link to a later question starts from the first one still unanswered', async () => {
    renderPublic('/signup/tenant?step=check')
    expect(await question('What’s your name?')).toBeInTheDocument()
  })
})

describe('tenant sign-up', () => {
  test('one question per screen, through the magic link, into the portal with a checked badge', async () => {
    const user = userEvent.setup()
    const { slate, store, location } = renderPublic('/signup/tenant')

    await question('What’s your name?')
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument()
    await carryOn(user)
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Full name'), 'Jamie Duthie')
    await carryOn(user)
    await question('Are you 18 or over?')
    await carryOn(user)
    expect(await screen.findByText(/Tick the box to confirm you’re 18 or over/)).toBeInTheDocument()
    await user.click(screen.getByText('I’m 18 or over'))
    await carryOn(user)

    await question('What’s your email?')
    await user.type(screen.getByLabelText('Email'), 'jamie.duthie@example.com')
    await carryOn(user)

    await question('Where do you live?')
    await user.click(screen.getByRole('button', { name: /^AB25/ }))
    expect(screen.getByLabelText('Postcode area')).toHaveValue('AB25')
    await carryOn(user)

    await question('Check your ID?')
    expect(screen.getByRole('radio', { name: /Check my ID now/ })).toBeChecked()
    await carryOn(user)

    await question('Check your answers')
    const answers = screen.getByRole('main')
    expect(within(answers).getByText('Jamie Duthie')).toBeInTheDocument()
    expect(within(answers).getByText('jamie.duthie@example.com')).toBeInTheDocument()
    expect(within(answers).getByText('AB25')).toBeInTheDocument()
    expect(within(answers).getByRole('link', { name: 'Change email' })).toHaveAttribute(
      'href',
      '/signup/tenant?step=email',
    )
    await user.click(screen.getByRole('button', { name: /Send my sign-in link/ }))

    await question('Check your email')
    expect(location()).toBe('/signup/tenant/check-email')
    expect(screen.getByRole('article', { name: /Email from/ })).toHaveTextContent(
      'jamie.duthie@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Confirm and continue' }))

    await question(`Welcome to ${BRAND.name}, Jamie`)
    const session = store.get()
    expect(session?.activeRole).toBe('tenant')
    const me = await slate.api.getMe({ personId: session!.personId, role: 'tenant' })
    expect(me.displayName).toBe('Jamie Duthie')
    expect(me.postcodeDistrict).toBe('AB25')
    expect(me.pendingVerifications.map((pending) => pending.claim.kind)).toEqual(['id_check'])

    expect(screen.getByText('Check in progress')).toBeInTheDocument()
    expect(await screen.findByText(/^Checked /, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to your home/ })).toHaveAttribute('href', '/tenant')
    expect(sessionStorage.getItem('slate-signup-draft')).toBeNull()
  })

  test('an email that already has an account is sent back to that question', async () => {
    const user = userEvent.setup()
    renderPublic('/signup/tenant')
    await answerCommonQuestions(user, 'Sarah Laing', 'sarah.laing@example.com')
    await question('Where do you live?')
    await user.type(screen.getByLabelText('Postcode area'), 'ab25')
    await carryOn(user)
    await question('Check your ID?')
    await user.click(screen.getByRole('radio', { name: /Later, from my profile/ }))
    await carryOn(user)
    await question('Check your answers')
    await user.click(screen.getByRole('button', { name: /Send my sign-in link/ }))

    await question('What’s your email?')
    expect(await screen.findByText(/already an account with this email/)).toBeInTheDocument()
  })

  test('answers survive a reload of the tab', async () => {
    const user = userEvent.setup()
    const first = renderPublic('/signup/tenant')
    await question('What’s your name?')
    await user.type(screen.getByLabelText('Full name'), 'Ailsa Reid')
    await carryOn(user)
    await question('Are you 18 or over?')
    first.unmount()

    renderPublic('/signup/tenant?step=name')
    expect(await question('What’s your name?')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('Ailsa Reid')
  })
})

describe('landlord sign-up', () => {
  test('checks the registration number format and explains the public register', async () => {
    const user = userEvent.setup()
    const { slate, store } = renderPublic('/signup/landlord')
    await answerCommonQuestions(user, 'Moira Kerr', 'moira.kerr@example.com')
    await question('Where are you based?')
    await user.type(screen.getByLabelText('Postcode area'), 'AB15')
    await carryOn(user)

    await question('Your landlord registration number')
    expect(screen.getByText('We check this against the public register')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Registration number'), '12345')
    await carryOn(user)
    expect(
      await screen.findByText(/registration numbers look like 123456\/100\/12345/),
    ).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Registration number'))
    await user.type(screen.getByLabelText('Registration number'), '123456/100/12345')
    await carryOn(user)

    await question('Do you work with a letting agent?')
    await user.click(screen.getByText('Yes, I use a letting agent'))
    await user.type(screen.getByLabelText(/Your agent’s email/), 'agent.kerr@example.co.uk')
    await carryOn(user)

    await question('Check your answers')
    expect(screen.getByText('Yes: agent.kerr@example.co.uk')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Send my sign-in link/ }))
    await question('Check your email')
    await user.click(screen.getByRole('button', { name: 'Confirm and continue' }))

    await question(`Welcome to ${BRAND.name}, Moira`)
    const me = await slate.api.getMe({ personId: store.get()!.personId, role: 'landlord' })
    expect(me.pendingVerifications[0]?.claim).toEqual({
      kind: 'landlord_registration',
      registrationNumber: '123456/100/12345',
      council: 'Aberdeen City Council',
    })
    expect(
      screen.getByRole('link', { name: /Invite agent.kerr@example.co.uk to your team/ }),
    ).toHaveAttribute('href', '/landlord/team')
  })

  test('the registration number can be added later', async () => {
    const user = userEvent.setup()
    renderPublic('/signup/landlord')
    await answerCommonQuestions(user, 'Moira Kerr', 'moira.kerr@example.com')
    await question('Where are you based?')
    await user.type(screen.getByLabelText('Postcode area'), 'AB15')
    await carryOn(user)
    await question('Your landlord registration number')
    await user.click(screen.getByRole('button', { name: 'Add it later' }))
    expect(await question('Do you work with a letting agent?')).toBeInTheDocument()
  })
})

describe('trade sign-up', () => {
  async function upToTrades(user: UserEvent) {
    await answerCommonQuestions(user, 'Morag Innes', 'morag.innes@example.com')
    await question('What’s your business called?')
    await user.type(screen.getByLabelText('Business name'), 'Innes Heating')
    await carryOn(user)
    await question('What work do you do?')
  }

  test('a gas engineer gives a Gas Safe number and appliances; an electrician a scheme', async () => {
    const user = userEvent.setup()
    const { slate, store } = renderPublic('/signup/trade')
    await upToTrades(user)
    await carryOn(user)
    expect(await screen.findByText('Choose at least one trade.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Plumber' })).toHaveFocus())
    await user.click(screen.getByText('Gas engineer'))
    await user.click(screen.getByText('Electrician'))
    await carryOn(user)

    await question('Which areas do you cover?')
    await user.click(screen.getByText(/^AB11/))
    await user.click(screen.getByText(/^AB10/))
    await carryOn(user)

    await question(/Your Gas.Safe registration/)
    await user.type(screen.getByLabelText('Gas Safe registration number'), '12ab3')
    await carryOn(user)
    expect(await screen.findByText(/6 or 7 digits\./)).toBeInTheDocument()
    expect(screen.getByText(/Choose at least one type of appliance/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Gas Safe registration number'))
    await user.type(screen.getByLabelText('Gas Safe registration number'), '5123456')
    await user.click(screen.getByText('Boilers and central heating'))
    await carryOn(user)

    await question('Are you in an electrical scheme?')
    await user.click(screen.getByText('NICEIC'))
    await user.type(screen.getByLabelText('NICEIC membership number'), 'D604211')
    await carryOn(user)

    await question('Do you have public liability insurance?')
    await user.click(screen.getByText('Yes, I’m insured'))
    await carryOn(user)

    await question('Check your answers')
    expect(screen.getByText('Gas engineer, Electrician')).toBeInTheDocument()
    expect(screen.getByText('AB10, AB11')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Send my sign-in link/ }))
    await question('Check your email')
    await user.click(screen.getByRole('button', { name: 'Confirm and continue' }))
    await question(`Welcome to ${BRAND.name}, Morag`)

    const me = await slate.api.getMe({ personId: store.get()!.personId, role: 'trade' })
    expect(me.tradeProfile).toMatchObject({
      businessName: 'Innes Heating',
      trades: ['gas_engineer', 'electrician'],
      serviceDistricts: ['AB10', 'AB11'],
    })
    expect(me.postcodeDistrict).toBe('AB10')
    expect(me.pendingVerifications.map((pending) => pending.claim)).toEqual([
      { kind: 'gas_safe', registrationNumber: '5123456', applianceCategories: ['boilers'] },
      { kind: 'electrical_scheme', scheme: 'NICEIC', membershipNumber: 'D604211' },
    ])
    expect(screen.getByRole('link', { name: /Add your insurance certificate/ })).toBeInTheDocument()
  })

  test('a plumber is only asked whether they work on gas, and trades without it skip ahead', async () => {
    const user = userEvent.setup()
    renderPublic('/signup/trade')
    await upToTrades(user)
    await user.click(screen.getByText('Plumber'))
    await carryOn(user)
    await question('Which areas do you cover?')
    await user.click(screen.getByText(/^AB24/))
    await carryOn(user)
    await question('Do you work on gas appliances?')
    expect(screen.queryByLabelText('Gas Safe registration number')).not.toBeInTheDocument()
    await user.click(screen.getByText('No, not gas work'))
    await carryOn(user)
    expect(await question('Do you have public liability insurance?')).toBeInTheDocument()
  })

  test('the trade sign-up uses the Hi-Vis trade styling', async () => {
    renderPublic('/signup/trade')
    await question('What’s your name?')
    expect(screen.getByRole('main').querySelector('[data-role="trade"]')).not.toBeNull()
  })
})

test('a signed-in visitor who reaches the welcome page for another role is sent back', async () => {
  const { location } = renderPublic('/signup/landlord/welcome', {
    session: { personId: 'person_sarah', activeRole: 'tenant' },
  })
  await waitFor(() => expect(location()).toBe('/signup/landlord'))
})
