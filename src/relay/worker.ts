import {
  type PublicRelaySessionResponse,
  type RelayEnvelope,
  type RelayPeerRole,
  type RelaySessionRecord,
  isRelayEnvelope,
} from './protocol'

type DurableObjectIdLike = unknown

interface DurableObjectStubLike {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

interface DurableObjectNamespaceLike {
  idFromName: (name: string) => DurableObjectIdLike
  get: (id: DurableObjectIdLike) => DurableObjectStubLike
}

interface DurableObjectStateLike {
  storage: {
    get: <T>(key: string) => Promise<T | undefined>
    put: (key: string, value: unknown) => Promise<void>
  }
  acceptWebSocket: (ws: WebSocket, tags?: string[]) => void
  getWebSockets: (tag?: string) => WebSocket[]
}

interface JsonRpcRequest {
  jsonrpc?: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

declare const WebSocketPair: {
  new (): {
    0: WebSocket
    1: WebSocket
  }
}

export interface RelayWorkerEnv {
  RELAY_SESSIONS: DurableObjectNamespaceLike
  RELAY_BOOTSTRAP_TOKEN: string
}

const SESSION_KEY = 'relay-session-record'
const MCP_PROTOCOL_VERSION = '2025-03-26'
const MCP_SERVER_INFO = { name: 'prettyfish-remote-relay', version: '0.1.0' }
const PUBLIC_ORIGIN_PATTERNS = [
  /^https:\/\/pretty\.fish$/,
  /^https:\/\/www\.pretty\.fish$/,
  /^https:\/\/prettyfish\.binalgo\.workers\.dev$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]
const MCP_TOOL_DEFINITIONS = [
  { name: 'session_info', description: 'Return the current relay session details.', inputSchema: { type: 'object', properties: {} } },
  { name: 'list_diagrams', description: 'List all diagrams on the current page. Returns each diagram\'s ID and name. Use include_code to also return the Mermaid source.', inputSchema: { type: 'object', properties: { include_code: { type: 'boolean', description: 'Include Mermaid source code for each diagram. Defaults to false.' } } } },
  { name: 'get_diagram', description: 'Get a single diagram by ID or name. Returns the diagram\'s details and Mermaid source code. If not found, suggests using list_diagrams.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string', description: 'Diagram ID (exact match).' }, name: { type: 'string', description: 'Diagram name (case-insensitive fuzzy match).' } } } },
  { name: 'create_diagram', description: 'Create a new Mermaid diagram on the current page. Always provide a short, descriptive name based on the diagram content.', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'A short descriptive name for the diagram (e.g. "User Auth Flow", "DB Schema").' }, code: { type: 'string', description: 'Mermaid diagram source code.' }, width: { type: 'number' } } } },
  { name: 'set_diagram_code', description: 'Replace a diagram\'s Mermaid source code and wait for render.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, code: { type: 'string' }, timeoutMs: { type: 'number' }, select: { type: 'boolean' } }, required: ['diagramId', 'code'] } },
  { name: 'export_svg', description: 'Export a diagram as SVG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, timeoutMs: { type: 'number' } } } },
  { name: 'export_png', description: 'Export a diagram as PNG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, background: { type: 'string' }, scale: { type: 'number' }, timeoutMs: { type: 'number' } } } },
] as const

function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null
  return origin.replace(/\/$/, '')
}

function isPublicOriginAllowed(origin: string | null): origin is string {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return false
  return PUBLIC_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalized))
}

