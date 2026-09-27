import {
  createSessionStore,
  parseSession,
  SESSION_KEY,
  sessionFromParams,
  sessionHref,
  viewerOf,
  withoutSessionParams,
} from '@/session'

function memorySessionStorage() {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

describe('parseSession', () => {
  it('accepts a person and a portal they could use', () => {
    expect(parseSession({ personId: 'person_sarah', activeRole: 'tenant' })).toEqual({
      personId: 'person_sarah',
      activeRole: 'tenant',
    })
  })

  it('treats anything malformed as signed out', () => {
    expect(parseSession(null)).toBeNull()
    expect(parseSession('person_sarah')).toBeNull()
    expect(parseSession({ personId: 'sarah', activeRole: 'tenant' })).toBeNull()
    expect(parseSession({ personId: 'person_sarah', activeRole: 'agent' })).toBeNull()
  })

  it('drops a landlord id that is not a person id', () => {
    expect(
      parseSession({ personId: 'person_aileen', activeRole: 'landlord', actingForLandlordId: 'x' }),
    ).toEqual({ personId: 'person_aileen', activeRole: 'landlord' })
  })
})

describe('?as= parameters', () => {
  it('reads the person, the portal and who an agent acts for', () => {
    expect(
      sessionFromParams('?as=person_aileen&role=landlord&for=person_graham', '/landlord'),
    ).toEqual({
      personId: 'person_aileen',
      activeRole: 'landlord',
      actingForLandlordId: 'person_graham',
    })
  })

  it('takes the portal from the path when the role is left out', () => {
    expect(sessionFromParams('?as=person_kev', '/trade/board')).toEqual({
      personId: 'person_kev',
      activeRole: 'trade',
    })
  })

  it('refuses a role that does not exist, or no role at all off a portal path', () => {
    expect(sessionFromParams('?as=person_kev&role=plumber', '/trade')).toBeNull()
    expect(sessionFromParams('?as=person_kev', '/start')).toBeNull()
  })

  it('removes only its own parameters from the address', () => {
    expect(withoutSessionParams('?as=person_sarah&role=tenant&tab=quotes')).toBe('?tab=quotes')
    expect(withoutSessionParams('?as=person_sarah&role=tenant&for=person_graham')).toBe('')
  })

  it('builds links the demo page can open', () => {
    const href = sessionHref('/slate-demo/landlord', {
      personId: 'person_aileen',
      activeRole: 'landlord',
      actingForLandlordId: 'person_graham',
    })
    expect(href).toBe('/slate-demo/landlord?as=person_aileen&role=landlord&for=person_graham')
    expect(sessionFromParams(href.slice(href.indexOf('?')), '/landlord')).toMatchObject({
      actingForLandlordId: 'person_graham',
    })
  })
})

describe('viewerOf', () => {
  it('acts for a landlord only in the landlord portal', () => {
    const agent = {
      personId: 'person_aileen',
      activeRole: 'landlord',
      actingForLandlordId: 'person_graham',
    } as const
    expect(viewerOf(agent)).toEqual({
      personId: 'person_aileen',
      role: 'landlord',
      actingForId: 'person_graham',
    })
    expect(viewerOf({ ...agent, activeRole: 'tenant' })).toEqual({
      personId: 'person_aileen',
      role: 'tenant',
    })
  })
})

describe('session store', () => {
  it('keeps the session in the tab’s storage so a reload stays signed in', () => {
    const storage = memorySessionStorage()
    const first = createSessionStore(storage)
    first.set({ personId: 'person_sarah', activeRole: 'tenant' })
    expect(JSON.parse(storage.items.get(SESSION_KEY)!)).toEqual({
      personId: 'person_sarah',
      activeRole: 'tenant',
    })
    expect(createSessionStore(storage).get()).toEqual({
      personId: 'person_sarah',
      activeRole: 'tenant',
    })
    first.set(null)
    expect(storage.items.has(SESSION_KEY)).toBe(false)
  })

  it('gives each frame its own key, so three iframes can be three people', () => {
    const storage = memorySessionStorage()
    createSessionStore(storage, `${SESSION_KEY}:tenant`).set({
      personId: 'person_sarah',
      activeRole: 'tenant',
    })
    createSessionStore(storage, `${SESSION_KEY}:trade`).set({
      personId: 'person_kev',
      activeRole: 'trade',
    })
    expect(createSessionStore(storage, `${SESSION_KEY}:tenant`).get()?.personId).toBe(
      'person_sarah',
    )
    expect(createSessionStore(storage, `${SESSION_KEY}:trade`).get()?.personId).toBe('person_kev')
  })

  it('ignores something unreadable in storage', () => {
    const storage = memorySessionStorage()
    storage.setItem(SESSION_KEY, '{not json')
    expect(createSessionStore(storage).get()).toBeNull()
  })

  it('tells subscribers about real changes only', () => {
    const store = createSessionStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.set({ personId: 'person_kev', activeRole: 'trade' })
    store.set({ personId: 'person_kev', activeRole: 'trade' })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
