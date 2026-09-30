import { appConfig } from './config'
import { fetchAuthenticatedImage as fetchAuthImageBlob } from '@/api/files'

/**
 * 标准化图片/文件 URL
 * @param {string} url - 原始 URL
 * @returns {string} - 处理后的 URL
 */
export const normalizeImageUrl = (url) => {
  if (!url) return ''
  const normalizedUrl = String(url).replace(/\\/g, '/')

  // 已经是完整 URL，仅修正后端误返回的 loopback 地址。
  if (/^https?:\/\//i.test(normalizedUrl)) {
    return replaceEnvironmentUrl(normalizedUrl)
  }

  const uploadBase = appConfig.getUploadBase()

  if (normalizedUrl.startsWith('/')) {
    return uploadBase + normalizedUrl
  }

  if (normalizedUrl.startsWith('api/') || normalizedUrl.startsWith('uploads/')) {
    return `${uploadBase}/${normalizedUrl}`
  }

  return `${uploadBase}/api/v1/${normalizedUrl.replace(/^\/+/, '')}`
}

/**
 * 后端若误返回 localhost/127.0.0.1 绝对地址，局域网客户端无法访问该地址。
 * 将这类 loopback URL 改为当前统一配置的上传/API 来源。
 */
const replaceEnvironmentUrl = (url) => {
  try {
    const parsed = new URL(url)
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return `${appConfig.getUploadBase()}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch (error) {
    console.warn('图片 URL 无效:', url)
  }
  return url
}

/**
 * 获取带认证信息的图片 Blob URL
 * 走 axios 实例（http.js）：自动带 Authorization、401 触发统一登录跳转
 * 响应拦截器返回 response.data，blob 模式下即 Blob 对象
 */
export const fetchAuthenticatedImage = async (imageUrl) => {
  if (!imageUrl) return ''

  // data/blob 已可直接显示；第三方绝对 URL 也应交给 <img> 原生加载。
  // 若用 axios 获取第三方图片，会因自动附加 Authorization 触发 CORS 预检，
  // picsum 等公共图片源通常不允许该预检，最终产生 console 错误和破图。
  if (/^(data:|blob:)/i.test(imageUrl)) return imageUrl
  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      const pageOrigin = window.location.origin
      const uploadOrigin = new URL(
        appConfig.getUploadBase(),
        pageOrigin
      ).origin
      const imageOrigin = new URL(imageUrl).origin
      if (imageOrigin !== pageOrigin && imageOrigin !== uploadOrigin) {
        return imageUrl
      }
    } catch (error) {
      console.warn('图片 URL 无效:', imageUrl)
      return imageUrl
    }
  }

  try {
    const blob = await fetchAuthImageBlob(imageUrl)
    return URL.createObjectURL(blob)
  } catch (error) {
    console.warn('图片加载失败:', error?.message || error)
    return imageUrl
  }
}
