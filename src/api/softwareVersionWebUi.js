import http from './http'

const resourcePath = versionUuid =>
  `/hn-model-catalog/software-versions/${encodeURIComponent(versionUuid)}/ui`

const responseWithEtag = response => ({
  ...response.data,
  etag: response.headers?.etag || null
})

export const fetchSoftwareVersionWebUi = async versionUuid => {
  const response = await http.get(resourcePath(versionUuid), {
    includeResponseMetadata: true
  })
  return responseWithEtag(response)
}

export const replaceSoftwareVersionWebUi = async (versionUuid, document, etag = null) => {
  const headers = { 'Content-Type': 'application/json' }
  if (etag) headers['If-Match'] = etag
  const response = await http.put(resourcePath(versionUuid), document, {
    headers,
    includeResponseMetadata: true
  })
  return responseWithEtag(response)
}

export const clearSoftwareVersionWebUi = (versionUuid, etag) =>
  http.delete(resourcePath(versionUuid), {
    headers: etag ? { 'If-Match': etag } : {}
  })

export const downloadSoftwareVersionWebUi = versionUuid =>
  http.get(`${resourcePath(versionUuid)}/document`, { responseType: 'blob' })

export const downloadSoftwareVersionWebUiAsset = asset => {
  const path = String(asset?.download_url || '')
  if (!/^\/api\/v1\/upload\/[0-9a-f-]+$/i.test(path)) {
    return Promise.reject(new Error('Invalid Web UI asset download path'))
  }
  return http.get(path.replace(/^\/api\/v1\//, '/'), { responseType: 'blob' })
}
