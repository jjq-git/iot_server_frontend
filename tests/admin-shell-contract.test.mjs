import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layoutSource = fs.readFileSync(path.join(root, 'src/layouts/AdminLayout.vue'), 'utf8')
const shellStyles = fs.readFileSync(path.join(root, 'src/assets/styles/_shell-ux.scss'), 'utf8')
const layoutStyles = fs.readFileSync(path.join(root, 'src/assets/styles/layout.scss'), 'utf8')
const interactionStyles = fs.readFileSync(path.join(root, 'src/assets/styles/_interaction.scss'), 'utf8')
const themeVariables = fs.readFileSync(path.join(root, 'src/assets/styles/_theme-vars.scss'), 'utf8')

test('admin shell restores predictable focus and scroll after route navigation', () => {
  assert.match(layoutSource, /id="main-content"/)
  assert.match(layoutSource, /class="skip-link"/)
  assert.match(layoutSource, /@click\.prevent="focusMainContent"/)
  assert.match(layoutSource, /mainContent\.scrollTop = 0/)
  assert.match(layoutSource, /mainContent\.focus\(\{ preventScroll: true \}\)/)
})

test('mobile navigation is dismissible and removed from the inactive focus order', () => {
  assert.match(layoutSource, /event\.key === 'Escape'/)
  assert.match(layoutSource, /\{ inert: '' \}/)
  assert.match(layoutSource, /BODY_NAVIGATION_CLASS/)
  assert.match(shellStyles, /body\.has-mobile-navigation-open/)
})

test('desktop sidebar preference is persisted independently from mobile state', () => {
  assert.match(layoutSource, /SIDEBAR_STORAGE_KEY/)
  assert.match(layoutSource, /desktopCollapsed/)
  assert.match(layoutSource, /window\.localStorage\.setItem/)
})

test('shell interaction styles only use semantic color tokens', () => {
  assert.doesNotMatch(shellStyles, /#[0-9a-f]{3,8}\b/i)
  assert.doesNotMatch(shellStyles, /\b(?:color|background(?:-color)?)\s*:\s*(?:white|black)\b/i)
})

test('admin shell uses one compact height token across the desktop layout', () => {
  assert.match(themeVariables, /--size-topbar-height:\s+76px/)
  assert.match(layoutStyles, /height:\s+calc\(100vh - var\(--size-topbar-height\)\)/)
  assert.match(layoutStyles, /min-height:\s+var\(--size-topbar-height\)/)
})

test('shared tables provide stronger scan hierarchy and contained horizontal scrolling', () => {
  assert.match(interactionStyles, /background:\s+var\(--color-bg-thead\)/)
  assert.match(interactionStyles, /color:\s+var\(--color-text-secondary\)/)
  assert.match(interactionStyles, /font-size:\s+var\(--font-size-control\)/)
  assert.match(interactionStyles, /letter-spacing:\s+0/)
  assert.match(interactionStyles, /overscroll-behavior-inline:\s+contain/)
})
