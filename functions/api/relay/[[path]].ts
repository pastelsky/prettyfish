/**
 * Cloudflare Pages Function: proxy /api/relay/* to the relay worker.
 * Pages Functions handle all HTTP methods (GET, POST, OPTIONS, etc.)
 * without zone WAF blocking.
 */

const RELAY_WORKER_URL = 'https://prettyfish-relay.binalgo.workers.dev'

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context
  const url = new URL(request.url)
  const targetUrl = `${RELAY_WORKER_URL}/api/relay${url.pathname.replace(/^\/api\/relay/, '')}${url.search}`

  // Strip Origin header — the relay worker validates origin allowlist,
  // but server-to-server calls don't need CORS validation.
  const headers = new Headers(request.headers)
  headers.delete('origin')

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow',
  })
}
