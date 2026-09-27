import type { DataChange } from '@/data/api'
import { createLocalSlate, memoryStorage, type ChannelLike, type SyncMessage } from '@/data/local'
import { isSyncMessage, shouldAdopt } from '@/data/local/sync'
import { safeStorage } from '@/data/local/storage'
import { readPersisted } from '@/data/local/store'
import { createSeedData } from '@/data/seed'
import { freshSlate, graham, kev, sarah } from './helpers'

/** Channels that deliver to each other straight away, like tabs sharing a BroadcastChannel. */
function channelHub() {
  const open = new Set<ChannelLike>()
  const make = (): ChannelLike => {
    const channel: ChannelLike = {
      onmessage: null,
      postMessage(message) {
        for (const other of open) {
          if (other === channel) continue
          other.onmessage?.({ data: structuredClone(message) } as MessageEvent)
        }
      },
      close() {
        open.delete(channel)
      },
    }
    open.add(channel)
    return channel
  }
  return { make }
}

function tabs(count: number) {
  const hub = channelHub()
  return Array.from({ length: count }, (_, i) =>
    createLocalSlate({ storage: memoryStorage(), channel: hub.make(), origin: `tab-${i}` }),
  )
}

describe('three portals open side by side', () => {
  test('a report in the tenant tab appears in the landlord and trade tabs', async () => {
    const [tenantTab, landlordTab, tradeTab] = tabs(3)
    if (!tenantTab || !landlordTab || !tradeTab) throw new Error('tabs missing')
    const heard: DataChange[] = []
    landlordTab.api.subscribe((change) => heard.push(change))

    const job = await tenantTab.api.createJob(sarah, {
      propertyId: 'property_esslemont',
      room: 'bathroom',
      category: 'leak',
      description: 'The bath tap drips all night and the plughole is staining.',
      photos: [],
      urgency: 'routine',
      access: { windows: [{ date: '2026-10-01', slot: 'afternoon' }], keyAllowed: false },
    })

    expect(await landlordTab.api.getJob(graham, job.id)).toMatchObject({ status: 'reported' })
    expect(heard).toContainEqual({ entity: 'job', id: job.id, op: 'created' })
    expect(landlordTab.store.getState().revision).toBe(tenantTab.store.getState().revision)

    // And back the other way: the landlord approves and chooses Kev; the trade tab sees it.
    await landlordTab.api.approveJob(graham, job.id)
    await landlordTab.api.chooseTrade(graham, job.id, {
      tradeId: 'person_kev',
      route: 'saved_trades',
    })
    expect(await tradeTab.api.listActionsNeeded(kev)).toContainEqual({
      kind: 'send_quote',
      jobId: job.id,
    })
    expect((await tenantTab.api.getJob(sarah, job.id))?.status).toBe('quoting')
  })

  test('reset in one tab resets them all', async () => {
    const [a, b] = tabs(2)
    if (!a || !b) throw new Error('tabs missing')
    await a.api.approveJob(graham, 'job_fan_union')
    expect((await b.api.getJob(graham, 'job_fan_union'))?.status).toBe('approved')
    await b.demo.reset()
    expect((await a.api.getJob(graham, 'job_fan_union'))?.status).toBe('reported')
  })

  test('the clock moves on in every tab', async () => {
    const [a, b] = tabs(2)
    if (!a || !b) throw new Error('tabs missing')
    await a.demo.advanceClock(7)
    expect(b.demo.now()).toBe(a.demo.now())
  })
})

