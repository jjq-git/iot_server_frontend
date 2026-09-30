import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('raw controller fan power-off zeros and disables its physical duty output', async () => {
  const source = await readFile(new URL('../src/components/ControllerFanPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /@input="setFanPower"/)
  assert.match(source, /:disabled="!form\.sw"/)
  assert.match(source, /if \(!this\.form\.sw\) this\.form\.duty = 0/)
  assert.match(source, /const duty = this\.form\.sw \? this\.form\.duty : 0/)
  assert.match(source, /op: 'fan',[\s\S]+duty,[\s\S]+sw: this\.form\.sw \? 1 : 0/)
})
