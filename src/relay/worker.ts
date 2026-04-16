import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import type {
  PublicRelaySessionResponse,
  RelayEnvelope,
  RelayPeerRole,
  RelaySessionRecord,
} from './protocol.js'

// Cloudflare-specific declarations

declare const WebSocketPair: {
  new (): {
    0: WebSocket
    1: WebSocket
  }
}

declare class WebSocketRequestResponsePair {
  constructor(request: string, response: string)
  getRequest(): string
  getResponse(): string
}

interface DurableObjectStubLike {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown
  get(id: unknown): DurableObjectStubLike
}

interface DurableObjectStateLike {
  storage: {
    get: <T>(key: string) => Promise<T | undefined>
    put: (key: string, value: unknown) => Promise<void>
  }
  acceptWebSocket: (ws: WebSocket, tags?: string[]) => void
  getWebSockets: (tag?: string) => WebSocket[]
  getTags: (ws: WebSocket) => string[]
  setWebSocketAutoResponse: (pair?: WebSocketRequestResponsePair) => void
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

export interface RelayWorkerEnv {
  RELAY_SESSIONS: DurableObjectNamespaceLike
  RELAY_BOOTSTRAP_TOKEN: string
}

const SESSION_KEY = 'relay-session-record'
const PUBLIC_ORIGIN_PATTERNS = [
  /^https:\/\/pretty\.fish$/,
  /^https:\/\/www\.pretty\.fish$/,
  /^https:\/\/prettyfish\.binalgo\.workers\.dev$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

const WORDS = [
  'amber','azure','birch','bloom','brass','brook','cedar','chalk','clay','cloud',
  'cobalt','coral','crane','crisp','denim','dewdrop','dove','dusk','elder','fawn',
  'fern','field','finch','flame','flint','foam','frost','gale','glint','grove',
  'hazel','heron','holly','honey','husk','indigo','iris','ivory','jade','juniper',
  'kelp','lark','lemon','lichen','lime','linen','loch','lotus','lunar','maple',
  'marsh','mist','moss','mote','muslin','myrtle','navy','nimbus','oak','oat',
  'obsidian','ochre','olive','onyx','opal','orchid','otter','pebble','pine','plum',
  'poppy','prairie','quartz','rain','reed','robin','rose','rune','rush','sable',
  'sage','sand','seafoam','sienna','slate','snow','solstice','sorrel','sparrow',
  'spruce','stone','straw','stream','sycamore','tallow','taupe','teal','thistle',
  'thyme','tide','timber','topaz','tulip','tundra','umber','vale','vapor','vine',
  'violet','vole','walnut','wave','wheat','willow','wren','yarrow','zephyr',
]

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
  if (!origin || !isPublicOriginAllowed(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,mcp-protocol-version,accept',
    'access-control-max-age': '86400',
  }
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

function makeToken() {
  return crypto.randomUUID().replaceAll('-', '')
}

function makeSessionId(): string {
  const arr = new Uint32Array(3)
  crypto.getRandomValues(arr)
  const words = Array.from(arr).map((n) => WORDS[n % WORDS.length]).join('-')
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

/** HMAC-SHA256(key, message) → hex */
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

  // Browser sends browserProof (random shared secret / HMAC basis) in body if desired.
  // If omitted, generate server-side and return it to the browser.
  let browserProof = ''
  try {
    const body = await request.clone().text()
    if (body) {
      const parsed = JSON.parse(body) as Record<string, unknown>
      if (typeof parsed.browserProof === 'string') browserProof = parsed.browserProof
    }
  } catch { /* ignore */ }
  if (!browserProof) browserProof = makeToken()

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

async function createPublicRelaySession(request: Request, env: RelayWorkerEnv) {
  const origin = request.headers.get('origin')
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
  const doUrl = `https://relay.internal/connect/${role}?token=${encodeURIComponent(token)}`
  // Preserve the original upgrade request semantics as much as possible.
  // Rebuilding from raw headers can lead to a half-open handshake where frames arrive
  // but the browser never reaches a stable OPEN state.
  const doRequest = new Request(doUrl, request)
  const response = await stub.fetch(doRequest)
  if (response.status !== 101) {
    console.warn('[relay] attach_rejected', JSON.stringify({ sessionId, role, status: response.status }))
  }
  return response
}
 

export async function handleRelayRequest(request: Request, env: RelayWorkerEnv): Promise<Response> {
  const url = new URL(request.url)
  const requestOrigin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) })
  }

