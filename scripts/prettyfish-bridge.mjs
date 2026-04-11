#!/usr/bin/env node

import http from 'node:http'
import crypto from 'node:crypto'
import process from 'node:process'

const HOST = process.env.PRETTYFISH_BRIDGE_HOST || '127.0.0.1'
const PORT = Number(process.env.PRETTYFISH_BRIDGE_PORT || 46321)
const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: 'prettyfish-bridge', version: '0.1.0' }
const EXPLICIT_ALLOWED_ORIGINS = new Set(
  (process.env.PRETTYFISH_ALLOWED_ORIGINS || 'https://pretty.fish')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const sessions = new Map()

function isOriginAllowed(origin) {
  if (!origin) return false
  if (EXPLICIT_ALLOWED_ORIGINS.has(origin)) return true

  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

function createSession(body) {
  const sessionId = crypto.randomUUID()
  const browserToken = crypto.randomBytes(24).toString('hex')
  const session = {
    id: sessionId,
    browserToken,
    origin: body.origin,
    pageUrl: body.pageUrl ?? '',
    title: body.title ?? '',
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    queue: [],
    waiters: [],
    results: new Map(),
  }
  sessions.set(sessionId, session)
  return session
}

function sendJson(res, status, payload, origin) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Private-Network': 'true',
      Vary: 'Origin',
    } : {}),
  })
  res.end(JSON.stringify(payload))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function getSessionOrThrow(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`Unknown session: ${sessionId}`)
  return session
}

function assertBrowserToken(session, browserToken) {
  if (!browserToken || browserToken !== session.browserToken) {
    const error = new Error('Invalid browser token')
    error.statusCode = 403
    throw error
  }
}

function drainWaiter(session) {
  const waiter = session.waiters.shift()
  if (!waiter) return
  const commands = session.queue.splice(0)
  waiter(commands)
}

async function enqueueCommand(sessionId, type, args = {}, timeoutMs = 15_000) {
  const session = getSessionOrThrow(sessionId)
  const command = {
    id: crypto.randomUUID(),
    type,
    args,
    createdAt: new Date().toISOString(),
  }

  const resultPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.results.delete(command.id)
      reject(new Error(`Timed out waiting for browser result: ${type}`))
    }, timeoutMs)
    session.results.set(command.id, {
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

  session.queue.push(command)
  session.lastSeenAt = new Date().toISOString()
  drainWaiter(session)
  return resultPromise
}

function pickSession(sessionId) {
  if (sessionId) return getSessionOrThrow(sessionId)
  const available = [...sessions.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
  if (available.length === 0) throw new Error('No active Pretty Fish browser sessions. Open Pretty Fish and connect the local agent bridge first.')
  return available[0]
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

function handleToolCall(name, args = {}) {
  switch (name) {
    case 'list_sessions':
      return Promise.resolve({
        sessions: [...sessions.values()].map((session) => ({
          id: session.id,
          origin: session.origin,
          pageUrl: session.pageUrl,
          title: session.title,
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          queuedCommands: session.queue.length,
        })),
      })
    case 'create_page': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'create_page', { name: args.name, code: args.code })
    }
    case 'create_diagram': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'create_diagram', {
        pageId: args.pageId,
        name: args.name,
        code: args.code,
        width: args.width,
      })
    }
    case 'set_diagram_code': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'set_diagram_code', {
        diagramId: args.diagramId,
        code: args.code,
        timeoutMs: args.timeoutMs,
        select: args.select,
      }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 15_000) + 2_000)
    }
    case 'render_status': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'render_status', { diagramId: args.diagramId })
    }
    case 'export_svg': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'export_svg', {
        diagramId: args.diagramId,
        timeoutMs: args.timeoutMs,
      }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 15_000) + 2_000)
    }
    case 'export_png': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'export_png', {
        diagramId: args.diagramId,
        background: args.background,
        scale: args.scale,
        timeoutMs: args.timeoutMs,
      }, (typeof args.timeoutMs === 'number' ? args.timeoutMs : 15_000) + 2_000)
    }
    case 'get_snapshot': {
      const session = pickSession(args.sessionId)
      return enqueueCommand(session.id, 'get_snapshot')
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

const toolDefinitions = [
  { name: 'list_sessions', description: 'List active Pretty Fish browser sessions paired to this local bridge.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'create_page',
    description: 'Create a new page in the paired Pretty Fish browser tab.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' } } },
  },
  {
    name: 'create_diagram',
    description: 'Create a new diagram and optionally seed Mermaid source.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, pageId: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, width: { type: 'number' } } },
  },
  {
    name: 'set_diagram_code',
    description: 'Replace Mermaid source for a diagram and wait for the browser render result.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, diagramId: { type: 'string' }, code: { type: 'string' }, timeoutMs: { type: 'number' }, select: { type: 'boolean' } }, required: ['diagramId', 'code'] },
  },
  {
    name: 'render_status',
    description: 'Read the current render status for a diagram in the paired browser tab.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, diagramId: { type: 'string' } } },
  },
  {
    name: 'export_svg',
    description: 'Export a rendered diagram from Pretty Fish as SVG and return it as base64.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, diagramId: { type: 'string' }, timeoutMs: { type: 'number' } } },
  },
  {
    name: 'export_png',
    description: 'Export a rendered diagram from Pretty Fish as PNG and return it as base64.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, diagramId: { type: 'string' }, background: { type: 'string' }, scale: { type: 'number' }, timeoutMs: { type: 'number' } } },
  },
  {
    name: 'get_snapshot',
    description: 'Return the full Pretty Fish document snapshot from the paired browser tab.',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } } },
  },
]

