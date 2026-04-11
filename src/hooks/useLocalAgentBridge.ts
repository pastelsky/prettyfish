import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAgentCommandExecutor, type BrowserCommandEnvelope } from '@/hooks/useAgentCommandExecutor'
import type { AppStoreState } from '@/state/appStore'
import type { AppState } from '@/types'

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:46321'
const BRIDGE_URL_KEY = 'prettyfish:agent-bridge-url'
const DEFAULT_WAIT_MS = 25_000

interface BrowserSessionResponse {
  sessionId: string
  browserToken: string
  bridgeUrl: string
}

interface LocalAgentBridgeOptions {
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

export interface LocalAgentBridgeState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  bridgeUrl: string
  sessionId: string | null
  error: string | null
}

export interface LocalAgentBridgeControls extends LocalAgentBridgeState {
  setBridgeUrl: (value: string) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

function readStoredBridgeUrl(): string {
  try {
    return localStorage.getItem(BRIDGE_URL_KEY) || DEFAULT_BRIDGE_URL
  } catch {
    return DEFAULT_BRIDGE_URL
  }
}

export function useLocalAgentBridge(options: LocalAgentBridgeOptions): LocalAgentBridgeControls {
  const [bridgeUrl, setBridgeUrlState] = useState(readStoredBridgeUrl)
  const [status, setStatus] = useState<LocalAgentBridgeState['status']>('disconnected')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<{ sessionId: string; browserToken: string; bridgeUrl: string } | null>(null)
  const loopAbortRef = useRef<AbortController | null>(null)
  const { executeCommand } = useAgentCommandExecutor(options)

  const setBridgeUrl = useCallback((value: string) => {
    setBridgeUrlState(value)
    try {
      localStorage.setItem(BRIDGE_URL_KEY, value)
    } catch {
      // ignore
    }
  }, [])

  const postCommandResult = useCallback(async (
    session: { sessionId: string; browserToken: string; bridgeUrl: string },
    commandId: string,
    payload: { ok: boolean; result?: unknown; error?: string },
  ) => {
    await fetch(`${session.bridgeUrl}/v1/browser/sessions/${session.sessionId}/results?browserToken=${encodeURIComponent(session.browserToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId,
        ...payload,
      }),
    })
  }, [])

  const processLoop = useCallback(async (session: { sessionId: string; browserToken: string; bridgeUrl: string }, signal: AbortSignal) => {
    while (!signal.aborted) {
      const response = await fetch(
        `${session.bridgeUrl}/v1/browser/sessions/${session.sessionId}/commands?browserToken=${encodeURIComponent(session.browserToken)}&waitMs=${DEFAULT_WAIT_MS}`,
        { signal },
      )
      if (!response.ok) {
        throw new Error(`Bridge polling failed (${response.status})`)
      }

      const payload = await response.json() as { commands?: BrowserCommandEnvelope[] }
      const commands = payload.commands ?? []
      for (const command of commands) {
        try {
          const result = await executeCommand(command)
          await postCommandResult(session, command.id, { ok: true, result })
        } catch (commandError) {
          const message = commandError instanceof Error ? commandError.message : 'Unknown bridge command error'
          await postCommandResult(session, command.id, { ok: false, error: message })
        }
      }
    }
  }, [executeCommand, postCommandResult])

  const disconnect = useCallback(async () => {
    loopAbortRef.current?.abort()
    loopAbortRef.current = null
    const session = sessionRef.current
    sessionRef.current = null
    setSessionId(null)
    setStatus('disconnected')
    setError(null)

    if (!session) return

    try {
      await fetch(`${session.bridgeUrl}/v1/browser/sessions/${session.sessionId}?browserToken=${encodeURIComponent(session.browserToken)}`, {
        method: 'DELETE',
      })
    } catch {
      // ignore best-effort disconnect failures
    }
  }, [])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)

    try {
      const normalizedUrl = bridgeUrl.replace(/\/$/, '')
      const response = await fetch(`${normalizedUrl}/v1/browser/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: window.location.origin,
          pageUrl: window.location.href,
          title: document.title,
        }),
      })
      if (!response.ok) {
        throw new Error(`Bridge refused connection (${response.status})`)
      }

      const session = await response.json() as BrowserSessionResponse
      const nextSession = {
        sessionId: session.sessionId,
        browserToken: session.browserToken,
        bridgeUrl: normalizedUrl,
      }
      sessionRef.current = nextSession
      setSessionId(session.sessionId)
      setStatus('connected')

      const abortController = new AbortController()
      loopAbortRef.current = abortController
      void processLoop(nextSession, abortController.signal).catch((loopError) => {
        if (abortController.signal.aborted) return
        setStatus('error')
        setError(loopError instanceof Error ? loopError.message : 'Bridge polling failed')
      })
    } catch (connectError) {
      setStatus('error')
      setError(connectError instanceof Error ? connectError.message : 'Failed to connect to local bridge')
    }
  }, [bridgeUrl, processLoop])

  useEffect(() => () => {
    loopAbortRef.current?.abort()
  }, [])

  return useMemo(() => ({
    status,
    bridgeUrl,
    sessionId,
    error,
    setBridgeUrl,
    connect,
    disconnect,
  }), [bridgeUrl, connect, disconnect, error, sessionId, setBridgeUrl, status])
}
