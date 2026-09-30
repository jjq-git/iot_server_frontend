import { networkInterfaces } from 'node:os'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)

const privateRank = address => {
  if (address.startsWith('192.168.')) return 0
  if (address.startsWith('10.')) return 1
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2
  return 3
}

const detectedHosts = Object.values(networkInterfaces())
  .flat()
  .filter(item => item && item.family === 'IPv4' && !item.internal)
  .map(item => item.address)
  .sort((left, right) => privateRank(left) - privateRank(right))

const host = String(process.env.DEMO_LAN_HOST || detectedHosts[0] || '').trim()
const port = String(process.env.DEMO_LAN_PORT || '46945').trim()
if (!host || /[*/:\s]/.test(host)) throw new Error('DEMO_LAN_HOST must be one exact IPv4 address or hostname')
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('DEMO_LAN_PORT must be a valid TCP port')

const webpackCli = require.resolve('webpack-cli/bin/cli.js')
const args = [
  webpackCli,
  'serve',
  '--mode', 'development',
  '--env', 'appMode=demo',
  '--env', 'demoTransport=inline',
  '--env', `demoDevHost=${host}`,
  '--host', '0.0.0.0',
  '--port', port,
  '--no-open'
]

console.log(`Starting LAN Demo at http://${host}:${port}/`)
const child = spawn(process.execPath, args, { stdio: 'inherit' })
child.on('exit', code => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
