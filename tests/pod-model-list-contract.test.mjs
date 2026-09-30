import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('pod model list props do not collide with globally mixed permission methods', async () => {
  const source = await readFile(new URL('../src/components/pod-model/PodModelListSection.vue', import.meta.url), 'utf8')

  assert.equal(source.includes('canDelete: { type: Function'), false)
  assert.match(source, /deleteAllowed:\s*\{\s*type:\s*Function/)
})
