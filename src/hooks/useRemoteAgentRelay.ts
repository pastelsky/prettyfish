import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAgentCommandExecutor, type BrowserCommandEnvelope } from '@/hooks/useAgentCommandExecutor'
import { hmacVerify } from '@/lib/hmac'
import type { PublicRelaySessionResponse, RelayEnvelope } from '@/relay/protocol'
import type { AppStoreState } from '@/state/appStore'
import type { AppState } from '@/types'

// Same-origin: relay routes (/relay/*, /mcp/*) are served by the same Worker as the SPA.
const DEFAULT_RELAY_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_PRETTYFISH_RELAY_URL
  // In local/dev, the Vite app does not serve /relay or /mcp routes. Default to the
  // deployed worker so Connect AI Agent works in local review unless explicitly overridden.
  || (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? 'https://prettyfish.binalgo.workers.dev'
    : (typeof window !== 'undefined' ? window.location.origin : 'https://pretty.fish'))
).replace(/\/$/, '')

// Migrate: clear any stale relay URL previously stored in localStorage
try { localStorage.removeItem('prettyfish:relay-url') } catch { /* ignore */ }

// Per-page session keys — all scoped by pageId
function sessionIdKey(pageId: string) { return `prettyfish:relay-session-id:${pageId}` }
function browserTokenKey(pageId: string) { return `prettyfish:relay-browser-token:${pageId}` }
// clientSecret never leaves the browser — only its HMAC proof is sent to the relay
function clientSecretKey(pageId: string) { return `prettyfish:relay-client-secret:${pageId}` }

