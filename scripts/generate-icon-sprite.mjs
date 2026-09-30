import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lineIconSymbols } from './line-icon-symbols.mjs'

const kebab = value => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const currentSprite = await readFile(new URL('../src/assets/icons/icons.svg', import.meta.url), 'utf8')
const bootstrapSource = await readFile(
  new URL('../node_modules/bootstrap-vue/esm/icons/icons.js', import.meta.url),
  'utf8'
)

const approvedIds = new Set(
  [...currentSprite.matchAll(/id="icon-([^"]+)"/g)]
    .map(match => match[1])
    .filter(name => !name.startsWith('modifier-'))
)
approvedIds.add('moon')
approvedIds.add('sun')
approvedIds.add('inbox')

// Icons selected from runtime configuration cannot be discovered from literal
// <app-icon> attributes, so keep their semantic catalog explicit here.
const dynamicIconNames = [
  'bar-chart',
  'fan',
  'heart-pulse',
  'lightning',
  'pie-chart',
  'soundwave',
  'thermometer-half',
  'wifi'
]
for (const name of dynamicIconNames) approvedIds.add(name)
for (const name of Object.keys(lineIconSymbols)) approvedIds.add(name)

async function collectVueFiles (directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectVueFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.vue') ? [fullPath] : []
  }))
  return nested.flat()
}

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
for (const file of await collectVueFiles(sourceRoot)) {
  const source = await readFile(file, 'utf8')
  for (const tag of source.match(/<app-icon\b[\s\S]*?>/gi) || []) {
    const literalName = tag.match(/\sname="([^"]+)"/)
    if (literalName) approvedIds.add(literalName[1])
  }
}
approvedIds.delete('plus-circle')
approvedIds.delete('plus-lg')
const available = new Map()
for (const match of bootstrapSource.matchAll(/makeIcon\('([^']+)','([^']*)'\)/g)) {
  available.set(kebab(match[1]), match[2])
}

const symbols = [...approvedIds]
  .sort()
  .map(name => {
    const lineBody = lineIconSymbols[name]
    if (lineBody) return `  <symbol id="icon-${name}" viewBox="0 0 24 24">${lineBody}</symbol>`
    const body = available.get(name)
    if (!body) return ''
    return `  <symbol id="icon-${name}" viewBox="0 0 24 24"><g transform="scale(1.5)" fill="currentColor">${body}</g></symbol>`
  })
  .filter(Boolean)

symbols.push(
  '  <symbol id="icon-modifier-list" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M13.5 15h9m-9 3h9m-9 3h9"/></symbol>',
  '  <symbol id="icon-modifier-dot" viewBox="0 0 24 24"><circle cx="19" cy="5" r="3" fill="currentColor"/></symbol>'
)

const output = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">
${symbols.join('\n')}
</svg>
`
const outputUrl = new URL('../src/assets/icons/icons.svg', import.meta.url)
await mkdir(new URL('../src/assets/icons/', import.meta.url), { recursive: true })
await writeFile(outputUrl, output, 'utf8')
console.log(`Generated ${symbols.length} approved symbols`)
