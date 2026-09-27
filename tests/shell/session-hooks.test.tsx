import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { createSessionStore, SessionProvider, useSession, useViewer } from '@/session'

function wrapperFor(store = createSessionStore()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SessionProvider store={store}>{children}</SessionProvider>
  }
}

describe('useSession', () => {
  it('signs a tab in and out', () => {
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor() })
    expect(result.current.session).toBeNull()
    expect(result.current.viewer).toBeNull()

    act(() => result.current.signIn({ personId: 'person_sarah', activeRole: 'tenant' }))
    expect(result.current.viewer).toEqual({ personId: 'person_sarah', role: 'tenant' })

    act(() => result.current.signOut())
    expect(result.current.session).toBeNull()
  })

  it('switches portal and acts for a landlord', () => {
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor() })
    act(() => result.current.signIn({ personId: 'person_hannah', activeRole: 'landlord' }))
    act(() => result.current.switchRole('tenant'))
    expect(result.current.viewer).toEqual({ personId: 'person_hannah', role: 'tenant' })

    act(() => result.current.signIn({ personId: 'person_aileen', activeRole: 'landlord' }))
    act(() => result.current.actFor('person_graham'))
    expect(result.current.viewer).toEqual({
      personId: 'person_aileen',
      role: 'landlord',
      actingForId: 'person_graham',
    })
    act(() => result.current.actFor(undefined))
    expect(result.current.viewer).toEqual({ personId: 'person_aileen', role: 'landlord' })
  })
})

describe('useViewer', () => {
  it('is the same object until the session changes, so it is safe in deps', () => {
    const store = createSessionStore()
    store.set({ personId: 'person_kev', activeRole: 'trade' })
    const { result, rerender } = renderHook(() => useViewer(), { wrapper: wrapperFor(store) })
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    act(() => store.set({ personId: 'person_mhairi', activeRole: 'trade' }))
    expect(result.current).toEqual({ personId: 'person_mhairi', role: 'trade' })
  })

  it('says clearly when it is used with nobody signed in', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useViewer(), { wrapper: wrapperFor() })).toThrow(/signed in/)
  })
})
