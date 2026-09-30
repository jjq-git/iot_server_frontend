import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'src/views/Users.vue'), 'utf8')
const profile = fs.readFileSync(path.join(process.cwd(), 'src/views/UserProfile.vue'), 'utf8')
const detail = fs.readFileSync(path.join(process.cwd(), 'src/views/UserDetail.vue'), 'utf8')
const api = fs.readFileSync(path.join(process.cwd(), 'src/api/user.js'), 'utf8')
const usersApi = fs.readFileSync(path.join(process.cwd(), 'src/api/users.js'), 'utf8')
const apiIndex = fs.readFileSync(path.join(process.cwd(), 'src/api/index.js'), 'utf8')

test('user list filters and forms expose exactly the four persisted roles', () => {
  assert.match(source, /const ROLE_KEYS = \['admin', 'operator', 'data_entry', 'viewer'\]/)
  assert.match(source, /\.\.\.ROLE_KEYS\.map\(key => \(\{/)
  assert.doesNotMatch(source, /platform_admin|ASSIGNABLE_ROLE_KEYS/)
})

test('role URLs accept only the four persisted roles', () => {
  assert.match(source, /field === 'role'[\s\S]*this\.query\.role = ROLE_KEYS\.includes\(v\) \? v : ''/)
})

test('only platform administrators submit the optional company filter', () => {
  assert.match(source, /this\.isPlatformAdmin\(\) && this\.query\.company_id[\s\S]*params\.company_id/)
  assert.match(source, /params\.role = this\.query\.role/)
})

test('root administrator rows use the shared capability-aware read-only guard', () => {
  assert.match(source, /canManageUserRow\(row, this\.currentUser\) && this\.canEdit\(row, 'user'\)/)
  assert.match(source, /canManageUserRow\(row, this\.currentUser\) &&[\s\S]*hasPermission\(PERMISSION\.USER_MANAGE/)
})

test('root administrators can edit their safe profile fields from user detail', () => {
  assert.match(detail, /SELF_EDITABLE_FIELDS = Object\.freeze\(\['display_name', 'phone', 'locale', 'timezone'\]\)/)
  assert.match(detail, /this\.isViewingCurrentUser\(\) && SELF_EDITABLE_FIELDS\.includes\(field\)/)
  assert.match(detail, /if \(selfServiceEdit\) await updateCurrentUser\(updateData\)/)
  assert.match(detail, /disabled: !canEditField\('display_name'\)/)
  assert.match(detail, /disabled: !canEditField\('role'\)/)
})

test('user detail submits only persisted role values with the role API contract', () => {
  for (const role of ['admin', 'operator', 'data_entry', 'viewer']) {
    assert.match(detail, new RegExp(`value: '${role}'`))
  }
  assert.doesNotMatch(detail, /value: 'maintainer'/)
  assert.match(detail, /updateUserRole\(this\.userId, roleValue, this\.user\.company_id\)/)
  assert.match(usersApi, /updateUserRole = \(uuid, role, companyId\) => http\.put\(`\/users\/\$\{uuid\}\/role`, \{ role \}/)
})

test('user detail exposes only fields writable by the matching backend endpoint', () => {
  assert.match(detail, /ADMIN_EDITABLE_FIELDS = Object\.freeze\(\['display_name', 'is_active', 'role'\]\)/)
  assert.doesNotMatch(detail, /startEditB\('(username|email|company_id)'/)
  assert.doesNotMatch(detail, /updateData = \{[\s\S]*username:|company_id: this\.editForm/)
  assert.match(detail, /formatDate\(user\.last_login_at\)/)
  assert.match(apiIndex, /\}[\s\n]*from '\.\/users'/)
})

test('current user responses render without the retired username field', () => {
  assert.match(source, /data\.item\.display_name \|\| data\.item\.email/)
  assert.doesNotMatch(profile, /userInfo\.username|startEdit\('email'\)|userInfo\.last_login(?!_at)/)
  assert.match(profile, /userInfo\.display_name \|\| userInfo\.email/)
})

test('user status changes are available in detail but not in list actions', () => {
  assert.doesNotMatch(source, /confirmToggleActive|users\.actions\.(?:disable|enable)|name="power"/)
  assert.match(detail, /canEditField\('is_active'\)/)
  assert.match(detail, /saveFieldEditDirectB\('is_active', value\)/)
  assert.match(detail, /field === 'is_active'[\s\S]*isPlatformAdmin\(this\.currentUser\)/)
})

test('shared users retain their selected membership context without exposing global account writes', () => {
  assert.match(source, /query: row\.company_id \? \{ company_id: String\(row\.company_id\) \} : \{\}/)
  assert.match(source, /updateUserRole\([\s\S]*this\.roleEditing\.company_id/)
  assert.match(source, /row\.home_company_id[\s\S]*this\.currentUser\?\.company_id/)
  assert.match(detail, /fetchUserDetail\(this\.userId, this\.\$route\.query\.company_id\)/)
  assert.match(detail, /this\.user\.home_company_id[\s\S]*this\.currentUser\?\.company_id/)
  assert.match(usersApi, /params: companyId \? \{ company_id: companyId \} : undefined/)
})

test('user list places display name before email', () => {
  const start = source.indexOf('buildUserColumns ()')
  const end = source.indexOf('handleUserColumnsUpdate', start)
  const columnBuilder = source.slice(start, end)

  assert.ok(columnBuilder.indexOf("prop: 'display_name'") < columnBuilder.indexOf("prop: 'email'"))
})

test('profile avatar keeps the dedicated multipart and delete endpoints', () => {
  assert.match(api, /http\.post\('\/users\/me\/avatar', formData/)
  assert.match(api, /http\.delete\('\/users\/me\/avatar'\)/)
  assert.match(profile, /formData\.append\('file', file\)/)
})
