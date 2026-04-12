/**
 * Pretty Fish edge worker.
 *
 * Routes /api/relay/* and /api/mcp/* to the relay Durable Object worker.
 * All other requests are handled by Cloudflare Assets (SPA fallback).
 *
 * IMPORTANT: The Worker fetch handler is only invoked for requests that
 * don't match a static asset. Cloudflare Assets serves JS/CSS/HTML directly
 * from the CDN without invoking this Worker, so there is no per-request cost
 * for loading static files.
 */

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const RELAY_WORKER_URL = 'https://prettyfish-relay.binalgo.workers.dev'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/relay/') || url.pathname.startsWith('/api/mcp/')) {
      const targetUrl = `${RELAY_WORKER_URL}${url.pathname}${url.search}`
      return fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow',
      })
    }

    return env.ASSETS.fetch(request)
  },
}
