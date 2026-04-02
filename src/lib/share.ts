import type { AppState } from '../types'

const HASH_PREFIX = '#/d/'

/**
 * Encodes the full app state (code + mode + mermaid theme) into a
 * URL-safe base64 string and sets it as the URL hash.
 * The resulting URL can be shared and will restore the exact state.
 */
export function encodeStateToHash(state: AppState): string {
  const json = JSON.stringify(state)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  const hash = `${HASH_PREFIX}${b64}`
  const url = new URL(window.location.href)
  url.hash = hash
  return url.toString()
}

/**
 * Attempts to decode app state from the current URL hash.
 * Returns null if the hash is absent or malformed.
 */
export function decodeStateFromHash(): Partial<AppState> | null {
  const hash = window.location.hash
  if (!hash.startsWith(HASH_PREFIX)) return null
  try {
    const b64 = hash.slice(HASH_PREFIX.length)
    const json = decodeURIComponent(escape(atob(b64)))
    return JSON.parse(json) as Partial<AppState>
  } catch {
    return null
  }
}

/**
 * Writes the shareable URL to the clipboard and returns it.
 */
export async function copyShareUrl(state: AppState): Promise<string> {
  const url = encodeStateToHash(state)
  await navigator.clipboard.writeText(url)
  return url
}
