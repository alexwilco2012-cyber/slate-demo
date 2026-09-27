import { FILTER_MESSAGES, checkText, type FilterResult } from '@/domain/rating'
import type { SensitiveTopic } from '@/domain/types'

const topics = (result: FilterResult, action?: 'block' | 'flag') =>
  [
    ...new Set(
      result.issues
        .filter((issue) => action === undefined || issue.action === action)
        .map((issue) => issue.topic),
    ),
  ].sort()

describe('comment filter: ordinary repair language passes untouched', () => {
  it.each([
    'The kitchen tap was dripping and Kev swapped the washer in twenty minutes.',
    'He fitted child locks to the cupboards under the sink and a child-proof catch on the window.',
    'There was black mould behind the wardrobe; it was treated and repainted.',
    'All the white goods were tested and the roller blind in the bedroom was fixed.',
    'The French doors now close properly and both locks work.',
    'Health and safety paperwork was all in order.',
    "The Legionnaires' disease risk assessment was done on time.",
    'The Legionnaires’ disease risk assessment was done on time.',
    'The engineer disabled the old alarm and fitted a new one.',
    'J Duncan & Sons did the slating and cleared the gutters.',
    'The Scottish landlord registration number was checked before the tenancy.',
    'I work from my home office, so a morning slot suited me.',
    'Paid by Visa debit card on the day, no fuss.',
    'The boiler pressure was sorted and the radiators bled.',
    'The final price matched the quote exactly.',
    'They sent the gas safety record on 12/03/2026 and the EICR the week after.',
    'Invoice total was £1,240.00 including VAT.',
    'Left the close tidy and took the old toilet away.',
    'The plumber arrived at 9am as agreed and was polite throughout.',
    'The damp in the AB10 flat was sorted before winter.',
    'He was ill-equipped for a job this size but sorted it in the end.',
    'Honestly sick of waiting three weeks for a part.',
    'The previous tenants left the oven filthy.',
    'Fell on deaf ears at first, but they fixed the heating in the end.',
    'Water was coming through the ceiling from the flat above.',
    'Replaced the combi boiler and the ceiling rose.',
    'Rent was paid on the 1st every month without fail.',
    'Visited on 3 March and again on 10 March.',
    'The Road was closed, so he parked round the back.',
    'My partner was at home to let him in.',
    'He will polish the taps and doled out advice on the boiler.',
    'The walls were white and the new carpet cost £7,700 in total.',
  ])('%s', (text) => {
    const result = checkText(text, { allowedNames: ['Kev'] })
    expect(result.issues).toEqual([])
    expect(result.blocked).toBe(false)
    expect(result.summary).toBeNull()
  })
})

describe('comment filter: blocked topics', () => {
  it.each<[string, SensitiveTopic]>([
    ['The landlord kept complaining about my kids being noisy.', 'children'],
    ['My son had to stay with his gran while the heating was off.', 'children'],
    ['Their baby was crying the whole time I was there.', 'children'],
    ['The kids were running about while he worked.', 'children'],
    ['She is on Universal Credit so rent was always late.', 'benefits'],
    ['He said he would not rent to anyone on benefits.', 'benefits'],
    ['The DWP paid it straight to the landlord.', 'benefits'],
    ['She has mental health problems and it showed.', 'health'],
    ['He mentioned she was pregnant, which had nothing to do with the boiler.', 'pregnancy'],
    ['My husband is disabled and the landlord ignored that.', 'disability'],
    ['There was no room for a wheelchair in the hall.', 'disability'],
    ["She's blind, so the trade had to explain everything.", 'disability'],
    ['The Polish plumber did a fine job.', 'ethnicity'],
    ['Nice Asian family, always paid on time.', 'ethnicity'],
    ['They are Muslim and asked for a different day.', 'religion'],
    ['He is an asylum seeker, as far as I know.', 'immigration_status'],
    ['The Home Office letter came while I was there.', 'immigration_status'],
    ['He is a thief and took the spare keys.', 'criminal_allegation'],
    ['The landlord is a fraudster.', 'criminal_allegation'],
    ['Call me on 07700 900123 if you want the full story.', 'phone_number'],
    ['His mobile is +44 7700 900456.', 'phone_number'],
    ['Text 07700900789 for details.', 'phone_number'],
    ['Email me at sarah.reid@example.com for photos.', 'email_address'],
    ['Write to sarah (at) example (dot) co (dot) uk instead.', 'email_address'],
    ['Try graham at example dot com.', 'email_address'],
    ['The flat at 14 Esslemont Avenue is damp.', 'postal_address'],
    ['Postcode is AB10 9CV if anyone wants to check.', 'postal_address'],
    ['My neighbour Dave saw the whole thing.', 'third_party_name'],
    ['Mr Smith from upstairs let him in.', 'third_party_name'],
    // Written to slip past: lower case, a dropped leading 0, slang.
    ['The postcode is ab10 9cv if you want to look.', 'postal_address'],
    ['Text 7700 900123 and ask for the flat.', 'phone_number'],
    ['The nigerian tenant upstairs was lovely.', 'ethnicity'],
    ['The gypsies next door were no bother.', 'ethnicity'],
    ['He has been on the dole since the spring.', 'benefits'],
    ['He is an alcoholic, which explains the mess.', 'health'],
  ])('%s', (text, topic) => {
    const result = checkText(text)
    expect(result.blocked).toBe(true)
    expect(topics(result, 'block')).toContain(topic)
    expect(result.summary).toBe('Change the highlighted words before you post.')
  })
})

