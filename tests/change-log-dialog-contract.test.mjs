import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/components/ChangeLogDialog.vue', import.meta.url), 'utf8')

test('field change dialog only renders fields available in log_change', () => {
  for (const key of ['changed_at', 'action', 'changed_field', 'change_content', 'changed_by']) {
    assert.match(source, new RegExp(`key: '${key}'`))
  }
  assert.doesNotMatch(source, /key: 'reason'/)
})
