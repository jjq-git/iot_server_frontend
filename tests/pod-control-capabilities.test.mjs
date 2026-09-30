import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../src/components/PodControlPanel.vue', import.meta.url),
  'utf8'
)

test('common actions are gated by the backend control-schema capabilities', () => {
  assert.match(source, /v-if="supportsAction\('restart'\)"/)
  assert.match(source, /isPlatformAccount && supportsAction\('get_status'\)/)
  assert.match(source, /\(this\.controlSchema\.actions \|\| \[\]\)/)
  assert.match(source, /\['restart', 'get_status'\]\.includes\(command\)/)
})

test('status events do not reload the full control schema', () => {
  const handler = source.match(/onStatusUpdate: \(msg\) => \{([\s\S]*?)\r?\n {8}\},\r?\n {8}onCommandAck/)
  assert.ok(handler)
  assert.doesNotMatch(handler[1], /loadControlSchema/)
  assert.match(handler[1], /_applyControlUpdates/)
})

test('publish failure is not shown as command success', () => {
  assert.match(source, /if \(resp\.published === false\)/)
  assert.match(source, /if \(response\.published === false\)/)
  assert.match(source, /pod_control_panel\.toast\.publish_failed/)
})

test('D1 curtain sentinel position is displayed as unknown', () => {
  assert.match(source, /field\?\.attr_code === 'node2_curtain_position' && Number\(value\) === 255/)
  assert.match(source, /pod_control_panel\.shadow\.unknown_value/)
})

test('formal widgets expose the instance selector and target every set request', () => {
  const selector = source.indexOf('v-if="activeModule.instances && activeModule.instances.length > 1"')
  const formalWidgets = source.indexOf('v-if="sortedActiveWidgets.length"')
  assert.ok(selector >= 0 && selector < formalWidgets)
  assert.match(source, /target_uuid: this\.selectedInstanceUuid \|\| undefined/)
  assert.match(source, /field\.current_values\[this\.selectedInstanceUuid\]/)
})

test('indexless MQTT buttons use the compatibility attribute command', () => {
  const start = source.indexOf('async invokeWidget (widget)')
  const end = source.indexOf('openModuleDialog (module', start)
  assert.ok(start >= 0 && end > start)
  const invoke = source.slice(start, end)
  assert.match(invoke, /widget\.idx\s*\? await sendWidgetOperation/)
  assert.match(invoke, /: await sendDeviceControl/)
  assert.match(invoke, /attr_code: field && field\.attr_code/)
  assert.match(invoke, /value: true/)
  assert.match(invoke, /target_uuid: this\.selectedInstanceUuid \|\| undefined/)
})

test('widget set rejects publish failures and keeps the dialog open for shadow reconciliation', () => {
  const start = source.indexOf('async submitViaDeviceControl (changedFields, attrs)')
  const end = source.indexOf('submitViaWriteAttrs (attrs)', start)
  assert.ok(start >= 0 && end > start)
  const submit = source.slice(start, end)
  assert.match(submit, /resp && resp\.published === false/)
  assert.match(submit, /recordPendingControl/)
  assert.match(submit, /this\.\$set\(this\.moduleOriginalForm, item\.attr_code, attrs\[item\.attr_code\]\)/)
  assert.doesNotMatch(submit, /this\.dialogVisible = false/)
})

test('successful compatibility controls advance the open-dialog submission baseline', () => {
  const start = source.indexOf('async submitViaDeviceControl (changedFields, attrs)')
  const end = source.indexOf('submitViaWriteAttrs (attrs)', start)
  assert.ok(start >= 0 && end > start)
  const submit = source.slice(start, end)
  const successIndex = submit.indexOf('successes.push({ fields: request.fields, resp })')
  const baselineIndex = submit.indexOf('this.$set(this.moduleOriginalForm, item.attr_code, attrs[item.attr_code])')
  assert.ok(successIndex >= 0 && baselineIndex > successIndex)
})

test('slider uses a bounded value group without a clear action', () => {
  const widgetSource = readFileSync(
    new URL('../src/components/DeviceWidget.vue', import.meta.url),
    'utf8'
  )
  assert.match(widgetSource, /device-widget__slider-track/)
  assert.match(widgetSource, /device-widget__range/)
  assert.match(widgetSource, /device-widget__slider-scale/)
  assert.match(widgetSource, /device-widget__slider-value/)
  assert.match(widgetSource, /device-widget__slider-value--with-unit/)
  assert.match(widgetSource, /sliderProgress/)
  assert.match(widgetSource, /:clearable="false" type="number"/)

  const styleSource = readFileSync(
    new URL('../src/assets/styles/_pod-control-panel.scss', import.meta.url),
    'utf8'
  )
  assert.match(styleSource, /\.device-widget__slider-value \.form-control[\s\S]*?border-radius: 3px;/)
  assert.match(styleSource, /\.device-widget__slider-value--with-unit \.form-control[\s\S]*?border-right: 0;/)
})

test('light-off state disables the compatibility brightness widget', () => {
  assert.match(source, /:disabled="!canSendCommands \|\| !activeModule\.bound \|\| isWidgetInterlocked\(widget\)"/)
  assert.match(source, /isControlFieldInterlocked\(field, this\.moduleForm\)/)
})

test('offline pods remain visible while every realtime command entry is disabled', () => {
  assert.match(source, /isOffline \(\) \{[\s\S]*?this\.onlineState === false/)
  assert.match(source, /canSendCommands \(\) \{[\s\S]*?this\.canOperateCommands && !this\.isOffline/)
  assert.match(source, /v-if="canUseCustomCommands"[\s\S]*?:disabled="!canSendCustomCommands"/)
  assert.match(source, /class="control-card"[\s\S]*?:disabled="isOffline"/)
  assert.match(source, /pod_control_panel\.offline\.description_with_last_seen/)
  assert.match(source, /await this\.loadControlState\(\)/)
})

test('resolved shadow states do not permanently occupy the control dialog', () => {
  const shadowFilter = source.match(/activeShadowItems \(\) \{([\s\S]*?)\n {4}\}/)
  assert.ok(shadowFilter)
  assert.match(shadowFilter[1], /'pending', 'acknowledged', 'failed', 'timeout'/)
  assert.doesNotMatch(shadowFilter[1], /'applied'/)
})

test('host command capabilities are editable from a discoverable keyboard trigger', () => {
  const modelSource = readFileSync(
    new URL('../src/views/HnModels.vue', import.meta.url),
    'utf8'
  )
  assert.match(modelSource, /editingField === 'command_capabilities'/)
  assert.match(modelSource, /v-editable-trigger="\{ label: \$t\('common\.edit'\)[^\n]*startEdit\('command_capabilities'/)
  assert.doesNotMatch(modelSource, /@dblclick/)
  assert.match(modelSource, /@input="saveCommandCapabilities"/)
  assert.match(modelSource, /this\.saveFieldEdit\('command_capabilities', true\)/)
  assert.doesNotMatch(modelSource, /saveFieldEdit\('command_capabilities'\)[^,]/)
  assert.match(modelSource, /:checked="\(selectedModel\.command_capabilities \|\| \[\]\)\.includes\(option\.value\)"/)
  assert.match(modelSource, /v-for="option in commandCapabilityOptions"/)
  assert.match(modelSource, /this\.editValue = Array\.isArray\(value\)/)
})
