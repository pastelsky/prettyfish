import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAgentCommandExecutor, type BrowserCommandEnvelope } from '@/hooks/useAgentCommandExecutor'
import type { AppStoreState } from '@/state/appStore'
import type { AppState } from '@/types'
import type { RelayEnvelope } from '@/relay/protocol'

const RELAY_URL_KEY = 'prettyfish:relay-url'
const RELAY_SESSION_ID_KEY = 'prettyfish:relay-session-id'
const RELAY_BROWSER_TOKEN_KEY = 'prettyfish:relay-browser-token'

interface RemoteAgentRelayOptions {
  state: AppStoreState
  getState: () => AppState
  createPageWithName: (name?: string, code?: string) => string
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
  relayUrl: string
  sessionId: string
  browserToken: string
  error: string | null
  setRelayUrl: (value: string) => void
  setSessionId: (value: string) => void
  setBrowserToken: (value: string) => void
  connect: () => Promise<void>
  disconnect: () => void
}

function readStoredValue(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function toWebSocketUrl(relayUrl: string, sessionId: string, browserToken: string): string {
  const normalized = relayUrl.replace(/\/$/, '')
  const base = normalized.startsWith('https://')
    ? normalized.replace(/^https:\/\//, 'wss://')
    : normalized.replace(/^http:\/\//, 'ws://')
  return `${base}/api/relay/sessions/${sessionId}/browser?token=${encodeURIComponent(browserToken)}`
}

export function useRemoteAgentRelay(options: RemoteAgentRelayOptions): RemoteAgentRelayControls {
  const [status, setStatus] = useState<RemoteAgentRelayControls['status']>('disconnected')
  const [relayUrl, setRelayUrlState] = useState(() => readStoredValue(RELAY_URL_KEY))
  const [sessionId, setSessionIdState] = useState(() => readStoredValue(RELAY_SESSION_ID_KEY))
  const [browserToken, setBrowserTokenState] = useState(() => readStoredValue(RELAY_BROWSER_TOKEN_KEY))
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const attemptedAutoConnectRef = useRef(false)
  const { executeCommand } = useAgentCommandExecutor(options)

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const relayUrlParam = url.searchParams.get('relayUrl')
      const relaySessionIdParam = url.searchParams.get('relaySessionId')
      const relayBrowserTokenParam = url.searchParams.get('relayBrowserToken')
      if (relayUrlParam) setRelayUrlState(relayUrlParam)
      if (relaySessionIdParam) setSessionIdState(relaySessionIdParam)
      if (relayBrowserTokenParam) setBrowserTokenState(relayBrowserTokenParam)
    } catch {
      // ignore
    }
  }, [])

  const persist = useCallback((key: string, value: string) => {
    try {
      if (value) localStorage.setItem(key, value)
      else localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [])

  const setRelayUrl = useCallback((value: string) => {
    setRelayUrlState(value)
    persist(RELAY_URL_KEY, value)
  }, [persist])

  const setSessionId = useCallback((value: string) => {
    setSessionIdState(value)
    persist(RELAY_SESSION_ID_KEY, value)
  }, [persist])

  const setBrowserToken = useCallback((value: string) => {
    setBrowserTokenState(value)
    persist(RELAY_BROWSER_TOKEN_KEY, value)
  }, [persist])

  const disconnect = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    setStatus('disconnected')
    setError(null)
  }, [])

  const connect = useCallback(async () => {
    if (!relayUrl || !sessionId || !browserToken) {
      setStatus('error')
      setError('Relay URL, session ID, and browser token are required')
      return
    }

    setStatus('connecting')
    setError(null)

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(toWebSocketUrl(relayUrl, sessionId, browserToken))
      socketRef.current = socket

      socket.addEventListener('open', () => {
        setStatus('connected')
        resolve()
      }, { once: true })

      socket.addEventListener('error', () => {
        if (socket.readyState !== WebSocket.OPEN) {
          setStatus('error')
          setError('Failed to connect to relay websocket')
          reject(new Error('Failed to connect to relay websocket'))
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
        try {
          message = JSON.parse(raw) as RelayEnvelope
        } catch {
          return
        }

        if (message.type === 'command') {
          void executeCommand({
            id: message.id,
            type: message.command as BrowserCommandEnvelope['type'],
            args: message.args,
          })
            .then((result) => {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                ok: true,
                result,
              } satisfies RelayEnvelope))
            })
            .catch((commandError) => {
              socket.send(JSON.stringify({
                type: 'command_result',
                id: message.id,
                ok: false,
                error: commandError instanceof Error ? commandError.message : 'Unknown relay command error',
              } satisfies RelayEnvelope))
            })
        } else if (message.type === 'error') {
          setStatus('error')
          setError(message.message)
        }
      })
    }).catch(() => undefined)
  }, [browserToken, executeCommand, relayUrl, sessionId])

  useEffect(() => () => {
    socketRef.current?.close()
  }, [])

  useEffect(() => {
    if (attemptedAutoConnectRef.current) return
    if (!relayUrl || !sessionId || !browserToken) return
    attemptedAutoConnectRef.current = true
    void connect()
  }, [browserToken, connect, relayUrl, sessionId])

  return useMemo(() => ({
    status,
    relayUrl,
    sessionId,
    browserToken,
    error,
    setRelayUrl,
    setSessionId,
    setBrowserToken,
    connect,
    disconnect,
  }), [browserToken, connect, disconnect, error, relayUrl, sessionId, setBrowserToken, setRelayUrl, setSessionId, status])
}
