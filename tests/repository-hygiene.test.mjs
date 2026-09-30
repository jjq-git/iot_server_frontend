import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('local deployment state and generated artifacts stay out of Git', () => {
  const ignoreRules = new Set(read('.gitignore').split(/\r?\n/).map(line => line.trim()))

  for (const rule of ['.deploy.local', '.env.local', '.env.prod', '.devserver.port', 'tmp/', 'playwright-report/', 'test-results/']) {
    assert.ok(ignoreRules.has(rule), `.gitignore must contain ${rule}`)
  }

  for (const legacyFile of [
    '.env.prod',
    '.devserver.port',
    'deploy.sh',
    'deploy-quick.sh',
    'deploy.py',
    'fix_nginx_prod.sh',
    'nginx.prod.conf'
  ]) {
    assert.equal(fs.existsSync(path.join(root, legacyFile)), false, `${legacyFile} must remain removed`)
  }
})

test('replacement deployment files use key authentication and placeholder targets', () => {
  const deployScript = read('scripts/deploy.sh')
  const demoDeployScript = read('scripts/deploy-demo.sh')
  const deployExample = read('.deploy.example')
  const nginxExample = read('nginx.example.conf')
  const demoNginxExample = read('nginx.demo.example.conf')
  const replacementFiles = `${deployScript}\n${demoDeployScript}\n${deployExample}\n${nginxExample}\n${demoNginxExample}`

  assert.match(deployScript, /ssh\s+"\$\{ssh_args\[@\]\}"/)
  assert.match(deployScript, /rsync\s+-az\s+--delete/)
  assert.match(demoDeployScript, /ssh\s+"\$\{ssh_args\[@\]\}"/)
  assert.match(demoDeployScript, /rsync\s+-az\s+--delete/)
  assert.doesNotMatch(replacementFiles, /\bsshpass\b/i)
  assert.doesNotMatch(replacementFiles, /(?:password|passwd|pwd)\s*=/i)
  const nonLoopbackAddresses = (replacementFiles.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])
    .filter(address => address !== '127.0.0.1')
  assert.deepEqual(nonLoopbackAddresses, [])
  assert.match(deployExample, /\.example\.com/)
})
