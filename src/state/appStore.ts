import type {
  AppMode,
  Diagram,
  DiagramConfig,
  DiagramConfigOverrides,
  DiagramPage,
  MermaidRenderError,
  MermaidTheme,
} from '../types'
import { DEFAULT_DIAGRAM_CONFIG } from '../types'
import { getDiagramRenderHash } from '../lib/render'

export interface ContextMenuState {
  type: 'diagram' | 'canvas'
  id?: string
  x: number
  y: number
}

export interface UndoableDocumentState {
  pages: DiagramPage[]
  activePageId: string
  mode: AppMode
  editorLigatures: boolean
  autoFormat: boolean
}

export interface AppUiState {
  sidebarOpen: boolean
  docsOpen: boolean
  helpOpen: boolean
  contextMenu: ContextMenuState | null
  sidebarWidth: number | null
}

export interface AppStoreState extends UndoableDocumentState {
  ui: AppUiState
}

export type AppAction =
  | { type: 'document/restore'; snapshot: UndoableDocumentState }
  | { type: 'document/set-mode'; mode: AppMode }
  | { type: 'document/set-editor-ligatures'; value: boolean }
  | { type: 'document/set-auto-format'; value: boolean }
  | { type: 'page/select'; pageId: string }
  | { type: 'page/add'; page: DiagramPage }
  | { type: 'page/delete'; pageId: string }
  | { type: 'page/rename'; pageId: string; name: string }
  | { type: 'diagram/select'; pageId: string; diagramId: string }
  | { type: 'diagram/add'; pageId: string; diagram: Diagram }
  | { type: 'diagram/duplicate'; pageId: string; diagram: Diagram }
  | { type: 'diagram/delete'; pageId: string; diagramId: string }
  | { type: 'diagram/rename'; diagramId: string; name: string }
  | { type: 'diagram/update-description'; diagramId: string; description?: string }
  | { type: 'diagram/move'; diagramId: string; x: number; y: number }
  | { type: 'diagram/resize'; diagramId: string; width: number }
  | { type: 'diagram/update-code'; diagramId: string; code: string }
  | { type: 'diagram/update-config'; diagramId: string; config: DiagramConfig }
  | { type: 'diagram/update-theme'; diagramId: string; theme: MermaidTheme }
  | { type: 'render/mark-rendering'; diagramId: string; inputHash: string }
  | { type: 'render/complete'; diagramId: string; inputHash: string; svg: string; error: MermaidRenderError | null; svgWidth: number | null; svgHeight: number | null }
  | { type: 'ui/set-sidebar-open'; open: boolean }
  | { type: 'ui/toggle-sidebar' }
  | { type: 'ui/set-docs-open'; open: boolean }
  | { type: 'ui/set-help-open'; open: boolean }
  | { type: 'ui/set-context-menu'; menu: ContextMenuState | null }
  | { type: 'ui/set-sidebar-width'; width: number | null }

export function createStoreState(document: UndoableDocumentState, ui: AppUiState): AppStoreState {
  return { ...document, ui }
}

export function stripDocumentSnapshot(state: AppStoreState): UndoableDocumentState {
  return {
    pages: state.pages,
    activePageId: state.activePageId,
    mode: state.mode,
    editorLigatures: state.editorLigatures,
    autoFormat: state.autoFormat,
  }
}

export function findDiagramById(pages: DiagramPage[], diagramId: string): { page: DiagramPage; diagram: Diagram } | null {
  for (const page of pages) {
    const diagram = page.diagrams.find(candidate => candidate.id === diagramId)
    if (diagram) return { page, diagram }
  }
  return null
}

export function buildDuplicateName(page: DiagramPage, name: string): string {
  const existingNames = new Set(page.diagrams.map(a => a.name))
  const baseName = `${name} Copy`
  let nextName = baseName
  let suffix = 2
  while (existingNames.has(nextName)) {
    nextName = `${baseName} ${suffix}`
    suffix += 1
  }
  return nextName
}

export function queueDiagramRender(diagram: Diagram): Diagram {
  return {
    ...diagram,
    render: {
      status: 'queued',
      svg: diagram.render?.svg ?? '',
      error: diagram.render?.error ?? null,
      svgWidth: diagram.render?.svgWidth ?? null,
      svgHeight: diagram.render?.svgHeight ?? null,
      inputHash: getDiagramRenderHash(diagram),
      outputHash: diagram.render?.outputHash ?? null,
    },
  }
}

function updatePage(pages: DiagramPage[], pageId: string, updater: (page: DiagramPage) => DiagramPage): DiagramPage[] {
  return pages.map(page => page.id === pageId ? updater(page) : page)
}

function updateDiagram(pages: DiagramPage[], diagramId: string, updater: (diagram: Diagram) => Diagram): DiagramPage[] {
  return pages.map(page => ({
    ...page,
    diagrams: page.diagrams.map(diagram => diagram.id === diagramId ? updater(diagram) : diagram),
  }))
}

function deriveConfigOverrides(config: DiagramConfig): DiagramConfigOverrides {
  const overrides: DiagramConfigOverrides = {}
  for (const key of Object.keys(config) as (keyof DiagramConfig)[]) {
    const defaultVal = DEFAULT_DIAGRAM_CONFIG[key]
    const newVal = config[key]
    if (JSON.stringify(newVal) !== JSON.stringify(defaultVal)) {
      ;(overrides as Record<string, unknown>)[key] = newVal
    }
  }
  return overrides
}

