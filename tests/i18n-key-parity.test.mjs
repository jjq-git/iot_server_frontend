import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const localeCodes = [
  'zh-CN',
  'zh-TW',
  'en-US',
  'de-DE',
  'ja-JP',
  'fr-FR',
  'es-ES',
  'ko-KR'
]

function flattenKeys (value, prefix = '', result = []) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenKeys(child, path, result)
    } else {
      result.push(path)
    }
  }
  return result.sort()
}

test('all locale files expose the same translation keys', () => {
  const localeKeys = Object.fromEntries(localeCodes.map(code => {
    const source = readFileSync(
      new URL(`../src/locales/${code}.json`, import.meta.url),
      'utf8'
    )
    return [code, flattenKeys(JSON.parse(source))]
  }))

  for (const code of localeCodes.slice(1)) {
    assert.deepEqual(localeKeys[code], localeKeys['zh-CN'], `${code} key set differs from zh-CN`)
  }
})
