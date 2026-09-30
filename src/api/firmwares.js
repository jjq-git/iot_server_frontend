/**
 * 固件管理 API（iot_server/backend Phase 2C 提供）
 *
 * 后端路由：
 *   POST   /api/v1/firmwares/upload              上传固件（multipart/form-data）
 *   POST   /api/v1/firmwares                     登记已存在文件的固件元数据（JSON）
 *   GET    /api/v1/firmwares                     固件列表（支持型号/版本过滤）
 *   GET    /api/v1/firmwares/{uuid}              固件详情
 *   GET    /api/v1/firmwares/{uuid}/download-token 生成短期下载地址
 *   GET    /api/v1/ota/firmware/{uuid}/download  使用签名地址下载二进制
 *   DELETE /api/v1/firmwares/{uuid}              删除固件
 */
import http from './http'

export const uploadFirmware = (formData, onUploadProgress) =>
  http.post('/firmwares/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
    onUploadProgress
  })

export const fetchFirmwares = (params = {}) => http.get('/firmwares', { params })

export const fetchFirmware = uuid => http.get(`/firmwares/${uuid}`)

export const updateFirmware = (uuid, data) => http.put(`/firmwares/${uuid}`, data)

export const downloadFirmware = async uuid => {
  const tokenData = await http.get(`/firmwares/${uuid}/download-token`)
  const signedUrl = tokenData?.download_url
  if (!signedUrl) throw new Error('Firmware download URL is missing')

  // The API base already ends in /api/v1. Same-origin signed URLs include
  // that prefix, so remove it before using this axios instance.
  const requestUrl = signedUrl.startsWith('/api/v1/')
    ? signedUrl.slice('/api/v1'.length)
    : signedUrl
  return http.get(requestUrl, {
    responseType: 'blob',
    timeout: 600000,
    skipUnauthorizedRedirect: true
  })
}

export const deleteFirmware = uuid => http.delete(`/firmwares/${uuid}`)
