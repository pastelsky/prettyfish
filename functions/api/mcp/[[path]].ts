/**
 * Cloudflare Pages Function: proxy /api/mcp/* to the relay worker.
 */

const RELAY_WORKER_URL = 'https://prettyfish-relay.binalgo.workers.dev'

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context
  const url = new URL(request.url)
  const targetUrl = `${RELAY_WORKER_URL}/api/mcp${url.pathname.replace(/^\/api\/mcp/, '')}${url.search}`

  // Strip Origin — server-to-server proxy, no CORS needed on the relay side
  const headers = new Headers(request.headers)
  headers.delete('origin')

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow',
  })
}
