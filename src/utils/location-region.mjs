export function districtToOption (district, labelKey = 'text') {
  return {
    value: district.code,
    id: district.id,
    [labelKey]: district.name,
    gps_lat: district.gps_lat,
    gps_lng: district.gps_lng,
    timezone: district.timezone
  }
}

export function findRegionOption (options, code) {
  if (!code) return undefined
  return options.find(option => option.value === code)
}

export function applyDistrictBaseline (form, optionGroups) {
  const option = findRegionOption(optionGroups.districts, form.district) ||
    findRegionOption(optionGroups.cities, form.city) ||
    findRegionOption(optionGroups.provinces, form.province)
  form.gps_lat = option?.gps_lat ?? null
  form.gps_lng = option?.gps_lng ?? null
  form.timezone = option?.timezone || ''
}

export function buildLocationRegionPayload (form, optionGroups) {
  const payload = { ...form }
  const option = findRegionOption(optionGroups.districts, form.district) ||
    findRegionOption(optionGroups.cities, form.city) ||
    findRegionOption(optionGroups.provinces, form.province)
  payload.district_id = option?.id ?? form.district_id ?? null

  // Administrative labels/codes are derived by the backend from district_id.
  for (const field of ['country_code', 'country', 'country_name', 'province', 'province_code',
    'city', 'city_code', 'district', 'district_code', 'district_id']) {
    if (field !== 'district_id') delete payload[field]
  }
  if (!payload.district_id) delete payload.district_id
  if (!payload.timezone) delete payload.timezone

  // Values copied from the catalog are defaults; omit them so the backend records
  // district_baseline provenance. User-entered coordinates remain explicit/manual.
  if (option && Number(payload.gps_lat) === Number(option.gps_lat) &&
      Number(payload.gps_lng) === Number(option.gps_lng)) {
    delete payload.gps_lat
    delete payload.gps_lng
    if (payload.timezone === option.timezone) delete payload.timezone
  }
  return payload
}
