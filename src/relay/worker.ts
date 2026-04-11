import {
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

interface ExecutionContextLike {
  waitUntil: (promise: Promise<unknown>) => void
}

interface RelayServerWebSocket extends WebSocket {
  accept: () => void
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
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

function requireBootstrapAuth(request: Request, env: RelayWorkerEnv): Response | null {
  const provided = request.headers.get('x-relay-bootstrap-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!provided || provided !== env.RELAY_BOOTSTRAP_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  return null
}

async function createRelaySession(request: Request, env: RelayWorkerEnv) {
  const authError = requireBootstrapAuth(request, env)
  if (authError) return authError

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
    return jsonResponse({ error: 'Failed to initialize relay session' }, 500)
  }

  return jsonResponse({
    sessionId,
    browserToken: session.browserToken,
    agentToken: session.agentToken,
    browserConnectUrl: `/api/relay/sessions/${sessionId}/browser`,
    agentConnectUrl: `/api/relay/sessions/${sessionId}/agent`,
  }, 201)
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
  async fetch(request: Request, env: RelayWorkerEnv, _ctx: ExecutionContextLike): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/api/relay/sessions') {
      return createRelaySession(request, env)
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

  constructor(state: DurableObjectStateLike, _env: RelayWorkerEnv) {
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

    return jsonResponse({ error: 'Not found' }, 404)
  }
}