export function pickNextQueuedDiagram(
  pages: DiagramPage[],
  activePageId: string,
  activeDiagramId: string | null,
): Diagram | null {
  if (activeDiagramId) {
    const active = findDiagramById(pages, activeDiagramId)?.diagram
    if (active?.render?.status === 'queued') return active
  }

  const activePage = pages.find(page => page.id === activePageId)
  const activePageQueued = activePage?.diagrams.find(diagram => diagram.render?.status === 'queued')
  if (activePageQueued) return activePageQueued

  for (const page of pages) {
    const queued = page.diagrams.find(diagram => diagram.render?.status === 'queued')
    if (queued) return queued
  }

  return null
}

export function appStoreReducer(state: AppStoreState, action: AppAction): AppStoreState {
  switch (action.type) {
    case 'document/restore':
      return { ...state, ...action.snapshot, ui: { ...state.ui, contextMenu: null } }
    case 'document/set-mode':
      return { ...state, mode: action.mode }
    case 'document/set-editor-ligatures':
      return { ...state, editorLigatures: action.value }
    case 'document/set-auto-format':
      return { ...state, autoFormat: action.value }
    case 'page/select':
      return { ...state, activePageId: action.pageId, ui: { ...state.ui, contextMenu: null } }
    case 'page/add':
      return {
        ...state,
        pages: [...state.pages, action.page],
        activePageId: action.page.id,
        ui: { ...state.ui, sidebarOpen: true },
      }
    case 'page/delete': {
      if (state.pages.length === 1) return state
      const currentIndex = state.pages.findIndex(page => page.id === action.pageId)
      const nextPages = state.pages.filter(page => page.id !== action.pageId)
      const nextActivePageId = state.activePageId === action.pageId
        ? nextPages[Math.min(Math.max(currentIndex - 1, 0), nextPages.length - 1)]?.id ?? nextPages[0]!.id
        : state.activePageId
      return { ...state, pages: nextPages, activePageId: nextActivePageId, ui: { ...state.ui, contextMenu: null } }
    }
    case 'page/rename':
      return { ...state, pages: updatePage(state.pages, action.pageId, page => ({ ...page, name: action.name })) }
    case 'diagram/select':
      return {
        ...state,
        pages: updatePage(state.pages, action.pageId, page => ({ ...page, activeDiagramId: action.diagramId })),
        ui: { ...state.ui, sidebarOpen: true, contextMenu: null },
      }
    case 'diagram/add':
      return {
        ...state,
        pages: updatePage(state.pages, action.pageId, page => ({
          ...page,
          diagrams: [...page.diagrams, action.diagram],
          activeDiagramId: action.diagram.id,
        })),
        ui: { ...state.ui, sidebarOpen: true },
      }
    case 'diagram/duplicate':
      return {
        ...state,
        pages: updatePage(state.pages, action.pageId, page => ({
          ...page,
          diagrams: [...page.diagrams, action.diagram],
          activeDiagramId: action.diagram.id,
        })),
        ui: { ...state.ui, sidebarOpen: true, contextMenu: null },
      }
    case 'diagram/delete':
      return {
        ...state,
        pages: updatePage(state.pages, action.pageId, page => {
          const remaining = page.diagrams.filter(diagram => diagram.id !== action.diagramId)
          return {
            ...page,
            diagrams: remaining,
            activeDiagramId: page.activeDiagramId === action.diagramId ? (remaining[0]?.id ?? null) : page.activeDiagramId,
          }
        }),
        ui: { ...state.ui, contextMenu: null },
      }
    case 'diagram/rename':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => ({ ...diagram, name: action.name })) }
    case 'diagram/update-description':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => ({ ...diagram, description: action.description })) }
    case 'diagram/move':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => ({ ...diagram, x: action.x, y: action.y })) }
    case 'diagram/resize':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => ({ ...diagram, width: action.width })) }
    case 'diagram/update-code':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => queueDiagramRender({ ...diagram, code: action.code })) }
    case 'diagram/update-config':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => queueDiagramRender({ ...diagram, configOverrides: deriveConfigOverrides(action.config) })) }
    case 'diagram/update-theme':
      return { ...state, pages: updateDiagram(state.pages, action.diagramId, diagram => queueDiagramRender({ ...diagram, mermaidTheme: action.theme })) }
    case 'render/mark-rendering':
      return {
        ...state,
        pages: updateDiagram(state.pages, action.diagramId, diagram => ({
          ...diagram,
          render: {
            status: 'rendering',
            svg: diagram.render?.svg ?? '',
            error: diagram.render?.error ?? null,
            svgWidth: diagram.render?.svgWidth ?? null,
            svgHeight: diagram.render?.svgHeight ?? null,
            inputHash: action.inputHash,
            outputHash: diagram.render?.outputHash ?? null,
          },
        })),
      }
    case 'render/complete':
      return {
        ...state,
        pages: updateDiagram(state.pages, action.diagramId, diagram => {
          const expectedHash = getDiagramRenderHash(diagram)
          if (expectedHash !== action.inputHash) {
            return queueDiagramRender(diagram)
          }
          return {
            ...diagram,
            render: {
              status: action.error ? 'error' : 'ready',
              svg: action.svg,
              error: action.error,
              svgWidth: action.svgWidth,
              svgHeight: action.svgHeight,
              inputHash: action.inputHash,
              outputHash: action.inputHash,
            },
          }
        }),
      }
    case 'ui/set-sidebar-open':
      return { ...state, ui: { ...state.ui, sidebarOpen: action.open } }
    case 'ui/toggle-sidebar':
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } }
    case 'ui/set-docs-open':
      return { ...state, ui: { ...state.ui, docsOpen: action.open } }
    case 'ui/set-help-open':
      return { ...state, ui: { ...state.ui, helpOpen: action.open } }
    case 'ui/set-context-menu':
      return { ...state, ui: { ...state.ui, contextMenu: action.menu } }
    case 'ui/set-sidebar-width':
      return { ...state, ui: { ...state.ui, sidebarWidth: action.width } }
    default:
      return state
  }
}
