#!/usr/bin/env node

import crypto from 'node:crypto'
import process from 'node:process'

const RELAY_URL = (process.env.PRETTYFISH_RELAY_URL || '').replace(/\/$/, '')
const RELAY_BOOTSTRAP_TOKEN = process.env.PRETTYFISH_RELAY_BOOTSTRAP_TOKEN || ''
const APP_URL = process.env.PRETTYFISH_APP_URL || 'https://pretty.fish/'
const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: 'prettyfish-remote-relay', version: '0.1.0' }

if (!RELAY_URL) {
  console.error('PRETTYFISH_RELAY_URL is required')
  process.exit(1)
}

if (!RELAY_BOOTSTRAP_TOKEN) {
  console.error('PRETTYFISH_RELAY_BOOTSTRAP_TOKEN is required')
  process.exit(1)
}

let relaySession = null
let relaySocket = null
let initialized = false
let wsReadyResolve = null
const pendingRelayCommands = new Map()

function buildBrowserAttachUrl(session) {
  const url = new URL(APP_URL)
  url.searchParams.set('relayUrl', RELAY_URL)
  url.searchParams.set('relaySessionId', session.sessionId)
  url.searchParams.set('relayBrowserToken', session.browserToken)
  return url.toString()
}

async function createRelaySession() {
  const response = await fetch(`${RELAY_URL}/api/relay/sessions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-relay-bootstrap-token': RELAY_BOOTSTRAP_TOKEN,
    },
    body: JSON.stringify({ createdBy: 'prettyfish-remote-mcp' }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create relay session (${response.status})`)
  }
  return await response.json()
}

function waitForSocketOpen() {
  if (relaySocket?.readyState === WebSocket.OPEN) return Promise.resolve()
  return new Promise((resolve) => {
    wsReadyResolve = resolve
  })
}

function connectRelaySocket(session) {
  const wsUrl = RELAY_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  const socket = new WebSocket(`${wsUrl}/api/relay/sessions/${session.sessionId}/agent?token=${encodeURIComponent(session.agentToken)}`)
  relaySocket = socket

  socket.addEventListener('open', () => {
    if (wsReadyResolve) {
      wsReadyResolve()
      wsReadyResolve = null
    }
  })

  socket.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : ''
    if (!raw) return
    const message = JSON.parse(raw)
    if (message.type === 'command_result') {
      const pending = pendingRelayCommands.get(message.id)
      if (!pending) return
      pendingRelayCommands.delete(message.id)
      if (message.ok) pending.resolve(message.result)
      else pending.reject(new Error(message.error || 'Remote relay command failed'))
      return
    }
    if (message.type === 'peer_status' && message.role === 'browser' && message.connected) {
      console.error(`Pretty Fish browser attached to relay session ${session.sessionId}`)
    }
  })

  socket.addEventListener('close', () => {
    relaySocket = null
  })

  socket.addEventListener('error', () => {
    relaySocket = null
  })
}

async function ensureRelayConnected() {
  if (!relaySession) {
    relaySession = await createRelaySession()
    console.error(`Relay session: ${relaySession.sessionId}`)
    console.error(`Browser attach URL: ${buildBrowserAttachUrl(relaySession)}`)
    connectRelaySocket(relaySession)
  }
  await waitForSocketOpen()
}

async function sendRelayCommand(command, args = {}, timeoutMs = 20_000) {
  await ensureRelayConnected()
  if (!relaySocket || relaySocket.readyState !== WebSocket.OPEN) {
    throw new Error('Relay websocket is not connected')
  }

  const id = crypto.randomUUID()
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRelayCommands.delete(id)
      reject(new Error(`Timed out waiting for relay result: ${command}`))
    }, timeoutMs)
    pendingRelayCommands.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
  })

  relaySocket.send(JSON.stringify({
    type: 'command',
    id,
    command,
    args,
  }))

  return promise
}