function corsHeaders(origin: string | null): HeadersInit {
  const normalized = normalizeOrigin(origin)
  if (!normalized || !isPublicOriginAllowed(normalized)) return {}
  return {
    'access-control-allow-origin': normalized,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-relay-bootstrap-token',
    vary: 'Origin',
  }
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

function makeToken() {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
}

// ~200 short, friendly, visually distinct words for readable session IDs
const WORDS = [
  'amber','arch','azure','bay','birch','blaze','bloom','bolt','brook','canyon',
  'cedar','cinder','cliff','cloud','cobalt','coral','crest','crisp','dawn','delta',
  'dew','drift','dune','dusk','echo','elm','ember','fern','field','fjord',
  'flame','flint','flux','foam','fog','fold','forge','frost','gale','glow',
  'glyph','grove','gulf','haze','helm','herb','hill','hive','holt','horn',
  'hue','hull','iris','isle','ivy','jade','jetty','kelp','knoll','lake',
  'lark','latch','lava','leaf','ledge','linen','link','loch','lodge','loom',
  'loop','lure','lynx','maple','marsh','mesa','mist','moat','moon','moss',
  'moth','muse','mystic','nook','nord','nova','oak','opal','orbit','petal',
  'pine','pixel','plum','pond','prism','pulse','quartz','quest','rain','reef',
  'ridge','rift','rind','rook','rose','ruby','rune','rush','rust','sage',
  'salt','sand','scribe','seam','shaft','shale','shoal','silk','slate','sleet',
  'slope','smoke','snap','snow','solar','spark','spire','splay','spray','spur',
  'staff','stag','star','stem','step','still','stone','storm','stray','stream',
  'sun','surf','swirl','swift','thorn','tide','till','timber','trace','trail',
  'tuft','tusk','twine','vale','vault','veil','velvet','vine','violet','volt',
  'wake','wave','weld','wisp','wren','yard','yew','zinc','zone','zeal',
]

/** Generate a human-readable session ID: word-word-word-xxxx */
function makeSessionId(): string {
  const arr = new Uint32Array(3)
  crypto.getRandomValues(arr)
  const words = Array.from(arr).map(n => WORDS[n % WORDS.length]).join('-')
  // 4-char hex suffix for extra collision resistance
  const hash = crypto.randomUUID().replaceAll('-', '').slice(0, 4)
  return `${words}-${hash}`
}

function getSessionStub(env: RelayWorkerEnv, sessionId: string): DurableObjectStubLike {
  const id = env.RELAY_SESSIONS.idFromName(sessionId)
  return env.RELAY_SESSIONS.get(id)
}

function getWorkerBaseUrl(request: Request): string {
  return new URL(request.url).origin
}

function buildPublicRelaySessionResponse(request: Request, session: RelaySessionRecord): PublicRelaySessionResponse {
  const baseUrl = getWorkerBaseUrl(request)
  return {
    ...session,
    mcpUrl: `${baseUrl}/mcp/${session.sessionId}`,
  }
}

function requireBootstrapAuth(request: Request, env: RelayWorkerEnv): Response | null {
  const provided = request.headers.get('x-relay-bootstrap-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!provided || provided !== env.RELAY_BOOTSTRAP_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  return null
}

function textResult(payload: unknown, isError = false) {
  return {
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      },
    ],
    isError,
  }
}

/** HMAC-SHA256(key, message) → hex — Cloudflare Workers Web Crypto */
async function hmacSign(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function initializeRelaySession(request: Request, env: RelayWorkerEnv) {
  const sessionId = makeSessionId()

  // Read browserProof from request body if provided.
  // The browser sends HMAC-SHA256(clientSecret, pageId) — stored so the relay
  // can sign forwarded commands. The raw clientSecret never transits the network.
  let browserProof = ''
  try {
    const body = await request.clone().text()
    if (body) {
      const parsed = JSON.parse(body) as Record<string, unknown>
      if (typeof parsed.browserProof === 'string') browserProof = parsed.browserProof
    }
  } catch { /* ignore — browserProof is optional */ }

  const session: RelaySessionRecord = {
    sessionId,
    browserToken: makeToken(),
    browserProof,
    createdAt: new Date().toISOString(),
  }

  const stub = getSessionStub(env, sessionId)
  const setupResponse = await stub.fetch('https://relay.internal/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(session),
  })

  if (!setupResponse.ok) {
    return jsonResponse({ error: 'Failed to initialize relay session' }, 500, corsHeaders(request.headers.get('origin')))
  }

  return session
}

async function createRelaySession(request: Request, env: RelayWorkerEnv) {
  const authError = requireBootstrapAuth(request, env)
  if (authError) return authError

  const session = await initializeRelaySession(request, env)
  if (session instanceof Response) return session
  return jsonResponse(buildPublicRelaySessionResponse(request, session), 201)
}

async function createPublicRelaySession(request: Request, env: RelayWorkerEnv) {
  const origin = request.headers.get('origin')
  // Allow requests with no Origin (server-to-server from Pages Functions proxy)
  if (origin && !isPublicOriginAllowed(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders(origin))
  }

  const session = await initializeRelaySession(request, env)
  if (session instanceof Response) return session
  return jsonResponse(buildPublicRelaySessionResponse(request, session), 201, corsHeaders(origin))
}

async function connectPeer(request: Request, env: RelayWorkerEnv, sessionId: string, role: RelayPeerRole) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const stub = getSessionStub(env, sessionId)
  // Forward the raw WebSocket upgrade request to the Durable Object.
  // The DO handles WebSocketPair creation and accept() itself.
  return stub.fetch(`https://relay.internal/connect/${role}?token=${encodeURIComponent(token)}`, request)
}

