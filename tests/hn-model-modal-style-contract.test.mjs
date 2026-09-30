import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const view = fs.readFileSync(path.join(root, 'src/views/HnModels.vue'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'src/assets/styles/pages/hn-models.scss'), 'utf8')

test('HN model dialogs retain their page layouts after being portaled', () => {
  const modalClasses = [...view.matchAll(/modal-class="([^"]+)"/g)].map(match => match[1])

  assert.equal(modalClasses.length, 3)
  assert.ok(modalClasses.every(className => className.includes('hn-models-modal')))
  assert.match(styles, /\.hn-models,\s*\.hn-models-modal\s*\{/)
  assert.doesNotMatch(styles, /\.editable-trigger::after/)
  assert.match(styles, /\.editable-hn\.editable-trigger\s*\{[\s\S]*?box-shadow:\s*inset 0 -1px 0 var\(--color-brand-border-soft\)/)
  assert.match(styles, /\.editable-hn\.editable-trigger > \.editable-trigger__icon\s*\{[\s\S]*?opacity:\s*0\.7;[\s\S]*?visibility:\s*visible;/)
  assert.match(styles, /\.new-attr-dialog-content\s*\{[\s\S]*?min-height:\s*650px;/)
  assert.match(styles, /\.attr-index-tree\s*\{[\s\S]*?height:\s*600px;/)
  assert.match(styles, /\.attr-edit-form\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/)
})

test('index group chevrons point right when collapsed and down when expanded', () => {
  assert.match(view, /<app-icon name="chevron-right"[\s\S]*?:rotate="isIndexGroupCollapsed\(group\.key\) \? 0 : 90"/)
  assert.doesNotMatch(styles, /\.index-group__chevron\.is-expanded\s*\{[\s\S]*?transform:/)
})
