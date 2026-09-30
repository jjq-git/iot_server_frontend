import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLoginTemplateLookup,
  getCompanyLoginUrl,
  normalizeCompanyLoginUrl,
  normalizeLoginHostname,
  resolveLoginCompanySlug
} from '../src/utils/login-entry-contract.mjs'

test('explicit login slug is used for a shared platform login URL', () => {
  assert.deepEqual(
    buildLoginTemplateLookup({ companySlug: ' Dengtec-ZZ ', hostname: 'localhost' }),
    { company_slug: 'dengtec-zz' }
  )
})

test('hostname identifies the company when the URL has no login slug', () => {
  assert.deepEqual(
    buildLoginTemplateLookup({ hostname: 'WWW.PKU.EDU.CN.' }),
    { domain: 'https://www.pku.edu.cn' }
  )
})

test('full entry URL keeps the platform tenant path', () => {
  assert.deepEqual(
    buildLoginTemplateLookup({ href: 'https://Pods.Dengtec.com/dengtec-zz/' }),
    { domain: 'https://pods.dengtec.com/dengtec-zz' }
  )
})

test('resolved template company slug becomes the login tenant context', () => {
  assert.equal(
    resolveLoginCompanySlug({ company: { company_slug: 'pku-company' } }),
    'pku-company'
  )
})

test('the canonical company domain is the direct login link', () => {
  assert.equal(
    getCompanyLoginUrl({ domain: 'https://Pods.Dengtec.com/dengtec-zz/' }),
    'https://pods.dengtec.com/dengtec-zz'
  )
  assert.equal(
    getCompanyLoginUrl({ domain: 'http://pods.dengtec.com/dengtec-zz' }),
    ''
  )
})

test('company URLs reject credentials, query strings and fragments', () => {
  assert.equal(normalizeCompanyLoginUrl('https://user:secret@example.com'), '')
  assert.equal(normalizeCompanyLoginUrl('https://example.com?tenant=1'), '')
  assert.equal(normalizeCompanyLoginUrl('https://example.com/#/login'), '')
})

test('hostname normalization rejects malformed values', () => {
  assert.equal(normalizeLoginHostname('not a host'), '')
})
