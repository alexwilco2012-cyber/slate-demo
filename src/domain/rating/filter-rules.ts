// The comment filter's word lists (SPEC §5 rule 7, plus sexual orientation, age and pregnancy from
// the Equality Act 2010). 'block' stops the text being posted until it's changed; 'flag' lets it
// through but marks it for moderation, for words that are often innocent. Every list is tested
// against ordinary repair language: "child lock", "black mould", "white goods", "roller blind",
// "French doors", "health and safety", "Legionnaires' disease", "the engineer disabled the alarm",
// "J Duncan & Sons", "an old boiler", "the property's age" and "ten minutes down the road" must all
// pass untouched.
//
// This is a demo lexicon, not a moderation service: it holds no slurs, and a live service would
// need a maintained list and a human review of flags.

import type { SensitiveTopic } from '@/domain/types'

export interface PatternRule {
  readonly topic: SensitiveTopic
  readonly action: 'block' | 'flag'
  /** Always global. Matched against the text with curly apostrophes made straight. */
  readonly pattern: RegExp
}

const any = (words: readonly string[]) => `(?:${words.join('|')})`
const anyCase = (source: string) => new RegExp(source, 'gi')
const exactCase = (source: string) => new RegExp(source, 'g')

const PEOPLE = [
  'm[ae]n',
  'wom[ae]n',
  'guys?',
  'lads?',
  'lass(?:es)?',
  'girls?',
  'boys?',
  'famil(?:y|ies)',
  'people',
  'person',
  'folks?',
  'couples?',
  'lad(?:y|ies)',
  'gentlem[ae]n',
  'chaps?',
  'blokes?',
  'fellas?',
]
const RESIDENTS_AND_TRADES = [
  'tenants?',
  'landlords?',
  'landlady',
  'workers?',
  'builders?',
  'plumbers?',
  'electricians?',
  'joiners?',
  'tradesm[ae]n',
  'cleaners?',
  'neighbours?',
  'flatmates?',
  'students?',
  'nationals?',
]
const FAMILY = [
  'son',
  'daughter',
  'child(?:ren)?',
  'partner',
  'husband',
  'wife',
  'mum',
  'mother',
  'dad',
  'father',
  'brother',
  'sister',
]
// Someone described as disabled or blind, e.g. "she's disabled", "my husband is blind".
const PERSON_IS = String.raw`\b(?:he|she|they|i|we|who|${any(FAMILY)}|tenants?)(?:'s|'re|'m|\s+(?:is|was|are|were|am|became|went|has been|had been|have been))\s+`

const NATIONALITIES = [
  'Polish',
  'Romanian',
  'Bulgarian',
  'Lithuanian',
  'Latvian',
  'Estonian',
  'Slovak',
  'Czech',
  'Hungarian',
  'Russian',
  'Ukrainian',
  'Albanian',
  'Indian',
  'Pakistani',
  'Bangladeshi',
  'Sri Lankan',
  'Chinese',
  'Japanese',
  'Korean',
  'Nigerian',
  'Ghanaian',
  'Somali',
  'Sudanese',
  'Eritrean',
  'Ethiopian',
  'Syrian',
  'Afghan',
  'Iraqi',
  'Iranian',
  'Kurdish',
  'Turkish',
  'Arab',
  'African',
  'Caribbean',
  'Asian',
  'Eastern European',
  'European',
  'Italian',
  'Spanish',
  'Portuguese',
  'Brazilian',
  'French',
  'German',
  'Filipino',
  'Thai',
  'Vietnamese',
  'American',
  'Jamaican',
  'Roma',
  'Gypsy',
  'Traveller',
  'Scottish',
  'English',
  'Irish',
  'Welsh',
  'British',
]

export const STREET_TYPES = [
  'Street',
  'St',
  'Road',
  'Rd',
  'Avenue',
  'Ave',
  'Terrace',
  'Place',
  'Crescent',
  'Drive',
  'Lane',
  'Gardens',
  'Court',
  'Way',
  'Walk',
  'Square',
  'Grove',
  'Row',
  'Wynd',
  'Close',
  'Brae',
  'Park',
  'View',
  'Hill',
  'Mews',
  'Circle',
  'Gate',
  'Loan',
  'Lonnen',
  'Quay',
  'Parade',
  'Green',
  'Rise',
  'Vale',
]