function readStored(key: string): string {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

function persist(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch { /* ignore */ }
}

function getOrCreateClientSecret(pageId: string): string {
  const key = clientSecretKey(pageId)
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(key, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}


function toWebSocketUrl(sessionId: string, browserToken: string): string {
  const base = DEFAULT_RELAY_URL.startsWith('https://')
    ? DEFAULT_RELAY_URL.replace(/^https:\/\//, 'wss://')
    : DEFAULT_RELAY_URL.replace(/^http:\/\//, 'ws://')
  return `${base}/relay/sessions/${sessionId}/browser?token=${encodeURIComponent(browserToken)}`
} 

function buildConfigSnippet(mcpUrl: string): string {
  return JSON.stringify({ mcpServers: { prettyfish: { url: mcpUrl } } }, null, 2)
}

interface RemoteAgentRelayOptions {
  activePageId: string
  state: AppStoreState
  getState: () => AppState
  setDiagramTheme: (diagramId: string, theme: import('@/types').MermaidTheme) => void
  createDiagramWithOptions: (options?: {
    pageId?: string
    name?: string
    code?: string
    width?: number
  }) => string | undefined
  selectDiagram: (diagramId: string) => void
  updateDiagramCode: (diagramId: string, code: string) => void
  updateDiagramDescription: (diagramId: string, description: string) => void
}

export interface RemoteAgentRelayControls {
  /** True when an AI agent peer has connected to this session via MCP. */
  agentConnected: boolean
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  sessionId: string
  mcpUrl: string
  displayId: string | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  createHostedSession: () => Promise<void>
  resetSession: () => void
  executeCommand: (command: BrowserCommandEnvelope) => Promise<unknown>
  getHostedConfigSnippet: () => string
}

export function useRemoteAgentRelay(options: RemoteAgentRelayOptions): RemoteAgentRelayControls {
  const { activePageId } = options

  const [status, setStatus] = useState<RemoteAgentRelayControls['status']>('disconnected')
  const [agentConnected, setAgentConnected] = useState(false)
  const [sessionId, setSessionId] = useState(() => readStored(sessionIdKey(activePageId)))
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const intentionalDisconnectRef = useRef(false)
  const [browserToken, setBrowserToken] = useState(() => readStored(browserTokenKey(activePageId)))
  const [mcpUrl, setMcpUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const attemptedAutoConnectRef = useRef(false)
  const activePageIdRef = useRef(activePageId)
  const { executeCommand } = useAgentCommandExecutor(options)

  // ── Page switch: disconnect, load session for new page ─────────────────────
  useEffect(() => {
    if (activePageIdRef.current === activePageId && attemptedAutoConnectRef.current) return

    activePageIdRef.current = activePageId
    attemptedAutoConnectRef.current = false

    socketRef.current?.close()
    socketRef.current = null
    setStatus('disconnected')
    setError(null)

    const nextSessionId = readStored(sessionIdKey(activePageId))
    const nextBrowserToken = readStored(browserTokenKey(activePageId))
    setSessionId(nextSessionId)
    setBrowserToken(nextBrowserToken)
    setMcpUrl('')
  }, [activePageId])

  // ── Rebuild mcpUrl whenever session changes ────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setMcpUrl(''); return }
    setMcpUrl(`${DEFAULT_RELAY_URL}/mcp/${sessionId}`)
  }, [sessionId])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => { socketRef.current?.close() }, [])

  // ── Heartbeat — ping every 30s to prevent idle WebSocket closure ──────────
  // Cloudflare drops idle WebSockets after 100s; most browsers/proxies after ~60s.
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    heartbeatIntervalRef.current = setInterval(() => {
      const socket = socketRef.current
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 55_000) // 55s — safely under Cloudflare's 100s idle timeout, minimizes DO request costs
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  // ── Auto-reconnect — exponential backoff, max 10 attempts ─────────────────
  // Use a ref to hold the latest connectWithSession to avoid circular dep.
  const connectWithSessionRef = useRef<((sid: string, token: string) => Promise<void>) | undefined>(undefined)

  const scheduleReconnect = useCallback(() => {
    if (intentionalDisconnectRef.current) return
    const attempts = reconnectAttemptsRef.current
    if (attempts >= 10) return // ~5 min total, give up
    const delay = Math.min(1_000 * Math.pow(1.5, attempts), 30_000)
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = setTimeout(() => {
      const sid = readStored(sessionIdKey(activePageIdRef.current))
      const tok = readStored(browserTokenKey(activePageIdRef.current))
      if (sid && tok && connectWithSessionRef.current) {
        reconnectAttemptsRef.current += 1
        void connectWithSessionRef.current(sid, tok)
      }
    }, delay)
  }, [])

  // Cleanup heartbeat and reconnect timer on unmount
  useEffect(() => () => {
    stopHeartbeat()
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
  }, [stopHeartbeat])

  // ── Core WebSocket connect ─────────────────────────────────────────────────
  const connectWithSession = useCallback(async (
    nextSessionId: string,
    nextBrowserToken: string,
  ) => {
    if (!nextSessionId || !nextBrowserToken) {
      setStatus('error')
      setError('Session ID and browser token are required')
      return
    }

    socketRef.current?.close()
    setStatus('connecting')
    setError(null)

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(toWebSocketUrl(nextSessionId, nextBrowserToken))
      socketRef.current = socket

      socket.addEventListener('open', () => {
        if (socketRef.current !== socket) return
        reconnectAttemptsRef.current = 0 // reset backoff on successful connect
        setStatus('connected')
        setError(null)
        startHeartbeat()
        resolve()
      }, { once: true })

      socket.addEventListener('error', () => {
        // Ignore errors from stale sockets that have already been replaced.
        if (socketRef.current !== socket) return
        if (socket.readyState !== WebSocket.OPEN) {
          setStatus('error')
          setError('Failed to connect to relay WebSocket')
          // If a stored session/token is stale, clear it so the next explicit click
          // starts fresh instead of repeatedly retrying a dead session.
          const pageId = activePageIdRef.current
          setSessionId('')
          setBrowserToken('')
          setMcpUrl('')
          persist(sessionIdKey(pageId), '')
          persist(browserTokenKey(pageId), '')
          reject(new Error('Failed to connect to relay WebSocket'))
        }
      }, { once: true })

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null
          stopHeartbeat()
          setStatus('disconnected')
          setAgentConnected(false)
          // Auto-reconnect after unexpected close (not triggered by user)
          scheduleReconnect()
        }
      }) 

      socket.addEventListener('message', (event) => {
        const raw = typeof event.data === 'string' ? event.data : ''
        if (!raw) return

        let message: RelayEnvelope
        try { message = JSON.parse(raw) as RelayEnvelope } catch { return }

        if (message.type === 'command') {
          void (async () => {
            // Verify HMAC signature before executing — prevents rogue commands.
            // browserProof was returned from the server at session creation and stored locally.
            const storedProof = readStored(clientSecretKey(activePageIdRef.current))
            const cmdSig = (message as { sig?: string }).sig
            const sigValid = storedProof && cmdSig
              ? await hmacVerify(storedProof, message.id, cmdSig)
              : false

            if (!sigValid) {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                error: { message: 'Command signature verification failed — rejecting' },
              } satisfies RelayEnvelope))
              return
            }

            try {
              const result = await executeCommand({
                id: message.id,
                type: message.command as BrowserCommandEnvelope['type'],
                args: message.args,
              })
              socket.send(JSON.stringify({ type: 'command_result', id: message.id, result } satisfies RelayEnvelope))
            } catch (err) {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                error: { message: err instanceof Error ? err.message : 'Unknown relay command error' },
              } satisfies RelayEnvelope))
            }
          })()
        } else if (message.type === 'peer_status') {
          setAgentConnected((message as { connected: boolean }).connected)
        } else if (message.type === 'error') {
          setStatus('error')
          setError(message.message)
        }
      })
    }).catch(() => undefined)
  }, [executeCommand, scheduleReconnect, startHeartbeat, stopHeartbeat])

  // Keep ref updated so scheduleReconnect can call it without circular dep
  connectWithSessionRef.current = connectWithSession

  // ── Auto-reconnect on mount / page switch if stored session exists ─────────
  useEffect(() => {
    if (attemptedAutoConnectRef.current) return
    if (!sessionId || !browserToken) return
    attemptedAutoConnectRef.current = true
    void connectWithSession(sessionId, browserToken)
  }, [browserToken, connectWithSession, sessionId])

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    stopHeartbeat()
    socketRef.current?.close()
    socketRef.current = null
    setStatus('disconnected')
    setAgentConnected(false)
    setError(null)
    // Allow reconnect again after manual re-connect is initiated
    setTimeout(() => { intentionalDisconnectRef.current = false }, 1_000)
  }, [stopHeartbeat])

  const connect = useCallback(async () => {
    await connectWithSession(sessionId, browserToken)
  }, [browserToken, connectWithSession, sessionId])

  const resetSession = useCallback(() => {
    const pageId = activePageIdRef.current
    disconnect()
    setSessionId('')
    setBrowserToken('')
    setMcpUrl('')
    persist(sessionIdKey(pageId), '')
    persist(browserTokenKey(pageId), '')
  }, [disconnect])

  const createHostedSession = useCallback(async () => {
    disconnect()
    setStatus('connecting')
    setError(null)

    let session: PublicRelaySessionResponse
    try {
      const pageId = activePageIdRef.current

      const response = await fetch(`${DEFAULT_RELAY_URL}/relay/sessions/public`, {
        method: 'POST',
        // text/plain avoids a CORS preflight (simple request)
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ createdBy: 'prettyfish-web', browserProof: getOrCreateClientSecret(pageId) }),
      })

      if (!response.ok) throw new Error(`Failed to create MCP session (${response.status})`)

      session = await response.json() as PublicRelaySessionResponse

      // Store the browserProof locally — it's used to HMAC-verify incoming commands.
      // browserProof is returned from the server and stored client-side only.
      const clientSecretKey_ = clientSecretKey(pageId)
      try { localStorage.setItem(clientSecretKey_, session.browserProof) } catch { /* ignore */ }

      // Persist per-page session
      setSessionId(session.sessionId)
      setBrowserToken(session.browserToken)
      persist(sessionIdKey(pageId), session.sessionId)
      persist(browserTokenKey(pageId), session.browserToken)
    } catch (sessionError) {
      setStatus('error')
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to create hosted session')
      return
    }

    // Attach browser WebSocket — if it fails, clear the just-created session so the
    // next click creates a fresh session instead of retrying a broken one.
    try {
      await connectWithSession(session.sessionId, session.browserToken)
    } catch {
      const pageId = activePageIdRef.current
      setStatus('disconnected')
      setSessionId('')
      setBrowserToken('')
      setMcpUrl('')
      persist(sessionIdKey(pageId), '')
      persist(browserTokenKey(pageId), '')
      setError('Session created but browser connection failed — click Start session to create a fresh session.')
    }
  }, [connectWithSession, disconnect])

  const displayId = sessionId
    ? (sessionId.match(/^[a-z]+-[a-z]+-[a-z]+-[a-f0-9]{4}$/) ? sessionId : sessionId.slice(0, 8))
    : null

  return useMemo(() => ({
    agentConnected,
    status,
    sessionId,
    mcpUrl,
    displayId,
    error,
    connect,
    disconnect,
    createHostedSession,
    resetSession,
    executeCommand,
    getHostedConfigSnippet: () => buildConfigSnippet(mcpUrl),
  }), [agentConnected, connect, createHostedSession, disconnect, displayId, error, executeCommand, mcpUrl, resetSession, sessionId, status])
}
