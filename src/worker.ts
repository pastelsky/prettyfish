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
    return env.ASSETS.fetch(request)
  },
}
