const CONFIG_KIND = 'iot-ui-config'
const CONFIG_VERSION = 1

export const normalizeAssetUrl = value => {
  const url = String(value || '').trim().replace(/["\\\r\n]/g, '')
  return /^(https?:\/\/|\/(?!\/)|data:image\/(?:png|jpe?g|webp);base64,)/i.test(url) ? url : ''
}

export const createLoginPageConfig = () => ({
  kind: CONFIG_KIND,
  schema_version: CONFIG_VERSION,
  template_type: 'login_page',
  layout: 'split_image',
  theme: {
    primary_color: '',
    background_color: '#078484',
    panel_color: '#ffffff',
    text_color: '#111827'
  },
  assets: {
    logo_url: '',
    background_url: ''
  },
  content: {
    kicker: 'SIGN IN',
    title: '',
    description: '',
    copyright: '',
    hero_title: '',
    hero_subtitle: '',
    hero_description: ''
  },
  options: {
    use_brand_logo: true,
    use_brand_primary_color: true,
    show_remember_me: true
  }
})

export const createFooterConfig = () => ({
  kind: CONFIG_KIND,
  schema_version: CONFIG_VERSION,
  template_type: 'footer',
  content: {
    copyright: '',
    website_label: '',
    website_url: ''
  },
  theme: {
    text_color: '#7a838c',
    background_color: '#ffffff'
  }
})

export const createTemplateConfig = templateType => {
  if (templateType === 'footer') return createFooterConfig()
  return createLoginPageConfig()
}

export const parseTemplateConfig = (content, templateType = 'login_page') => {
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content)
    if (parsed?.kind !== CONFIG_KIND || parsed?.template_type !== templateType) return null
    const defaults = createTemplateConfig(templateType)
    const parsedOptions = parsed.options || {}
    const options = { ...(defaults.options || {}), ...parsedOptions }
    // 兼容旧版本：已有专用值继续按“覆盖基础品牌”处理；没有专用值则自动继承。
    if (!Object.prototype.hasOwnProperty.call(parsedOptions, 'use_brand_logo')) {
      options.use_brand_logo = !normalizeAssetUrl(parsed.assets?.logo_url)
    }
    if (!Object.prototype.hasOwnProperty.call(parsedOptions, 'use_brand_primary_color')) {
      options.use_brand_primary_color = !String(parsed.theme?.primary_color || '').trim()
    }
    return {
      ...defaults,
      ...parsed,
      theme: { ...defaults.theme, ...(parsed.theme || {}) },
      assets: { ...(defaults.assets || {}), ...(parsed.assets || {}) },
      content: { ...defaults.content, ...(parsed.content || {}) },
      options
    }
  } catch (error) {
    return null
  }
}