describe('comment filter: flagged, not blocked', () => {
  it.each<[string, SensitiveTopic]>([
    ['I was unwell that week so rearranged the visit.', 'health'],
    ['The police came round about the break-in next door.', 'criminal_allegation'],
    ['He asked about my visa, which felt odd.', 'immigration_status'],
    ['They were at church on Sunday so we went on Monday.', 'religion'],
    ['Fiona from the agency was lovely.', 'third_party_name'],
    ['The flat on Esslemont Avenue was damp.', 'postal_address'],
    ['A carer visits daily so access was easy.', 'disability'],
    ["The radiator in the kids' bedroom was fixed first.", 'children'],
    ["The children's room window now opens.", 'children'],
    ['The landlord threatened to keep the whole deposit.', 'criminal_allegation'],
    ['He is black, which should not matter to anyone.', 'ethnicity'],
  ])('%s', (text, topic) => {
    const result = checkText(text)
    expect(result.blocked).toBe(false)
    expect(result.flagged).toBe(true)
    expect(topics(result, 'flag')).toContain(topic)
    expect(result.summary).toBe('You can post this, but check the highlighted words first.')
  })
})

describe('comment filter: names', () => {
  it('lets through the name of the person being rated', () => {
    const result = checkText('Kev was on time and my landlord Graham paid him promptly.', {
      allowedNames: ['Kev Mitchell', 'Graham Reid'],
    })
    expect(result.issues).toEqual([])
  })

  it('treats a first name in a street or business name as part of that name', () => {
    expect(topics(checkText('Callum Duncan & Sons fitted the new gutters.'))).toEqual([])
    expect(topics(checkText("Dave's Plumbing came out within the hour."))).toEqual([])
    const street = checkText('The flat on George Street needed new windows.')
    expect(topics(street)).toEqual(['postal_address'])
  })

  it('only takes a capitalised word after "my neighbour" as a name', () => {
    expect(checkText('My neighbour said the leak started on Friday.').issues).toEqual([])
    expect(checkText('Our tenant Monday morning was fine.').issues).toEqual([])
  })

  it('blocks names that must never appear, written as a name, even if also allowed', () => {
    const options = { allowedNames: ['Will Reid'], blockedNames: ['Will Reid'] }
    expect(topics(checkText('Will sent the photos late.', options), 'block')).toEqual([
      'third_party_name',
    ])
    expect(topics(checkText('Talk to REID about it.', options), 'block')).toEqual([
      'third_party_name',
    ])
    expect(checkText('I will send the photos and the invoice.', options).issues).toEqual([])
  })

  it('reports one issue when the same name is found twice over', () => {
    const result = checkText('My neighbour Dave let him in.')
    expect(result.issues).toEqual([
      { topic: 'third_party_name', action: 'block', start: 13, end: 17, text: 'Dave' },
    ])
  })
})

describe('comment filter: what it returns', () => {
  it('gives the exact range of the words, for highlighting', () => {
    const text = 'Lovely job. Call 07700 900123 any time.'
    const [issue] = checkText(text).issues
    expect(issue).toMatchObject({ topic: 'phone_number', action: 'block' })
    expect(text.slice(issue!.start, issue!.end)).toBe('07700 900123')
    expect(issue!.text).toBe('07700 900123')
  })

  it('explains each topic once, in plain English, blocked ones first', () => {
    const result = checkText(
      'My son was unwell and Mr Smith rang 07700 900123. The police were called later.',
    )
    expect(result.reasons.map((reason) => [reason.topic, reason.action])).toEqual([
      ['children', 'block'],
      ['third_party_name', 'block'],
      ['phone_number', 'block'],
      ['health', 'flag'],
      ['criminal_allegation', 'flag'],
    ])
    expect(result.reasons[0]?.message).toBe(FILTER_MESSAGES.children.block)
    expect(result.reasons[2]?.message).toBe(
      "Take out the phone number. Reviews can't include contact details.",
    )
  })

  it('has a message for every topic and action', () => {
    for (const messages of Object.values(FILTER_MESSAGES)) {
      expect(messages.block.length).toBeGreaterThan(20)
      expect(messages.flag.length).toBeGreaterThan(20)
    }
  })

  it('handles empty text', () => {
    expect(checkText('')).toEqual({
      blocked: false,
      flagged: false,
      issues: [],
      reasons: [],
      summary: null,
    })
  })
})

