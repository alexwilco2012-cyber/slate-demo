// demo.completeChecks: the sign-up welcome screen plays the checks out in a few seconds, then
// makes them real, so the new person's portal shows the same checked badges.

import { createLocalSlate, memoryStorage } from '@/data/local'

function fresh() {
  return createLocalSlate({ storage: memoryStorage(), channel: null })
}

test('finishes one person’s pending checks now, with today’s date, and tells them', async () => {
  const { api, demo } = fresh()
  const sent = await api.signUp({
    displayName: 'Isla Buchanan',
    email: 'isla.buchanan@example.com',
    role: 'trade',
    postcodeDistrict: 'AB15',
    confirmsAdult: true,
    claims: [{ kind: 'gas_safe', registrationNumber: '5123456', applianceCategories: ['boilers'] }],
    tradeProfile: {
      businessName: 'Buchanan Heating',
      trades: ['gas_engineer'],
      serviceDistricts: ['AB15'],
      vatRegistered: false,
    },
  })
  const person = await api.completeMagicLink(sent.demoToken ?? '')
  const viewer = { personId: person.id, role: 'trade' } as const
  expect((await api.getMe(viewer)).pendingVerifications).toHaveLength(1)

  await demo.completeChecks(person.id)

  const me = await api.getMe(viewer)
  expect(me.pendingVerifications).toHaveLength(0)
  expect(me.badges).toEqual([
    expect.objectContaining({ kind: 'gas_safe', checkedAt: demo.now().slice(0, 10) }),
  ])
  const news = await api.listNotifications(viewer)
  expect(news.map((n) => n.title)).toContain('Checked: Gas Safe registered')
})

test('leaves everyone else’s checks to run their normal course', async () => {
  const { api, demo } = fresh()
  const join = async (displayName: string, email: string) => {
    const sent = await api.signUp({
      displayName,
      email,
      role: 'tenant',
      postcodeDistrict: 'AB25',
      confirmsAdult: true,
      claims: [{ kind: 'id_check' }],
    })
    return api.completeMagicLink(sent.demoToken ?? '')
  }
  const eilidh = await join('Eilidh Grant', 'eilidh.grant@example.com')
  const finn = await join('Finn Moir', 'finn.moir@example.com')

  await demo.completeChecks(eilidh.id)

  const tenant = (id: typeof eilidh.id) => ({ personId: id, role: 'tenant' }) as const
  expect((await api.getMe(tenant(eilidh.id))).badges.map((b) => b.kind)).toEqual(['id_check'])
  expect((await api.getMe(tenant(finn.id))).pendingVerifications).toHaveLength(1)
  expect((await api.getMe(tenant(finn.id))).badges).toEqual([])
})
