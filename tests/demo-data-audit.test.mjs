import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { auditDemoData } from '../scripts/audit-demo-data.mjs'

const policy = JSON.parse(await readFile(new URL('../config/demo-data-policy.json', import.meta.url), 'utf8'))
const seedSource = await readFile(new URL('../src/demo/seeds/index.js', import.meta.url), 'utf8')
const seedModule = await import(`data:text/javascript;base64,${Buffer.from(seedSource).toString('base64')}`)

test('Demo seed contains only approved synthetic identities and resources', () => {
  const result = auditDemoData(seedModule.createDemoSeed(), policy)
  assert.deepEqual(result.violations, [])
  assert.ok(result.counts.emails > 0)
  assert.ok(result.counts.uuids > 0)
  assert.ok(result.counts.serialNumbers > 0)
  assert.ok(result.counts.macAddresses > 0)
})

test('Demo data audit rejects customer-like identities and external assets without echoing their values', () => {
  const result = auditDemoData({
    user: { uuid: 'production-user', email: 'person@customer.invalid', phone: '+8613812345678' },
    pod: { serial_number: 'PROD-001', mac_address: '00:11:22:33:44:55' },
    branding: { logo: 'https://cdn.customer.invalid/logo.png' }
  }, policy)
  assert.deepEqual(new Set(result.violations.map(item => item.code)), new Set([
    'uuid-prefix-not-synthetic',
    'email-domain-not-approved',
    'phone-range-not-approved',
    'serial-prefix-not-synthetic',
    'mac-address-not-locally-administered',
    'absolute-host-not-approved',
    'asset-location-not-approved'
  ]))
  assert.equal(JSON.stringify(result.violations).includes('customer.invalid'), false)
  assert.equal(JSON.stringify(result.violations).includes('+8613812345678'), false)
})
