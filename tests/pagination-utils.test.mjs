import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchAllPages } from '../src/utils/pagination.mjs'

test('fetchAllPages follows paged totals until every item is loaded', async () => {
  const calls = []
  const result = await fetchAllPages(async params => {
    calls.push(params)
    return params.page === 1
      ? { items: [{ id: 1 }, { id: 2 }], total: 3 }
      : { items: [{ id: 3 }], total: 3 }
  }, { pageSize: 2 })

  assert.deepEqual(result.map(item => item.id), [1, 2, 3])
  assert.deepEqual(calls, [
    { page: 1, page_size: 2 },
    { page: 2, page_size: 2 }
  ])
})

test('fetchAllPages supports nested and total-less response envelopes', async () => {
  const result = await fetchAllPages(async ({ page }) => ({
    data: {
      items: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }]
    }
  }), { pageSize: 2 })

  assert.deepEqual(result.map(item => item.id), [1, 2, 3])
})

test('fetchAllPages stops on an empty page even when a total is inconsistent', async () => {
  let calls = 0
  const result = await fetchAllPages(async ({ page }) => {
    calls += 1
    return { items: page === 1 ? [{ id: 1 }] : [], total: 5 }
  }, { pageSize: 1 })

  assert.deepEqual(result.map(item => item.id), [1])
  assert.equal(calls, 2)
})