describe('handling messages from other tabs', () => {
  const data = createSeedData()
  const message = (revision: number, origin: string): SyncMessage => ({
    type: 'state',
    origin,
    revision,
    data,
    changes: [],
  })

  test('newer revisions win; a tab ignores its own and older messages', () => {
    const local = { revision: 5, origin: 'tab-b' }
    expect(shouldAdopt(local, message(6, 'tab-a'))).toBe(true)
    expect(shouldAdopt(local, message(4, 'tab-a'))).toBe(false)
    expect(shouldAdopt(local, message(9, 'tab-b'))).toBe(false)
  })

  test('two tabs that changed something at once settle on the same copy', () => {
    expect(shouldAdopt({ revision: 5, origin: 'tab-a' }, message(5, 'tab-b'))).toBe(true)
    expect(shouldAdopt({ revision: 5, origin: 'tab-b' }, message(5, 'tab-a'))).toBe(false)
  })

  test('anything that is not a state message from this version is ignored', () => {
    expect(isSyncMessage(message(1, 'x'))).toBe(true)
    expect(isSyncMessage({ type: 'state', origin: 'x', revision: 1, changes: [] })).toBe(false)
    expect(isSyncMessage({ ...message(1, 'x'), data: { ...data, schema: 0 } })).toBe(false)
    expect(isSyncMessage('hello')).toBe(false)
    expect(isSyncMessage(null)).toBe(false)
  })

  test('receive() takes newer data and tells subscribers what changed', async () => {
    const tab = freshSlate({ origin: 'tab-b' })
    const heard: DataChange[] = []
    tab.api.subscribe((change) => heard.push(change))
    const other = freshSlate({ origin: 'tab-a' })
    await other.api.approveJob(graham, 'job_fan_union')
    const state = other.store.getState()
    const change: DataChange = { entity: 'job', id: 'job_fan_union', op: 'updated' }

    expect(
      tab.receive({
        type: 'state',
        origin: 'tab-a',
        revision: state.revision,
        data: state.data,
        changes: [change],
      }),
    ).toBe(true)
    expect((await tab.api.getJob(graham, 'job_fan_union'))?.status).toBe('approved')
    expect(heard).toEqual([change])

    // The same message again is old news.
    expect(
      tab.receive({
        type: 'state',
        origin: 'tab-a',
        revision: state.revision,
        data: state.data,
        changes: [change],
      }),
    ).toBe(false)
    expect(heard).toHaveLength(1)
  })

  test('a malformed message on the channel is ignored', () => {
    const hub = channelHub()
    const tab = createLocalSlate({ storage: memoryStorage(), channel: hub.make() })
    const noisy = hub.make()
    const before = tab.store.getState().revision
    noisy.postMessage({
      type: 'state',
      origin: 'x',
      revision: 99,
      data: { nope: true },
      changes: [],
    })
    noisy.postMessage('not even an object')
    expect(tab.store.getState().revision).toBe(before)
  })
})

describe('when the browser gets in the way', () => {
  test('a channel that throws does not stop changes being made', async () => {
    const broken: ChannelLike = {
      onmessage: null,
      postMessage() {
        throw new Error('DataCloneError')
      },
      close() {
        throw new Error('already closed')
      },
    }
    const tab = createLocalSlate({ storage: memoryStorage(), channel: broken })
    await tab.api.approveJob(graham, 'job_fan_union')
    expect((await tab.api.getJob(graham, 'job_fan_union'))?.status).toBe('approved')
    expect(() => tab.dispose()).not.toThrow()
  })

  test('storage that throws on every call still leaves a working demo', async () => {
    const hostile = safeStorage({
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })
    const tab = createLocalSlate({ storage: hostile, channel: null })
    await tab.api.sendMessage(sarah, 'thread_radiator_esslemont', { body: 'Works without saving.' })
    const messages = await tab.api.listMessages(sarah, 'thread_radiator_esslemont')
    expect(messages.at(-1)?.body).toBe('Works without saving.')
  })

  test('a copy saved by another version, or garbage, is replaced by the seed', () => {
    expect(readPersisted('{not json')).toBeNull()
    expect(
      readPersisted(JSON.stringify({ state: { data: {}, revision: 1 }, version: 1 })),
    ).toBeNull()
    const storage = memoryStorage()
    storage.setItem(
      'slate-demo-v1',
      JSON.stringify({ state: { data: { old: true }, revision: 7 }, version: 0 }),
    )
    const tab = freshSlate({ storage })
    expect(tab.store.getState().revision).toBe(0)
    expect(tab.store.getState().data.tables.jobs['job_fan_union']).toBeDefined()
  })

  test('a copy that grew from an older seed is replaced, so a new demo opens on its story', async () => {
    const storage = memoryStorage()
    const first = freshSlate({ storage })
    await first.api.approveJob(graham, 'job_fan_union')
    const saved = storage.getItem('slate-demo-v1') as string
    const seedId = first.store.getState().seedId
    expect(readPersisted(saved, seedId)).not.toBeNull()

    // The same data, saved by a build whose seed was different.
    const parsed = JSON.parse(saved) as { state: { seedId: string } }
    parsed.state.seedId = 'older-seed'
    const older = JSON.stringify(parsed)
    expect(readPersisted(older, seedId)).toBeNull()
    storage.setItem('slate-demo-v1', older)

    const next = freshSlate({ storage })
    expect(next.store.getState().revision).toBe(0)
    expect((await next.api.getJob(graham, 'job_fan_union'))?.status).toBe('reported')
  })

  test('the real BroadcastChannel carries changes between instances', async () => {
    const name = `slate-test-${Math.random().toString(36).slice(2)}`
    const a = createLocalSlate({ storage: memoryStorage(), channel: new BroadcastChannel(name) })
    const b = createLocalSlate({ storage: memoryStorage(), channel: new BroadcastChannel(name) })
    try {
      await a.api.approveJob(graham, 'job_fan_union')
      await vi.waitFor(async () => {
        expect((await b.api.getJob(graham, 'job_fan_union'))?.status).toBe('approved')
      })
    } finally {
      a.dispose()
      b.dispose()
    }
  })
})
