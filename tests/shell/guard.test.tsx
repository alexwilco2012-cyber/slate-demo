import { screen, waitFor } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router'
import { useSlateQuery } from '@/data'
import {
  PortalGate,
  returnPathAfterSignIn,
  SessionFromUrl,
  usePortal,
  useViewer,
  type Session,
} from '@/session'
import { renderShell } from './harness'

/** A stand-in portal that shows who it thinks is signed in. */
function WhoAmI() {
  const viewer = useViewer()
  const { person } = usePortal()
  return (
    <p>
      {person.displayName} in the {viewer.role} portal
      {viewer.actingForId ? ` for ${viewer.actingForId}` : ''}
    </p>
  )
}

function Start() {
  const location = useLocation()
  return <h1>Persona picker, then {returnPathAfterSignIn(location.state, 'landlord')}</h1>
}

function renderApp(path: string, session: Session | null = null) {
  return renderShell(
    <>
      <SessionFromUrl />
      <Routes>
        {(['tenant', 'landlord', 'trade'] as const).map((role) => (
          <Route
            key={role}
            path={`/${role}/*`}
            element={
              <PortalGate role={role} fallback={<p>Checking</p>}>
                <WhoAmI />
              </PortalGate>
            }
          />
        ))}
        <Route path="/start" element={<Start />} />
      </Routes>
    </>,
    { path, session },
  )
}

const location = () => screen.getByTestId('location').textContent

describe('portal guard', () => {
  it('sends a signed-out visitor to the persona picker, remembering where they were going', async () => {
    renderApp('/landlord/jobs/job_fan_union')
    expect(
      await screen.findByRole('heading', {
        name: 'Persona picker, then /landlord/jobs/job_fan_union',
      }),
    ).toBeInTheDocument()
    expect(location()).toBe('/start')
  })

  it('lets someone in to a portal they hold', async () => {
    renderApp('/tenant', { personId: 'person_sarah', activeRole: 'tenant' })
    expect(await screen.findByText('Sarah Laing in the tenant portal')).toBeInTheDocument()
  })

  it('sends someone to their own portal when they open one they don’t hold', async () => {
    const { store } = renderApp('/landlord', { personId: 'person_sarah', activeRole: 'tenant' })
    expect(await screen.findByText('Sarah Laing in the tenant portal')).toBeInTheDocument()
    expect(location()).toBe('/tenant')
    expect(store.get()?.activeRole).toBe('tenant')
  })

  it('switches the portal for someone who holds both, following the URL', async () => {
    const { store } = renderApp('/tenant', { personId: 'person_hannah', activeRole: 'landlord' })
    expect(await screen.findByText('Hannah Reid in the tenant portal')).toBeInTheDocument()
    expect(store.get()).toEqual({ personId: 'person_hannah', activeRole: 'tenant' })
  })

  it('puts a letting agent inside the landlord’s account they work in', async () => {
    renderApp('/landlord', { personId: 'person_aileen', activeRole: 'landlord' })
    expect(
      await screen.findByText('Aileen Christie in the landlord portal for person_graham'),
    ).toBeInTheDocument()
  })

  it('signs out someone who is no longer in the data', async () => {
    const { store } = renderApp('/trade', { personId: 'person_nobody', activeRole: 'trade' })
    await waitFor(() => expect(location()).toBe('/start'))
    expect(store.get()).toBeNull()
  })
})

describe('?as= links', () => {
  it('signs this tab in as that person and tidies the address', async () => {
    const { store } = renderApp('/tenant?as=person_sarah&role=tenant&tab=repairs')
    expect(await screen.findByText('Sarah Laing in the tenant portal')).toBeInTheDocument()
    expect(location()).toBe('/tenant?tab=repairs')
    expect(store.get()).toEqual({ personId: 'person_sarah', activeRole: 'tenant' })
  })

  it('replaces whoever was signed in before', async () => {
    renderApp('/trade?as=person_kev&role=trade', {
      personId: 'person_sarah',
      activeRole: 'tenant',
    })
    expect(await screen.findByText('Kev Rattray in the trade portal')).toBeInTheDocument()
  })

  it('can sign an agent in for a landlord', async () => {
    renderApp('/landlord?as=person_aileen&role=landlord&for=person_graham')
    expect(
      await screen.findByText('Aileen Christie in the landlord portal for person_graham'),
    ).toBeInTheDocument()
  })

  it('ignores a link that makes no sense, leaving the visitor signed out', async () => {
    const { store } = renderApp('/trade?as=person_kev&role=plumber')
    await waitFor(() => expect(location()).toBe('/start'))
    expect(store.get()).toBeNull()
  })
})

describe('queries inside a portal', () => {
  it('use the viewer from the session', async () => {
    function Jobs() {
      const viewer = useViewer()
      const { state } = useSlateQuery((api) => api.listJobs(viewer), [viewer])
      return <p>{state.status === 'success' ? `${state.data.length > 0} jobs` : 'Loading'}</p>
    }
    renderShell(
      <Routes>
        <Route
          path="/landlord/*"
          element={
            <PortalGate role="landlord">
              <Jobs />
            </PortalGate>
          }
        />
      </Routes>,
      { path: '/landlord', session: { personId: 'person_graham', activeRole: 'landlord' } },
    )
    expect(await screen.findByText('true jobs')).toBeInTheDocument()
  })
})
