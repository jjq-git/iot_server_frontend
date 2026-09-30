import { mkdir, readFile, writeFile } from 'node:fs/promises'

const runtime = await readFile(new URL('../src/assets/icons/icons.svg', import.meta.url), 'utf8')
const symbols = [...runtime.matchAll(/<symbol\b[\s\S]*?<\/symbol>/g)].map(match => match[0])
const names = symbols
  .map(symbol => symbol.match(/id="icon-([^"]+)"/)?.[1])
  .filter(name => name && !name.startsWith('modifier-'))

const columns = 8
const cellWidth = 144
const cellHeight = 58
const rows = Math.ceil(names.length / columns)
const gallery = names.map((name, index) => {
  const x = (index % columns) * cellWidth
  const y = Math.floor(index / columns) * cellHeight
  return `<g transform="translate(${x} ${y})"><use href="#icon-${name}" x="8" y="6" width="24" height="24"/><text x="8" y="46">${name}</text></g>`
}).join('\n')

const overview = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cellWidth}" height="${rows * cellHeight + 100}" viewBox="0 0 ${columns * cellWidth} ${rows * cellHeight + 100}">
<style>svg{color:#46505a;background:#fff;font:10px sans-serif}text{fill:#46505a}.rule{fill:#f4f6f8}</style>
<defs>${symbols.join('\n')}</defs>
${gallery}
<g transform="translate(0 ${rows * cellHeight})"><rect class="rule" width="${columns * cellWidth}" height="100"/><text x="12" y="20">组合规则：新增使用预合成 symbol；列表与通知状态运行时组合 modifier</text><use href="#icon-controller-host-add" x="12" y="34" width="36" height="36"/><use href="#icon-controller-host" x="72" y="34" width="36" height="36"/><use href="#icon-modifier-list" x="72" y="34" width="36" height="36"/><use href="#icon-bell" x="132" y="34" width="36" height="36"/><use href="#icon-modifier-dot" x="132" y="34" width="36" height="36"/></g>
</svg>
`

const snapshot = (title, icons) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="160" viewBox="0 0 720 160">
<style>svg{color:#46505a;background:#fff;font:14px sans-serif}.panel{fill:#f4f6f8;stroke:#d8dde3}text{fill:#20262d}</style>
<defs>${symbols.join('\n')}</defs>
<rect class="panel" x="8" y="8" width="704" height="144"/><text x="28" y="38">${title}</text>
${icons.map((name, index) => `<g transform="translate(${32 + index * 100} 58)"><use href="#icon-${name}" width="32" height="32"/><text x="0" y="54">${name}</text></g>`).join('\n')}
</svg>
`

const outputDir = new URL('../docs/ui/svgs/', import.meta.url)
await mkdir(outputDir, { recursive: true })
await writeFile(new URL('icons.svg', outputDir), overview)
await writeFile(new URL('admin-layout.svg', outputDir), snapshot('后台布局公共图标', ['list', 'bell', 'sun', 'person', 'box-arrow-right']))
await writeFile(new URL('sidebar-comparison.svg', outputDir), snapshot('侧栏语义图标', ['controller-system', 'product-model', 'system-platform', 'mqtt-broker', 'web-interface', 'lvgl-interface']))
await writeFile(new URL('content-list-template.svg', outputDir), snapshot('内容列表动作', ['search', 'arrow-clockwise', 'pencil', 'trash', 'download', 'upload']))
console.log(`Synced ${names.length} icon snapshots`)
