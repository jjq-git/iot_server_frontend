import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const themeSource = fs.readFileSync(path.join(root, 'src/assets/styles/_theme-vars.scss'), 'utf8')

function themeBlock (selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = themeSource.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`))
  assert.ok(match, `missing ${selector} theme block`)
  return match[1]
}

function colorVariables (source) {
  return new Set([...source.matchAll(/(--color-[\w-]+)\s*:/g)].map(match => match[1]))
}

test('every light color token has an explicit dark-theme value', () => {
  const lightColors = colorVariables(themeBlock(':root'))
  const darkColors = colorVariables(themeBlock('[data-theme="dark"]'))
  const missingDarkColors = [...lightColors].filter(variable => !darkColors.has(variable))

  assert.deepEqual(missingDarkColors, [])
})

test('critical migrated page styles use semantic theme colors', () => {
  const stylesheets = [
    'src/assets/styles/pages/company-dashboard-config.scss',
    'src/assets/styles/pages/file-manager.scss',
    'src/assets/styles/pages/pod-models.scss'
  ]

  stylesheets.forEach(stylesheet => {
    const source = fs.readFileSync(path.join(root, stylesheet), 'utf8')
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b/i, `${stylesheet} must not hard-code theme colors`)
    assert.doesNotMatch(source, /\b(?:color|background(?:-color)?)\s*:\s*(?:white|black)\b/i, `${stylesheet} must use semantic inverse colors`)
  })
})
