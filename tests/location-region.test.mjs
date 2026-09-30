import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyDistrictBaseline,
  buildLocationRegionPayload,
  districtToOption
} from '../src/utils/location-region.mjs'

const optionGroups = {
  provinces: [districtToOption({ id: 31, code: '31', name: '上海市', gps_lat: 31.23, gps_lng: 121.47, timezone: 'Asia/Shanghai' })],
  cities: [districtToOption({ id: 3101, code: '3101', name: '上海市', gps_lat: 31.22, gps_lng: 121.46, timezone: 'Asia/Shanghai' })],
  districts: [districtToOption({ id: 310115, code: '310115', name: '浦东新区', gps_lat: 31.221, gps_lng: 121.544, timezone: 'Asia/Shanghai' })]
}

test('district selection applies the most specific coordinate and timezone baseline', () => {
  const form = { province: '31', city: '3101', district: '310115' }

  applyDistrictBaseline(form, optionGroups)

  assert.equal(form.gps_lat, 31.221)
  assert.equal(form.gps_lng, 121.544)
  assert.equal(form.timezone, 'Asia/Shanghai')
})

test('location payload submits one district reference and omits copied baseline', () => {
  const form = {
    location_name: 'Test location',
    country_code: 'CN',
    province: '31',
    city: '3101',
    district: '310115',
    gps_lat: 31.221,
    gps_lng: 121.544,
    timezone: 'Asia/Shanghai'
  }

  const payload = buildLocationRegionPayload(form, optionGroups)

  assert.equal(payload.district_id, 310115)
  assert.equal(payload.province, undefined)
  assert.equal(payload.city, undefined)
  assert.equal(payload.district, undefined)
  assert.equal(payload.gps_lat, undefined)
  assert.equal(payload.gps_lng, undefined)
})

test('city baseline is used when no district is selected', () => {
  const form = { province: '31', city: '3101', district: '' }

  applyDistrictBaseline(form, optionGroups)

  assert.equal(form.gps_lat, 31.22)
  assert.equal(form.gps_lng, 121.46)
})
