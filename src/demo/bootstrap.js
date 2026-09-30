import { setupWorker } from 'msw/browser'
import { sha256 } from 'js-sha256'
import { AppStartupError } from '@/app-mode/errors'
import { initializeDemoDatabase } from './database'
import { demoHandlers } from './handlers'
import { bindDemoSessionSync } from './session'

const WORKER_URL = '/mockServiceWorker.js?app=podsc-demo'

const fetchJson = async (url, code) => {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new AppStartupError(code, `${url} returned HTTP ${response.status}`)
  return response.json()
}

const verifyWorkerAsset = async () => {
  const buildInfo = await fetchJson('/build-info.json', 'E_DEMO_SW_ASSET')
  if (!buildInfo.mockWorkerSha256 || !buildInfo.mswVersion) {
    throw new AppStartupError('E_DEMO_SW_VERSION', 'Demo build metadata does not identify the request worker')
  }
  const workerResponse = await fetch(WORKER_URL, { cache: 'no-store', credentials: 'same-origin' })
  if (!workerResponse.ok) throw new AppStartupError('E_DEMO_SW_ASSET', 'Demo request worker is missing')
  const actualHash = sha256(await workerResponse.arrayBuffer())
  if (actualHash !== buildInfo.mockWorkerSha256) {
    throw new AppStartupError('E_DEMO_SW_VERSION', 'Demo request worker does not match this build')
  }
}

export async function bootstrapDemo () {
  /* global __DEMO_TRANSPORT__ */
  if (__DEMO_TRANSPORT__ === 'inline') {
    await initializeDemoDatabase()
    bindDemoSessionSync()
    const { installInlineDemoTransport } = await import('./inline-transport')
    installInlineDemoTransport()
    return
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    throw new AppStartupError('E_DEMO_SW_UNSUPPORTED', 'Service Worker requires HTTPS or a trusted localhost origin')
  }
  await verifyWorkerAsset()
  await initializeDemoDatabase()
  bindDemoSessionSync()

  const worker = setupWorker(...demoHandlers)
  try {
    await worker.start({
      serviceWorker: { url: WORKER_URL, options: { scope: '/', updateViaCache: 'none' } },
      onUnhandledRequest (request) {
        const url = new URL(request.url)
        if (url.origin === window.location.origin && (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/'))) {
          throw new Error(`Unhandled Demo API request: ${request.method} ${url.pathname}`)
        }
      }
    })
  } catch (error) {
    throw new AppStartupError('E_DEMO_SW_REGISTER', 'Demo request worker could not start', error)
  }
}
