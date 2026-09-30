import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const webpackConfigFactory = require('../webpack.config.js')
const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)))

const toDataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const errorsSource = await readFile(new URL('../src/app-mode/errors.js', import.meta.url), 'utf8')
const constantsSource = await readFile(new URL('../src/app-mode/constants.js', import.meta.url), 'utf8')
const errorsUrl = toDataUrl(errorsSource)
const constantsUrl = toDataUrl(constantsSource)
const validateSource = (await readFile(new URL('../src/app-mode/validate.js', import.meta.url), 'utf8'))
  .replace("from './constants'", `from '${constantsUrl}'`)
  .replace("from './errors'", `from '${errorsUrl}'`)
const { validateAppStartup } = await import(toDataUrl(validateSource))

test('webpack produces isolated backend and Demo configurations', () => {
  assert.throws(() => webpackConfigFactory({}, { mode: 'production' }), /expected backend or demo/)

  const backend = webpackConfigFactory({ appMode: 'backend' }, { mode: 'production' })
  const demo = webpackConfigFactory({ appMode: 'demo' }, { mode: 'production' })
  const lanDemo = webpackConfigFactory({ appMode: 'demo', demoTransport: 'inline', demoDevHost: '192.168.1.31' }, { mode: 'development' })

  assert.equal(backend.output.path, path.join(root, 'dist'))
  assert.equal(demo.output.path, path.join(root, 'dist-demo'))
  assert.match(backend.resolve.alias['@app-mode-entry$'], /app-mode-entries[\\/]backend\.js$/)
  assert.match(demo.resolve.alias['@app-mode-entry$'], /app-mode-entries[\\/]demo\.js$/)
  assert.match(backend.resolve.alias['@realtime-mode-entry$'], /realtime-mode-entries[\\/]backend\.js$/)
  assert.match(demo.resolve.alias['@realtime-mode-entry$'], /realtime-mode-entries[\\/]demo\.js$/)
  assert.ok(backend.devServer.proxy['/api'])
  assert.ok(backend.devServer.proxy['/emqx'])
  assert.equal(Object.hasOwn(demo.devServer, 'proxy'), false)
  assert.equal(demo.devServer.port, 46944)
  assert.deepEqual(demo.devServer.allowedHosts, ['localhost', '127.0.0.1', '[::1]'])
  assert.deepEqual(lanDemo.devServer.allowedHosts, ['localhost', '127.0.0.1', '[::1]', '192.168.1.31'])
  assert.throws(() => webpackConfigFactory({ appMode: 'demo', demoTransport: 'inline' }, { mode: 'production' }), /must use the worker transport/)
  const demoDefinitions = demo.plugins.find(plugin => plugin.constructor.name === 'DefinePlugin').definitions
  const lanDefinitions = lanDemo.plugins.find(plugin => plugin.constructor.name === 'DefinePlugin').definitions
  assert.equal(demoDefinitions.__DEMO_TRANSPORT__, '"worker"')
  assert.equal(lanDefinitions.__DEMO_TRANSPORT__, '"inline"')

  const backendCopies = backend.plugins.find(plugin => plugin.constructor.name === 'CopyPlugin').patterns
  const demoCopies = demo.plugins.find(plugin => plugin.constructor.name === 'CopyPlugin').patterns
  assert.equal(backendCopies.some(pattern => pattern.to === 'mockServiceWorker.js'), false)
  assert.equal(demoCopies.some(pattern => pattern.to === 'mockServiceWorker.js'), true)
})

test('runtime mode, host and Demo API settings fail closed', () => {
  const base = {
    buildAppMode: 'demo',
    runtimeConfig: { appMode: 'demo', apiBase: 'auto', uploadBaseUrl: 'auto' },
    hostname: 'demo.podsc.com'
  }
  assert.equal(validateAppStartup(base), 'demo')
  assert.equal(validateAppStartup({ ...base, hostname: 'localhost', isDevelopment: true }), 'demo')
  assert.equal(validateAppStartup({ ...base, hostname: 'demo-lab.local', isDevelopment: true, demoDevHosts: ['demo-lab.local'] }), 'demo')

  assert.throws(() => validateAppStartup({ ...base, runtimeConfig: { ...base.runtimeConfig, appMode: 'backend' } }), error => error.code === 'E_DEMO_MODE_INVALID')
  assert.throws(() => validateAppStartup({ ...base, hostname: 'example.com' }), error => error.code === 'E_DEMO_HOST_DENIED')
  assert.throws(() => validateAppStartup({ ...base, runtimeConfig: { ...base.runtimeConfig, apiBase: 'https://api.podsc.com/api/v1' } }), error => error.code === 'E_DEMO_API_UNSAFE')
  assert.throws(() => validateAppStartup({
    buildAppMode: 'backend',
    runtimeConfig: { appMode: 'backend', apiBase: 'auto' },
    hostname: 'demo.podsc.com'
  }), error => error.code === 'E_DEMO_HOST_DENIED')
})

test('build scripts, runtime configs and startup sequencing declare both modes', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const backendConfig = JSON.parse(await readFile(new URL('../public/config.json', import.meta.url), 'utf8'))
  const demoConfig = JSON.parse(await readFile(new URL('../public/config.demo.json', import.meta.url), 'utf8'))
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  const startupErrorSource = await readFile(new URL('../src/app-mode/startupError.js', import.meta.url), 'utf8')
  const inlineTransportSource = await readFile(new URL('../src/demo/inline-transport.js', import.meta.url), 'utf8')
  const lanLauncherSource = await readFile(new URL('../scripts/start-demo-lan.mjs', import.meta.url), 'utf8')

  assert.match(packageJson.scripts.dev, /appMode=backend/)
  assert.match(packageJson.scripts['dev:demo'], /appMode=demo.*46944/)
  assert.equal(packageJson.scripts['dev:demo:lan'], 'node scripts/start-demo-lan.mjs')
  assert.match(inlineTransportSource, /getResponse\(demoHandlers, request\)/)
  assert.match(lanLauncherSource, /demoTransport=inline/)
  assert.match(lanLauncherSource, /DEMO_LAN_PORT \|\| '46945'/)
  assert.match(packageJson.scripts.build, /appMode=backend/)
  assert.match(packageJson.scripts['build:demo'], /appMode=demo/)
  assert.equal(backendConfig.appMode, 'backend')
  assert.equal(demoConfig.appMode, 'demo')
  assert.ok(mainSource.indexOf('await bootstrapAppModeInfrastructure()') < mainSource.indexOf('new Vue({'))
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']) {
    assert.match(startupErrorSource, new RegExp(`['"]${locale}['"]`))
  }
})
