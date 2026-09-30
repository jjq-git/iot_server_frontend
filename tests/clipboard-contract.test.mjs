import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const clipboardSource = await readFile(new URL('../src/utils/clipboard.js', import.meta.url), 'utf8')
const credentialsSource = await readFile(new URL('../src/views/debug/Credentials.vue', import.meta.url), 'utf8')
const clipboardModule = await import(`data:text/javascript;base64,${Buffer.from(clipboardSource).toString('base64')}`)

async function withLegacyClipboard (execCommand, run) {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let copyHandler = null

  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { getSelection: () => null }
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: null,
      body: {},
      addEventListener: (name, handler) => {
        if (name === 'copy') copyHandler = handler
      },
      removeEventListener: (name, handler) => {
        if (name === 'copy' && copyHandler === handler) copyHandler = null
      },
      execCommand: command => execCommand(command, () => copyHandler)
    }
  })

  try {
    await run()
  } finally {
    for (const [name, descriptor] of [
      ['document', originalDocument],
      ['navigator', originalNavigator],
      ['window', originalWindow]
    ]) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('LAN HTTP fallback copies through the visible input and confirms the payload', async () => {
  let copiedPayload = null
  const target = {
    value: 'example-value',
    focus: () => {},
    select: () => {},
    setSelectionRange: () => {}
  }

  await withLegacyClipboard((command, getCopyHandler) => {
    assert.equal(command, 'copy')
    getCopyHandler()({
      clipboardData: {
        setData: (type, value) => { copiedPayload = { type, value } }
      },
      preventDefault: () => {}
    })
    return true
  }, async () => {
    assert.equal(await clipboardModule.copyText('example-value', { target }), 'exec-command')
  })

  assert.deepEqual(copiedPayload, { type: 'text/plain', value: 'example-value' })
})

test('LAN HTTP fallback rejects false success when no copy event is dispatched', async () => {
  const target = {
    value: 'example-value',
    focus: () => {},
    select: () => {},
    setSelectionRange: () => {}
  }

  await withLegacyClipboard(() => true, async () => {
    await assert.rejects(
      clipboardModule.copyText('example-value', { target }),
      /Copy command was rejected/
    )
  })
})

test('credential secret copies from the visible input and supports manual Ctrl+C fallback', () => {
  assert.match(credentialsSource, /ref="secretPasswordInput"/)
  assert.match(credentialsSource, /@copy="onSecretCopied"/)
  assert.match(credentialsSource, /copyText\(this\.secret\.password, \{ target: input \}\)/)
  assert.match(credentialsSource, /this\.selectSecretPassword\(\)/)
})
