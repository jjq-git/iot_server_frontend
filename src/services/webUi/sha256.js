import { sha256 as sha256Fallback } from 'js-sha256'

const toHex = buffer => [...new Uint8Array(buffer)]
  .map(value => value.toString(16).padStart(2, '0'))
  .join('')

/**
 * Calculate a SHA-256 digest without weakening integrity checks on non-secure
 * intranet origins. Web Crypto remains the preferred implementation; the
 * bundled implementation is used when subtle crypto is unavailable or fails.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>} lowercase hexadecimal digest
 */
export const sha256Hex = async buffer => {
  const subtle = typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : null
  if (subtle) {
    try {
      return toHex(await subtle.digest('SHA-256', buffer))
    } catch (error) {
      // Continue with the bundled implementation for restricted browser contexts.
    }
  }

  return sha256Fallback(new Uint8Array(buffer))
}
