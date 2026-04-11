import { once } from 'node:events'
import { createServer } from 'node:net'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

function parseJsonContentText(result: any): any {
  if (result?.isError) {
    const errorText = result?.content?.find((entry: { type: string }) => entry.type === 'text')?.text
    throw new Error(errorText || 'MCP tool call failed')
  }
  if (Array.isArray(result?.content) && result.content.some((entry: { type: string }) => entry.type === 'image')) {
    return result
  }
  const text = result?.content?.find((entry: { type: string }) => entry.type === 'text')?.text
  if (!text) return result
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function reservePort(): Promise<number> {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to reserve ephemeral port')
  }
  const port = address.port
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
  return port
}

export class PrettyFishMcpClient {
  private readonly process: ChildProcessWithoutNullStreams
  private nextId = 1
  private readonly pending = new Map<number, { resolve: (value: JsonRpcResponse) => void; reject: (error: Error) => void }>()
  readonly port: number
  readonly bridgeUrl: string

  private constructor(process: ChildProcessWithoutNullStreams, port: number) {
    this.process = process
    this.port = port
    this.bridgeUrl = `http://127.0.0.1:${port}`

    let stdoutBuffer = ''
    process.stdout.setEncoding('utf8')
    process.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk
      while (stdoutBuffer.includes('\n')) {
        const newlineIndex = stdoutBuffer.indexOf('\n')
        const line = stdoutBuffer.slice(0, newlineIndex).trim()
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)
        if (!line) continue
        const message = JSON.parse(line) as JsonRpcResponse
        if (typeof message.id === 'number' && this.pending.has(message.id)) {
          const waiter = this.pending.get(message.id)!
          this.pending.delete(message.id)
          if (message.error) waiter.reject(new Error(message.error.message))
          else waiter.resolve(message)
        }
      }
    })
  }

  static async start(): Promise<PrettyFishMcpClient> {
    const port = await reservePort()
    const child = spawn('node', ['scripts/prettyfish-bridge.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PRETTYFISH_BRIDGE_HOST: '127.0.0.1',
        PRETTYFISH_BRIDGE_PORT: String(port),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stderrBuffer = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderrBuffer += chunk
    })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out starting bridge process\n${stderrBuffer}`))
      }, 10000)
      child.stderr.on('data', () => {
        if (stderrBuffer.includes(`http://127.0.0.1:${port}`)) {
          clearTimeout(timeout)
          resolve()
        }
      })
      child.once('exit', (code) => {
        clearTimeout(timeout)
        reject(new Error(`Bridge exited before startup (code ${code})\n${stderrBuffer}`))
      })
    })

    const client = new PrettyFishMcpClient(child, port)
    await client.initialize()
    return client
  }

  private send(message: JsonRpcRequest) {
    this.process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  private request(method: string, params?: Record<string, unknown>) {
    const id = this.nextId++
    const message: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }
    const promise = new Promise<JsonRpcResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.send(message)
    return promise
  }

  private notify(method: string, params?: Record<string, unknown>) {
    this.send({ jsonrpc: '2.0', method, params })
  }

  async initialize() {
    await this.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'playwright-e2e',
        version: '0.1.0',
      },
    })
    this.notify('notifications/initialized')
  }

  async callTool<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await this.request('tools/call', {
      name,
      arguments: args,
    })
    return parseJsonContentText(response.result) as T
  }

  async stop() {
    this.process.kill('SIGINT')
    await once(this.process, 'exit').catch(() => undefined)
  }
}
