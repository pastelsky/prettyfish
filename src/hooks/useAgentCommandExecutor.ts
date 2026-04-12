import { useCallback, useEffect, useRef } from 'react'

import { captureEvent } from '@/lib/analytics'
import { buildPngBlob, buildSvgBlob } from '@/lib/export'
import { DIAGRAM_REFS, getRef } from '@/lib/reference'
import type { AppStoreState } from '@/state/appStore'
import type { AppState, Diagram, DiagramPage, MermaidTheme } from '@/types'
import { MERMAID_THEMES } from '@/types'

export type BridgeCommandName =
  | 'list_diagrams'
  | 'get_diagram'
  | 'list_diagram_types'
  | 'get_diagram_reference'
  | 'list_themes'
  | 'set_theme'
  | 'create_diagram'
  | 'set_diagram_code'
  | 'export_svg'
  | 'export_png'

export interface BrowserCommandEnvelope {
  id: string
  type: BridgeCommandName
  args?: Record<string, unknown>
}

interface AgentCommandExecutorOptions {
  state: AppStoreState
  getState: () => AppState
  setDiagramTheme: (diagramId: string, theme: MermaidTheme) => void
  createDiagramWithOptions: (options?: {
    pageId?: string
    name?: string
    code?: string
    width?: number
    mermaidTheme?: MermaidTheme
  }) => string | undefined
  selectDiagram: (diagramId: string) => void
  updateDiagramCode: (diagramId: string, code: string) => void
}

function findDiagram(pages: DiagramPage[], diagramId: string): { page: DiagramPage; diagram: Diagram } | null {
  for (const page of pages) {
    const diagram = page.diagrams.find((candidate) => candidate.id === diagramId)
    if (diagram) return { page, diagram }
  }
  return null
}

function summarizePage(page: DiagramPage) {
  return {
    id: page.id,
    name: page.name,
    activeDiagramId: page.activeDiagramId,
    diagramCount: page.diagrams.length,
  }
}

function summarizeDiagram(page: DiagramPage, diagram: Diagram) {
  return {
    id: diagram.id,
    pageId: page.id,
    pageName: page.name,
    name: diagram.name,
    description: diagram.description ?? null,
    width: diagram.width,
    x: diagram.x,
    y: diagram.y,
    mermaidTheme: diagram.mermaidTheme ?? 'default',
    renderStatus: diagram.render?.status ?? 'queued',
    hasRenderError: Boolean(diagram.render?.error),
  }
}

function getActiveDiagramId(state: AppStoreState): string | null {
  const activePage = state.pages.find((page) => page.id === state.activePageId) ?? state.pages[0]
  return activePage?.activeDiagramId ?? null
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (const value of bytes) binary += String.fromCharCode(value)
  return btoa(binary)
}

