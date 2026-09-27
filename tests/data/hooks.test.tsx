import { act, render, screen, waitFor } from '@testing-library/react'
import { SlateProvider, useDemoNow, useSlateQuery } from '@/data/local'
import { freshSlate, graham } from './helpers'

function WaitingJobs() {
  const { state } = useSlateQuery((api) => api.listJobs(graham, { status: ['reported'] }), [])
  const now = useDemoNow()
  if (state.status === 'loading') return <p>Loading</p>
  if (state.status === 'error') return <p>{state.error.message}</p>
  return (
    <p>
      {state.data.length} to approve at {now}
    </p>
  )
}

test('screens re-run their queries when the data changes', async () => {
  const slate = freshSlate()
  render(
    <SlateProvider slate={slate}>
      <WaitingJobs />
    </SlateProvider>,
  )
  await screen.findByText(/^2 to approve/)
  await act(() => slate.api.approveJob(graham, 'job_fan_union'))
  await waitFor(() => expect(screen.getByText(/^1 to approve/)).toBeInTheDocument())
  expect(screen.getByText(new RegExp(slate.demo.now()))).toBeInTheDocument()
})