describe('comment filter: sexual orientation, age and pregnancy (Equality Act)', () => {
  it.each<[string, SensitiveTopic]>([
    ['They are a gay couple and kept the flat spotless.', 'sexual_orientation'],
    ['She mentioned her girlfriend, as if her sexuality mattered.', 'sexual_orientation'],
    ['A same-sex couple rented it before us.', 'sexual_orientation'],
    ['The landlord seemed uneasy that we are LGBT.', 'sexual_orientation'],
    ['Lovely elderly tenant, always paid on time.', 'age'],
    ['He is a pensioner so he was home all day.', 'age'],
    ['A young couple, so I expected parties.', 'age'],
    ['The old man downstairs let the plumber in.', 'age'],
    ['A 70-year-old woman should not have to wait weeks for heating.', 'age'],
    ["She's 82 and lives alone.", 'age'],
    ['He is in his eighties and struggled with the stairs.', 'age'],
    ['At her age she should not be climbing ladders.', 'age'],
    ['He is too old to be renting a top-floor flat.', 'age'],
    ['The OAPs next door complained about the noise.', 'age'],
    ['She was on maternity leave, so she was home for the visit.', 'pregnancy'],
    ['Heavily pregnant and no hot water for a week.', 'pregnancy'],
    ['She gave birth that month and the heating was off for a week.', 'pregnancy'],
    ['The midwife was visiting when the engineer arrived.', 'pregnancy'],
  ])('blocks: %s', (text, topic) => {
    const result = checkText(text)
    expect(result.blocked).toBe(true)
    expect(topics(result, 'block')).toContain(topic)
  })

  it.each([
    'The old boiler was replaced with a new combi.',
    "The property's age shows in the draughty sash windows.",
    'A 20-year-old boiler is overdue for replacing.',
    'The boiler is 15 years old and still going.',
    'The windows are showing their age but the flat is warm.',
    'The old tenants left a mattress in the shed.',
    'My old landlord never fixed anything, so this was a change.',
    'They were 20 minutes late but called ahead.',
    'We were 10 minutes early and waited in the van.',
    'The part took ages to arrive, but it was fitted the same day.',
    'I was expecting the plumber at nine and he came at nine.',
    'A young company, but they did a tidy job on the bathroom.',
    'The age of the wiring meant a full EICR was needed.',
    'Straight answers and a fair price.',
  ])('lets through: %s', (text) => {
    expect(checkText(text).issues).toEqual([])
  })

  it('explains each new topic in plain English, without "please"', () => {
    for (const topic of ['sexual_orientation', 'age', 'pregnancy'] as const) {
      expect(FILTER_MESSAGES[topic].block).toMatch(/^Take out the part about/)
      expect(FILTER_MESSAGES[topic].flag).toMatch(/If it is, take it out\.$/)
    }
    for (const messages of Object.values(FILTER_MESSAGES)) {
      expect(messages.block).not.toMatch(/please/i)
      expect(messages.flag).not.toMatch(/please/i)
    }
  })

  it('flags retirement and pension talk for moderation rather than blocking it', () => {
    const result = checkText('He is retired, so weekday mornings suited him.')
    expect(result.blocked).toBe(false)
    expect(topics(result, 'flag')).toEqual(['age'])
  })
})

describe('comment filter: addresses written in lower case', () => {
  it.each([
    'the flat at 14 esslemont avenue is damp',
    'i lived at 211 rosemount place for two years',
    'Came out to 7 union st on a sunday.',
    "His van was outside 32 queen's road all morning.",
    'The job at 12b walker road took all day.',
  ])('blocks a house number and street: %s', (text) => {
    const result = checkText(text)
    expect(result.blocked).toBe(true)
    expect(topics(result, 'block')).toEqual(['postal_address'])
  })

  it('highlights the address itself', () => {
    const text = 'the flat at 14 esslemont avenue is damp'
    const [issue] = checkText(text).issues
    expect(issue?.text).toBe('14 esslemont avenue')
  })

  it.each(['the flat on esslemont avenue was cold', 'parked off great northern road'])(
    'flags a lower-case street name after "on" or "off": %s',
    (text) => {
      const result = checkText(text)
      expect(result.blocked).toBe(false)
      expect(topics(result, 'flag')).toEqual(['postal_address'])
    },
  )

  it.each([
    'He was 10 minutes down the road when I called.',
    'A 5 minute walk from the bus stop, so easy to find.',
    'Took 2 days to get the part, parked on the main road.',
    'The van was on the high street because the back lane was blocked.',
    'Up 3 flights, 4 storey terrace, no lift.',
    'A 2 car drive and a small garden.',
    'They were at the end of the road waiting for me.',
    'Access is from the ring road, then the service road behind the shops.',
    'Five stars from me: 5 stars on the whole way through.',
  ])('lets ordinary directions through: %s', (text) => {
    expect(checkText(text).issues).toEqual([])
  })
})
