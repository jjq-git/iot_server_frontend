import { DEMO_WORKER_QUERY } from '@/app-mode/constants'

const expectedWorkerUrl = () => {
  if (typeof document === 'undefined') return null
  const url = new URL('mockServiceWorker.js', document.baseURI)
  url.search = DEMO_WORKER_QUERY
  return url.toString()
}

export async function bootstrapAppModeInfrastructure () {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.getRegistration) return
  const registration = await navigator.serviceWorker.getRegistration(new URL('.', document.baseURI).toString())
  if (!registration) return
  const workerUrls = [registration.active, registration.installing, registration.waiting]
    .filter(Boolean)
    .map(worker => worker.scriptURL)
  if (workerUrls.includes(expectedWorkerUrl())) {
    await registration.unregister()
  }
}
