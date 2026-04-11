export type RelayPeerRole = 'browser' | 'agent'

export interface RelaySessionRecord {
  sessionId: string
  browserToken: string
  agentToken: string
  createdAt: string
}

export interface RelayCommandMessage {
  type: 'command'
  id: string
  command: string
  args?: Record<string, unknown>
}

export interface RelayCommandResultMessage {
  type: 'command_result'
  id: string
  ok: boolean
  result?: unknown
  error?: string
}

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

export interface RelayErrorMessage {
  type: 'error'
  message: string
}

export type RelayEnvelope =
  | RelayCommandMessage
  | RelayCommandResultMessage
  | RelayHelloMessage
  | RelayPeerStatusMessage
  | RelayErrorMessage

export function isRelayEnvelope(value: unknown): value is RelayEnvelope {
  return typeof value === 'object' && value !== null && 'type' in value
}
