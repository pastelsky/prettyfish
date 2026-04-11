import { useCallback, useMemo, useReducer, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  createPage,
  resolveConfig,
  stripRuntimePagesState,
  withRuntimePagesState,
  type AppState,
  type Diagram,
  type DiagramConfig,
  type DiagramConfigOverrides,
  type DiagramPage,
  type MermaidTheme,
} from '../types'
import { CUSTOM_THEME_PRESETS } from '../lib/themePresets'
import {
  appStoreReducer,
  createStoreState,
  stripDocumentSnapshot,
  type AppStoreState,
  type UndoableDocumentState,
} from '../state/appStore'
import { useDocumentHistory } from './useDocumentHistory'
import { useRenderQueue } from './useRenderQueue'
import { usePersistenceSync } from './usePersistenceSync'
import { usePageActions } from './usePageActions'
import { useDiagramActions } from './useDiagramActions'
import { useClipboard } from './useClipboard'
import { useProjectIO } from './useProjectIO'

const HISTORY_LIMIT = 100

function getInitialDocumentState(): UndoableDocumentState {
  const defaultPage = createPage('Page 1', '')
  const pages = withRuntimePagesState([defaultPage])
  return {
    pages,
    activePageId: pages[0]!.id,
    mode: (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light',
    editorLigatures: true,
    autoFormat: true,
  }
}

function getInitialSidebarWidth(): number | null {
  try {
    const stored = sessionStorage.getItem('diagram-studio:sidebar-width')
    return stored ? Number(stored) : null
  } catch {
    return null
  }
}

export interface AppController {
  state: AppStoreState
  activePage: DiagramPage
  activeDiagram: Diagram | null
  mermaidTheme: MermaidTheme
  diagramConfig: DiagramConfig
  hasCopied: boolean
  restoreSnapshot: (snapshot: UndoableDocumentState) => void
  registerFocusDiagram: (fn: (id: string) => void) => void
  registerInsertHandler: (fn: (text: string) => void) => void
  registerEditorFocusHandler: (fn: () => void) => void
  insertText: (text: string) => void
  focusEditor: () => void
  setHasCopied: Dispatch<SetStateAction<boolean>>
  addPage: () => string
  createPageWithName: (name?: string, code?: string) => string
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
  addDiagram: () => string
  createDiagramWithOptions: (options?: {
    pageId?: string
    name?: string
    code?: string
    width?: number
    mermaidTheme?: MermaidTheme
  }) => string | undefined
  selectDiagram: (diagramId: string) => void
  focusDiagram: (diagramId: string) => void
  renameDiagram: (diagramId: string, name: string) => void
  updateDiagramDescription: (diagramId: string, description: string) => void
  copyDiagram: (diagramId: string) => void
  copyActiveDiagram: () => void
  pasteDiagram: () => void
  duplicateDiagram: (source: Diagram) => string | undefined
  deleteDiagram: (diagramId: string) => void
  moveDiagram: (diagramId: string, x: number, y: number) => void
  resizeDiagram: (diagramId: string, width: number) => void
  updateCode: (value: string) => void
  updateDiagramCode: (diagramId: string, value: string) => void
  setDiagramConfig: (config: DiagramConfig) => void
  setMermaidTheme: (theme: MermaidTheme) => void
  saveProject: () => void
  loadProject: () => Promise<void>
  resetWorkspace: () => Promise<void>
  undo: () => void
  redo: () => void
  getState: () => AppState
  getShareState: () => AppState
  getShareStateForDiagram: (diagramId: string) => AppState
  copyContextShare: (diagramId: string) => Promise<void>
  dispatch: Dispatch<import('../state/appStore').AppAction>
}

export function useAppController(isMobile: boolean): AppController {
  const [state, dispatch] = useReducer(
    appStoreReducer,
    undefined,
    () => createStoreState(getInitialDocumentState(), {
      sidebarOpen: !isMobile,
      docsOpen: false,
      helpOpen: false,
      contextMenu: null,
      sidebarWidth: getInitialSidebarWidth(),
    }),
  )

  // ── Refs for imperative canvas/editor callbacks ──────────────────────────────
  const focusDiagramRef = useRef<((id: string) => void) | null>(null)
  const insertRef = useRef<((text: string) => void) | null>(null)
  const editorFocusRef = useRef<(() => void) | null>(null)

  // ── Derived active page / diagram ────────────────────────────────────────────
  const pageById = useMemo(() => new Map(state.pages.map(page => [page.id, page])), [state.pages])
  const activePage = pageById.get(state.activePageId) ?? state.pages[0]!
  const diagramById = useMemo(
    () => new Map(activePage.diagrams.map(diagram => [diagram.id, diagram])),
    [activePage.diagrams],
  )
  const activeDiagram = activePage.activeDiagramId
    ? diagramById.get(activePage.activeDiagramId) ?? null
    : null

  const mermaidTheme: MermaidTheme = activeDiagram?.mermaidTheme ?? 'default'
  const diagramConfig = resolveConfig(
    CUSTOM_THEME_PRESETS[mermaidTheme]?.configOverrides as DiagramConfigOverrides | undefined,
    activeDiagram?.configOverrides,
  )

  // ── Undo / redo ──────────────────────────────────────────────────────────────
  const makeSnapshot = useCallback((): UndoableDocumentState => stripDocumentSnapshot({
    ...state,
    pages: structuredClone(stripRuntimePagesState(state.pages)),
  }), [state])

  const restoreSnapshot = useCallback((snapshot: UndoableDocumentState) => {
    dispatch({
      type: 'document/restore',
      snapshot: { ...snapshot, pages: withRuntimePagesState(snapshot.pages) },
    })
  }, [])

  const { pushUndoSnapshot, undo, redo, clearHistory } = useDocumentHistory({
    limit: HISTORY_LIMIT,
    makeSnapshot,
    restoreSnapshot,
  })

  // ── Imperative ref registration callbacks ────────────────────────────────────
  const registerFocusDiagram = useCallback((fn: (id: string) => void) => {
    focusDiagramRef.current = fn
  }, [])
  const registerInsertHandler = useCallback((fn: (text: string) => void) => {
    insertRef.current = fn
  }, [])
  const registerEditorFocusHandler = useCallback((fn: () => void) => {
    editorFocusRef.current = fn
  }, [])
  const insertText = useCallback((text: string) => { insertRef.current?.(text) }, [])
  const focusEditor = useCallback(() => { editorFocusRef.current?.() }, [])

  // ── Focused action slices ────────────────────────────────────────────────────
  const pageActions = usePageActions({ pages: state.pages, dispatch, pushUndoSnapshot, pageById })

  const diagramActions = useDiagramActions({
    pages: state.pages,
    activePage,
    activeDiagram,
    dispatch,
    pushUndoSnapshot,
    focusDiagramRef,
  })

  const clipboard = useClipboard({
    pages: state.pages,
    activeDiagram,
    duplicateDiagram: diagramActions.duplicateDiagram,
  })

  const projectIO = useProjectIO({
    state,
    activeDiagram,
    dispatch,
    clearHistory,
    restoreSnapshot,
    getInitialDocumentState,
  })

  // ── Side effects: persistence sync + render queue ───────────────────────────
  usePersistenceSync({ state, dispatch })
  useRenderQueue({
    pages: state.pages,
    activePageId: state.activePageId,
    activeDiagramId: activeDiagram?.id ?? null,
    dispatch,
  })

  return {
    state,
    activePage,
    activeDiagram,
    mermaidTheme,
    diagramConfig,
    restoreSnapshot,
    registerFocusDiagram,
    registerInsertHandler,
    registerEditorFocusHandler,
    insertText,
    focusEditor,
    dispatch,
    undo,
    redo,
    ...pageActions,
    ...diagramActions,
    ...clipboard,
    ...projectIO,
  }
}
