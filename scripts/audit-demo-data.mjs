import { execFileSync } from 'node:child_process'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi
const HTTP_URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi
const PHONE_FIELD_PATTERN = /(?:^|_)(?:phone|mobile|telephone|tel)(?:_|$)/i
const ASSET_FIELD_PATTERN = /(?:avatar|logo|image|file)(?:_url)?$/i

const normalizePhone = value => String(value).replace(/[\s().-]/g, '')
const issue = (code, pathName) => ({ code, path: pathName })

export function auditDemoData (seed, policy) {
  const violations = []
  const counts = {
    strings: 0,
    emails: 0,
    absoluteUrls: 0,
    phones: 0,
    uuids: 0,
    serialNumbers: 0,
    macAddresses: 0
  }
  const approvedEmailDomains = new Set(policy.approvedEmailDomains || [])
  const approvedAbsoluteHosts = new Set(policy.approvedAbsoluteHosts || [])
  const approvedPhonePrefixes = policy.approvedPhonePrefixes || []
  const approvedAssetPrefixes = policy.approvedAssetPrefixes || []

  const inspectString = (value, key, pathName) => {
    counts.strings += 1
    for (const match of value.matchAll(EMAIL_PATTERN)) {
      counts.emails += 1
      if (!approvedEmailDomains.has(match[1].toLowerCase())) violations.push(issue('email-domain-not-approved', pathName))
    }
    for (const match of value.matchAll(HTTP_URL_PATTERN)) {
      counts.absoluteUrls += 1
      let hostname = ''
      try {
        hostname = new URL(match[0]).hostname.toLowerCase()
      } catch (error) {
        violations.push(issue('absolute-url-invalid', pathName))
        continue
      }
      if (!approvedAbsoluteHosts.has(hostname)) violations.push(issue('absolute-host-not-approved', pathName))
    }
    if (PHONE_FIELD_PATTERN.test(key) && value) {
      counts.phones += 1
      const phone = normalizePhone(value)
      if (!approvedPhonePrefixes.some(prefix => phone.startsWith(normalizePhone(prefix)))) {
        violations.push(issue('phone-range-not-approved', pathName))
      }
    }
    if (ASSET_FIELD_PATTERN.test(key) && value && !approvedAssetPrefixes.some(prefix => value.startsWith(prefix))) {
      violations.push(issue('asset-location-not-approved', pathName))
    }
    if (key === 'uuid' || key === 'user_id') {
      counts.uuids += 1
      if (!value.startsWith(policy.requiredUuidPrefix)) violations.push(issue('uuid-prefix-not-synthetic', pathName))
    }
    if (key === 'serial_number') {
      counts.serialNumbers += 1
      if (!value.startsWith(policy.requiredSerialPrefix)) violations.push(issue('serial-prefix-not-synthetic', pathName))
    }
    if (key === 'mac_address') {
      counts.macAddresses += 1
      const firstOctet = Number.parseInt(value.split(':')[0], 16)
      if (!Number.isInteger(firstOctet) || (firstOctet & 2) !== 2) violations.push(issue('mac-address-not-locally-administered', pathName))
    }
  }

  const visit = (value, key = '', pathName = '$') => {
    if (typeof value === 'string') return inspectString(value, key, pathName)
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, key, `${pathName}[${index}]`))
    if (!value || typeof value !== 'object') return
    for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey, `${pathName}.${childKey}`)
  }

  visit(seed)
  return { counts, violations }
}

const isCommandLine = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isCommandLine) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const policy = JSON.parse(await readFile(path.join(projectRoot, 'config/demo-data-policy.json'), 'utf8'))
  const seedSource = await readFile(path.join(projectRoot, 'src/demo/seeds/index.js'), 'utf8')
  const seedModule = await import(`data:text/javascript;base64,${Buffer.from(seedSource).toString('base64')}`)
  const fixtureRoot = path.join(projectRoot, 'tests/fixtures/demo')
  const fixtureFiles = (await readdir(fixtureRoot, { recursive: true }))
    .filter(filename => filename.endsWith('.json'))
    .sort()
  const fixtureData = await Promise.all(fixtureFiles.map(async filename => ({
    filename,
    value: JSON.parse(await readFile(path.join(fixtureRoot, filename), 'utf8'))
  })))
  const result = auditDemoData({ seed: seedModule.createDemoSeed(), fixtures: fixtureData }, policy)
  const report = {
    status: result.violations.length ? 'failed' : 'passed',
    policyVersion: policy.version,
    schemaVersion: seedModule.DEMO_SCHEMA_VERSION,
    seedVersion: seedModule.DEMO_SEED_VERSION,
    fixtureFiles: fixtureFiles.length,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
    counts: result.counts,
    violations: result.violations
  }
  const outputFlag = process.argv.indexOf('--output')
  if (outputFlag >= 0) {
    const outputPath = process.argv[outputFlag + 1]
    if (!outputPath) throw new Error('--output requires a file path')
    await writeFile(path.resolve(projectRoot, outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }
  if (result.violations.length) {
    process.stderr.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`Demo data audit passed (${result.counts.strings} strings, ${result.counts.emails} emails, ${result.counts.absoluteUrls} absolute URLs)\n`)
  }
}
