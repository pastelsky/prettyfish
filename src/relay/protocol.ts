/**
 * Pretty Fish Relay Protocol Types
 *
 * All messages exchanged between browser, agent, and relay server.
 */

export type RelayPeerRole = 'browser' | 'agent'

// ── Session ───────────────────────────────────────────────────────────────────

export interface RelaySessionRecord {
  sessionId: string
  browserToken: string
  browserProof: string   // HMAC-SHA256(clientSecret, pageId) — stored server-side, never sent to agent
  createdAt: string
}

export interface PublicRelaySessionResponse extends RelaySessionRecord {
  mcpUrl: string
}  // wsUrl is derived client-side from sessionId + browserToken like before.

// ── WebSocket envelope types ──────────────────────────────────────────────────

export interface RelayHelloMessage {
  type: 'hello'
  role: RelayPeerRole
  sessionId: string
}

export interface RelayPeerStatusMessage {
  type: 'peer_status'
  role: RelayPeerRole
  connected: boolean
}

export interface RelayCommandMessage {
  type: 'command'
  id: string
  command: string
  args?: Record<string, unknown>
  sig?: string  // HMAC-SHA256(browserProof, id) — browser verifies before executing
}

export interface RelayCommandResultMessage {
  type: 'command_result'
  id: string
  result?: unknown
  error?: { message: string; code?: string }
}

export interface RelayErrorMessage {
  type: 'error'
  message: string
}

export type RelayEnvelope =
  | RelayHelloMessage
  | RelayPeerStatusMessage
  | RelayCommandMessage
  | RelayCommandResultMessage
  | RelayErrorMessage

export function isRelayEnvelope(value: unknown): value is RelayEnvelope {
  return typeof value === 'object' && value !== null && 'type' in value
}
