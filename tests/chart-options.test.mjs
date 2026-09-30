import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const utilitySource = await fs.readFile(path.join(root, 'src/utils/chart-options.js'), 'utf8')
const utility = await import(`data:text/javascript;base64,${Buffer.from(utilitySource).toString('base64')}`)

test('chart axis indexes fall back to the primary axis', () => {
  for (const value of [undefined, null, '', 'left', -1, 1.5]) {
    assert.equal(utility.normalizeChartAxisIndex(value), 0)
  }
  assert.equal(utility.normalizeChartAxisIndex('1'), 1)
})

test('cartesian chart options render only when every referenced axis exists', () => {
  const line = { series: [{ type: 'line', data: [1] }] }
  assert.equal(utility.isChartOptionReady(line), false)
  assert.equal(utility.isChartOptionReady({ ...line, xAxis: {}, yAxis: {} }), true)
  assert.equal(utility.isChartOptionReady({
    xAxis: {},
    yAxis: {},
    series: [{ type: 'line', yAxisIndex: 1, data: [1] }]
  }), false)
  assert.equal(utility.isChartOptionReady({
    xAxis: {},
    yAxis: [{}, {}],
    series: [{ type: 'line', yAxisIndex: 1, data: [1] }]
  }), true)
})

test('non-cartesian charts remain valid without cartesian axes', () => {
  assert.equal(utility.isChartOptionReady({
    series: [{ type: 'pie', data: [{ value: 1 }] }]
  }), true)
  assert.equal(utility.isChartOptionReady({ series: [] }), false)
})

test('dashboard widgets replace chart options and account for preserved secondary series', async () => {
  const [widget, runtime] = await Promise.all([
    fs.readFile(path.join(root, 'src/components/dashboard/ChartWidget.vue'), 'utf8'),
    fs.readFile(path.join(root, 'src/views/DashboardRuntime.vue'), 'utf8')
  ])

  assert.match(widget, /chartUpdateOptions:\s*\{ notMerge: true, lazyUpdate: true \}/)
  assert.match(widget, /empty \|\| !chartOptionReady/)
  assert.match(runtime, /preservedBaseSeries\.map\(source => normalizeChartAxisIndex\(source\.yAxisIndex\)\)/)
  assert.match(runtime, /yAxisIndex:\s*normalizeChartAxisIndex\(source\.y_axis\)/)
})
