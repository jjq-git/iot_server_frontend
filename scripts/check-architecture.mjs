import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve('.')
const sourceRoot = path.join(projectRoot, 'src')

function walk (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

const sourceFiles = walk(sourceRoot).filter(file => /\.(?:js|vue|scss|css)$/.test(file))
const relative = file => path.relative(projectRoot, file).replaceAll('\\', '/')
const failures = []
const report = (file, rule) => failures.push(`${relative(file)}: ${rule}`)
const read = file => fs.readFileSync(file, 'utf8')
const styleAllowlist = JSON.parse(read(path.join(projectRoot, 'scripts/architecture-allowlist.json')))

const primitivePattern = /<b-(?:button|card|form-group|form-input|input|table|modal)(?=[\s>])/i
const nativeBootstrapButtonPattern = /<button\b[^>]*\bclass\s*=\s*["'](?:btn(?=\s|["'])|[^"']*\sbtn(?=\s|["']))/i
const publicComponentSelectorPattern = /\.(?:btn|card|table|form-control|custom-select|modal|pagination|alert)(?=[\s.#:[>{,+~)]|$)/
for (const file of sourceFiles.filter(file => file.endsWith('.vue'))) {
  const name = relative(file)
  const source = read(file)
  if (!name.startsWith('src/components/base/') && primitivePattern.test(source)) {
    report(file, 'business UI must use the approved Base* components')
  }
  if (!name.startsWith('src/components/base/') && nativeBootstrapButtonPattern.test(source)) {
    report(file, 'native Bootstrap-styled buttons are not allowed; use BaseButton')
  }
  if (/<(?:b-icon|BIcon)(?=[\s>])|\bb-icon-/i.test(source)) {
    report(file, 'legacy BootstrapVue icons are not allowed; use AppIcon')
  }
  if (name.startsWith('src/views/')) {
    const scopedStyles = [...source.matchAll(/<style\b(?=[^>]*\bscoped\b)(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/style>/gi)]
      .map(match => {
        const styleSource = match.groups.attrs.match(/\bsrc=["']@\/([^"']+)["']/i)?.[1]
        return styleSource ? read(path.join(sourceRoot, styleSource)) : match.groups.body
      })
      .join('\n')
    const selectors = [...scopedStyles.matchAll(/(?:^|[}\n])\s*([^@;{}]*?)\{/gm)]
      .map(match => match[1].trim())
      .filter(Boolean)
    if (selectors.some(selector => publicComponentSelectorPattern.test(selector))) {
      report(file, 'scoped page styles must not override public component internals; use a business class or Base* contract')
    }
  }
}

const inlineSvgAllowlist = new Set([
  'src/components/AppIcon.vue',
  'src/views/Login.vue',
  'src/views/IconLibrary.vue',
  'src/components/PodControlPanel.vue',
  'src/components/DeviceWidget.vue',
  // The arc widget uses SVG paths as the rendered data visualization, not as an icon.
  'src/components/device-ui/widgets/WidgetArc.vue'
])
for (const file of sourceFiles.filter(file => /\.(?:vue|js)$/.test(file))) {
  const name = relative(file)
  const source = read(file)
  if (/<svg\b/i.test(source) && !inlineSvgAllowlist.has(name)) {
    report(file, 'ordinary inline SVG is not allowlisted; use AppIcon')
  }
  if (/\$bvToast\b/.test(source) && name !== 'src/services/ui/toast.js') {
    report(file, 'toast calls must go through services/ui/toast')
  }
  if (/\bmsgBoxConfirm\b|\$bvModal\b/.test(source) && name !== 'src/services/ui/confirm.js') {
    report(file, 'confirm calls must go through services/ui/confirm')
  }
  if (/from\s+['"]axios['"]|require\(['"]axios['"]\)/.test(source) && !name.startsWith('src/api/')) {
    report(file, 'axios may only be used through src/api resource modules')
  }
  if (/\b(?:error|err|e|firstError)\??\.userMessage\s*\|\|/.test(source) && name !== 'src/services/error.js') {
    report(file, 'user-facing error extraction must go through services/error')
  }
}

for (const file of sourceFiles.filter(file => relative(file).startsWith('src/components/base/'))) {
  const source = read(file)
  if (/\$route\b|@\/api\//.test(source)) {
    report(file, 'Base* components must remain route- and business-neutral')
  }
}

const roleDisplayAllowlist = new Set([
  'src/components/UserAvatar.vue',
  'src/components/Topbar.vue',
  'src/views/Login.vue',
  'src/views/UserProfile.vue',
  'src/views/Users.vue',
  'src/utils/permission.js'
])
for (const file of sourceFiles.filter(file => /\.(?:vue|js)$/.test(file))) {
  const name = relative(file)
  const source = read(file)
  const directRoleDecision = /\.role\s*(?:===|!==)|\[(?:[^\]]*['"](?:platform_admin|admin|data_entry)['"][^\]]*)\]\.includes\([^)]*role/i.test(source)
  if (directRoleDecision && !roleDisplayAllowlist.has(name)) {
    report(file, 'authorization must use capability helpers, not role strings')
  }
}

const legacyTokenPattern = /--(?:ui|app|prototype)-[a-z0-9-]+/i
for (const file of sourceFiles) {
  if (legacyTokenPattern.test(read(file))) {
    report(file, 'legacy --ui-*, --app-* and --prototype-* tokens are not allowed')
  }
}

for (const file of sourceFiles.filter(file => /\.(?:vue|scss|css)$/.test(file))) {
  const name = relative(file)
  const source = read(file)
  const allowed = styleAllowlist.entries[name] || { hardcodedThemeColors: 0, important: 0 }
  const hardcodedThemeColors = (source.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) || []).length
  const important = (source.match(/!important\b/g) || []).length
  if (hardcodedThemeColors > allowed.hardcodedThemeColors) {
    report(file, `hard-coded theme colors increased (${hardcodedThemeColors} > ${allowed.hardcodedThemeColors})`)
  }
  if (important > allowed.important) {
    report(file, `unexplained !important usage increased (${important} > ${allowed.important})`)
  }
}

if (failures.length) {
  console.error(`Architecture guard failed (${failures.length}):`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log('Architecture guard passed.')
}
