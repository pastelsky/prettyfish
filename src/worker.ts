/**
 * Pretty Fish unified edge worker.
 *
 * - /relay/*  → MCP relay session management + WebSocket connections
 * - /mcp/*    → MCP JSON-RPC tool calls
 * - /*        → SPA static assets via Cloudflare Assets binding
 *
 * Durable Objects handle per-session state and WebSocket hibernation.
 */

import { handleRelayRequest, RelaySessionDurableObject } from './relay/worker'
export type { RelayWorkerEnv } from './relay/worker'

// Re-export the Durable Object class so Cloudflare can find it at module init time.
// This MUST be a static export (not dynamic import) for the DO binding to work correctly.
export { RelaySessionDurableObject }

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  RELAY_SESSIONS: import('./relay/worker').RelayWorkerEnv['RELAY_SESSIONS']
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // ── Relay and MCP routes ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/relay/') || url.pathname.startsWith('/mcp/')) {
      return handleRelayRequest(request, {
        RELAY_SESSIONS: env.RELAY_SESSIONS,
        RELAY_BOOTSTRAP_TOKEN: '',
      })
    }

    // ── Everything else: static SPA assets ───────────────────────────────────
    const assetResponse = await env.ASSETS.fetch(request)

    // Hashed asset filenames (e.g. main-Abc123.js, index-XYZ.css) are content-
    // addressed and never change — serve with 1-year immutable cache.
    // index.html and manifests must revalidate on every load.
    const isHashedAsset = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|ico)$/.test(url.pathname)
    if (isHashedAsset && assetResponse.status === 200) {
      const headers = new Headers(assetResponse.headers)
      headers.set('cache-control', 'public, max-age=31536000, immutable')
      return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers })
    }

    return assetResponse
  },
}
