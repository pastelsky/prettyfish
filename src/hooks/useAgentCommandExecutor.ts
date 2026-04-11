import { useCallback, useEffect, useRef } from 'react'

import { buildPngBlob, buildSvgBlob } from '@/lib/export'
import type { AppStoreState } from '@/state/appStore'
import type { AppState, Diagram, DiagramPage } from '@/types'

export type BridgeCommandName =
  | 'create_page'
  | 'create_diagram'
  | 'set_diagram_code'
  | 'render_status'
  | 'export_svg'
  | 'export_png'
  | 'get_snapshot'

export interface BrowserCommandEnvelope {
  id: string
  type: BridgeCommandName
  args?: Record<string, unknown>
}

interface AgentCommandExecutorOptions {
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
  createPageWithName,
  createDiagramWithOptions,
  selectDiagram,
  updateDiagramCode,
}: AgentCommandExecutorOptions) {
  const stateRef = useRef(state)
  const getStateRef = useRef(getState)
  const createPageWithNameRef = useRef(createPageWithName)
  const createDiagramWithOptionsRef = useRef(createDiagramWithOptions)
  const selectDiagramRef = useRef(selectDiagram)
  const updateDiagramCodeRef = useRef(updateDiagramCode)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    getStateRef.current = getState
    createPageWithNameRef.current = createPageWithName
    createDiagramWithOptionsRef.current = createDiagramWithOptions
    selectDiagramRef.current = selectDiagram
    updateDiagramCodeRef.current = updateDiagramCode
  }, [createDiagramWithOptions, createPageWithName, getState, selectDiagram, updateDiagramCode])

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

  const waitForPage = useCallback((pageId: string, timeoutMs = 4_000) => {
    const start = Date.now()

    return new Promise<DiagramPage>((resolve, reject) => {
      const poll = () => {
        const page = stateRef.current.pages.find((candidate) => candidate.id === pageId)
        if (page) {
          resolve(page)
          return
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for page: ${pageId}`))
          return
        }
        window.setTimeout(poll, 50)
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
    const liveState = stateRef.current
    const args = command.args || {}

    switch (command.type) {
      case 'create_page': {
        const pageName = typeof args.name === 'string' ? args.name : undefined
        const pageCode = typeof args.code === 'string' ? args.code : ''
        const pageId = createPageWithNameRef.current(pageName, pageCode)
        const page = await waitForPage(pageId)
        return { page: summarizePage(page) }
      }

      case 'create_diagram': {
        const diagramId = createDiagramWithOptionsRef.current({
          pageId: typeof args.pageId === 'string' ? args.pageId : undefined,
          name: typeof args.name === 'string' ? args.name : undefined,
          code: typeof args.code === 'string' ? args.code : undefined,
          width: typeof args.width === 'number' ? args.width : undefined,
        })
        if (!diagramId) throw new Error('Unable to create diagram')
        const match = await waitForDiagram(diagramId)
        return { diagram: summarizeDiagram(match.page, match.diagram) }
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

      case 'render_status': {
        const diagramId = typeof args.diagramId === 'string' ? args.diagramId : getActiveDiagramId(liveState)
        if (!diagramId) throw new Error('diagramId is required')
        const match = findDiagram(liveState.pages, diagramId)
        if (!match) throw new Error(`Diagram not found: ${diagramId}`)
        return {
          diagram: summarizeDiagram(match.page, match.diagram),
          render: {
            status: match.diagram.render?.status ?? 'queued',
            error: match.diagram.render?.error ?? null,
            svgWidth: match.diagram.render?.svgWidth ?? null,
            svgHeight: match.diagram.render?.svgHeight ?? null,
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

      case 'get_snapshot':
        return { snapshot: getStateRef.current() }

      default:
        throw new Error(`Unsupported bridge command: ${command.type}`)
    }
  }, [waitForDiagram, waitForDiagramRender, waitForPage])

  return { executeCommand }
}
