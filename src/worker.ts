/**
 * Main Pretty Fish edge worker.
 *
 * Proxies /api/relay/* and /api/mcp/* to the relay worker so that all relay
 * API calls are same-origin from the browser's perspective (pretty.fish → relay).
 * This avoids Cloudflare's workers.dev cross-origin CORS blocking.
 */

const RELAY_WORKER_URL = 'https://prettyfish-relay.binalgo.workers.dev'

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/relay/') || url.pathname.startsWith('/api/mcp/')) {
      const targetUrl = `${RELAY_WORKER_URL}${url.pathname}${url.search}`

      // For WebSocket upgrade requests, proxy directly
      if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        return fetch(targetUrl, request)
      }

      // For regular HTTP requests, forward and return response
      const proxied = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow',
      })

      return fetch(proxied)
    }

    // All other requests: fall through to SPA assets (handled by Cloudflare Assets)
    return new Response(null, { status: 404 })
  },
}
