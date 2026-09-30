import { getResponse } from 'msw'
import http from '@/api/http'
import { demoHandlers } from './handlers'

const toHeaders = value => {
  const headers = new Headers()
  const source = typeof value?.toJSON === 'function' ? value.toJSON() : (value || {})
  Object.entries(source).forEach(([name, headerValue]) => {
    if (headerValue !== undefined && headerValue !== null) headers.set(name, String(headerValue))
  })
  return headers
}

const toBody = (data, headers) => {
  if (data === undefined || data === null) return undefined
  if (typeof data === 'string' || data instanceof Blob || data instanceof FormData || data instanceof URLSearchParams || data instanceof ArrayBuffer) return data
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return JSON.stringify(data)
}

const readData = async (response, responseType) => {
  if (response.status === 204) return null
  if (responseType === 'arraybuffer') return response.arrayBuffer()
  if (responseType === 'blob') return response.blob()
  const text = await response.text()
  if (!text) return null
  const contentType = response.headers.get('content-type') || ''
  if (responseType === 'json' || contentType.includes('json')) return JSON.parse(text)
  return text
}

const rejectStatus = (config, request, response) => {
  const error = new Error(`Request failed with status code ${response.status}`)
  error.name = 'AxiosError'
  error.isAxiosError = true
  error.config = config
  error.request = request
  error.response = response
  return Promise.reject(error)
}

const resolveDemoRequest = async request => {
  const url = new URL(request.url)
  const mocked = await getResponse(demoHandlers, request)
  if (!mocked) throw new Error(`Unhandled Demo API request: ${request.method} ${url.pathname}`)
  if (mocked.type === 'error') throw new TypeError(`Failed to fetch Demo API: ${request.method} ${url.pathname}`)
  return mocked
}

const inlineDemoAdapter = async config => {
  const url = new URL(http.getUri(config), window.location.origin)
  const method = String(config.method || 'get').toUpperCase()
  const headers = toHeaders(config.headers)
  const request = new Request(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : toBody(config.data, headers)
  })
  const mocked = await resolveDemoRequest(request)
  const response = {
    data: await readData(mocked, config.responseType),
    status: mocked.status,
    statusText: mocked.statusText,
    headers: Object.fromEntries(mocked.headers.entries()),
    config,
    request
  }
  const validateStatus = config.validateStatus || (status => status >= 200 && status < 300)
  return validateStatus(response.status) ? response : rejectStatus(config, request, response)
}

export const installInlineDemoTransport = () => {
  http.defaults.adapter = inlineDemoAdapter
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init)
    const url = new URL(request.url)
    const isDemoApi = url.origin === window.location.origin && (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/'))
    return isDemoApi ? resolveDemoRequest(request) : nativeFetch(input, init)
  }
}
