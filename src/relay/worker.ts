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
}

interface RelayServerWebSocket extends WebSocket {
  accept: () => void
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
    0: RelayServerWebSocket
    1: RelayServerWebSocket
  }
}

export interface RelayWorkerEnv {
  RELAY_SESSIONS: DurableObjectNamespaceLike
  RELAY_BOOTSTRAP_TOKEN: string
}

const SESSION_KEY = 'relay-session-record'
const MCP_PROTOCOL_VERSION = '2025-03-26'
const MCP_SERVER_INFO = { name: 'prettyfish-remote-relay', version: '0.1.0' }
const DEFAULT_APP_URL = 'https://pretty.fish/'
const PUBLIC_ORIGIN_PATTERNS = [
  /^https:\/\/pretty\.fish$/,
  /^https:\/\/www\.pretty\.fish$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]
const MCP_TOOL_DEFINITIONS = [
  { name: 'session_info', description: 'Return the current relay session details and browser attach URL.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_page', description: 'Create a new page in the connected Pretty Fish browser tab.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' } } } },
  { name: 'create_diagram', description: 'Create a new diagram in the connected Pretty Fish browser tab.', inputSchema: { type: 'object', properties: { pageId: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, width: { type: 'number' } } } },
  { name: 'set_diagram_code', description: 'Replace Mermaid source and wait for render completion.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, code: { type: 'string' }, timeoutMs: { type: 'number' }, select: { type: 'boolean' } }, required: ['diagramId', 'code'] } },
  { name: 'render_status', description: 'Read render status from the connected browser session.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' } } } },
  { name: 'export_svg', description: 'Export the current rendered diagram as SVG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, timeoutMs: { type: 'number' } } } },
  { name: 'export_png', description: 'Export the current rendered diagram as PNG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, background: { type: 'string' }, scale: { type: 'number' }, timeoutMs: { type: 'number' } } } },
  { name: 'get_snapshot', description: 'Return the full Pretty Fish document snapshot.', inputSchema: { type: 'object', properties: {} } },
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

function getSessionStub(env: RelayWorkerEnv, sessionId: string): DurableObjectStubLike {
  const id = env.RELAY_SESSIONS.idFromName(sessionId)
  return env.RELAY_SESSIONS.get(id)
}

function getWorkerBaseUrl(request: Request): string {
  return new URL(request.url).origin
}

function buildBrowserAttachUrl(request: Request, session: RelaySessionRecord): string {
  const url = new URL(DEFAULT_APP_URL)
  url.searchParams.set('relayUrl', getWorkerBaseUrl(request))
  url.searchParams.set('relaySessionId', session.sessionId)
  url.searchParams.set('relayBrowserToken', session.browserToken)
  return url.toString()
}

function buildPublicRelaySessionResponse(request: Request, session: RelaySessionRecord): PublicRelaySessionResponse {
  const relayUrl = getWorkerBaseUrl(request)
  const mcpUrl = new URL(`${relayUrl}/api/mcp/sessions/${session.sessionId}`)
  mcpUrl.searchParams.set('token', session.agentToken)

  return {
    ...session,
    relayUrl,
    mcpUrl: mcpUrl.toString(),
    browserAttachUrl: buildBrowserAttachUrl(request, session),
  }
}

function requireBootstrapAuth(request: Request, env: RelayWorkerEnv): Response | null {
  const provided = request.headers.get('x-relay-bootstrap-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!provided || provided !== env.RELAY_BOOTSTRAP_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  return null
}

function parseAuthToken(request: Request): string {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || new URL(request.url).searchParams.get('token')
    || ''
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

async function initializeRelaySession(request: Request, env: RelayWorkerEnv) {
  const sessionId = crypto.randomUUID()
  const session: RelaySessionRecord = {
    sessionId,
    browserToken: makeToken(),
    agentToken: makeToken(),
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
  if (!isPublicOriginAllowed(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders(origin))
  }

  const session = await initializeRelaySession(request, env)
  if (session instanceof Response) return session
  return jsonResponse(buildPublicRelaySessionResponse(request, session), 201, corsHeaders(origin))
}

async function connectPeer(request: Request, env: RelayWorkerEnv, sessionId: string, role: RelayPeerRole) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const stub = getSessionStub(env, sessionId)
  return stub.fetch(`https://relay.internal/connect/${role}?token=${encodeURIComponent(token)}`, {
    headers: {
      Upgrade: request.headers.get('Upgrade') || '',
    },
    webSocket: (request as Request & { webSocket?: WebSocket }).webSocket,
  } as RequestInit)
}

export default {
  async fetch(request: Request, env: RelayWorkerEnv): Promise<Response> {
    const url = new URL(request.url)
    const requestOrigin = request.headers.get('origin')

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/relay/public/')) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(requestOrigin),
      })
    }

    if (request.method === 'POST' && url.pathname === '/api/relay/sessions') {
      return createRelaySession(request, env)
    }

    if (request.method === 'POST' && url.pathname === '/api/relay/public/sessions') {
      return createPublicRelaySession(request, env)
    }

    const mcpMatch = url.pathname.match(/^\/api\/mcp\/sessions\/([^/]+)$/)
    if (mcpMatch) {
      const [, sessionId] = mcpMatch
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405)
      }
      const token = parseAuthToken(request)
      const stub = getSessionStub(env, sessionId)
      return stub.fetch(`https://relay.internal/mcp?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: await request.text(),
      })
    }

    const match = url.pathname.match(/^\/api\/relay\/sessions\/([^/]+)\/(browser|agent)$/)
    if (match) {
      const [, sessionId, role] = match
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return jsonResponse({ error: 'Expected websocket upgrade' }, 426)
      }
      return connectPeer(request, env, sessionId, role as RelayPeerRole)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
}

export class RelaySessionDurableObject {
  private readonly state: DurableObjectStateLike
  private session: RelaySessionRecord | null = null
  private browserSocket: RelayServerWebSocket | null = null
  private agentSocket: RelayServerWebSocket | null = null
  private pendingForBrowser: RelayEnvelope[] = []
  private pendingForAgent: RelayEnvelope[] = []
  private readonly pendingHttpCommands = new Map<string, {
    resolve: (response: JsonRpcResponse) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  constructor(state: DurableObjectStateLike) {
    this.state = state
  }

  private async ensureSessionLoaded() {
    if (this.session) return this.session
    this.session = await this.state.storage.get<RelaySessionRecord>(SESSION_KEY) ?? null
    return this.session
  }

  private send(socket: RelayServerWebSocket | null, message: RelayEnvelope) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(message))
    return true
  }

  private flushQueue(role: RelayPeerRole) {
    const queue = role === 'browser' ? this.pendingForBrowser : this.pendingForAgent
    const socket = role === 'browser' ? this.browserSocket : this.agentSocket
    while (queue.length > 0 && socket && socket.readyState === WebSocket.OPEN) {
      const next = queue.shift()
      if (!next) return
      socket.send(JSON.stringify(next))
    }
  }

  private notifyPeerStatus(role: RelayPeerRole, connected: boolean) {
    const message: RelayEnvelope = { type: 'peer_status', role, connected }
    if (role === 'browser') {
      this.send(this.agentSocket, message)
      if (!this.send(this.agentSocket, message)) this.pendingForAgent.push(message)
      return
    }
    this.send(this.browserSocket, message)
    if (!this.send(this.browserSocket, message)) this.pendingForBrowser.push(message)
  }

  private async sendCommandToBrowser(command: string, args: Record<string, unknown> = {}, timeoutMs = 20_000) {
    if (!this.browserSocket || this.browserSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Pretty Fish browser is not attached to this relay session')
    }

    const id = crypto.randomUUID()
    const response = await new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingHttpCommands.delete(id)
        reject(new Error(`Timed out waiting for relay result: ${command}`))
      }, timeoutMs)

      this.pendingHttpCommands.set(id, { resolve, reject, timer })
      this.browserSocket?.send(JSON.stringify({
        type: 'command',
        id,
        command,
        args,
      } satisfies RelayEnvelope))
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.result
  }

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
      return {
        jsonrpc: '2.0',
        id,
        result: {},
      }
    }

    if (request.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOL_DEFINITIONS },
      }
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
                browserAttached: Boolean(this.browserSocket && this.browserSocket.readyState === WebSocket.OPEN),
              }),
            }
          case 'create_page':
          case 'create_diagram':
          case 'render_status':
          case 'get_snapshot': {
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
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`,
              },
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
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`,
      },
    }
  }

  private wireSocket(role: RelayPeerRole, socket: RelayServerWebSocket) {
    const counterpartRole: RelayPeerRole = role === 'browser' ? 'agent' : 'browser'
    const counterpartSocket = () => role === 'browser' ? this.agentSocket : this.browserSocket
    const pendingQueue = role === 'browser' ? this.pendingForAgent : this.pendingForBrowser

    socket.accept()
    this.send(socket, {
      type: 'hello',
      role,
      sessionId: this.session?.sessionId ?? '',
    })

    socket.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : ''
      if (!raw) return

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        this.send(socket, { type: 'error', message: 'Invalid relay message JSON' })
        return
      }

      if (!isRelayEnvelope(parsed)) {
        this.send(socket, { type: 'error', message: 'Unsupported relay payload' })
        return
      }

      if (parsed.type === 'command_result') {
        const pending = this.pendingHttpCommands.get(parsed.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingHttpCommands.delete(parsed.id)
          if (parsed.ok) pending.resolve({ jsonrpc: '2.0', id: parsed.id, result: parsed.result })
          else pending.reject(new Error(parsed.error || 'Remote relay command failed'))
          return
        }
      }

      if (!this.send(counterpartSocket(), parsed)) {
        pendingQueue.push(parsed)
      }
    })

    socket.addEventListener('close', () => {
      if (role === 'browser' && this.browserSocket === socket) this.browserSocket = null
      if (role === 'agent' && this.agentSocket === socket) this.agentSocket = null
      this.notifyPeerStatus(role, false)
    })

    socket.addEventListener('error', () => {
      if (role === 'browser' && this.browserSocket === socket) this.browserSocket = null
      if (role === 'agent' && this.agentSocket === socket) this.agentSocket = null
      this.notifyPeerStatus(role, false)
    })

    this.notifyPeerStatus(role, true)
    this.flushQueue(role)
    this.flushQueue(counterpartRole)
  }

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
      const token = url.searchParams.get('token') || ''
      const expectedToken = role === 'browser' ? session.browserToken : session.agentToken
      if (!token || token !== expectedToken) {
        return jsonResponse({ error: 'Invalid relay token' }, 403)
      }

      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]

      if (role === 'browser') this.browserSocket = server
      else this.agentSocket = server

      this.wireSocket(role, server)

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket })
    }

    if (request.method === 'POST' && url.pathname === '/mcp') {
      const token = parseAuthToken(request)
      if (!token || token !== session.agentToken) {
        return jsonResponse({ error: 'Invalid relay token' }, 403)
      }

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

      const response = await this.handleMcpRequest(body)
      return jsonResponse(response)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }
}