function handleHttp(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const origin = req.headers.origin

  if (req.method === 'OPTIONS') {
    if (origin && isOriginAllowed(origin)) {
      sendJson(res, 200, { ok: true }, origin)
      return
    }
    sendJson(res, 403, { error: 'Origin not allowed' })
    return
  }

  if (url.pathname === '/healthz') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (origin && !isOriginAllowed(origin)) {
    sendJson(res, 403, { error: 'Origin not allowed' }, origin)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/browser/sessions') {
    parseBody(req)
      .then((body) => {
        const session = createSession(body)
        sendJson(res, 200, {
          sessionId: session.id,
          browserToken: session.browserToken,
          bridgeUrl: `http://${HOST}:${PORT}`,
        }, origin)
      })
      .catch((error) => {
        sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid JSON body' }, origin)
      })
    return
  }

  const sessionMatch = url.pathname.match(/^\/v1\/browser\/sessions\/([^/]+)(?:\/(commands|results))?$/)
  if (!sessionMatch) {
    sendJson(res, 404, { error: 'Not found' }, origin)
    return
  }

  const [, sessionId, subresource] = sessionMatch

  try {
    const session = getSessionOrThrow(sessionId)
    assertBrowserToken(session, url.searchParams.get('browserToken'))
    session.lastSeenAt = new Date().toISOString()

    if (req.method === 'DELETE' && !subresource) {
      sessions.delete(sessionId)
      sendJson(res, 200, { ok: true }, origin)
      return
    }

    if (req.method === 'GET' && subresource === 'commands') {
      if (session.queue.length > 0) {
        const commands = session.queue.splice(0)
        sendJson(res, 200, { commands }, origin)
        return
      }

      const waitMs = Math.max(1_000, Math.min(Number(url.searchParams.get('waitMs') || 0), 30_000))
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        sendJson(res, 200, { commands: [] }, origin)
      }, waitMs)

      session.waiters.push((commands) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        sendJson(res, 200, { commands }, origin)
      })
      return
    }

    if (req.method === 'POST' && subresource === 'results') {
      parseBody(req)
        .then((body) => {
          const pending = session.results.get(body.commandId)
          if (!pending) {
            sendJson(res, 404, { error: `Unknown command result: ${body.commandId}` }, origin)
            return
          }
          session.results.delete(body.commandId)
          if (body.ok) {
            pending.resolve(body.result)
          } else {
            pending.reject(new Error(body.error || 'Browser command failed'))
          }
          sendJson(res, 200, { ok: true }, origin)
        })
        .catch((error) => {
          sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid JSON body' }, origin)
        })
      return
    }

    sendJson(res, 405, { error: 'Method not allowed' }, origin)
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || 'Request failed' }, origin)
  }
}

const httpServer = http.createServer(handleHttp)
httpServer.listen(PORT, HOST, () => {
  console.error(`prettyfish-bridge browser server listening on http://${HOST}:${PORT}`)
})

let initialized = false

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
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: SERVER_INFO,
      instructions: 'Use this server to drive a paired Pretty Fish browser tab through a localhost bridge.',
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
