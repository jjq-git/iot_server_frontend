import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('Demo nginx is static-only with fail-closed service paths and cache rules', () => {
  const nginx = read('nginx.demo.example.conf')

  assert.doesNotMatch(nginx, /proxy_pass|fastcgi_pass|uwsgi_pass/)
  assert.match(nginx, /connect-src 'self'/)
  assert.match(nginx, /X-Content-Type-Options "nosniff"/)
  assert.match(nginx, /max-age=31536000, immutable/)
  assert.match(nginx, /mockServiceWorker\\\.js[^\n]+" "no-store"/)
  assert.match(nginx, /error_page 404 = @demo_not_found/)
  assert.match(nginx, /location @demo_not_found[\s\S]+default_type text\/plain;[\s\S]+return 404/)

  for (const service of ['api', 'uploads', 'emqx']) {
    assert.match(nginx, new RegExp(`location = \\/${service} \\{ return 404; \\}`))
    assert.match(nginx, new RegExp(`location \\^~ \\/${service}\\/ \\{ return 404; \\}`))
  }

  assert.match(nginx, /location ~\* \^\/(?:\(\?:)?js\|css\|assets\|demo-assets/)
  assert.match(nginx, /try_files \$uri =404;/)
  assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html;/)
})

test('Demo deploy script verifies before upload and atomically rolls back the exact release', () => {
  const deploy = read('scripts/deploy-demo.sh')
  const contractIndex = deploy.indexOf('npm run verify:demo-contracts')
  const auditIndex = deploy.indexOf('npm run audit:demo-data')
  const buildIndex = deploy.indexOf('npm run build:demo')
  const verifyIndex = deploy.indexOf('verify-demo-artifact.mjs')
  const uploadIndex = deploy.indexOf('rsync -az --delete')
  const switchIndex = deploy.indexOf("mv -Tf '$next_link' '$current_link'")
  const smokeIndex = deploy.indexOf('smoke-demo-release.mjs "$public_url" "$commit"')

  assert.ok(contractIndex > 0 && contractIndex < auditIndex)
  assert.ok(auditIndex < buildIndex)
  assert.ok(buildIndex < verifyIndex && verifyIndex < uploadIndex)
  assert.ok(uploadIndex < switchIndex && switchIndex < smokeIndex)
  assert.match(deploy, /releases\/\$release_id/)
  assert.match(deploy, /previous_release=.*readlink -f/)
  assert.match(deploy, /ln -s '\$previous_release' '\$rollback_link'/)
  assert.doesNotMatch(deploy, /ls\s+-[tr]|sort|tail\s+-n/)
  assert.match(deploy, /git status --porcelain/)
})

test('Demo CI workflow runs the full quality gate and preserves safe evidence', () => {
  const workflow = read('.gitea/workflows/demo-quality.yml')

  for (const command of [
    'npm ci',
    'npm run lint',
    'npm run lint:style',
    'npm run test:architecture',
    'npm test',
    'npm run verify:demo-contracts',
    'npm run audit:demo-data -- --output demo-data-audit.json',
    'npm run build',
    'npm run build:demo',
    'npm run verify:demo-artifact',
    'npm run test:browser'
  ]) {
    assert.ok(workflow.includes(command), `missing CI command: ${command}`)
  }

  assert.match(workflow, /playwright install --with-deps chromium firefox webkit/)
  assert.match(workflow, /if: always\(\)/)
  assert.match(workflow, /actions\/upload-artifact@v4/)
  assert.match(workflow, /demo-data-audit\.json/)
  assert.match(workflow, /tests\/fixtures\/demo\/manifest\.json/)
  assert.match(workflow, /dist-demo\/build-info\.json/)
  assert.match(workflow, /playwright-report\//)
  assert.match(workflow, /test-results\//)
})

test('Demo data policy is versioned and audit evidence stays outside source control', () => {
  const policy = JSON.parse(read('config/demo-data-policy.json'))
  const packageJson = JSON.parse(read('package.json'))
  const gitignore = read('.gitignore')

  assert.equal(policy.version, 1)
  assert.ok(policy.approvedEmailDomains.length > 0)
  assert.ok(policy.approvedPhonePrefixes.length > 0)
  assert.ok(policy.requiredUuidPrefix)
  assert.ok(policy.requiredSerialPrefix)
  assert.equal(packageJson.scripts['audit:demo-data'], 'node scripts/audit-demo-data.mjs')
  assert.match(gitignore, /^demo-data-audit\.json$/m)
})

test('offline verifier accepts a clean internally consistent Demo artifact', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'podsc-demo-artifact-'))
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }))

  const config = Buffer.from(JSON.stringify({ appMode: 'demo', apiBase: 'auto', uploadBaseUrl: 'auto' }))
  const worker = Buffer.from('self.addEventListener("install", () => {})')
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const sha256 = value => createHash('sha256').update(value).digest('hex')
  const buildInfo = {
    appMode: 'demo',
    commit,
    dirty: false,
    configSha256: sha256(config),
    mockWorkerSha256: sha256(worker)
  }

  fs.writeFileSync(path.join(temporary, 'config.json'), config)
  fs.writeFileSync(path.join(temporary, 'mockServiceWorker.js'), worker)
  fs.writeFileSync(path.join(temporary, 'build-info.json'), JSON.stringify(buildInfo))
  fs.writeFileSync(path.join(temporary, 'index.html'), '<script src="/js/app.deadbeef.js"></script>')

  const result = spawnSync(process.execPath, ['scripts/verify-demo-artifact.mjs', temporary, commit], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Verified Demo artifact/)
})

test('offline verifier rejects dirty metadata and forbidden network targets', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'podsc-demo-artifact-invalid-'))
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }))

  const config = Buffer.from(JSON.stringify({ appMode: 'demo', apiBase: 'auto', uploadBaseUrl: 'auto' }))
  const worker = Buffer.from('/* mock worker */')
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const sha256 = value => createHash('sha256').update(value).digest('hex')
  const metadata = dirty => ({
    appMode: 'demo',
    commit,
    dirty,
    configSha256: sha256(config),
    mockWorkerSha256: sha256(worker)
  })

  fs.writeFileSync(path.join(temporary, 'config.json'), config)
  fs.writeFileSync(path.join(temporary, 'mockServiceWorker.js'), worker)
  fs.writeFileSync(path.join(temporary, 'build-info.json'), JSON.stringify(metadata(true)))
  fs.writeFileSync(path.join(temporary, 'index.html'), '<html></html>')

  let result = spawnSync(process.execPath, ['scripts/verify-demo-artifact.mjs', temporary, commit], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /clean source checkout/)

  fs.writeFileSync(path.join(temporary, 'build-info.json'), JSON.stringify(metadata(false)))
  fs.writeFileSync(path.join(temporary, 'index.html'), '<script>fetch("https://api.podsc.com")</script>')
  result = spawnSync(process.execPath, ['scripts/verify-demo-artifact.mjs', temporary, commit], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /forbidden network target/)
})
