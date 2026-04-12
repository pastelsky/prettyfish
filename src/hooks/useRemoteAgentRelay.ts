import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAgentCommandExecutor, type BrowserCommandEnvelope } from '@/hooks/useAgentCommandExecutor'
import { hmacSign, hmacVerify } from '@/lib/hmac'
import type { PublicRelaySessionResponse, RelayEnvelope } from '@/relay/protocol'
import type { AppStoreState } from '@/state/appStore'
import type { AppState } from '@/types'

// Same-origin: relay routes (/relay/*, /mcp/*) are served by the same Worker as the SPA.
const DEFAULT_RELAY_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_PRETTYFISH_RELAY_URL
  || (typeof window !== 'undefined' ? window.location.origin : 'https://pretty.fish')
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
  createDiagramWithOptions: (options?: {
    pageId?: string
    name?: string
    code?: string
    width?: number
  }) => string | undefined
  selectDiagram: (diagramId: string) => void
  updateDiagramCode: (diagramId: string, code: string) => void
}

export interface RemoteAgentRelayControls {
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
  const [sessionId, setSessionId] = useState(() => readStored(sessionIdKey(activePageId)))
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

      socket.addEventListener('open', () => { setStatus('connected'); resolve() }, { once: true })

      socket.addEventListener('error', () => {
        if (socket.readyState !== WebSocket.OPEN) {
          setStatus('error')
          setError('Failed to connect to relay WebSocket')
          reject(new Error('Failed to connect to relay WebSocket'))
        }
      }, { once: true })

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null
          setStatus('disconnected')
        }
      })

      socket.addEventListener('message', (event) => {
        const raw = typeof event.data === 'string' ? event.data : ''
        if (!raw) return

        let message: RelayEnvelope
        try { message = JSON.parse(raw) as RelayEnvelope } catch { return }

        if (message.type === 'command') {
          void (async () => {
            // Verify HMAC signature before executing — prevents rogue commands
            const clientSecret = getOrCreateClientSecret(activePageIdRef.current)
            const browserProof = await hmacSign(clientSecret, activePageIdRef.current)
            const cmdSig = (message as { sig?: string }).sig
            const sigValid = cmdSig ? await hmacVerify(browserProof, message.id, cmdSig) : false

            if (!sigValid) {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                ok: false,
                error: 'Command signature verification failed — rejecting',
              } satisfies RelayEnvelope))
              return
            }

            try {
              const result = await executeCommand({
                id: message.id,
                type: message.command as BrowserCommandEnvelope['type'],
                args: message.args,
              })
              socket.send(JSON.stringify({ type: 'command_result', id: message.id, ok: true, result } satisfies RelayEnvelope))
            } catch (err) {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                ok: false,
                error: err instanceof Error ? err.message : 'Unknown relay command error',
              } satisfies RelayEnvelope))
            }
          })()
        } else if (message.type === 'error') {
          setStatus('error')
          setError(message.message)
        }
      })
    }).catch(() => undefined)
  }, [executeCommand])

  // ── Auto-reconnect on mount / page switch if stored session exists ─────────
  useEffect(() => {
    if (attemptedAutoConnectRef.current) return
    if (!sessionId || !browserToken) return
    attemptedAutoConnectRef.current = true
    void connectWithSession(sessionId, browserToken)
  }, [browserToken, connectWithSession, sessionId])

  const disconnect = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    setStatus('disconnected')
    setError(null)
  }, [])

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
      const clientSecret = getOrCreateClientSecret(pageId)
      // Send only the HMAC proof — the raw secret never leaves the browser
      const browserProof = await hmacSign(clientSecret, pageId)

      const response = await fetch(`${DEFAULT_RELAY_URL}/relay/sessions/public`, {
        method: 'POST',
        // text/plain avoids a CORS preflight (simple request)
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ createdBy: 'prettyfish-web', browserProof }),
      })

      if (!response.ok) throw new Error(`Failed to create MCP session (${response.status})`)

      session = await response.json() as PublicRelaySessionResponse

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

    // Attach browser WebSocket — non-fatal if it fails (config snippet still usable)
    try {
      await connectWithSession(session.sessionId, session.browserToken)
    } catch {
      setStatus('disconnected')
      setError('Session created but browser connection failed — click Reconnect to retry.')
    }
  }, [connectWithSession, disconnect])

  const displayId = sessionId
    ? (sessionId.match(/^[a-z]+-[a-z]+-[a-z]+-[a-f0-9]{4}$/) ? sessionId : sessionId.slice(0, 8))
    : null

  return useMemo(() => ({
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
  }), [connect, createHostedSession, disconnect, displayId, error, executeCommand, mcpUrl, resetSession, sessionId, status])
}
