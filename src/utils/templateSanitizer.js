const unsafeCssPattern = /expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding\s*:/i
const unsafeUrlPattern = /^(?:javascript|vbscript|data:text\/html)/i

const isSafeUrl = (value, attributeName) => {
  const normalized = Array.from(String(value || '').trim())
    .filter(character => {
      const code = character.charCodeAt(0)
      return code > 31 && code !== 127 && !/\s/.test(character)
    })
    .join('')
  if (!normalized || normalized.startsWith('#')) return true
  if (unsafeUrlPattern.test(normalized)) return false
  if (attributeName === 'action' || attributeName === 'formaction') return false
  if (normalized.startsWith('data:')) return attributeName === 'src' && /^data:image\//i.test(normalized)
  return /^(?:https?:|mailto:|tel:|\/|\.\/|\.\.\/)/i.test(normalized)
}

export const sanitizeTemplateCss = css => {
  if (!css) return ''
  return String(css)
    .replace(/@import\s+(?:url\()?[^;]+;?/gi, '')
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, value) => {
      return isSafeUrl(value, 'src') ? match : 'none'
    })
    .split(';')
    .filter(declaration => !unsafeCssPattern.test(declaration))
    .join(';')
    .replace(/<\/style/gi, '<\\/style')
}