  if (request.method === 'POST' && (url.pathname === '/relay/sessions' || url.pathname === '/relay/sessions/public')) {
    return createPublicRelaySession(request, env)
  }

  const mcpMatch = url.pathname.match(/^\/mcp\/([^/]+)$/)
  if (mcpMatch) {
    const [, sessionId] = mcpMatch
    const stub = getSessionStub(env, sessionId)

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
      return stub.fetch('https://relay.internal/mcp/sse', {
        method: 'GET',
        headers: { accept: 'text/event-stream' },
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
  private readonly pendingHttpCommands = new Map<string, {
    resolve: (response: JsonRpcResponse) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  constructor(state: DurableObjectStateLike) {
    this.state = state
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    )
  }

  private async ensureSessionLoaded() {
    if (this.session) return this.session
    this.session = await this.state.storage.get<RelaySessionRecord>(SESSION_KEY) ?? null
    return this.session
  }

  private getRoleSockets(role: RelayPeerRole): WebSocket[] {
    return this.state.getWebSockets(role)
  }

  private getOpenRoleSocket(role: RelayPeerRole): WebSocket | null {
    const sockets = this.getRoleSockets(role)
    for (let i = sockets.length - 1; i >= 0; i -= 1) {
      if (sockets[i]?.readyState === WebSocket.OPEN) return sockets[i]
    }
    return null
  }

  private hasOpenRoleSocket(role: RelayPeerRole): boolean {
    return this.getOpenRoleSocket(role) !== null
  }

  private closeSupersededSockets(role: RelayPeerRole, current: WebSocket): number {
    let closed = 0
    for (const socket of this.getRoleSockets(role)) {
      if (socket === current) continue
      try {
        socket.close(1012, 'Superseded by a newer relay connection')
        closed += 1
      } catch {
        // Ignore close failures for stale sockets.
      }
    }
    return closed
  }

  private getBrowserSocket(): WebSocket | null {
    return this.getOpenRoleSocket('browser')
  }

  private getAgentSocket(): WebSocket | null {
    return this.getOpenRoleSocket('agent')
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
      throw new Error('Pretty Fish browser is not attached to this relay session. Ask the user to refresh the page or click Reconnect in the Connect AI Agent panel, then try again.')
    }

    const id = crypto.randomUUID()
    const session = await this.ensureSessionLoaded()
    const sig = session?.browserProof ? await hmacSign(session.browserProof, id) : ''

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

  private createMcpServer(): McpServer {
    const server = new McpServer({ name: 'prettyfish', version: '1.0.0' })

    const cmd = async (toolName: string, args: Record<string, unknown> = {}, timeoutMs?: number) => {
      const result = await this.sendCommandToBrowser(toolName, args, timeoutMs)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    }

    server.tool('list_diagrams', 'List all diagrams across all pages in the current workspace.', {}, async () => cmd('list_diagrams'))
    server.tool('get_diagram', 'Get the current Mermaid source code and metadata for a specific diagram.',
      { diagramId: z.string().describe('The diagram ID to retrieve.') },
      async (args) => cmd('get_diagram', args),
    )
    server.tool('list_diagram_types', 'List all supported Mermaid diagram types (flowchart, sequence, class, ER, etc.).', {}, async () => cmd('list_diagram_types'))
    server.tool('get_diagram_reference', 'Get the full syntax reference for a Mermaid diagram type, including all elements and examples. Call this before writing diagram code to ensure correct syntax.',
      { type: z.string().describe('Diagram type ID (e.g. "flowchart", "sequence", "classDiagram"). Use list_diagram_types to see all.') },
      async (args) => cmd('get_diagram_reference', args),
    )
    server.tool('export_svg', 'Export a diagram as SVG.',
      { diagramId: z.string(), timeoutMs: z.number().optional() },
      async ({ diagramId, timeoutMs }) => {
        const resolvedTimeout = typeof timeoutMs === 'number' ? timeoutMs + 2_000 : 22_000
        return cmd('export_svg', { diagramId, timeoutMs }, resolvedTimeout)
      },
    )
    server.tool('create_diagram', 'Create a new Mermaid diagram on the current page and wait for it to render. Returns render status and any syntax errors — if render.status is "error", fix the Mermaid syntax and call set_diagram_code with the corrected code. Always provide a short, descriptive name based on the diagram content.',
      {
        name: z.string().optional().describe('A short descriptive name for the diagram (e.g. "User Auth Flow", "DB Schema").'),
        description: z.string().optional().describe('Optional short caption (8–10 words max) describing what the diagram shows. Displayed below the diagram.'),
        code: z.string().optional().describe('Mermaid diagram source code.'),
        width: z.number().optional(),
        theme: z.string().optional().describe('Optional theme ID (e.g. "blueprint", "neon"). Defaults to page theme if not set.'),
      },
      async (args) => cmd('create_diagram', args),
    )
    server.tool('set_diagram_code', "Replace a diagram's Mermaid source code and wait for render. Returns render status and any syntax errors in render.error — if render.status is \"error\", the code has a syntax problem that must be fixed.",
      { diagramId: z.string(), code: z.string(), timeoutMs: z.number().optional(), select: z.boolean().optional() },
      async ({ diagramId, code, timeoutMs, select }) => {
        const resolvedTimeout = typeof timeoutMs === 'number' ? timeoutMs + 2_000 : 22_000
        return cmd('set_diagram_code', { diagramId, code, timeoutMs, select }, resolvedTimeout)
      },
    )
    server.tool('set_diagram_theme', 'Change the visual theme of a specific diagram.',
      { diagramId: z.string(), theme: z.string().describe('Theme ID (e.g. "blueprint", "neon", "wireframe", "rosepine", "brutalist").') },
      async (args) => cmd('set_theme', args),
    )
    server.tool('export_png', 'Export a diagram as a PNG image and return it as base64.',
      { diagramId: z.string() },
      async ({ diagramId }) => {
        const result = await this.sendCommandToBrowser('export_png', { diagramId }, 22_000) as {
          fileName?: string; diagram?: string; mimeType?: string
        }
        if (!result?.diagram) {
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], isError: true }
        }
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ fileName: result.fileName, mimeType: result.mimeType }) },
            { type: 'image' as const, data: result.diagram, mimeType: (result.mimeType || 'image/png') as 'image/png' },
          ],
        }
      },
    )
    server.tool('delete_diagram', 'Delete a diagram by ID.', { diagramId: z.string() }, async (args) => cmd('delete_diagram', args))
    server.tool('select_diagram', 'Bring a specific diagram into focus/view.', { diagramId: z.string() }, async (args) => cmd('select_diagram', args))
    server.tool('list_themes', 'List all available visual themes.', {}, async () => cmd('list_themes'))
    server.tool('session_info', 'Get current relay session info and browser attachment status.', {}, async () => {
      const session = await this.ensureSessionLoaded()
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          sessionId: session?.sessionId ?? null,
          browserAttached: this.getBrowserSocket()?.readyState === WebSocket.OPEN,
        }) }],
      }
    })

    return server
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/setup') {
      const session = await request.json() as RelaySessionRecord
      this.session = session
      await this.state.storage.put(SESSION_KEY, session)
      return jsonResponse({ ok: true })
    }

    const connectMatch = url.pathname.match(/^\/connect\/(browser|agent)$/)
    if (connectMatch) {
      const session = await this.ensureSessionLoaded()
      if (!session) {
        console.warn('[relay-do] attach_session_missing', JSON.stringify({
          role: connectMatch[1],
          path: url.pathname,
        }))
        return jsonResponse({ error: 'Relay session not initialized' }, 404)
      }

      // DOs receive this request via stub.fetch() from the main Worker.
      // Cloudflare strips the Upgrade header on this internal hop, so we do NOT
      // re-check it here. The main Worker has already verified it was a WS upgrade.
      const role = connectMatch[1] as RelayPeerRole

      // NOTE: Because this route is exclusively used for WS attach after the main
      // worker validated the upgrade, returning 101 here is safe and correct.
      if (role === 'browser') {
        const token = url.searchParams.get('token') || ''
        if (!token || token !== session.browserToken) {
          console.warn('[relay-do] invalid_browser_token', JSON.stringify({
            sessionId: session.sessionId,
            path: url.pathname,
            hasToken: Boolean(token),
          }))
          return jsonResponse({ error: 'Invalid relay token' }, 403)
        }
      }

      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
      this.state.acceptWebSocket(server, [role])
      const supersededSockets = this.closeSupersededSockets(role, server)

      // Return the 101 upgrade response first, then send the initial hello on the
      // next turn. Sending immediately during attach can produce a half-open state
      // where the browser receives a frame but never reaches stable OPEN.
      if (supersededSockets > 0) {
        console.warn('[relay-do] superseded_sockets_closed', JSON.stringify({
          role,
          sessionId: session.sessionId,
          supersededSockets,
        }))
      }
      const response = new Response(null, {
        status: 101,
        // @ts-expect-error Cloudflare-specific
        webSocket: client,
      })

      queueMicrotask(() => {
        try {
          server.send(JSON.stringify({
            type: 'hello',
            role,
            sessionId: session.sessionId,
          } satisfies RelayEnvelope))
          this.notifyPeerStatus(role, true)
        } catch {
          console.warn('[relay-do] hello_send_failed', JSON.stringify({
            role,
            sessionId: session.sessionId,
          }))
        }
      })

      return response 
    }

    if (url.pathname === '/mcp' || url.pathname === '/mcp/sse') {
      const session = await this.ensureSessionLoaded()
      if (!session) return jsonResponse({ error: 'Relay session not initialized' }, 404)

      const mcpServer = this.createMcpServer()
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        // For one-shot POST requests like initialize and tools/call, return a concrete
        // JSON body instead of an empty SSE stream. This is required by clients like
        // Codex/rmcp that expect an initialize result body on the transport response.
        enableJsonResponse: true,
      }) 
      await mcpServer.connect(transport)
      const mcpRequest = url.pathname === '/mcp/sse'
        ? new Request(request.url.replace('/mcp/sse', '/mcp'), { method: 'GET', headers: request.headers })
        : request
      const response = await transport.handleRequest(mcpRequest)
      await transport.close()
      return response
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let envelope: RelayEnvelope
    try {
      envelope = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) as RelayEnvelope
    } catch {
      return
    }

    const tags = this.state.getTags(ws)
    const role = tags[0] as RelayPeerRole | undefined

    if (envelope.type === 'command_result') {
      const pending = this.pendingHttpCommands.get(envelope.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pendingHttpCommands.delete(envelope.id)
      if (envelope.error) {
        pending.resolve({ jsonrpc: '2.0', id: envelope.id, error: { code: -32000, message: envelope.error.message } })
      } else {
        pending.resolve({ jsonrpc: '2.0', id: envelope.id, result: envelope.result })
      }
      return
    }

    if (role === 'browser') {
      this.sendTo(this.getAgentSocket(), envelope)
    } else if (role === 'agent') {
      this.sendTo(this.getBrowserSocket(), envelope)
    }
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.state.getTags(ws)
    const role = tags[0] as RelayPeerRole | undefined
    if (role && !this.hasOpenRoleSocket(role)) this.notifyPeerStatus(role, false)
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws)
  }
}
