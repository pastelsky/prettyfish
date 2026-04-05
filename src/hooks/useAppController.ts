import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { clearPersistedDocumentState, nextDiagramPosition } from '../lib/storage'
import { loadProjectFile, saveProjectFile } from '../lib/file'
import { copyShareUrl } from '../lib/share'
import {
  createDiagram,
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
  buildDuplicateName,
  createStoreState,
  findDiagramById,
  queueDiagramRender,
  stripDocumentSnapshot,
  type AppStoreState,
  type UndoableDocumentState,
} from '../state/appStore'
import { useDocumentHistory } from './useDocumentHistory'
import { useRenderQueue } from './useRenderQueue'
import { usePersistenceSync } from './usePersistenceSync'

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

function stripSingleDiagram(diagram: Diagram): Diagram {
  const [page] = stripRuntimePagesState([{
    id: 'shared',
    name: 'Shared',
    activeDiagramId: diagram.id,
    diagrams: [diagram],
  }])
  return page!.diagrams[0]!
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
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
  addDiagram: () => string
  selectDiagram: (diagramId: string) => void
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

  const [hasCopied, setHasCopied] = useState(false)
  const copiedDiagramRef = useRef<Diagram | null>(null)

  const focusDiagramRef = useRef<((id: string) => void) | null>(null)
  const insertRef = useRef<((text: string) => void) | null>(null)
  const editorFocusRef = useRef<(() => void) | null>(null)

  const pageById = useMemo(() => new Map(state.pages.map(page => [page.id, page])), [state.pages])
  const activePage = pageById.get(state.activePageId) ?? state.pages[0]!
  const diagramById = useMemo(() => new Map(activePage.diagrams.map(diagram => [diagram.id, diagram])), [activePage.diagrams])
  const activeDiagram = activePage.activeDiagramId ? diagramById.get(activePage.activeDiagramId) ?? null : null

  const mermaidTheme: MermaidTheme = activeDiagram?.mermaidTheme ?? 'default'
  const diagramConfig = resolveConfig(
    CUSTOM_THEME_PRESETS[mermaidTheme]?.configOverrides as DiagramConfigOverrides | undefined,
    activeDiagram?.configOverrides,
  )

  const makeSnapshot = useCallback((): UndoableDocumentState => stripDocumentSnapshot({
    ...state,
    pages: structuredClone(stripRuntimePagesState(state.pages)),
  }), [state])

  const restoreSnapshot = useCallback((snapshot: UndoableDocumentState) => {
    dispatch({
      type: 'document/restore',
      snapshot: {
        ...snapshot,
        pages: withRuntimePagesState(snapshot.pages),
      },
    })
  }, [])

  const {
    pushUndoSnapshot,
    undo,
    redo,
    clearHistory,
  } = useDocumentHistory({
    limit: HISTORY_LIMIT,
    makeSnapshot,
    restoreSnapshot,
  })

  const registerFocusDiagram = useCallback((fn: (id: string) => void) => {
    focusDiagramRef.current = fn
  }, [])

  const registerInsertHandler = useCallback((fn: (text: string) => void) => {
    insertRef.current = fn
  }, [])

  const registerEditorFocusHandler = useCallback((fn: () => void) => {
    editorFocusRef.current = fn
  }, [])

  const insertText = useCallback((text: string) => {
    insertRef.current?.(text)
  }, [])

  const focusEditor = useCallback(() => {
    editorFocusRef.current?.()
  }, [])

  const addPage = useCallback((): string => {
    pushUndoSnapshot()
    const page = withRuntimePagesState([createPage(`Page ${state.pages.length + 1}`, '')])[0]!
    dispatch({ type: 'page/add', page })
    return page.id
  }, [pushUndoSnapshot, state.pages.length])

  const deletePage = useCallback((pageId: string) => {
    if (state.pages.length === 1) return
    pushUndoSnapshot()
    dispatch({ type: 'page/delete', pageId })
  }, [pushUndoSnapshot, state.pages.length])

  const renamePage = useCallback((pageId: string, name: string) => {
    const page = pageById.get(pageId)
    if (!page || page.name === name) return
    pushUndoSnapshot()
    dispatch({ type: 'page/rename', pageId, name })
  }, [pageById, pushUndoSnapshot])

  const addDiagram = useCallback((): string => {
    pushUndoSnapshot()
    const position = nextDiagramPosition(activePage.diagrams)
    const diagram = queueDiagramRender(createDiagram(`Diagram ${activePage.diagrams.length + 1}`, '', position))
    dispatch({ type: 'diagram/add', pageId: activePage.id, diagram })
    setTimeout(() => focusDiagramRef.current?.(diagram.id), 50)
    return diagram.id
  }, [activePage, pushUndoSnapshot])

  const selectDiagram = useCallback((diagramId: string) => {
    dispatch({ type: 'diagram/select', pageId: activePage.id, diagramId })
  }, [activePage.id])

  const renameDiagram = useCallback((diagramId: string, name: string) => {
    const diagram = findDiagramById(state.pages, diagramId)?.diagram
    if (!diagram || diagram.name === name) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/rename', diagramId, name })
  }, [pushUndoSnapshot, state.pages])

  const updateDiagramDescription = useCallback((diagramId: string, description: string) => {
    const diagram = findDiagramById(state.pages, diagramId)?.diagram
    const nextDescription = description || undefined
    if (!diagram || diagram.description === nextDescription) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/update-description', diagramId, description: nextDescription })
  }, [pushUndoSnapshot, state.pages])

  const copyDiagram = useCallback((diagramId: string) => {
    const target = findDiagramById(state.pages, diagramId)?.diagram
    if (!target) return
    copiedDiagramRef.current = structuredClone(target)
    setHasCopied(true)
  }, [state.pages])

  const duplicateDiagram = useCallback((source: Diagram): string | undefined => {
    pushUndoSnapshot()
    const position = nextDiagramPosition(activePage.diagrams)
    const diagram: Diagram = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: buildDuplicateName(activePage, source.name),
      x: position.x,
      y: position.y,
      configOverrides: source.configOverrides ? structuredClone(source.configOverrides) : {},
      render: source.render ? structuredClone(source.render) : undefined,
    }
    dispatch({ type: 'diagram/duplicate', pageId: activePage.id, diagram })
    setTimeout(() => focusDiagramRef.current?.(diagram.id), 50)
    return diagram.id
  }, [activePage, pushUndoSnapshot])

  const copyActiveDiagram = useCallback(() => {
    if (!activeDiagram) return
    copyDiagram(activeDiagram.id)
  }, [activeDiagram, copyDiagram])

  const pasteDiagram = useCallback(() => {
    const copied = copiedDiagramRef.current
    if (!copied) return
    duplicateDiagram(copied)
  }, [duplicateDiagram])

  const deleteDiagram = useCallback((diagramId: string) => {
    pushUndoSnapshot()
    dispatch({ type: 'diagram/delete', pageId: activePage.id, diagramId })
  }, [activePage.id, pushUndoSnapshot])

  const moveDiagram = useCallback((diagramId: string, x: number, y: number) => {
    const diagram = findDiagramById(state.pages, diagramId)?.diagram
    if (!diagram || (diagram.x === x && diagram.y === y)) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/move', diagramId, x, y })
  }, [pushUndoSnapshot, state.pages])

  const resizeDiagram = useCallback((diagramId: string, width: number) => {
    const diagram = findDiagramById(state.pages, diagramId)?.diagram
    if (!diagram || diagram.width === width) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/resize', diagramId, width })
  }, [pushUndoSnapshot, state.pages])

  const updateCode = useCallback((value: string) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-code', diagramId: activeDiagram.id, code: value })
  }, [activeDiagram])

  const setDiagramConfig = useCallback((config: DiagramConfig) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-config', diagramId: activeDiagram.id, config })
  }, [activeDiagram])

  const setMermaidTheme = useCallback((theme: MermaidTheme) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-theme', diagramId: activeDiagram.id, theme })
  }, [activeDiagram])

  const getState = useCallback((): AppState => ({
    version: 1,
    pages: stripRuntimePagesState(state.pages),
    activePageId: state.activePageId,
    mode: state.mode,
    editorLigatures: state.editorLigatures,
  }), [state.activePageId, state.editorLigatures, state.mode, state.pages])

  const getShareStateForDiagram = useCallback((diagramId: string): AppState => {
    const source = findDiagramById(state.pages, diagramId)
    if (!source) return getState()

    const sharedPage: DiagramPage = {
      id: source.page.id,
      name: source.page.name,
      diagrams: [stripSingleDiagram(source.diagram)],
      activeDiagramId: source.diagram.id,
    }

    return {
      version: 1,
      pages: [sharedPage],
      activePageId: sharedPage.id,
      mode: state.mode,
      editorLigatures: state.editorLigatures,
    }
  }, [getState, state.editorLigatures, state.mode, state.pages])

  const getShareState = useCallback((): AppState => {
    if (!activeDiagram) return getState()
    return getShareStateForDiagram(activeDiagram.id)
  }, [activeDiagram, getShareStateForDiagram, getState])

  const saveProject = useCallback(() => {
    saveProjectFile(getState())
  }, [getState])

  const loadProject = useCallback(async () => {
    const loaded = await loadProjectFile()
    if (!loaded) return
    clearHistory()
    dispatch({
      type: 'document/restore',
      snapshot: {
        pages: withRuntimePagesState(loaded.pages),
        activePageId: loaded.activePageId,
        mode: loaded.mode,
        editorLigatures: loaded.editorLigatures,
        autoFormat: state.autoFormat,
      },
    })
  }, [clearHistory, state.autoFormat])

  const resetWorkspace = useCallback(async () => {
    clearHistory()
    await clearPersistedDocumentState()
    restoreSnapshot(getInitialDocumentState())
  }, [clearHistory, restoreSnapshot])

  const copyContextShare = useCallback(async (diagramId: string) => {
    await copyShareUrl(getShareStateForDiagram(diagramId))
  }, [getShareStateForDiagram])

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
    hasCopied,
    restoreSnapshot,
    registerFocusDiagram,
    registerInsertHandler,
    registerEditorFocusHandler,
    insertText,
    focusEditor,
    setHasCopied,
    addPage,
    deletePage,
    renamePage,
    addDiagram,
    selectDiagram,
    renameDiagram,
    updateDiagramDescription,
    copyDiagram,
    copyActiveDiagram,
    pasteDiagram,
    duplicateDiagram,
    deleteDiagram,
    moveDiagram,
    resizeDiagram,
    updateCode,
    setDiagramConfig,
    setMermaidTheme,
    saveProject,
    loadProject,
    resetWorkspace,
    undo,
    redo,
    getState,
    getShareState,
    getShareStateForDiagram,
    copyContextShare,
    dispatch,
  }
}