/**
 * Words that sit between a number, or "on the", and a street type without being part of a street
 * name: "ten minutes down the road", "a 2 car drive", "on the main road", "the back lane".
 */
export const NOT_STREET_NAME_WORDS: ReadonlySet<string> = new Set(
  `
  the a an this that these those my our your his her their its main high back front rear side
  busy quiet narrow wide long short steep cobbled private public same next nearby local whole
  entire other each every another new old dead end dead-end residential one-way slip ring
  access service dirt farm country dual bus cycle bike fast slow memory shopping communal
  shared roof sun patio car cars parking garden gravel minute minutes min mins hour hours day
  days week weeks month months year years mile miles yard yards metre metres meter meters foot
  feet step steps time times down up along across over under past from to of on in at off by
  near round around with for into onto through via behind beside between beyond towards toward
  out and or but then so is was were are be been it we they he she i you us me him them more
  less few first second third only just about nearly almost floor floors storey storeys story
  flat flats house houses door doors bin bins space spaces people tenants bed bedroom bedrooms
  pane panes window windows stars quid pounds
  `
    .trim()
    .split(/\s+/),
)

/** Street types distinctive enough to flag a street name even without a house number. */
export const DISTINCT_STREET_TYPES = [
  'Street',
  'Road',
  'Avenue',
  'Terrace',
  'Place',
  'Crescent',
  'Drive',
  'Lane',
  'Gardens',
  'Wynd',
  'Brae',
  'Row',
  'Square',
  'Grove',
  'Quay',
  'Parade',
]