function textResult(payload, isError = false) {
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

const toolDefinitions = [
  { name: 'session_info', description: 'Return the current Cloudflare relay session details and browser attach URL.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_page', description: 'Create a new page in the connected Pretty Fish browser tab.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' } } } },
  { name: 'create_diagram', description: 'Create a new diagram in the connected Pretty Fish browser tab.', inputSchema: { type: 'object', properties: { pageId: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, width: { type: 'number' } } } },
  { name: 'set_diagram_code', description: 'Replace Mermaid source and wait for render completion.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, code: { type: 'string' }, timeoutMs: { type: 'number' }, select: { type: 'boolean' } }, required: ['diagramId', 'code'] } },
  { name: 'render_status', description: 'Read render status from the connected browser session.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' } } } },
  { name: 'export_svg', description: 'Export the current rendered diagram as SVG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, timeoutMs: { type: 'number' } } } },
  { name: 'export_png', description: 'Export the current rendered diagram as PNG.', inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, background: { type: 'string' }, scale: { type: 'number' }, timeoutMs: { type: 'number' } } } },
  { name: 'get_snapshot', description: 'Return the full Pretty Fish document snapshot.', inputSchema: { type: 'object', properties: {} } },
]

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'session_info':
      await ensureRelayConnected()
      return {
        relayUrl: RELAY_URL,
        sessionId: relaySession.sessionId,
        browserAttachUrl: buildBrowserAttachUrl(relaySession),
      }
    case 'create_page':
      return sendRelayCommand('create_page', { name: args.name, code: args.code })
    case 'create_diagram':
      return sendRelayCommand('create_diagram', { pageId: args.pageId, name: args.name, code: args.code, width: args.width })
    case 'set_diagram_code':
      return sendRelayCommand('set_diagram_code', { diagramId: args.diagramId, code: args.code, timeoutMs: args.timeoutMs, select: args.select }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 20_000) + 2_000)
    case 'render_status':
      return sendRelayCommand('render_status', { diagramId: args.diagramId })
    case 'export_svg':
      return sendRelayCommand('export_svg', { diagramId: args.diagramId, timeoutMs: args.timeoutMs }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 20_000) + 2_000)
    case 'export_png':
      return sendRelayCommand('export_png', { diagramId: args.diagramId, background: args.background, scale: args.scale, timeoutMs: args.timeoutMs }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 20_000) + 2_000)
    case 'get_snapshot':
      return sendRelayCommand('get_snapshot')
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function sendMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function sendResult(id, result) {
  sendMessage({ jsonrpc: '2.0', id, result })
}

function sendError(id, code, message) {
  sendMessage({ jsonrpc: '2.0', id, error: { code, message } })
}

function handleMcpMessage(message) {
  if (!message || typeof message !== 'object') return
  const { id, method, params } = message

  if (method === 'initialize') {
    sendResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions: 'Use this server to drive Pretty Fish through the Cloudflare relay.',
    })
    return
  }

  if (method === 'notifications/initialized') {
    initialized = true
    return
  }

  if (!initialized && method !== 'ping') {
    sendError(id, -32002, 'Server not initialized')
    return
  }

  if (method === 'ping') {
    sendResult(id, {})
    return
  }

  if (method === 'tools/list') {
    sendResult(id, { tools: toolDefinitions })
    return
  }

  if (method === 'tools/call') {
    handleToolCall(params?.name, params?.arguments || {})
      .then((payload) => {
        if (params?.name === 'export_png' && payload?.data) {
          sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  fileName: payload.fileName,
                  diagram: payload.diagram,
                  mimeType: payload.mimeType,
                }, null, 2),
              },
              {
                type: 'image',
                data: payload.data,
                mimeType: payload.mimeType || 'image/png',
              },
            ],
            isError: false,
          })
          return
        }
        sendResult(id, textResult(payload, false))
      })
      .catch((error) => {
        sendResult(id, textResult(error instanceof Error ? error.message : 'Tool call failed', true))
      })
    return
  }

  sendError(id, -32601, `Method not found: ${method}`)
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  while (buffer.includes('\n')) {
    const newlineIndex = buffer.indexOf('\n')
    const line = buffer.slice(0, newlineIndex).trim()
    buffer = buffer.slice(newlineIndex + 1)
    if (!line) continue
    try {
      handleMcpMessage(JSON.parse(line))
    } catch (error) {
      console.error('Failed to parse MCP message', error)
    }
  }
})
