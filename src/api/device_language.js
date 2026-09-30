/**
 * 设备语言 API（语言资源归固件 build，平台只选择运行时索引）
 *
 * 后端路由：
 *   GET    /api/v1/device-languages             固件支持的语言索引(0~6)
 *   POST   /api/v1/hosts/{host_uuid}/language   下发语言切换命令
 *
 * 不存在独立语言文件的上传、列表、下载或删除接口。
 */
import http from './http'

/** 列出固件内置支持的语言(后端硬编码 7 种) */
export const fetchDeviceLanguages = () => http.get('/device-languages')

/**
 * 给指定主机下发语言切换命令
 * @param {string} hostUuid
 * @param {Object} payload
 * @param {number} payload.lang_id   0=zh 1=en 2=ja 3=ko 4=de 5=fr 6=es
 * @param {number} [payload.device_id=1]
 */
export const setHostLanguage = (hostUuid, payload) =>
  http.post(`/hosts/${hostUuid}/language`, payload)
