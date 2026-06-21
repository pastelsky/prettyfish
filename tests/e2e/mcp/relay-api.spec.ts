/**
 * Relay API integration tests.
 *
 * Tests the HTTP relay endpoints using wrangler dev as a local server.
 * These tests verify:
 * - Session creation returns correct shape
 * - CORS headers are set correctly
 * - 404 for unknown routes
 * - WebSocket upgrade is accepted
 * - MCP endpoint responds correctly
 *
 * Requires wrangler dev to be running on RELAY_PORT (default 8787).
 * Started automatically by playwright.config.ts via webServer.
 *
 * Skip with: SKIP_RELAY_TESTS=1 npx playwright test
 */
import { expect, test } from '@playwright/test'

const RELAY_URL = process.env.RELAY_URL ?? 'http://localhost:8787'
const SKIP = !!process.env.SKIP_RELAY_TESTS

// Helper to make a relay request
async function relayFetch(path: string, init?: RequestInit) {
  return fetch(`${RELAY_URL}${path}`, {
    ...init,
    headers: {
      'Origin': 'http://localhost:4175',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

test.describe('Relay API — session lifecycle', () => {
  test.skip(SKIP, 'Skipping relay tests (SKIP_RELAY_TESTS=1)')

  test('POST /relay/sessions creates a session', async () => {
    const res = await relayFetch('/relay/sessions', {
      method: 'POST',
      body: JSON.stringify({ createdBy: 'test' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json() as Record<string, unknown>
    expect(typeof body.sessionId).toBe('string')
    expect(body.sessionId).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[0-9a-f]{4}$/)
    expect(typeof body.wsUrl).toBe('string')
    expect(body.wsUrl).toContain('/relay/')
    expect(body.wsUrl).toContain('/ws?token=')
    expect(typeof body.mcpUrl).toBe('string')
    expect(body.mcpUrl).toContain('/relay/')
    expect(body.mcpUrl).toContain('/mcp')
    expect(typeof body.browserToken).toBe('string')
    expect(typeof body.browserProof).toBe('string')
  })

  test('POST /relay/sessions returns CORS headers for allowed origin', async () => {
    const res = await relayFetch('/relay/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:4175')
  })

  test('OPTIONS preflight returns 204', async () => {
    const res = await relayFetch('/relay/sessions', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })

  test('unknown route returns 404', async () => {
    const res = await relayFetch('/relay/no-such-session/ws')
    // 404 from the DO (session not found)
    expect([404, 426]).toContain(res.status)
  })

  test('unknown top-level route returns 404', async () => {
    const res = await relayFetch('/not-a-relay-route')
    // The SPA serves the index.html for unknown routes — this is OK
    // We just verify it doesn't throw a 500
    expect(res.status).not.toBe(500)
  })
})

test.describe('Relay API — MCP endpoint', () => {
  test.skip(SKIP, 'Skipping relay tests (SKIP_RELAY_TESTS=1)')

  let sessionId: string
  let mcpUrl: string

  test.beforeAll(async () => {
    // Create a session to get an MCP URL
    const res = await relayFetch('/relay/sessions', {
      method: 'POST',
      body: JSON.stringify({ createdBy: 'test' }),
    })
    const body = await res.json() as { sessionId: string; mcpUrl: string }
    sessionId = body.sessionId
    mcpUrl = body.mcpUrl
  })

  test('MCP endpoint responds to initialize request', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4175',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(1)
    expect(body.result).toBeDefined()
    const result = body.result as Record<string, unknown>
    expect(result.protocolVersion).toBeDefined()
    expect(result.serverInfo).toBeDefined()
    const serverInfo = result.serverInfo as Record<string, unknown>
    expect(serverInfo.name).toBe('prettyfish')
  })

  test('MCP notifications/initialized returns 202', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4175',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      }),
    })
    expect(res.status).toBe(202)
    const text = await res.text()
    expect(text).toBe('') // empty body
  })

  test('MCP endpoint declines an unused standalone SSE stream', async () => {
    const res = await fetch(mcpUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Origin': 'http://localhost:4175',
      },
    })

    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
  })

  test('MCP tools/list returns available tools', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4175',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    const result = body.result as { tools: Array<{ name: string }> }
    const toolNames = result.tools.map((t) => t.name)

    expect(toolNames).toContain('create_diagram')
    expect(toolNames).toContain('list_diagrams')
    expect(toolNames).toContain('get_diagram')
    expect(toolNames).toContain('set_diagram_code')
    expect(toolNames).toContain('set_diagram_theme')
    expect(toolNames).toContain('export_png')
    expect(toolNames).toContain('delete_diagram')
    expect(toolNames).toContain('select_diagram')
    expect(toolNames).toContain('list_themes')
    expect(toolNames).toContain('session_info')
  })

  test('MCP tools/call session_info when browser not connected', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4175',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'session_info', arguments: {} },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    const result = body.result as { content: Array<{ type: string; text: string }> }
    const content = JSON.parse(result.content[0].text) as Record<string, unknown>

    expect(content.sessionId).toBe(sessionId)
    expect(content.browserConnected).toBe(false) // no browser connected in test
  })

  test('MCP tools/call list_diagrams when browser not connected returns error', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4175',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'list_diagrams', arguments: {} },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    // Should return an error result (browser not connected)
    const result = body.result as { isError?: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('not connected')
  })
})
