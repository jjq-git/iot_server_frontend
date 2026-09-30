import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const artifactDir = path.resolve(process.argv[2] || 'dist-demo')
const expectedCommit = process.argv[3] || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const readJson = async name => JSON.parse(await readFile(path.join(artifactDir, name), 'utf8'))
const sha256 = value => createHash('sha256').update(value).digest('hex')

const collectTextFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectTextFiles(absolute))
    else if (/\.(?:css|html|js|json)$/i.test(entry.name)) files.push(absolute)
  }
  return files
}

const buildInfo = await readJson('build-info.json')
const configBuffer = await readFile(path.join(artifactDir, 'config.json'))
const config = JSON.parse(configBuffer.toString('utf8'))
const workerBuffer = await readFile(path.join(artifactDir, 'mockServiceWorker.js'))

assert.equal(buildInfo.appMode, 'demo', 'build-info.json must declare demo mode')
assert.equal(config.appMode, 'demo', 'config.json must declare demo mode')
assert.equal(config.apiBase, 'auto', 'Demo API base must remain same-origin')
assert.equal(config.uploadBaseUrl, 'auto', 'Demo upload base must remain same-origin')
assert.equal(buildInfo.commit, expectedCommit, 'Demo artifact commit does not match the release commit')
assert.equal(buildInfo.dirty, false, 'Demo releases require a clean source checkout')
assert.equal(buildInfo.configSha256, sha256(configBuffer), 'config.json hash does not match build-info.json')
assert.equal(buildInfo.mockWorkerSha256, sha256(workerBuffer), 'worker hash does not match build-info.json')

const sources = await Promise.all((await collectTextFiles(artifactDir)).map(file => readFile(file, 'utf8')))
const combined = sources.join('\n')
for (const forbidden of ['api.podsc.com', 'test.podsc.com', '/ws/pods/', '/ws/hosts/']) {
  assert.equal(combined.includes(forbidden), false, `Demo artifact contains forbidden network target: ${forbidden}`)
}

process.stdout.write(`Verified Demo artifact ${buildInfo.commit} (${artifactDir})\n`)
