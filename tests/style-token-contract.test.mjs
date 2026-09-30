import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const sourceRoot = path.resolve('src')

function collectStyleSources (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectStyleSources(target)
    return /\.(?:css|scss|vue)$/.test(entry.name) ? [target] : []
  })
}

test('semantic style variables referenced by source files are defined', () => {
  const sources = collectStyleSources(sourceRoot).map(file => fs.readFileSync(file, 'utf8'))
  const definitions = new Set()
  const usages = new Set()

  for (const source of sources) {
    for (const match of source.matchAll(/(--[a-z0-9_-]+)\s*:/gi)) definitions.add(match[1])
    for (const match of source.matchAll(/var\((--(?:color|font-family|font-size|font-weight|line-height|radius|space|control-height|icon-|motion-|z-|shadow|size-)[a-z0-9_-]*)/gi)) usages.add(match[1])
  }

  const unresolved = [...usages]
    .filter(token => !definitions.has(token))
    .filter(token => !['--color-', '--color-xxx'].includes(token))
    .sort()

  assert.deepEqual(unresolved, [])
})
