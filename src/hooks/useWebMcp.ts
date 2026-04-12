import { useEffect, useRef } from 'react'

import type { BridgeCommandName, BrowserCommandEnvelope } from './useAgentCommandExecutor'

interface WebMcpTool {
  name: BridgeCommandName
  title: string
  description: string
  inputSchema?: Record<string, unknown>
  readOnly?: boolean
}

const TOOLS: WebMcpTool[] = [
  {
    name: 'list_diagrams',
    title: 'List Diagrams',
    description: 'List all diagrams on the current page.',
    inputSchema: { type: 'object', properties: { include_code: { type: 'boolean', description: 'Include Mermaid source code in results.' } } },
    readOnly: true,
  },
  {
    name: 'get_diagram',
    title: 'Get Diagram',
    description: 'Get a diagram by ID or fuzzy name match. Returns diagram details and code.',
    inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, name: { type: 'string', description: 'Fuzzy name search.' } } },
    readOnly: true,
  },
  {
    name: 'list_diagram_types',
    title: 'List Diagram Types',
    description: 'List all supported Mermaid diagram types (flowchart, sequence, class, ER, etc.).',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  },
  {
    name: 'get_diagram_reference',
    title: 'Get Diagram Reference',
    description: 'Get the full syntax reference for a Mermaid diagram type. Call before writing code.',
    inputSchema: { type: 'object', properties: { type: { type: 'string', description: 'Diagram type ID (e.g. "flowchart", "sequence").' } }, required: ['type'] },
    readOnly: true,
  },
  {
    name: 'create_diagram',
    title: 'Create Diagram',
    description: 'Create a new Mermaid diagram. Always provide a descriptive name.',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Short descriptive name.' }, code: { type: 'string', description: 'Mermaid diagram source code.' }, width: { type: 'number' } } },
  },
  {
    name: 'set_diagram_code',
    title: 'Update Diagram Code',
    description: 'Replace a diagram\'s Mermaid source code. Use list_diagrams to find the ID first.',
    inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, code: { type: 'string' }, timeoutMs: { type: 'number' }, select: { type: 'boolean' } }, required: ['diagramId', 'code'] },
  },
  {
    name: 'export_svg',
    title: 'Export SVG',
    description: 'Export a diagram as SVG.',
    inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, timeoutMs: { type: 'number' } } },
    readOnly: true,
  },
  {
    name: 'export_png',
    title: 'Export PNG',
    description: 'Export a diagram as PNG.',
    inputSchema: { type: 'object', properties: { diagramId: { type: 'string' }, background: { type: 'string' }, scale: { type: 'number' }, timeoutMs: { type: 'number' } } },
    readOnly: true,
  },
]

/** True when the browser supports the WebMCP API (production or testing). */
export function isWebMcpSupported(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    ('modelContext' in navigator && navigator.modelContext != null)
    || ('modelContextTesting' in navigator)
  )
}

/** Returns the modelContext API if available (production or testing shim). */
function getModelContext(): ModelContext | undefined {
  if (typeof navigator === 'undefined') return undefined
  if ('modelContext' in navigator && navigator.modelContext != null) return navigator.modelContext
  return undefined
}

interface UseWebMcpOptions {
  executeCommand: (command: BrowserCommandEnvelope) => Promise<unknown>
}

/**
 * Registers Pretty Fish tools via the WebMCP browser API when available.
 * Falls back silently when unsupported — the relay path handles that case.
 */
export const WEB_MCP_TOOL_COUNT = TOOLS.length

export function useWebMcp({ executeCommand }: UseWebMcpOptions) {
  const executeRef = useRef(executeCommand)
  useEffect(() => { executeRef.current = executeCommand }, [executeCommand])

  useEffect(() => {
    const ctx = getModelContext()
    if (!ctx) return

    const controller = new AbortController()

    for (const tool of TOOLS) {
      try {
        ctx.registerTool(
          {
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.readOnly ? { readOnlyHint: true } : undefined,
            execute: async (input: Record<string, unknown>) => {
              const envelope: BrowserCommandEnvelope = {
                id: crypto.randomUUID(),
                type: tool.name,
                args: input,
              }
              return executeRef.current(envelope)
            },
          },
          { signal: controller.signal },
        )
      } catch {
        // Tool already registered or API error — skip silently
      }
    }

    return () => controller.abort()
  }, [])

  return { supported: isWebMcpSupported() }
}
