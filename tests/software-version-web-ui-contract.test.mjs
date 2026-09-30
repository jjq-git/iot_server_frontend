import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { sha256 as jsSha256 } from 'js-sha256'

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8')

test('software version UI resource uses the frozen backend endpoints and ETag metadata', async () => {
  const source = await read('src/api/softwareVersionWebUi.js')
  assert.match(source, /\/hn-model-catalog\/software-versions\/\$\{encodeURIComponent\(versionUuid\)\}\/ui/)
  assert.match(source, /includeResponseMetadata: true/)
  assert.match(source, /response\.headers\?\.etag/)
  assert.match(source, /headers\['If-Match'\] = etag/)
  assert.match(source, /http\.put\(resourcePath\(versionUuid\), document/)
  assert.match(source, /http\.delete\(resourcePath\(versionUuid\)/)
  assert.match(source, /`\$\{resourcePath\(versionUuid\)\}\/document`/)
  assert.doesNotMatch(source, /axios/)
})

test('HTTP metadata opt-in preserves response headers without changing default consumers', async () => {
  const source = await read('src/api/http.js')
  assert.match(source, /response\.config\?\.includeResponseMetadata/)
  assert.match(source, /data: response\.data/)
  assert.match(source, /headers: response\.headers/)
  assert.match(source, /: response\.data/)
  assert.match(source, /apiData\?\.code \|\| apiDetail\?\.code/)
  assert.match(source, /apiData\.message \|\| apiDetail\.message/)
})

test('HN catalog drills down from hardware to OD and exact software versions', async () => {
  const api = await read('src/api/hnModels.js')
  const list = await read('src/components/hn-model/HnModelListSection.vue')
  const tree = await read('src/components/hn-model/HnModelVersionTree.vue')
  const modal = await read('src/components/hn-model/HnModelVersionCatalogModal.vue')
  const page = await read('src/views/HnModels.vue')

  assert.match(api, /\/hn-model-catalog\/revisions/)
  assert.match(api, /\/hn-model-catalog\/versions/)
  assert.match(list, /<hn-model-version-tree/)
  assert.match(tree, /fetchHnModelRevisions\(this\.hardwareLine\.id\)/)
  assert.match(tree, /fetchHnModelVersions\(revision\.id\)/)
  assert.match(tree, /\$emit\('web-ui'/)
  assert.match(modal, /fetchHnModelRevisions\(this\.hardwareLine\.id\)/)
  assert.match(modal, /fetchHnModelVersions\(this\.selectedRevisionId\)/)
  assert.match(modal, /initialVersionUuid/)
  assert.match(page, /hasPermission\(PERMISSION\.FIRMWARE_VIEW/)
  assert.match(page, /hasPermission\(PERMISSION\.PLATFORM_MODEL_MANAGE/)
  assert.match(page, /hasPermission\(PERMISSION\.FIRMWARE_MANAGE/)
  assert.doesNotMatch(page, /PERMISSION\.FIRMWARE_MANAGE[\s\S]{0,120}PERMISSION\.DEVICE_OPERATE/)
})

test('management panel validates locally, renders safely and handles concurrency', async () => {
  const source = await read('src/components/hn-model/SoftwareVersionWebUiPanel.vue')
  assert.match(source, /validateWebUiDocument\(document\)/)
  assert.match(source, /<web-ui-renderer/)
  assert.match(source, /error\?\.response\?\.status === 412/)
  assert.match(source, /clearSoftwareVersionWebUi\(this\.version\.uuid, this\.etag\)/)
  assert.match(source, /MAX_JSON_BYTES = 1048576/)
  assert.match(source, /downloadSoftwareVersionWebUiAsset\(asset\)/)
  assert.match(source, /sha256Hex\(await this\.readBlob\(blob\)\)/)
  assert.match(source, /URL\.createObjectURL\(blob\)/)
  assert.match(source, /URL\.revokeObjectURL\(url\)/)
  assert.match(source, /:asset-urls="assetUrls"/)
  assert.doesNotMatch(source, /v-html|<iframe|eval\(|new Function/)
})

test('asset integrity keeps Web Crypto and a bundled SHA-256 fallback', async () => {
  const source = await read('src/services/webUi/sha256.js')
  assert.match(source, /subtle\.digest\('SHA-256', buffer\)/)
  assert.match(source, /sha256Fallback\(new Uint8Array\(buffer\)\)/)
  assert.doesNotMatch(source, /return null|return true|skip/i)

  const executable = source
    .replace(
      "import { sha256 as sha256Fallback } from 'js-sha256'",
      'const sha256Fallback = globalThis.__sha256Fallback'
    )
    .replace('export const sha256Hex', 'const sha256Hex') +
    '\nglobalThis.__sha256Hex = sha256Hex\n'
  const context = { __sha256Fallback: jsSha256 }
  runInNewContext(executable, context)

  const input = new TextEncoder().encode('abc').buffer
  const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  assert.equal(await context.__sha256Hex(input), expected)

  context.crypto = { subtle: { digest: async () => { throw new Error('restricted context') } } }
  assert.equal(await context.__sha256Hex(input), expected)

  let webCryptoCalled = false
  context.crypto = {
    subtle: {
      digest: async algorithm => {
        webCryptoCalled = algorithm === 'SHA-256'
        return new Uint8Array(32).buffer
      }
    }
  }
  assert.equal(await context.__sha256Hex(input), '0'.repeat(64))
  assert.equal(webCryptoCalled, true)
})

test('software version UI messages exist in every supported locale', async () => {
  const localeFiles = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  const locales = await Promise.all(localeFiles.map(async name => JSON.parse(await read(`src/locales/${name}.json`))))
  const messages = locales.map(locale => locale.software_version_web_ui)
  const expected = Object.keys(messages[0]).sort()
  for (const [index, namespace] of messages.entries()) {
    assert.deepEqual(Object.keys(namespace).sort(), expected, `${localeFiles[index]} keys differ`)
  }

  const stableErrorCodes = [
    'web_ui_json_required',
    'web_ui_document_too_large',
    'web_ui_json_invalid',
    'web_ui_document_invalid',
    'web_ui_not_applicable',
    'web_ui_if_match_required',
    'web_ui_etag_mismatch',
    'software_version_immutable',
    'software_version_not_found',
    'asset_blob_missing'
  ]
  for (const [index, locale] of locales.entries()) {
    for (const code of stableErrorCodes) {
      assert.equal(typeof locale.errors[code], 'string', `${localeFiles[index]} missing errors.${code}`)
    }
  }
})