export function useAgentCommandExecutor({
  state,
  getState,
  setDiagramTheme,
  createDiagramWithOptions,
  selectDiagram,
  updateDiagramCode,
}: AgentCommandExecutorOptions) {
  const stateRef = useRef(state)
  const getStateRef = useRef(getState)
  const setDiagramThemeRef = useRef(setDiagramTheme)
  const createDiagramWithOptionsRef = useRef(createDiagramWithOptions)
  const selectDiagramRef = useRef(selectDiagram)
  const updateDiagramCodeRef = useRef(updateDiagramCode)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    getStateRef.current = getState
    setDiagramThemeRef.current = setDiagramTheme
    createDiagramWithOptionsRef.current = createDiagramWithOptions
    selectDiagramRef.current = selectDiagram
    updateDiagramCodeRef.current = updateDiagramCode
  }, [createDiagramWithOptions, getState, selectDiagram, setDiagramTheme, updateDiagramCode])

  const waitForDiagramRender = useCallback((diagramId: string, timeoutMs = 8_000) => {
    const start = Date.now()

    return new Promise<Diagram>((resolve, reject) => {
      const poll = () => {
        const match = findDiagram(stateRef.current.pages, diagramId)
        if (!match) {
          reject(new Error(`Diagram not found: ${diagramId}`))
          return
        }

        const { diagram } = match
        if (diagram.render?.status === 'ready') {
          resolve(diagram)
          return
        }
        if (diagram.render?.status === 'error') {
          reject(new Error(diagram.render.error?.message || 'Diagram render failed'))
          return
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for render: ${diagramId}`))
          return
        }

        window.setTimeout(poll, 120)
      }

      poll()
    })
  }, [])

  const waitForDiagram = useCallback((diagramId: string, timeoutMs = 4_000) => {
    const start = Date.now()

    return new Promise<{ page: DiagramPage; diagram: Diagram }>((resolve, reject) => {
      const poll = () => {
        const match = findDiagram(stateRef.current.pages, diagramId)
        if (match) {
          resolve(match)
          return
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for diagram: ${diagramId}`))
          return
        }
        window.setTimeout(poll, 50)
      }

      poll()
    })
  }, [])

  const executeCommand = useCallback(async (command: BrowserCommandEnvelope) => {
    captureEvent('mcp_tool_called', { tool: command.type })
    const liveState = stateRef.current
    const args = command.args || {}

    switch (command.type) {
      case 'list_diagrams': {
        const activePage = liveState.pages.find((p) => p.id === liveState.activePageId) ?? liveState.pages[0]
        if (!activePage) throw new Error('No active page')
        const includeCode = args.include_code === true
        return {
          page: summarizePage(activePage),
          diagrams: activePage.diagrams.map((d) => ({
            id: d.id,
            name: d.name,
            ...(includeCode ? { code: d.code } : {}),
          })),
        }
      }

      case 'get_diagram': {
        const activePage = liveState.pages.find((p) => p.id === liveState.activePageId) ?? liveState.pages[0]
        if (!activePage) throw new Error('No active page')
        const targetId = typeof args.diagramId === 'string' ? args.diagramId : ''
        const targetName = typeof args.name === 'string' ? args.name : ''

        let match: { page: DiagramPage; diagram: Diagram } | null = null
        if (targetId) {
          match = findDiagram(liveState.pages, targetId)
        } else if (targetName) {
          const lower = targetName.toLowerCase()
          const diagram = activePage.diagrams.find(
            (d) => d.name.toLowerCase() === lower
              || d.name.toLowerCase().includes(lower)
              || lower.includes(d.name.toLowerCase()),
          )
          if (diagram) match = { page: activePage, diagram }
        }

        if (!match) {
          const available = activePage.diagrams.map((d) => ({ id: d.id, name: d.name }))
          return {
            error: `Diagram not found. Use list_diagrams to see available diagrams.`,
            available,
          }
        }

        return {
          diagram: {
            ...summarizeDiagram(match.page, match.diagram),
            code: match.diagram.code,
          },
        }
      }

      case 'list_diagram_types': {
        return {
          types: Object.entries(DIAGRAM_REFS).map(([id, ref]) => ({
            id,
            label: ref.label,
          })),
        }
      }

      case 'get_diagram_reference': {
        const typeName = typeof args.type === 'string' ? args.type.toLowerCase() : ''
        if (!typeName) {
          return {
            error: 'Please provide a diagram type. Use list_diagram_types to see available types.',
            available: Object.keys(DIAGRAM_REFS),
          }
        }
        const ref = getRef(typeName)
        if (ref.id === 'generic' && typeName !== 'generic') {
          return {
            error: `Unknown diagram type: "${typeName}". Use list_diagram_types to see available types.`,
            available: Object.keys(DIAGRAM_REFS),
          }
        }
        return {
          type: ref.id,
          label: ref.label,
          elements: ref.elements.map((el) => ({
            name: el.name,
            syntax: el.syntax,
            description: el.description,
            examples: el.examples,
          })),
        }
      }

      case 'list_themes': {
        return {
          themes: MERMAID_THEMES.map((t) => ({
            id: t.value,
            label: t.label,
            group: t.group,
          })),
        }
      }

      case 'set_theme': {
        const diagramId = typeof args.diagramId === 'string' ? args.diagramId : getActiveDiagramId(liveState)
        if (!diagramId) throw new Error('diagramId is required')
        const match = findDiagram(liveState.pages, diagramId)
        if (!match) throw new Error(`Diagram not found: ${diagramId}`)
        const theme = typeof args.theme === 'string' ? args.theme : undefined
        if (!theme) throw new Error('theme is required. Use list_themes to see available themes.')
        const valid = MERMAID_THEMES.find((t) => t.value === theme)
        if (!valid) {
          return {
            error: `Unknown theme: "${theme}". Use list_themes to see available themes.`,
            available: MERMAID_THEMES.map((t) => t.value),
          }
        }
        setDiagramThemeRef.current(diagramId, theme as MermaidTheme)
        return { diagram: summarizeDiagram(match.page, match.diagram), theme: valid.value }
      }

      case 'create_diagram': {
        const diagramId = createDiagramWithOptionsRef.current({
          name: typeof args.name === 'string' ? args.name : undefined,
          code: typeof args.code === 'string' ? args.code : undefined,
          width: typeof args.width === 'number' ? args.width : undefined,
          mermaidTheme: typeof args.theme === 'string' ? (args.theme as MermaidTheme) : undefined,
        })
        if (!diagramId) throw new Error('Unable to create diagram')
        // Wait for diagram to exist in state, then wait for render to complete.
        // This ensures the agent gets back the actual render result (including any
        // syntax errors) rather than a 'queued' status with no useful feedback.
        await waitForDiagram(diagramId)
        let rendered: Diagram
        try {
          rendered = await waitForDiagramRender(diagramId)
        } catch (renderError) {
          // Render failed (syntax error etc) — find the diagram and return the error
          // so the agent can fix the code rather than silently producing a broken diagram.
          const latestMatch = findDiagram(stateRef.current.pages, diagramId)
          if (!latestMatch) throw renderError
          return {
            diagram: summarizeDiagram(latestMatch.page, latestMatch.diagram),
            render: {
              status: 'error',
              error: renderError instanceof Error ? renderError.message : 'Render failed',
            },
            hint: 'The diagram was created but failed to render. Fix the Mermaid syntax and call set_diagram_code with the corrected code.',
          }
        }
        const latestMatch = findDiagram(stateRef.current.pages, diagramId)
        if (!latestMatch) throw new Error(`Diagram not found after render: ${diagramId}`)
        return {
          diagram: summarizeDiagram(latestMatch.page, rendered),
          render: {
            status: rendered.render?.status ?? 'ready',
            error: rendered.render?.error ?? null,
            svgWidth: rendered.render?.svgWidth ?? null,
            svgHeight: rendered.render?.svgHeight ?? null,
          },
        }
      }

      case 'set_diagram_code': {
        const diagramId = typeof args.diagramId === 'string' ? args.diagramId : ''
        const code = typeof args.code === 'string' ? args.code : ''
        if (!diagramId) throw new Error('diagramId is required')
        updateDiagramCodeRef.current(diagramId, code)
        const match = findDiagram(stateRef.current.pages, diagramId)
        if (args.select !== false && match?.page.id === stateRef.current.activePageId) {
          selectDiagramRef.current(diagramId)
        }
        const rendered = await waitForDiagramRender(
          diagramId,
          typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
        )
        const latestMatch = findDiagram(stateRef.current.pages, diagramId)
        if (!latestMatch) throw new Error(`Diagram not found after render: ${diagramId}`)
        return {
          diagram: summarizeDiagram(latestMatch.page, rendered),
          render: {
            status: rendered.render?.status ?? 'queued',
            error: rendered.render?.error ?? null,
            svgWidth: rendered.render?.svgWidth ?? null,
            svgHeight: rendered.render?.svgHeight ?? null,
          },
        }
      }


      case 'export_svg': {
        const diagramId = typeof args.diagramId === 'string' ? args.diagramId : getActiveDiagramId(liveState)
        if (!diagramId) throw new Error('diagramId is required')
        const match = findDiagram(liveState.pages, diagramId)
        if (!match) throw new Error(`Diagram not found: ${diagramId}`)
        const diagram = await waitForDiagramRender(diagramId, typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined)
        if (!diagram.render?.svg) throw new Error('No rendered SVG available')
        const blob = await buildSvgBlob(diagram.render.svg)
        return {
          diagram: summarizeDiagram(match.page, diagram),
          mimeType: blob.type,
          fileName: `${diagram.name || 'diagram'}.svg`,
          data: await blobToBase64(blob),
        }
      }

      case 'export_png': {
        const diagramId = typeof args.diagramId === 'string' ? args.diagramId : getActiveDiagramId(liveState)
        if (!diagramId) throw new Error('diagramId is required')
        const match = findDiagram(liveState.pages, diagramId)
        if (!match) throw new Error(`Diagram not found: ${diagramId}`)
        const diagram = await waitForDiagramRender(diagramId, typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined)
        if (!diagram.render?.svg) throw new Error('No rendered SVG available')
        const blob = await buildPngBlob(
          diagram.render.svg,
          typeof args.background === 'string' ? args.background : '#ffffff',
          typeof args.scale === 'number' ? args.scale : 2,
        )
        return {
          diagram: summarizeDiagram(match.page, diagram),
          mimeType: blob.type || 'image/png',
          fileName: `${diagram.name || 'diagram'}.png`,
          data: await blobToBase64(blob),
        }
      }

      default:
        throw new Error(`Unsupported bridge command: ${command.type}`)
    }
  }, [waitForDiagram, waitForDiagramRender])

  return { executeCommand }
}