export const PATTERN_RULES: readonly PatternRule[] = [
  // Children. Child-safety fittings such as "child lock" or "child-proof catches" are fine, and
  // "the kids' bedroom" names a room, so it is only flagged.
  {
    topic: 'children',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:child(?:ren)?|kids?|kiddies|bab(?:y|ies)|toddlers?|infants?|newborns?|daughters?|step-?(?:sons?|daughters?|child(?:ren)?)|grand(?:sons?|daughters?|child(?:ren)?)|teenagers?|school run|nursery)\b(?!'?s?'?[\s-]*(?:locks?|proof|safety|resistant|gates?|catch(?:es)?|restrictors?|(?:bed)?rooms?)\b)`,
    ),
  },
  {
    topic: 'children',
    action: 'flag',
    pattern: anyCase(String.raw`\b(?:child(?:ren)?|kids?)'?s?'?\s+(?:bed)?rooms?\b`),
  },
  // "son", but not the "& Sons" in many trade names.
  { topic: 'children', action: 'block', pattern: anyCase(String.raw`(?<!&\s?|\band\s)\bsons?\b`) },

  // Benefits
  {
    topic: 'benefits',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:universal credit|housing benefits?|housing element|local housing allowance|on benefits|benefits? claimants?|claim(?:s|ing|ed)? benefits|job ?seeker'?s'? allowance|income support|pension credit|personal independence payment|employment and support allowance|disability living allowance|council tax reduction)\b`,
    ),
  },
  {
    topic: 'benefits',
    action: 'block',
    pattern: exactCase(String.raw`\b(?:DSS|DWP|LHA|JSA|ESA|PIP|DLA)\b`),
  },
  { topic: 'benefits', action: 'block', pattern: anyCase(String.raw`\bon the dole\b`) },
  {
    topic: 'benefits',
    action: 'flag',
    // "Dole out" means hand out.
    pattern: anyCase(String.raw`\b(?:welfare|benefits(?! of)|dole(?!\s+out))\b`),
  },

  // Health. "Health and safety" and Legionnaires' disease are ordinary compliance language.
  {
    topic: 'health',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:mental health|health (?:conditions?|problems?|issues?)|cancer|chemo(?:therapy)?|diabet(?:es|ic)|asthma(?:tic)?|dementia|alzheimer'?s|schizophreni[ac]\w*|bipolar|epilep(?:sy|tic)|medication|illness(?:es)?|terminally ill|alcoholics?|alcoholism|addicts?|addiction|junkies?)\b`,
    ),
  },
  { topic: 'health', action: 'block', pattern: exactCase(String.raw`\b(?:HIV|AIDS|COPD|PTSD)\b`) },
  {
    topic: 'health',
    action: 'flag',
    pattern: anyCase(
      String.raw`\b(?:anxiety|anxious|depress(?:ed|ion)|unwell|hospital(?:ised|ized)?|doctors?|surgery|injur(?:y|ies|ed)|disorders?|sick(?! of| and tired)|ill(?!-)|addicted)\b`,
    ),
  },
  {
    topic: 'health',
    action: 'flag',
    pattern: anyCase(String.raw`(?<!legionnaires'?\s)\bdiseases?\b`),
  },
  { topic: 'health', action: 'flag', pattern: exactCase(String.raw`\b(?:GP|OCD)\b`) },

  // Disability. "Disabled" and "blind" only about a person: "disabled the alarm" and "roller
  // blind" are repair language.
  {
    topic: 'disability',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:disabilit(?:y|ies)|wheelchairs?|deaf(?! ears)|autis(?:m|tic)|learning (?:disabilit(?:y|ies)|difficult(?:y|ies))|special needs|mobility (?:scooters?|aids?|problems?|issues?)|blue badge|hearing aids?|guide dogs?|sign language|registered blind|partially sighted|visually impaired|down'?s syndrome|cerebral palsy|dyslexi[ac])\b`,
    ),
  },
  {
    topic: 'disability',
    action: 'block',
    pattern: anyCase(
      String.raw`${PERSON_IS}disabled\b|\bdisabled\s+${any([...PEOPLE, ...FAMILY, 'tenants?', 'residents?', 'occupants?'])}\b`,
    ),
  },
  {
    topic: 'disability',
    action: 'block',
    pattern: anyCase(String.raw`${PERSON_IS}(?:partially\s+)?blind\b|\bblind\s+${any(PEOPLE)}\b`),
  },
  { topic: 'disability', action: 'block', pattern: exactCase(String.raw`\bADHD\b`) },
  {
    topic: 'disability',
    action: 'flag',
    pattern: anyCase(
      String.raw`\b(?:carers?|care workers?|support workers?|walking sticks?|crutches)\b`,
    ),
  },

  // Ethnicity and nationality. "Black mould", "white goods" and "French doors" are fine.
  {
    topic: 'ethnicity',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:ethnic(?:ity|ities)?|racial(?:ly)?|foreigners?|non-?white|people of colou?r|mixed[\s-]race|ethnic minorit(?:y|ies)|gyps(?:y|ies))\b`,
    ),
  },
  // "They were white" could be the walls, so a colour after "he is" and the like is only flagged.
  {
    topic: 'ethnicity',
    action: 'flag',
    pattern: anyCase(String.raw`${PERSON_IS}(?:black|white|asian|brown|mixed[\s-]race)\b`),
  },
  {
    topic: 'ethnicity',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:black|white|asian|brown|coloured)\s+${any([...PEOPLE, ...RESIDENTS_AND_TRADES])}\b`,
    ),
  },
  {
    topic: 'ethnicity',
    action: 'block',
    // "Scottish landlord registration" is a register, not a person.
    pattern: anyCase(
      String.raw`\b${any(NATIONALITIES.filter((n) => n !== 'Polish'))}\s+${any([...PEOPLE, ...RESIDENTS_AND_TRADES])}\b(?!\s+regist)`,
    ),
  },
  {
    topic: 'ethnicity',
    action: 'block',
    // Only with a capital: "polish" in lower case is usually the verb.
    pattern: exactCase(
      String.raw`\b(?:Polish|POLISH)\s+${any([...PEOPLE, ...RESIDENTS_AND_TRADES])}\b`,
    ),
  },
  {
    topic: 'ethnicity',
    action: 'flag',
    pattern: exactCase(String.raw`\b(?:[Hh]is|[Hh]er|[Tt]heir|broken|poor)\s+(?:English|accent)\b`),
  },
  {
    topic: 'ethnicity',
    action: 'flag',
    pattern: anyCase(String.raw`\b(?:racist|racism|nationality)\b`),
  },

  // Religion
  {
    topic: 'religion',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:muslims?|islam(?:ic)?|christians?|catholics?|protestants?|jewish|jews?|hindus?|sikhs?|buddhists?|atheists?|religions?|religious|mosques?|synagogues?|gurdwaras?|hijabs?|burqas?|niqabs?|turbans?|ramadan|kosher|halal|jehovah'?s witness(?:es)?|mormons?)\b`,
    ),
  },
  {
    topic: 'religion',
    action: 'flag',
    pattern: anyCase(String.raw`\b(?:church(?:es)?|pray(?:s|ed|ing)?|prayers?|temples?)\b`),
  },
  { topic: 'religion', action: 'flag', pattern: exactCase(String.raw`\bEid\b`) },

  // Sexual orientation
  {
    topic: 'sexual_orientation',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:gay|lesbians?|bisexuals?|homosexuals?|homosexuality|heterosexuals?|queer|sexual orientation|sexuality|same[\s-]sex\s+(?:couples?|partners?|relationships?|marriages?))\b`,
    ),
  },
  {
    topic: 'sexual_orientation',
    action: 'block',
    pattern: exactCase(String.raw`\bLGBT(?:Q|QI|QIA)?\+?(?![A-Za-z])`),
  },

  // Age. Only about people: "an old boiler", "a 20-year-old boiler", "the property's age",
  // "showing their age" and "the old tenants" (the ones before) all pass.
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:elderly|pensioners?|geriatric|senile|middle[\s-]aged|old[\s-]age|aged\s+(?:over\s+|about\s+|nearly\s+|under\s+)?\d{2,3})\b`,
    ),
  },
  { topic: 'age', action: 'block', pattern: exactCase(String.raw`\bOAPs?\b`) },
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:old|older|retired)\s+${any(PEOPLE.filter((p) => !p.startsWith('famil')))}\b`,
    ),
  },
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:young|younger)\s+${any([...PEOPLE, ...RESIDENTS_AND_TRADES])}\b`,
    ),
  },
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`\b\d{1,3}[\s-]*(?:years?|yrs?)[\s-]*old\s+${any([...PEOPLE, ...RESIDENTS_AND_TRADES, ...FAMILY])}\b`,
    ),
  },
  // "he's 80", "she is 72 and lives alone", but not "they were 20 minutes late".
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`${PERSON_IS}(?:about |around |nearly |almost |over |under |only |just )?\d{2,3}(?:\s*(?:years?|yrs?)(?:\s+old)?)?(?=\s*(?:[.,;:!?)]|$|and\b|but\b|so\b|or\b|now\b))`,
    ),
  },
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`\bin\s+(?:his|her|their|my|your)\s+(?:(?:early|mid|late)[\s-]+)?(?:teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties|[1-9]0'?s)\b`,
    ),
  },
  // "at her age", but not "the windows are showing their age".
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(String.raw`(?<!\bshow(?:s|ing|ed|n)?\s)\b(?:his|her|their|my|your)\s+age\b`),
  },
  {
    topic: 'age',
    action: 'block',
    pattern: anyCase(
      String.raw`${PERSON_IS}(?:(?:far|much|a bit|a little|way|getting)\s+)?too\s+(?:old|young)\b`,
    ),
  },
  {
    topic: 'age',
    action: 'flag',
    pattern: anyCase(
      String.raw`${PERSON_IS}(?:semi-?)?retired\b|\b(?:retirees?|pensions?|boomers?|millennials?|ageist|ageism|age discrimination)\b`,
    ),
  },

  // Pregnancy and maternity
  {
    topic: 'pregnancy',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:pregnan(?:t|cy|cies)|miscarri(?:age|ages|ed)|(?:maternity|paternity) leave|on maternity|expecting (?:a baby|a child|twins)|expectant (?:mothers?|mums?|parents?)|morning sickness|ante-?natal|post-?natal|midwi(?:fe|ves)|breast-?feeding|IVF|gave birth|giving birth|due to give birth)\b`,
    ),
  },
  { topic: 'pregnancy', action: 'flag', pattern: anyCase(String.raw`\bmaternity\b`) },

  // Immigration status. "Home Office" only with capitals: "my home office" is a room.
  {
    topic: 'immigration_status',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:immigrants?|immigration|migrants?|asylum(?: seekers?)?|refugees?|deport(?:ed|ation|ing)?|work permits?|(?:pre-?)?settled status|leave to remain|no recourse to public funds|illegals|right to rent|(?:biometric )?residence permits?|undocumented)\b`,
    ),
  },
  {
    topic: 'immigration_status',
    action: 'block',
    pattern: exactCase(String.raw`\b(?:Home Office|BRP|NRPF)\b`),
  },
  {
    topic: 'immigration_status',
    action: 'flag',
    pattern: anyCase(String.raw`\bvisas?\b(?![\s-]*(?:card|debit|credit))`),
  },

  // Accusing someone of a crime. Being the victim of one ("we were burgled") is only flagged.
  {
    topic: 'criminal_allegation',
    action: 'block',
    pattern: anyCase(
      String.raw`\b(?:thie(?:f|ves)|stole|steals|stealing|fraud(?:sters?|ulent(?:ly)?)?|scammers?|conm[ae]n|con artists?|crooks?|criminals?|drug dealers?|dealing drugs|assault(?:ed|ing)?|robbed|arrested|convicted|convictions?|paedophiles?|abusers?|harass(?:ed|ing|ment)|blackmail(?:ed|ing)?|extort(?:ed|ion)|money laundering|embezzl\w+)\b`,
    ),
  },
  {
    topic: 'criminal_allegation',
    action: 'flag',
    pattern: anyCase(
      String.raw`\b(?:stolen|theft|scam(?:med)?|burgl(?:ed|ar|ars|ary)|police|illegal(?:ly)?|unlawful(?:ly)?|prison|jail(?:ed)?|drugs?|drunk|violen(?:t|ce)|threaten(?:ed|ing|s)?)\b`,
    ),
  },

  // Contact details. UK numbers: 07700 900123, +44 7700 900123, (01224) 555123.
  {
    topic: 'phone_number',
    action: 'block',
    pattern: exactCase(
      String.raw`(?<![\w+])(?:\+44[\s-]?(?:\(0\)[\s-]?)?|\(?0)\d(?:[\s\-.)]{0,2}\d){8,9}(?!\w)`,
    ),
  },
  // A mobile number with its leading 0 left off to dodge the filter: "7700 900123".
  {
    topic: 'phone_number',
    action: 'block',
    pattern: exactCase(String.raw`(?<![\w+.,£$])7\d{3}[\s-]?\d{3}[\s-]?\d{3}(?![\w.,])`),
  },
  {
    topic: 'email_address',
    action: 'block',
    pattern: anyCase(String.raw`\b[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b`),
  },
  // Written out to dodge the filter: "name (at) example (dot) com", "name at example dot com".
  {
    topic: 'email_address',
    action: 'block',
    pattern: anyCase(
      String.raw`\b[a-z0-9._%+-]+\s*(?:\(at\)|\[at\])\s*[a-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\s+dot\s+)\s*[a-z0-9-]+)+`,
    ),
  },
  {
    topic: 'email_address',
    action: 'block',
    pattern: anyCase(
      String.raw`\b[a-z0-9._%+-]+\s+at\s+[a-z0-9-]+\s+dot\s+(?:com|co\s+dot\s+uk|co\.uk|uk|org|net|scot)\b`,
    ),
  },

  // Addresses: a full postcode, in any case, or a house number and street. The postcode district
  // alone (AB10) is fine: reviews already show it.
  {
    topic: 'postal_address',
    action: 'block',
    pattern: anyCase(String.raw`\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b`),
  },
  {
    topic: 'postal_address',
    action: 'block',
    pattern: exactCase(
      String.raw`\b\d{1,4}[A-Za-z]?,?\s+(?:[A-Z][a-z'-]+\s+){1,3}${any(STREET_TYPES)}\b`,
    ),
  },
]

