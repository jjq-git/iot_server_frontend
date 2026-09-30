import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = relative => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')

test('the application uses one pod mark for the sidebar and browser icons', () => {
  const sidebar = read('src/components/Sidebar.vue')
  const component = read('src/components/shared/PodBrandMark.vue')
  const source = read('public/icon.svg')
  const favicon = read('public/favicon.svg')

  assert.match(sidebar, /<pod-brand-mark v-else/)
  assert.match(component, /stroke="currentColor"/)
  assert.match(source, /stroke="currentColor"/)
  assert.match(favicon, /stroke="#067a7a"/)
  for (const file of ['public/index.html', 'public/index.demo.html']) {
    const html = read(file)
    assert.match(html, /favicon-16x16\.png/)
    assert.match(html, /favicon-32x32\.png/)
    assert.match(html, /apple-touch-icon\.png/)
  }
})

test('raster fallback icon files are present', () => {
  for (const file of [
    'public/favicon.ico',
    'public/favicon-16x16.png',
    'public/favicon-32x32.png',
    'public/apple-touch-icon.png'
  ]) {
    assert.ok(fs.statSync(new URL(`../${file}`, import.meta.url)).size > 0, file)
  }
})
