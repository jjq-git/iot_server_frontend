import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const publicUrl = String(process.argv[2] || '').replace(/\/$/, '')
const expectedCommit = String(process.argv[3] || '')
if (!/^https:\/\//.test(publicUrl)) throw new Error('Usage: node scripts/smoke-demo-release.mjs https://demo.example.com')
const sha256 = value => createHash('sha256').update(value).digest('hex')

const get = async pathname => {
  const response = await fetch(`${publicUrl}${pathname}`, { redirect: 'manual', cache: 'no-store' })
  return { response, body: await response.text() }
}

const root = await get('/')
assert.equal(root.response.status, 200, 'Demo index must return HTTP 200')
assert.match(root.response.headers.get('content-security-policy') || '', /connect-src\s+'self'/, 'CSP must restrict connections to self')
assert.equal(root.response.headers.get('x-content-type-options'), 'nosniff', 'nosniff header is required')
assert.match(root.response.headers.get('cache-control') || '', /no-store/, 'Demo index must not be cached')

const controlFiles = new Map()
for (const pathname of ['/config.json', '/build-info.json', '/mockServiceWorker.js']) {
  const result = await get(pathname)
  controlFiles.set(pathname, result.body)
  assert.equal(result.response.status, 200, `${pathname} must return HTTP 200`)
  assert.match(result.response.headers.get('cache-control') || '', /no-store/, `${pathname} must not be cached`)
  if (pathname === '/mockServiceWorker.js') {
    assert.match(result.response.headers.get('content-type') || '', /javascript/, 'Demo worker must use a JavaScript MIME type')
  }
}

const config = JSON.parse(controlFiles.get('/config.json'))
const buildInfo = JSON.parse(controlFiles.get('/build-info.json'))
assert.equal(config.appMode, 'demo', 'Online config must declare demo mode')
assert.equal(buildInfo.appMode, 'demo', 'Online build metadata must declare demo mode')
assert.equal(buildInfo.dirty, false, 'Online Demo release must come from a clean checkout')
if (expectedCommit) assert.equal(buildInfo.commit, expectedCommit, 'Online Demo release commit does not match the requested commit')
assert.equal(buildInfo.configSha256, sha256(controlFiles.get('/config.json')), 'Online config hash does not match build metadata')
assert.equal(buildInfo.mockWorkerSha256, sha256(controlFiles.get('/mockServiceWorker.js')), 'Online worker hash does not match build metadata')

const assetPaths = [...root.body.matchAll(/(?:src|href)=["']([^"']+\.[0-9a-f]{8}\.(?:js|css))["']/gi)]
  .map(match => new URL(match[1], `${publicUrl}/`).pathname)
assert.ok(assetPaths.length > 0, 'Demo index must reference hashed JS or CSS assets')
for (const pathname of assetPaths) {
  const result = await get(pathname)
  assert.equal(result.response.status, 200, `${pathname} must return HTTP 200`)
  assert.match(result.response.headers.get('cache-control') || '', /immutable/, `${pathname} must use immutable caching`)
}

for (const pathname of ['/api', '/api/health', '/uploads', '/uploads/test', '/emqx', '/emqx/test']) {
  assert.equal((await get(pathname)).response.status, 404, `${pathname} must return HTTP 404`)
}

for (const pathname of ['/js/missing.deadbeef.js', '/css/missing.deadbeef.css', '/assets/missing.deadbeef.svg', '/demo-assets/missing.png']) {
  const result = await get(pathname)
  assert.equal(result.response.status, 404, `${pathname} must return HTTP 404`)
  assert.doesNotMatch(result.response.headers.get('content-type') || '', /text\/html/, `${pathname} must not fall back to index.html`)
}

process.stdout.write(`Demo release smoke passed: ${publicUrl}\n`)