// ─── Names ───────────────────────────────────────────────────────────────────────────────────

/** "Mr Smith", "Dr Patel": always a name. */
export const HONORIFIC_NAME = /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr)\.?\s+([A-Z][A-Za-z'-]+)/g

/**
 * "my neighbour Dave", "the agent Sarah": the capitalised word after is a name. The whole pattern
 * ignores case so "My Neighbour" matches too, which means filter.ts must check that the captured
 * word really starts with a capital ("my neighbour said" is not a name).
 */
export const RELATION_NAME = new RegExp(
  String.raw`\b(?:my|his|her|their|our|the|a|your)\s+(?:neighbours?|flatmates?|partner|husband|wife|boyfriend|girlfriend|fianc[eé]e?|brother|sister|mum|mother|dad|father|son|daughter|friend|colleague|cousin|uncle|aunt(?:ie)?|gran(?:ny)?|grandad|grandson|granddaughter|apprentice|boss|manager|mate|lodger|carer|landlady|landlord|tenant|agent|plumber|electrician|joiner|engineer|cleaner|builder|roofer|locksmith|handyman|decorator)\s+([A-Z][a-z'-]+)`,
  'gi',
)

/** Capitalised words that follow "my neighbour" and the like without being names. */
export const NOT_NAMES = new Set([
  'I',
  'The',
  'And',
  'But',
  'Then',
  'So',
  'He',
  'She',
  'They',
  'We',
  'It',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
])

// Common first names in Scotland. Names that are also ordinary words or places ("Will", "Mark",
// "Rose", "Grace", "Heather", "Don", "Lorne", "Ben") are left out to avoid false alarms. A name
// on its own is only flagged, never blocked.
const FIRST_NAMES = [
  'Aaron',
  'Adam',
  'Aileen',
  'Ailsa',
  'Alan',
  'Alastair',
  'Alasdair',
  'Alex',
  'Alexander',
  'Alison',
  'Amy',
  'Andrew',
  'Andy',
  'Angus',
  'Anne',
  'Barry',
  'Brian',
  'Callum',
  'Calum',
  'Catherine',
  'Charlie',
  'Chloe',
  'Chris',
  'Christine',
  'Claire',
  'Colin',
  'Connor',
  'Craig',
  'Daniel',
  'Danny',
  'Darren',
  'Dave',
  'David',
  'Debbie',
  'Derek',
  'Donald',
  'Douglas',
  'Duncan',
  'Eilidh',
  'Elaine',
  'Elizabeth',
  'Ellie',
  'Emily',
  'Emma',
  'Euan',
  'Ewan',
  'Fiona',
  'Fraser',
  'Gary',
  'George',
  'Gillian',
  'Graeme',
  'Graham',
  'Hamish',
  'Hannah',
  'Harry',
  'Iain',
  'Ian',
  'Isla',
  'Jamie',
  'James',
  'Jason',
  'Jennifer',
  'Jessica',
  'Jim',
  'Jimmy',
  'Joanne',
  'John',
  'Jonathan',
  'Josh',
  'Julie',
  'Karen',
  'Katie',
  'Keith',
  'Kenneth',
  'Kev',
  'Kevin',
  'Kirsty',
  'Kyle',
  'Laura',
  'Lauren',
  'Lesley',
  'Liam',
  'Linda',
  'Lindsay',
  'Lisa',
  'Lorna',
  'Lorraine',
  'Louise',
  'Lucy',
  'Malcolm',
  'Margaret',
  'Martin',
  'Mary',
  'Matthew',
  'Megan',
  'Michael',
  'Michelle',
  'Mike',
  'Mohammed',
  'Morag',
  'Muhammad',
  'Murray',
  'Neil',
  'Nicola',
  'Oliver',
  'Olivia',
  'Paul',
  'Peter',
  'Rachel',
  'Rebecca',
  'Richard',
  'Robert',
  'Ross',
  'Ruth',
  'Ryan',
  'Sam',
  'Sandra',
  'Sarah',
  'Scott',
  'Sean',
  'Shona',
  'Simon',
  'Sophie',
  'Stephen',
  'Steve',
  'Steven',
  'Stuart',
  'Susan',
  'Thomas',
  'Tom',
  'Tony',
  'Tracy',
  'Wendy',
  'William',
  'Willie',
]

export const FIRST_NAME = new RegExp(String.raw`\b${any(FIRST_NAMES)}\b`, 'g')
