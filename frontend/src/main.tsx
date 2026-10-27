import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { API_URL, USE_MOCKS } from './api/config'
import { App } from './app/App'
import { useLogStore } from './state/logStore'

async function startMocks() {
  if (!USE_MOCKS) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

await startMocks()
useLogStore
  .getState()
  .append('info', USE_MOCKS ? 'Using the mock API (MSW).' : `Using the API at ${API_URL}.`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