/** Route handler for /relay/* and /mcp/* — called by the main worker */
export async function handleRelayRequest(request: Request, env: RelayWorkerEnv): Promise<Response> {
  const url = new URL(request.url)
  const requestOrigin = request.headers.get('origin')

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) })
  }

  if (request.method === 'POST' && url.pathname === '/relay/sessions') {
    return createRelaySession(request, env)
  }

  if (request.method === 'POST' && url.pathname === '/relay/sessions/public') {
    return createPublicRelaySession(request, env)
  }

  const mcpMatch = url.pathname.match(/^\/mcp\/([^/]+)$/)
  if (mcpMatch) {
    const [, sessionId] = mcpMatch
    const stub = getSessionStub(env, sessionId)

    // MCP Streamable HTTP: POST for JSON-RPC calls, GET for SSE stream
    if (request.method === 'POST') {
      const body = await request.text()
      const accept = request.headers.get('accept') || ''
      return stub.fetch('https://relay.internal/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': accept,
        },
        body,
      })
    }

    if (request.method === 'GET') {
      // SSE endpoint for server-initiated messages (required by MCP Streamable HTTP)
      return stub.fetch('https://relay.internal/mcp/sse', {
        method: 'GET',
        headers: { 'accept': 'text/event-stream' },
      })
    }

    if (request.method === 'DELETE') {
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const match = url.pathname.match(/^\/relay\/sessions\/([^/]+)\/(browser|agent)$/)
  if (match) {
    const [, sessionId, role] = match
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return jsonResponse({ error: 'Expected websocket upgrade' }, 426)
    }
    return connectPeer(request, env, sessionId, role as RelayPeerRole)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

export class RelaySessionDurableObject {
  private readonly state: DurableObjectStateLike
  private session: RelaySessionRecord | null = null
  // pendingHttpCommands only lives while the DO is in memory.
  // If the DO hibernates between a tool call and the browser response,
  // the call will time out (acceptable — the agent can retry).
  private readonly pendingHttpCommands = new Map<string, {
    resolve: (response: JsonRpcResponse) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  constructor(state: DurableObjectStateLike) {
    this.state = state
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async ensureSessionLoaded() {
    if (this.session) return this.session
    this.session = await this.state.storage.get<RelaySessionRecord>(SESSION_KEY) ?? null
    return this.session
  }

  private getBrowserSocket(): WebSocket | null {
    return this.state.getWebSockets('browser')[0] ?? null
  }

  private getAgentSocket(): WebSocket | null {
    return this.state.getWebSockets('agent')[0] ?? null
  }

  private sendTo(socket: WebSocket | null, message: RelayEnvelope): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(message))
    return true
  }

  private notifyPeerStatus(role: RelayPeerRole, connected: boolean) {
    const counterpart = role === 'browser' ? this.getAgentSocket() : this.getBrowserSocket()
    this.sendTo(counterpart, { type: 'peer_status', role, connected })
  }

  private async sendCommandToBrowser(
    command: string,
    args: Record<string, unknown> = {},
    timeoutMs = 20_000,
  ) {
    const browserSocket = this.getBrowserSocket()
    if (!browserSocket || browserSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Pretty Fish browser is not attached to this relay session')
    }

    const id = crypto.randomUUID()

    // Sign the command with HMAC-SHA256(browserProof, commandId) so the browser
    // can verify it originated from this trusted relay session.
    const session = await this.ensureSessionLoaded()
    const sig = session?.browserProof
      ? await hmacSign(session.browserProof, id)
      : ''

    const response = await new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingHttpCommands.delete(id)
        reject(new Error(`Timed out waiting for relay result: ${command}`))
      }, timeoutMs)

      this.pendingHttpCommands.set(id, { resolve, reject, timer })
      browserSocket.send(JSON.stringify({
        type: 'command',
        id,
        command,
        args,
        sig,
      } satisfies RelayEnvelope))
    })

    if (response.error) throw new Error(response.error.message)
    return response.result
  }

  // ── Hibernation WebSocket handlers ─────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const raw = typeof message === 'string' ? message : ''
    if (!raw) return

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid relay message JSON' } satisfies RelayEnvelope))
      return
    }

    if (!isRelayEnvelope(parsed)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unsupported relay payload' } satisfies RelayEnvelope))
      return
    }

    // command_result from browser → resolve pending HTTP MCP call
    if (parsed.type === 'command_result') {
      const pending = this.pendingHttpCommands.get(parsed.id)
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingHttpCommands.delete(parsed.id)
        if (parsed.ok) {
          pending.resolve({ jsonrpc: '2.0', id: parsed.id, result: parsed.result })
        } else {
          pending.reject(new Error(parsed.error || 'Remote relay command failed'))
        }
      }
      return
    }

    // Forward everything else to the counterpart
    const isBrowser = this.state.getWebSockets('browser').includes(ws)
    const counterpart = isBrowser ? this.getAgentSocket() : this.getBrowserSocket()
    this.sendTo(counterpart, parsed)
  }

  async webSocketClose(ws: WebSocket) {
    const isBrowser = this.state.getWebSockets('browser').includes(ws)
    const role: RelayPeerRole = isBrowser ? 'browser' : 'agent'
    this.notifyPeerStatus(role, false)
  }

  async webSocketError(ws: WebSocket) {
    const isBrowser = this.state.getWebSockets('browser').includes(ws)
    const role: RelayPeerRole = isBrowser ? 'browser' : 'agent'
    this.notifyPeerStatus(role, false)
  }

  // ── MCP request handler ────────────────────────────────────────────────────

  private async handleMcpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const session = await this.ensureSessionLoaded()
    const id = request.id ?? null

    if (request.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: MCP_SERVER_INFO,
          instructions: 'Use this server to drive Pretty Fish through the hosted relay.',
        },
      }
    }

    if (request.method === 'notifications/initialized' || request.method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} }
    }

    if (request.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: MCP_TOOL_DEFINITIONS } }
    }

    if (request.method === 'tools/call') {
      const toolName = typeof request.params?.name === 'string' ? request.params.name : ''
      const args = (request.params?.arguments && typeof request.params.arguments === 'object')
        ? request.params.arguments as Record<string, unknown>
        : {}

      try {
        switch (toolName) {
          case 'session_info':
            return {
              jsonrpc: '2.0',
              id,
              result: textResult({
                sessionId: session?.sessionId ?? null,
                browserAttached: Boolean(this.getBrowserSocket()?.readyState === WebSocket.OPEN),
              }),
            }
          case 'list_diagrams':
          case 'get_diagram':
          case 'create_diagram': {
            const payload = await this.sendCommandToBrowser(toolName, args)
            return { jsonrpc: '2.0', id, result: textResult(payload) }
          }
          case 'set_diagram_code':
          case 'export_svg':
          case 'export_png': {
            const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs + 2_000 : 22_000
            const payload = await this.sendCommandToBrowser(toolName, args, timeoutMs)
            if (toolName === 'export_png' && payload && typeof payload === 'object' && 'data' in payload) {
              const pngPayload = payload as { data?: string; fileName?: string; diagram?: unknown; mimeType?: string }
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        fileName: pngPayload.fileName,
                        diagram: pngPayload.diagram,
                        mimeType: pngPayload.mimeType,
                      }, null, 2),
                    },
                    {
                      type: 'image',
                      data: pngPayload.data ?? '',
                      mimeType: pngPayload.mimeType || 'image/png',
                    },
                  ],
                  isError: false,
                },
              }
            }
            return { jsonrpc: '2.0', id, result: textResult(payload) }
          }
          default:
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Unknown tool: ${toolName}` },
            }
        }
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          result: textResult(error instanceof Error ? error.message : 'Tool call failed', true),
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${request.method}` },
    }
  }

  // ── fetch ──────────────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/setup') {
      const session = await request.json() as RelaySessionRecord
      this.session = session
      await this.state.storage.put(SESSION_KEY, session)
      return jsonResponse({ ok: true })
    }

    const session = await this.ensureSessionLoaded()
    if (!session) return jsonResponse({ error: 'Relay session not initialized' }, 404)

    const connectMatch = url.pathname.match(/^\/connect\/(browser|agent)$/)
    if (connectMatch) {
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return jsonResponse({ error: 'Expected websocket upgrade' }, 426)
      }

      const role = connectMatch[1] as RelayPeerRole
      if (role === 'browser') {
        const token = url.searchParams.get('token') || ''
        if (!token || token !== session.browserToken) {
          return jsonResponse({ error: 'Invalid relay token' }, 403)
        }
      }

      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

      // Use hibernation API so the DO can sleep between messages
      this.state.acceptWebSocket(server, [role])

      // Greet the new peer
      server.send(JSON.stringify({
        type: 'hello',
        role,
        sessionId: session.sessionId,
      } satisfies RelayEnvelope))

      // Notify counterpart that this peer just connected
      this.notifyPeerStatus(role, true)

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket })
    }

    if (request.method === 'POST' && url.pathname === '/mcp') {
      let body: JsonRpcRequest
      try {
        body = await request.json() as JsonRpcRequest
      } catch {
        return jsonResponse({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }, 400)
      }

      const result = await this.handleMcpRequest(body)
      const accept = request.headers.get('accept') || ''

      // MCP Streamable HTTP: if client accepts SSE, wrap response as SSE event
      if (accept.includes('text/event-stream')) {
        const sseData = `data: ${JSON.stringify(result)}\n\n`
        return new Response(sseData, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'connection': 'keep-alive',
          },
        })
      }

      return jsonResponse(result)
    }

    // SSE GET endpoint — keep-alive stream for server-initiated messages
    if (request.method === 'GET' && url.pathname === '/mcp/sse') {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          // Send an initial comment to establish the connection
          controller.enqueue(encoder.encode(': connected\n\n'))
          // Keep the stream open — in a real implementation we'd push
          // server-initiated notifications here. For now this is a no-op
          // keep-alive that satisfies the SSE handshake requirement.
        },
      })
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'connection': 'keep-alive',
        },
      })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }
}
